"use client";

import { useState } from "react";
import { Plus, Check, Trash2, RotateCcw } from "lucide-react";
import type { UserState } from "@/lib/types";

/**
 * Provides an interface for logging and managing learning gaps.
 *
 * @param state - The user state containing the list of gaps
 * @param update - Function to mutate the user state with gap changes
 */
export function Gaps({
  state,
  update,
}: {
  state: UserState;
  update: (m: (d: UserState) => void) => void;
}) {
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    update((d) => {
      d.gaps.unshift({
        id: "g_" + Date.now().toString(36),
        text: t,
        date: new Intl.DateTimeFormat("en-CA").format(new Date()), // local YYYY-MM-DD
        resolved: false,
      });
    });
    setText("");
  };

  const toggleResolved = (id: string) =>
    update((d) => {
      const g = d.gaps.find((x) => x.id === id);
      if (g) g.resolved = !g.resolved;
    });

  const remove = (id: string) =>
    update((d) => {
      d.gaps = d.gaps.filter((x) => x.id !== id);
    });

  const open = state.gaps.filter((g) => !g.resolved);
  const resolved = state.gaps.filter((g) => g.resolved);

  return (
    <div className="space-y-5">
      <div className="anim-fadeSlideUp">
        <div className="font-eyebrow mb-1 text-[10px] text-muted">phase 1 — weekly habit</div>
        <p className="mb-3 text-xs text-muted">
          Log the holes as you hit them. When the same gap shows up twice, that&apos;s the signal to
          pull from the Foundations shelf.
        </p>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="What didn't you understand?"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={add}
            aria-label="Add gap"
            className="flex items-center justify-center rounded-lg bg-accent px-3 text-bg"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {open.length === 0 && resolved.length === 0 && (
        <p className="text-sm text-muted anim-fadeSlideUp">No gaps logged yet.</p>
      )}

      {open.length > 0 && (
        <ul className="space-y-2 anim-fadeSlideUp">
          {open.map((g) => (
            <li
              key={g.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <button
                onClick={() => toggleResolved(g.id)}
                aria-label="Mark resolved"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-transparent hover:border-accent/60"
              >
                <Check size={14} strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{g.text}</p>
                <span className="text-[10px] text-muted">{g.date}</span>
              </div>
              <button onClick={() => remove(g.id)} aria-label="Delete" className="text-muted hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="anim-fadeSlideUp">
          <div className="font-eyebrow mb-2 text-[10px] text-muted">resolved</div>
          <ul className="space-y-2">
            {resolved.map((g) => (
              <li
                key={g.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-3"
              >
                <button
                  onClick={() => toggleResolved(g.id)}
                  aria-label="Reopen"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent text-bg"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted line-through">{g.text}</p>
                  <span className="text-[10px] text-muted">{g.date}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleResolved(g.id)}
                    aria-label="Reopen"
                    className="text-muted hover:text-accent"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button onClick={() => remove(g.id)} aria-label="Delete" className="text-muted hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
