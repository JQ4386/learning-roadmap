"use client";

import { useState } from "react";
import { Check, X, ArrowRight, RotateCcw } from "lucide-react";
import { CATEGORIES } from "@/domain/config";
import type { UserState } from "@/lib/types";
import {
  buildSession,
  hasRecentMaterial,
  type SessionQuestion,
  type QuizMode,
} from "@/lib/quiz";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Phase = "pick" | "play" | "score";

function calibratedMessage(score: number, total: number): string {
  const r = total ? score / total : 0;
  if (r === 1) return "Clean sweep. Calibrated.";
  if (r >= 0.8) return "Sharp. The frame is holding.";
  if (r >= 0.5) return "Solid. A couple of soft spots to revisit.";
  if (r > 0) return "Honest signal — go re-read the misses.";
  return "Rough run. That's data, not failure.";
}

export function Quiz({
  state,
  update,
  onConfetti,
}: {
  state: UserState;
  update: (m: (d: UserState) => void) => void;
  onConfetti: () => void;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("pick");
  const [session, setSession] = useState<SessionQuestion[]>([]);
  const [mode, setMode] = useState<QuizMode>("recent");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  // Correctness recorded per answered question (parallel to session order).
  const [results, setResults] = useState<boolean[]>([]);

  const recentReady = hasRecentMaterial(state);
  const score = results.filter(Boolean).length;

  const start = (m: QuizMode, catId?: string) => {
    const s = buildSession(m, state, catId);
    if (!s.length) return;
    setSession(s);
    setMode(m);
    setIdx(0);
    setSelected(null);
    setResults([]);
    setPhase("play");
  };

  const answer = (choice: number) => {
    if (selected !== null) return;
    setSelected(choice);
    setResults((r) => [...r, choice === session[idx].a]);
  };

  const next = () => {
    if (idx + 1 < session.length) {
      setIdx((i) => i + 1);
      setSelected(null);
      return;
    }
    finish();
  };

  const finish = () => {
    const finalScore = results.filter(Boolean).length;
    update((d) => {
      // Per-question stats: answered (a) and correct (c).
      session.forEach((q, i) => {
        const stat = d.quiz.stats[q.id] || { a: 0, c: 0 };
        stat.a += 1;
        if (results[i]) stat.c += 1;
        d.quiz.stats[q.id] = stat;
      });
      d.quiz.history.push({
        date: new Date().toISOString(),
        score: finalScore,
        total: session.length,
        mode,
      });
    });
    setPhase("score");
    if (finalScore === session.length && session.length >= 5) onConfetti();
  };

  // --- PICK ---
  if (phase === "pick") {
    return (
      <div className="space-y-5">
        <button
          disabled={!recentReady}
          onClick={() => start("recent")}
          className={`w-full rounded-xl border p-4 text-left transition-colors anim-fadeSlideUp ${
            recentReady
              ? "border-accent bg-accent/10 hover:bg-accent/15"
              : "cursor-not-allowed border-border bg-surface opacity-50"
          }`}
        >
          <div className="font-eyebrow text-[10px] text-accent">primary</div>
          <div className="text-base font-bold text-ink">Test recent learning</div>
          <p className="text-xs text-muted">
            {recentReady
              ? "Questions on what you just completed, plus a curveball."
              : "Complete at least one item to unlock."}
          </p>
        </button>

        <button
          onClick={() => start("random")}
          className="w-full rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50 anim-fadeSlideUp"
        >
          <div className="font-eyebrow text-[10px] text-muted">mixed</div>
          <div className="text-base font-bold text-ink">Curveball 5</div>
          <p className="text-xs text-muted">Five random across the whole frame + fresh intel.</p>
        </button>

        <div className="anim-fadeSlideUp">
          <div className="font-eyebrow mb-2 text-[10px] text-muted">by category</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => start("cat", c.id)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ color: c.color, borderColor: c.color + "55", backgroundColor: c.color + "12" }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- SCORE ---
  if (phase === "score") {
    const pct = Math.round((score / session.length) * 100);
    return (
      <div className="flex flex-col items-center gap-5 pt-6 anim-fadeSlideUp">
        <ProgressRing value={pct} size={140} stroke={10} label={`${score}/${session.length}`} sublabel="score" />
        <p className="max-w-xs text-center text-sm text-muted">{calibratedMessage(score, session.length)}</p>
        <button
          onClick={() => setPhase("pick")}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink"
        >
          <RotateCcw size={15} /> New quiz
        </button>
      </div>
    );
  }

  // --- PLAY ---
  const q = session[idx];
  const answered = selected !== null;

  return (
    <div className="space-y-5">
      {/* progress dots */}
      <div className="flex items-center justify-center gap-2">
        {session.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === idx ? "w-6 bg-accent" : i < idx ? "w-2 bg-accent/50" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      {q.badge && (
        <div className="flex justify-center">
          <span
            className={`font-eyebrow rounded-full px-2.5 py-1 text-[10px] font-bold ${
              q.badge === "FRESH INTEL" ? "bg-accent/20 text-accent" : "bg-sky-400/15 text-sky-300"
            }`}
          >
            {q.badge}
          </span>
        </div>
      )}

      <h2 className="text-center text-base font-bold leading-snug text-ink">{q.q}</h2>

      <div className="space-y-2">
        {q.opts.map((opt, i) => {
          const isCorrect = i === q.a;
          const isChosen = i === selected;
          let cls = "border-border bg-surface text-ink";
          let anim = "";
          if (answered) {
            if (isCorrect) {
              cls = "border-green-500 bg-green-500/15 text-green-200";
              anim = reduced ? "" : "anim-greenPop";
            } else if (isChosen) {
              cls = "border-red-500 bg-red-500/15 text-red-200";
              anim = reduced ? "" : "anim-shake";
            } else {
              cls = "border-border bg-surface text-muted opacity-60";
            }
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => answer(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${cls} ${anim}`}
            >
              <span>{opt}</span>
              {answered && isCorrect && <Check size={16} className="shrink-0 text-green-400" />}
              {answered && isChosen && !isCorrect && <X size={16} className="shrink-0 text-red-400" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="rounded-lg border border-border bg-surface2 p-3 anim-fadeSlideUp">
          <div className="font-eyebrow mb-1 text-[10px] text-accent">why</div>
          <p className="text-xs leading-relaxed text-muted">{q.why}</p>
        </div>
      )}

      {answered && (
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-bg"
        >
          {idx + 1 < session.length ? "Next" : "See score"} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
