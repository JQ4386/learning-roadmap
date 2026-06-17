"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { TrackItem } from "@/domain/config";
import { CategoryChip } from "./CategoryChip";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function ItemRow({
  item,
  done,
  onToggle,
}: {
  item: TrackItem;
  done: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  const [sweep, setSweep] = useState(false);
  const [pop, setPop] = useState(false);
  const prevDone = useRef(done);

  // Trigger the accent wash + check pop when transitioning to done.
  useEffect(() => {
    if (done && !prevDone.current && !reduced) {
      setSweep(true);
      setPop(true);
      const t1 = setTimeout(() => setSweep(false), 750);
      const t2 = setTimeout(() => setPop(false), 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    prevDone.current = done;
  }, [done, reduced]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface">
      {/* Content layer */}
      <div className="relative z-0 flex items-start gap-3 p-3">
        <button
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? "border-accent bg-accent text-bg"
              : "border-border bg-transparent text-transparent hover:border-accent/60"
          } ${pop ? "anim-popIn" : ""}`}
        >
          <Check size={16} strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <CategoryChip cat={item.cat} />
            <span className="font-eyebrow text-[10px] text-muted">{item.meta}</span>
          </div>
          <div className={`text-sm font-semibold leading-snug ${done ? "text-muted line-through" : "text-ink"}`}>
            {item.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{item.desc}</p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Open source <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Sweep layer — z-20 so it passes ABOVE the check icon (no keyhole). */}
      {sweep && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="anim-rowSweep absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>
      )}
    </div>
  );
}
