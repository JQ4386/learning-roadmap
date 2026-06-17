// lib/achievements.ts — achievement engine (domain-agnostic).
//
// 15 achievements, evaluated by diffing earned-vs-stored on every state change.
// On newly earned: the app fires confetti + a top banner and persists the
// unlock date so it does not refire. Streak = consecutive days with any
// activity (a completion, a gap, a quiz, or a scan).

import { PHASES, CATEGORIES } from "@/domain/config";
import type { UserState } from "@/lib/types";

export type Achievement = {
  id: string;
  label: string;
  desc: string;
  icon: string; // lucide-react icon name (resolved in the UI)
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_node", label: "First Node", desc: "Complete your first item", icon: "Sparkles" },
  { id: "oriented", label: "Oriented", desc: "Finish Phase 0", icon: "Compass" },
  { id: "canon", label: "Canon", desc: "Finish the Core Six", icon: "BookOpen" },
  { id: "momentum", label: "Momentum", desc: "Complete 5 items", icon: "Wind" },
  { id: "deep_ten", label: "Deep Ten", desc: "Complete 10 items", icon: "Layers" },
  { id: "second_ring", label: "Second Ring", desc: "Complete 5 Depth Library items", icon: "Orbit" },
  { id: "full_frame", label: "Full Frame", desc: "Read in all 7 categories", icon: "Grid3x3" },
  { id: "calibrated", label: "Calibrated", desc: "Finish a quiz", icon: "Target" },
  { id: "clean_sweep", label: "Clean Sweep", desc: "Score 5/5 on a quiz", icon: "Trophy" },
  { id: "battle_25", label: "Battle-25", desc: "Answer 25 quiz questions", icon: "Swords" },
  { id: "honest_gap", label: "Honest Gap", desc: "Log your first gap", icon: "Flag" },
  { id: "loop_closed", label: "Loop Closed", desc: "Resolve a gap", icon: "CheckCheck" },
  { id: "scout", label: "Scout", desc: "Run your first scan", icon: "Radar" },
  { id: "streak_3", label: "Streak ×3", desc: "3-day activity streak", icon: "Flame" },
  { id: "streak_7", label: "Streak ×7", desc: "7-day activity streak", icon: "Flame" },
];

/**
 * Retrieves the item ids from a phase.
 *
 * @returns The item ids from the matching phase, or an empty array if the phase is not found.
 */
function phaseItemIds(phaseId: string): string[] {
  const p = PHASES.find((x) => x.id === phaseId);
  return p ? p.items.map((i) => i.id) : [];
}

/**
 * Determines the category of an item from the curriculum or custom items.
 *
 * @param id - The item ID to look up
 * @returns The item's category, or `null` if not found
 */
function itemCategory(id: string, state: UserState): string | null {
  for (const p of PHASES) {
    const found = p.items.find((i) => i.id === id);
    if (found) return found.cat;
  }
  const c = state.custom.find((i) => i.id === id);
  return c ? c.cat : null;
}

/**
 * Retrieves the ids of completed items.
 *
 * @returns An array of item ids from `state.done` with truthy values.
 */
function doneIds(state: UserState): string[] {
  return Object.keys(state.done).filter((id) => state.done[id]);
}

/**
 * Collects calendar dates on which any activity occurred.
 *
 * @returns A set of date strings in `YYYY-MM-DD` format representing days with activity.
 */
function activityDays(state: UserState): Set<string> {
  const days = new Set<string>();
  const add = (iso?: string | null) => {
    if (!iso) return;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) days.add(d.toISOString().slice(0, 10));
  };
  Object.values(state.doneAt).forEach(add);
  state.gaps.forEach((g) => add(g.date));
  state.quiz.history.forEach((h) => add(h.date));
  // Use the full scan-day history (state.scan.date only holds the latest scan).
  (state.scan.scanDays || []).forEach(add);
  add(state.scan.date);
  return days;
}

