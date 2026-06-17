"use client";

import { useMemo } from "react";
import { Flame, Award } from "lucide-react";
import type { UserState } from "@/lib/types";
import { ACHIEVEMENTS, currentStreak } from "@/lib/achievements";
import { itemById } from "@/lib/curriculum";
import { AchievementIcon } from "@/components/shared/AchievementIcon";
import { CategoryChip } from "@/components/shared/CategoryChip";

/**
 * Computes the Monday date for the week containing the input date.
 *
 * @param d - The input date
 * @returns The Monday of the input date's week, at midnight
 */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

/**
 * Formats a date with the month abbreviation and day number.
 *
 * @returns A formatted date string (e.g., 'Jan 5')
 */
function fmtWeek(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Renders a user progress dashboard displaying streak, achievements, and activity history.
 *
 * @param state - The user state containing progress data
 */
export function Progress({ state }: { state: UserState }) {
  const streak = currentStreak(state);
  const achCount = Object.keys(state.achievements || {}).length;

  // Completed items with their completion date, newest first.
  const completed = useMemo(() => {
    return Object.keys(state.done)
      .filter((id) => state.done[id])
      .map((id) => ({ id, date: state.doneAt[id] || "", item: itemById(id, state.custom) }))
      .filter((x) => x.item)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state]);

  // 8-week activity bar chart (all activity events per week).
  const weeks = useMemo(() => {
    const now = new Date();
    const buckets: { start: Date; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const s = weekStart(new Date(now.getTime() - i * 7 * 86400000));
      buckets.push({ start: s, count: 0 });
    }
    const bump = (iso?: string | null) => {
      if (!iso) return;
      const t = new Date(iso).getTime();
      if (isNaN(t)) return;
      const ws = weekStart(new Date(t)).getTime();
      const b = buckets.find((x) => x.start.getTime() === ws);
      if (b) b.count++;
    };
    Object.values(state.doneAt).forEach(bump);
    state.gaps.forEach((g) => bump(g.date));
    state.quiz.history.forEach((h) => bump(h.date));
    bump(state.scan.date);
    return buckets;
  }, [state]);

  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  // Group completed items by week for the "concepts learned" cards.
  const thisWeekStart = weekStart(new Date()).getTime();
  const thisWeek = completed.filter((c) => c.date && weekStart(new Date(c.date)).getTime() === thisWeekStart);
  const earlier = completed.filter((c) => !c.date || weekStart(new Date(c.date)).getTime() !== thisWeekStart);

  return (
    <div className="space-y-5">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 anim-fadeSlideUp">
        <div
          className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-4 ${
            streak >= 3 ? "anim-glow" : ""
          }`}
        >
          <Flame size={28} className={streak >= 3 ? "text-accent" : "text-muted"} />
          <div>
            <div className="text-2xl font-bold tabular-nums text-ink">{streak}</div>
            <div className="font-eyebrow text-[10px] text-muted">day streak</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <Award size={28} className="text-accent" />
          <div>
            <div className="text-2xl font-bold tabular-nums text-ink">
              {achCount}
              <span className="text-sm text-muted">/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="font-eyebrow text-[10px] text-muted">achievements</div>
          </div>
        </div>
      </div>

      {/* 8-week activity chart */}
      <div className="rounded-xl border border-border bg-surface p-4 anim-fadeSlideUp">
        <div className="font-eyebrow mb-3 text-[10px] text-muted">8-week activity</div>
        <div className="flex h-24 items-end gap-2">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end">
                <div
                  className="anim-barGrow w-full rounded-t bg-accent/70"
                  style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? 4 : 0 }}
                  title={`${w.count} events`}
                />
              </div>
              <span className="text-[8px] text-muted">{fmtWeek(w.start)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* This week — concepts learned */}
      <div className="rounded-xl border border-border bg-surface p-4 anim-fadeSlideUp">
        <div className="font-eyebrow mb-3 text-[10px] text-muted">this week — concepts learned</div>
        {thisWeek.length === 0 ? (
          <p className="text-xs text-muted">Nothing completed yet this week. Pick one item and start.</p>
        ) : (
          <ul className="space-y-3">
            {thisWeek.map((c) => (
              <li key={c.id} className="flex gap-3">
                <CategoryChip cat={c.item!.cat} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs leading-relaxed text-ink">{c.item!.desc}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">{c.item!.title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Earlier weeks history */}
      {earlier.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 anim-fadeSlideUp">
          <div className="font-eyebrow mb-3 text-[10px] text-muted">earlier</div>
          <ul className="space-y-2">
            {earlier.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-xs">
                <CategoryChip cat={c.item!.cat} />
                <span className="min-w-0 flex-1 truncate text-muted">{c.item!.title}</span>
                <span className="shrink-0 text-[10px] text-muted">{c.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Achievements grid */}
      <div className="rounded-xl border border-border bg-surface p-4 anim-fadeSlideUp">
        <div className="font-eyebrow mb-3 text-[10px] text-muted">achievements</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = !!state.achievements?.[a.id];
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center ${
                  unlocked ? "border-accent/40 bg-accent/10" : "border-border bg-surface2 opacity-50"
                }`}
                title={a.desc}
              >
                <AchievementIcon
                  name={a.icon}
                  size={20}
                  className={unlocked ? "text-accent" : "text-muted"}
                />
                <span className="text-[9px] font-semibold leading-tight text-ink">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
