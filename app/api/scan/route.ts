// app/api/scan/route.ts — server-side Gemini scout.
//
// Holds GEMINI_API_KEY (server env only — never shipped to the client). Calls
// Gemini with Google Search grounding, parses robustly, dedups against the
// caller's knowledge bank, and returns up to 10 curated items + the grounding
// trace. Rate-limit guarded; always returns a structured error the client can
// render inline (never crashes the UI).

import { NextResponse } from "next/server";
import { SCOUT_PROMPT, CATEGORIES } from "@/domain/config";
import {
  canonUrl,
  simhash32,
  buildDedupIndex,
  indexAdd,
  isDup,
  type DedupBankItem,
} from "@/lib/dedup";
import { isValidBankQuiz } from "@/lib/quiz";
import type { Rec } from "@/lib/types";

export const runtime = "nodejs";

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3-flash";
const COOLDOWN_MS = 15_000;
const DAILY_CAP = 20;

// Best-effort, per-process defensive guard (durable per-user limiting is done
// client-side via Firestore scoutMeta). Resets on cold start — that's fine.
type Bucket = { last: number; day: string; count: number };
const buckets = new Map<string, Bucket>();

type ScanError = {
  kind: "cooldown" | "daily" | "busy" | "truncated" | "parse" | "config" | "upstream";
  message: string;
};

function err(error: ScanError, status = 200) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Brace-balanced, string-aware extraction of the first complete JSON object.
// Tolerates braces inside string values; does NOT naively grab the last brace.
function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function callGemini(model: string, prompt: string, key: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // Built-in Google Search grounding (replaces the artifact's web_search).
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2500 },
    }),
  });
  return res;
}

function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return err({ kind: "config", message: "Scout is not configured (missing API key)." });

  // --- defensive rate-limit guard ---
  const ck = clientKey(req);
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const b = buckets.get(ck) || { last: 0, day: today, count: 0 };
  if (b.day !== today) {
    b.day = today;
    b.count = 0;
  }
  if (now - b.last < COOLDOWN_MS) {
    return err({ kind: "cooldown", message: "Scout busy — wait a few seconds and try again." });
  }
  if (b.count >= DAILY_CAP) {
    return err({ kind: "daily", message: "Daily scan limit reached — back tomorrow." });
  }

  // --- parse request ---
  let body: { bank?: DedupBankItem[]; bankTitles?: string[]; date?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const date = body.date || today;
  const bankTitles = Array.isArray(body.bankTitles) ? body.bankTitles.slice(0, 60) : [];
  const bank = Array.isArray(body.bank) ? body.bank : [];

  const prompt = SCOUT_PROMPT(date, bankTitles, CATEGORIES.map((c) => c.id));

  // --- call Gemini (with fallback model) ---
  let res: Response;
  try {
    res = await callGemini(PRIMARY_MODEL, prompt, key);
    if (res.status === 404) res = await callGemini(FALLBACK_MODEL, prompt, key);
  } catch (e) {
    return err({ kind: "upstream", message: "Could not reach the scout. Try again shortly." });
  }

  if (res.status === 429) {
    const txt = await res.text().catch(() => "");
    const daily = /per ?day|perday|RPD|requests per day/i.test(txt);
    return daily
      ? err({ kind: "daily", message: "Daily limit reached — back tomorrow." })
      : err({ kind: "busy", message: "Scout busy (rate limited) — try again shortly." });
  }

  if (!res.ok) {
    return err({ kind: "upstream", message: `Scout error (${res.status}). Try again shortly.` });
  }

  const data = await res.json().catch(() => null);
  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish === "MAX_TOKENS") {
    return err({ kind: "truncated", message: "Response cut off — rescan." });
  }

  const text: string = (cand?.content?.parts || [])
    .map((p: any) => p?.text || "")
    .join("")
    .trim();
  if (!text) return err({ kind: "parse", message: "Empty response — rescan." });

  // Grounding trace: the real search queries the model ran.
  const trace: string[] = Array.isArray(cand?.groundingMetadata?.webSearchQueries)
    ? cand.groundingMetadata.webSearchQueries
    : [];

  const jsonStr = extractJson(text);
  if (!jsonStr) return err({ kind: "parse", message: "Could not parse scout output — rescan." });

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return err({ kind: "parse", message: "Could not parse scout output — rescan." });
  }

  const rawRecs: any[] = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  const validCats = new Set(CATEGORIES.map((c) => c.id));

  // Dedup against the caller's bank.
  const idx = buildDedupIndex(bank);
  let suppressed = 0;
  const recs: Rec[] = [];

  for (const r of rawRecs) {
    if (!r || typeof r.title !== "string" || !r.title.trim()) continue; // skip titleless
    const title = String(r.title).trim();
    const summary = typeof r.summary === "string" ? r.summary : "";
    const u = canonUrl(typeof r.url === "string" ? r.url : "");
    const hash = simhash32(title + " " + summary);

    if (isDup(idx, u, hash)) {
      suppressed++;
      continue;
    }
    indexAdd(idx, u, hash); // dedup within this batch too

    const category = validCats.has(r.category) ? r.category : CATEGORIES[0].id;
    const priority: Rec["priority"] = ["now", "soon", "later"].includes(r.priority)
      ? r.priority
      : "later";

    recs.push({
      id: "rc_" + hash.toString(36) + "_" + recs.length,
      title,
      source: typeof r.source === "string" ? r.source : "",
      url: typeof r.url === "string" ? r.url : "",
      summary,
      reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
      fit: typeof r.fit === "string" ? r.fit : "",
      category,
      priority,
      quiz: isValidBankQuiz(r.quiz) ? r.quiz : null,
    });
    if (recs.length >= 10) break;
  }

  // Commit the rate-limit bucket only on a successful run.
  b.last = now;
  b.count += 1;
  buckets.set(ck, b);

  return NextResponse.json({ ok: true, trace, suppressed, recs });
}
