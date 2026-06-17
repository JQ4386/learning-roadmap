"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertTriangle, MessageCircle } from "lucide-react";
import type { UserState, CoachMessage } from "@/lib/types";
import type { CoachContext } from "@/domain/config";
import { currentStreak } from "@/lib/achievements";
import { progressCounts, itemById } from "@/lib/curriculum";

function weekStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x.getTime();
}

// Build the personalized context the coach sees from the user's real state.
function buildContext(state: UserState): CoachContext {
  const thisWeek = weekStart(new Date());
  const completedThisWeek = Object.keys(state.done)
    .filter((id) => state.done[id] && state.doneAt[id] && weekStart(new Date(state.doneAt[id])) === thisWeek)
    .map((id) => {
      const item = itemById(id, state.custom);
      return item ? { title: item.title, concept: item.desc } : null;
    })
    .filter((x): x is { title: string; concept: string } => x !== null);

  return {
    date: new Date().toISOString().slice(0, 10),
    streak: currentStreak(state),
    totalDone: progressCounts(state).done,
    completedThisWeek,
    openGaps: state.gaps.filter((g) => !g.resolved).map((g) => g.text),
    recentScans: (state.bank || []).slice(-5).map((b) => b.t),
  };
}

export function Coach({
  state,
  update,
}: {
  state: UserState;
  update: (m: (d: UserState) => void) => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = state.coach?.messages ?? [];
  const isNewWeek =
    !state.coach?.lastCheckIn || weekStart(new Date(state.coach.lastCheckIn)) !== weekStart(new Date());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  // `state` is captured from render and could be slightly stale, but that's safe:
  // the `sending` mutex blocks concurrent calls, and the user message is pushed
  // optimistically (below) before we build `apiMessages`, so the fetch always
  // sees the latest thread.
  const send = async (text: string, kickoff: boolean) => {
    if (sending) return;
    const trimmed = text.trim();
    if (!kickoff && !trimmed) return;
    setError(null);
    setSending(true);

    const base = state.coach?.messages ?? [];
    const newUser: CoachMessage | null = kickoff
      ? null
      : { role: "user", text: trimmed, date: new Date().toISOString() };

    if (newUser) {
      update((d) => {
        d.coach = d.coach ?? { messages: [] };
        d.coach.messages.push(newUser);
      });
      setInput("");
    }

    // On a weekly kickoff, start the thread fresh (don't replay old weeks).
    const apiMessages = kickoff
      ? []
      : [...base, newUser!].map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context: buildContext(state) }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Coach unavailable. Try again.");
        return;
      }
      const modelMsg: CoachMessage = {
        role: "model",
        text: json.reply,
        date: new Date().toISOString(),
      };
      update((d) => {
        d.coach = d.coach ?? { messages: [] };
        d.coach.messages.push(modelMsg);
        if (d.coach.messages.length > 100) d.coach.messages = d.coach.messages.slice(-100);
        if (kickoff) d.coach.lastCheckIn = new Date().toISOString();
      });
    } catch {
      setError("Could not reach the coach. Check your connection and retry.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="anim-fadeSlideUp">
        <div className="font-eyebrow mb-1 text-[10px] text-muted">weekly reflection</div>
        <p className="mb-4 text-xs text-muted">
          A short weekly check-in to consolidate what you learned and decide what&apos;s next. Grounded in
          your actual progress.
        </p>
      </div>

      {/* New-week check-in CTA */}
      {isNewWeek && (
        <button
          onClick={() => send("", true)}
          disabled={sending}
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-bg anim-fadeSlideUp disabled:opacity-60"
        >
          <Sparkles size={16} /> {messages.length ? "Start this week's check-in" : "Start your first check-in"}
        </button>
      )}

      {/* Conversation */}
      <div className="flex-1 space-y-3">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center gap-2 pt-10 text-center text-muted">
            <MessageCircle size={28} className="opacity-50" />
            <p className="text-sm">Tap above to begin — your coach will open with what you did this week.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed anim-fadeSlideUp ${
                m.role === "user"
                  ? "rounded-br-sm bg-accent text-bg"
                  : "rounded-bl-sm border border-border bg-surface text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="sticky bottom-0 mt-3 flex gap-2 bg-bg/80 py-2 backdrop-blur">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input, false)}
          placeholder="Type your reflection…"
          disabled={sending}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={() => send(input, false)}
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-bg disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
