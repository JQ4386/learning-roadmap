// lib/curriculum.ts — domain-agnostic helpers over the config + custom items.

import { CATEGORIES, PHASES, type Category, type TrackItem } from "@/domain/config";
import type { UserState, CustomItem } from "@/lib/types";

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function catColor(id: string): string {
  return categoryById(id)?.color ?? "#94A3B8";
}

export function catShort(id: string): string {
  return categoryById(id)?.short ?? id;
}

// All curriculum items, flattened (does not include custom/scanned items).
export function curriculumItems(): TrackItem[] {
  return PHASES.flatMap((p) => p.items);
}

// Every trackable item id -> item, including custom items added from scans.
export function allItemsMap(custom: CustomItem[]): Map<string, TrackItem> {
  const m = new Map<string, TrackItem>();
  curriculumItems().forEach((i) => m.set(i.id, i));
  custom.forEach((c) => m.set(c.id, c));
  return m;
}

export function itemById(id: string, custom: CustomItem[]): TrackItem | undefined {
  return allItemsMap(custom).get(id);
}

// Total trackable items (curriculum + custom) and how many are done.
export function progressCounts(state: UserState): { done: number; total: number } {
  const ids = new Set<string>(curriculumItems().map((i) => i.id));
  state.custom.forEach((c) => ids.add(c.id));
  let done = 0;
  ids.forEach((id) => {
    if (state.done[id]) done++;
  });
  return { done, total: ids.size };
}