/**
 * Converts a date to a string in YYYY-MM-DD format.
 *
 * @param d - The date to convert
 * @returns The date formatted as YYYY-MM-DD
 */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Finds the longest consecutive run of days with activity.
 *
 * @returns The length of the longest consecutive streak of activity days.
 */
export function longestStreak(state: UserState): number {
  const days = [...activityDays(state)].sort();
  if (!days.length) return 0;
  let best = 1,
    run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00Z");
    const cur = new Date(days[i] + "T00:00:00Z");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

// Current streak: consecutive days ending today (or yesterday, so the flame
/**
 * Computes the activity streak of consecutive days ending on today (or yesterday if today has no activity).
 *
 * @returns The count of consecutive activity days.
 */
export function currentStreak(state: UserState): number {
  const days = activityDays(state);
  if (!days.size) return 0;
  const today = new Date();
  let cursor = new Date(dayKey(today) + "T00:00:00Z");
  if (!days.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return count;
}

/**
 * Calculates the total number of questions answered across all quiz attempts.
 *
 * @returns The sum of answered questions across all quiz stats entries.
 */
function questionsAnswered(state: UserState): number {
  return Object.values(state.quiz.stats).reduce((sum, s) => sum + (s?.a || 0), 0);
}

/**
 * Computes which achievements have been earned based on the current state.
 *
 * @returns A set of achievement IDs currently earned.
 */
export function evaluateAchievements(state: UserState): Set<string> {
  const earned = new Set<string>();
  const done = doneIds(state);
  const doneSet = new Set(done);
  const count = done.length;

  if (count >= 1) earned.add("first_node");
  if (count >= 5) earned.add("momentum");
  if (count >= 10) earned.add("deep_ten");

  const phase0 = phaseItemIds("phase0");
  if (phase0.length && phase0.every((id) => doneSet.has(id))) earned.add("oriented");

  const core6 = phaseItemIds("core6");
  if (core6.length && core6.every((id) => doneSet.has(id))) earned.add("canon");

  const depth = phaseItemIds("depth");
  const depthDone = depth.filter((id) => doneSet.has(id)).length;
  if (depthDone >= 5) earned.add("second_ring");

  const cats = new Set<string>();
  done.forEach((id) => {
    const c = itemCategory(id, state);
    if (c) cats.add(c);
  });
  if (CATEGORIES.every((c) => cats.has(c.id))) earned.add("full_frame");

  if (state.quiz.history.length >= 1) earned.add("calibrated");
  if (state.quiz.history.some((h) => h.total >= 5 && h.score === h.total))
    earned.add("clean_sweep");
  if (questionsAnswered(state) >= 25) earned.add("battle_25");

  if (state.gaps.length >= 1) earned.add("honest_gap");
  if (state.gaps.some((g) => g.resolved)) earned.add("loop_closed");

  if (state.scan.date) earned.add("scout");

  const streak = longestStreak(state);
  if (streak >= 3) earned.add("streak_3");
  if (streak >= 7) earned.add("streak_7");

  return earned;
}

// Diff earned-vs-stored. Returns the newly-earned achievement ids (to celebrate)
/**
 * Identifies newly earned achievements by comparing current evaluation against stored achievements.
 *
 * @param todayIso - The date string to assign as the unlock date for newly earned achievements
 * @returns An object containing the newly earned achievement ids and the updated achievements map with unlock dates
 */
export function diffAchievements(
  state: UserState,
  todayIso: string
): { newlyEarned: string[]; merged: Record<string, string> } {
  const earned = evaluateAchievements(state);
  const stored = state.achievements || {};
  const merged: Record<string, string> = { ...stored };
  const newlyEarned: string[] = [];
  earned.forEach((id) => {
    if (!merged[id]) {
      merged[id] = todayIso;
      newlyEarned.push(id);
    }
  });
  return { newlyEarned, merged };
}
