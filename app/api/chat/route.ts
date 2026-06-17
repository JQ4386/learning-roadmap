// app/api/chat/route.ts — server-side Gemini chat for the weekly reflection coach.
//
// Holds GEMINI_API_KEY (server env only — never shipped to the client). Calls a
// Flash model with the COACH_PROMPT as a system instruction plus the user's real
// activity context. Always returns a structured error the client renders inline.

import { NextResponse } from "next/server";
import { COACH_PROMPT, type CoachContext } from "@/domain/config";

export const runtime = "nodejs";

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
const COOLDOWN_MS = 2_000; // light anti-spam, per-process per-IP

type Bucket = { last: number };
const buckets = new Map<string, Bucket>();

type ChatError = {
  kind: "config" | "busy" | "daily" | "truncated" | "upstream" | "empty";
  message: string;
};

/**
 * Creates a JSON error response.
 *
 * @param error - The error details to include in the response
 * @returns A NextResponse with `ok: false` and the provided error object
 */
function err(error: ChatError) {
  return NextResponse.json({ ok: false, error });
}

type InMessage = { role: "user" | "model"; text: string };

/**
 * Sends a request to the Google Gemini generative content API.
 * @returns The raw response from the Google Generative Language API.
 */
async function callGemini(
  model: string,
  systemInstruction: string,
  contents: any[],
  key: string
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 },
    }),
  });
}

// Note: x-forwarded-for is client-spoofable if not stripped by a trusted proxy.
// That's acceptable here — this is only a light per-process anti-spam guard; the
/**
 * Extracts a client identifier from HTTP request headers for rate-limiting.
 *
 * @returns A client identifier string, typically derived from the `x-forwarded-for` or `x-real-ip` header, or `"anon"` if neither is available.
 */
function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
}

/**
 * Generates a coach response to a user's chat request using the Gemini API.
 *
 * Enforces per-client rate limiting with a 2-second cooldown. Requires `GEMINI_API_KEY`
 * environment variable. Returns structured error responses for rate limiting, missing
 * configuration, API failures, and empty replies.
 *
 * @returns `{ ok: true, reply }` containing the generated coach message on success, or
 * `{ ok: false, error }` with structured error details on failure.
 */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return err({ kind: "config", message: "Coach is not configured (missing API key)." });

  const ck = clientKey(req);
  const now = Date.now();
  const b = buckets.get(ck) || { last: 0 };
  if (now - b.last < COOLDOWN_MS) {
    return err({ kind: "busy", message: "One sec — sending too fast." });
  }

  let body: { messages?: InMessage[]; context?: CoachContext };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const ctx: CoachContext = {
    date: body.context?.date || new Date().toISOString().slice(0, 10),
    streak: body.context?.streak ?? 0,
    totalDone: body.context?.totalDone ?? 0,
    completedThisWeek: Array.isArray(body.context?.completedThisWeek)
      ? body.context!.completedThisWeek.slice(0, 20)
      : [],
    openGaps: Array.isArray(body.context?.openGaps) ? body.context!.openGaps.slice(0, 20) : [],
    recentScans: Array.isArray(body.context?.recentScans)
      ? body.context!.recentScans.slice(0, 10)
      : [],
  };

  const history = Array.isArray(body.messages) ? body.messages : [];

  // Always lead with a kickoff user turn so the model has something to answer
  // and the role sequence stays valid (user, model, user, ...).
  const contents: any[] = [
    { role: "user", parts: [{ text: "(Begin this week's reflection check-in.)" }] },
    ...history
      .filter((m) => m && typeof m.text === "string" && m.text.trim())
      .map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
  ];

  const system = COACH_PROMPT(ctx);

  let res: Response;
  try {
    res = await callGemini(PRIMARY_MODEL, system, contents, key);
    if (res.status === 404) res = await callGemini(FALLBACK_MODEL, system, contents, key);
  } catch {
    return err({ kind: "upstream", message: "Could not reach the coach. Try again shortly." });
  }

  if (res.status === 429) {
    const txt = await res.text().catch(() => "");
    const daily = /per ?day|perday|RPD|requests per day/i.test(txt);
    return daily
      ? err({ kind: "daily", message: "Daily limit reached — back tomorrow." })
      : err({ kind: "busy", message: "Coach busy (rate limited) — try again shortly." });
  }
  if (!res.ok) {
    return err({ kind: "upstream", message: `Coach error (${res.status}). Try again shortly.` });
  }

  const data = await res.json().catch(() => null);
  const cand = data?.candidates?.[0];
  if (cand?.finishReason === "MAX_TOKENS") {
    // Still return whatever text we got, if any.
  }
  const reply: string = (cand?.content?.parts || [])
    .map((p: any) => p?.text || "")
    .join("")
    .trim();

  if (!reply) return err({ kind: "empty", message: "Coach went quiet — try again." });

  b.last = now;
  buckets.set(ck, b);
  return NextResponse.json({ ok: true, reply });
}
