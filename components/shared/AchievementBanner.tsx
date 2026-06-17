"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementIcon } from "./AchievementIcon";

// Top banner that announces a newly-earned achievement, then auto-dismisses.
/**
 * Displays achievement notifications from a queue one at a time, auto-dismissing each after 4 seconds.
 *
 * @param queue - Array of achievement IDs to display sequentially
 * @param onDone - Callback invoked when the current achievement is dismissed
 */
export function AchievementBanner({
  queue,
  onDone,
}: {
  queue: string[];
  onDone: () => void;
}) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      setCurrent(null);
      onDone();
    }, 4000);
    return () => clearTimeout(t);
  }, [current, onDone]);

  if (!current) return null;
  const ach = ACHIEVEMENTS.find((a) => a.id === current);
  if (!ach) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-3">
      <div className="anim-bannerIn relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border border-accent/40 bg-surface2 px-4 py-3 shadow-lg">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="anim-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <AchievementIcon name={ach.icon} size={20} />
        </div>
        <div className="min-w-0">
          <div className="font-eyebrow text-[10px] text-accent">Achievement unlocked</div>
          <div className="truncate text-sm font-semibold text-ink">{ach.label}</div>
          <div className="truncate text-xs text-muted">{ach.desc}</div>
        </div>
      </div>
    </div>
  );
}
