"use client";

import { useEffect, useRef, useState } from "react";
import { Radar, Plus, Check, ExternalLink, X, AlertTriangle } from "lucide-react";
import type { UserState, Rec, BankEntry } from "@/lib/types";
import { canonUrl, simhash32 } from "@/lib/dedup";
import { CategoryChip } from "@/components/shared/CategoryChip";
import { useToast } from "@/components/shared/Toast";

const COOLDOWN_MS = 15_000;
const DAILY_CAP = 20;

const STAGES = [
  "Spinning up the scout…",
  "Searching the last 14 days…",
  "Reading primary sources…",
  "Filtering changelog noise…",
  "Deduping against your bank…",
  "Curating the feed…",
];

const PRIORITY_STYLE: Record<Rec["priority"], { label: string; cls: string }> = {
  now: { label: "NOW", cls: "bg-accent/20 text-accent" },
  soon: { label: "SOON", cls: "bg-yellow-400/15 text-yellow-300" },
  later: { label: "LATER", cls: "bg-slate-400/15 text-slate-300" },
};

export function Scan({
  state,
  update,
}: {
  state: UserState;
  update: (m: (d: UserState) => void) => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Rec | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = state.scan;
  const addedIds = new Set(state.custom.map((c) => c.id));

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, []);

  const runScan = async () => {
    if (loading) return;
    setError(null);

    // Client-side durable rate-limit (Firestore-backed scoutMeta).
    const meta = state.scoutMeta || {};
    const today = new Date().toISOString().slice(0, 10);
    if (meta.lastScanAt && Date.now() - new Date(meta.lastScanAt).getTime() < COOLDOWN_MS) {
      setError("Scout busy — wait a few seconds and try again.");
      return;
    }
    if (meta.dayKey === today && (meta.dayCount || 0) >= DAILY_CAP) {
      setError("Daily scan limit reached — back tomorrow.");
      return;
    }

    setLoading(true);
    setStage(0);
    stageTimer.current = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1400);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          bank: state.bank.map((b) => ({ u: b.u, hash: b.hash })),
          bankTitles: state.bank.map((b) => b.t),
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        setError(json.error?.message || "Scan failed. Try again.");
        return;
      }

      const recs: Rec[] = json.recs || [];
      const trace: string[] = json.trace || [];
      const suppressed: number = json.suppressed || 0;

      update((d) => {
        // Preserve the scan-day history (for streaks); cap to last 400 days.
        const days = Array.from(new Set([...(d.scan?.scanDays || []), today])).slice(-400);
        d.scan = { trace, recs, date: today, suppressed, scanDays: days };
        // File a bank entry per kept item (FRESH INTEL fodder for the quiz).
        recs.forEach((r) => {
          const entry: BankEntry = {
            id: r.id,
            t: r.title,
            u: canonUrl(r.url),
            s: r.summary,
            cat: r.category,
            hash: simhash32(r.title + " " + r.summary),
            date: today,
            quiz: r.quiz,
          };
          d.bank.push(entry);
        });
        if (d.bank.length > 200) d.bank = d.bank.slice(d.bank.length - 200); // cap 200 FIFO
        const sameDay = d.scoutMeta?.dayKey === today;
        d.scoutMeta = {
          lastScanAt: new Date().toISOString(),
          dayKey: today,
          dayCount: (sameDay ? d.scoutMeta?.dayCount || 0 : 0) + 1,
        };
      });
    } catch {
      setError("Could not reach the scout. Check your connection and retry.");
    } finally {
      setLoading(false);
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  };

  const addToTrack = (r: Rec) => {
    if (addedIds.has(r.id)) return;
    update((d) => {
      d.custom.push({
        id: r.id,
        cat: r.category,
        title: r.title,
        meta: r.source || "from scan",
        desc: r.summary || r.fit,
        url: r.url,
      });
    });
    toast("Added to Track ✓");
  };

  // --- LOADING (single integrated radar state) ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 pt-16">
        <div className="relative h-32 w-32">
          <div className="absolute inset-0 rounded-full border border-accent/30" />
          <div className="absolute inset-4 rounded-full border border-accent/20" />
          <div className="absolute inset-8 rounded-full border border-accent/10" />
          <div className="anim-sweep absolute inset-0 rounded-full">
            <div
              className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(255,138,61,0.45), rgba(255,138,61,0) 70%)",
                borderTopLeftRadius: "100%",
              }}
            />
          </div>
          <Radar size={22} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" />
        </div>
        <p className="font-eyebrow text-xs text-muted">{STAGES[stage]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Trigger */}
      <button
        onClick={runScan}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-bg anim-fadeSlideUp"
      >
        <Radar size={18} /> {scan.date ? "Scan again" : "Run scout"}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200 anim-fadeSlideUp">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Exploration trace */}
      {scan.date && (
        <div className="rounded-xl border border-border bg-surface p-4 anim-fadeSlideUp">
          <div className="font-eyebrow mb-2 text-[10px] text-muted">exploration trace</div>
          {scan.trace.length ? (
            <ul className="space-y-1">
              {scan.trace.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted">
                  <span className="text-accent">→</span>
                  <span className="min-w-0 break-words">{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No grounding queries reported.</p>
          )}
          <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted">
            {scan.suppressed} duplicate{scan.suppressed === 1 ? "" : "s"} suppressed · last scan {scan.date}
          </div>
        </div>
      )}

      {/* Cards */}
      {scan.recs.length > 0 && (
        <div className="space-y-2">
          {scan.recs.map((r) => {
            const ps = PRIORITY_STYLE[r.priority];
            const added = addedIds.has(r.id);
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 anim-fadeSlideUp hover:border-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`font-eyebrow rounded px-1.5 py-0.5 text-[9px] font-bold ${ps.cls}`}>
                      {ps.label}
                    </span>
                    <CategoryChip cat={r.category} />
                  </div>
                  <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{r.title}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">{r.source}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToTrack(r);
                  }}
                  aria-label="Add to track"
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    added ? "border-accent bg-accent text-bg" : "border-border text-accent hover:bg-accent/10"
                  }`}
                >
                  {added ? <Check size={16} /> : <Plus size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {scan.date && scan.recs.length === 0 && !error && (
        <p className="text-sm text-muted anim-fadeSlideUp">
          Quiet out there — no genuinely new items this scan.
        </p>
      )}

      {/* Bottom sheet */}
      {selected && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="anim-fadeSlideUp relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface2 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute right-4 top-4 text-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <div className="mb-2 flex items-center gap-2">
              <span className={`font-eyebrow rounded px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_STYLE[selected.priority].cls}`}>
                {PRIORITY_STYLE[selected.priority].label}
              </span>
              <CategoryChip cat={selected.category} />
            </div>
            <h3 className="pr-6 text-base font-bold leading-snug text-ink">{selected.title}</h3>
            <div className="mt-1 text-xs text-muted">{selected.source}</div>

            <div className="mt-4 space-y-3">
              <Field label="summary" value={selected.summary} />
              <Field label="why it earns your time" value={selected.reasoning} />
              <Field label="where it slots in" value={selected.fit} />
            </div>

            <div className="mt-5 flex gap-3">
              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
                >
                  Open source <ExternalLink size={14} />
                </a>
              )}
              <button
                onClick={() => addToTrack(selected)}
                disabled={addedIds.has(selected.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold ${
                  addedIds.has(selected.id) ? "bg-accent/40 text-bg" : "bg-accent text-bg"
                }`}
              >
                {addedIds.has(selected.id) ? (
                  <>
                    <Check size={15} /> Added
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Add to Track
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="font-eyebrow mb-1 text-[10px] text-accent">{label}</div>
      <p className="text-sm leading-relaxed text-ink">{value}</p>
    </div>
  );
}
