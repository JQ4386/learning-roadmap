// lib/curriculum.ts — domain-agnostic helpers over the config + custom items.

import { CATEGORIES, PHASES, type Category, type TrackItem } from "@/domain/config";
import type { UserState, CustomItem } from "@/lib/types";

/**
 * Finds a category by its ID.
 *
 * @returns The category matching the provided ID, or `undefined` if not found.
 */
export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Retrieves the display color for a category.
 *
 * @param id - The category identifier
 * @returns The category's color, or `"#94A3B8"` if the category is not found.
 */
export function catColor(id: string): string {
  return categoryById(id)?.color ?? "#94A3B8";
}

/**
 * Gets the short category label for the given id.
 *
 * @returns The category's short label if found, otherwise the provided `id`
 */
export function catShort(id: string): string {
  return categoryById(id)?.short ?? id;
}

/**
 * Retrieves all curriculum track items as a flat list.
 *
 * @returns A flattened array of all curriculum items, excluding custom/scanned items.
 */
export function curriculumItems(): TrackItem[] {
  return PHASES.flatMap((p) => p.items);
}

/**
 * Creates a map containing all trackable items from the curriculum and custom sources.
 *
 * @param custom - Custom items to include in the map
 * @returns A `Map<string, TrackItem>` where keys are item ids and values are the corresponding items. Custom items take precedence over curriculum items with the same id.
 */
export function allItemsMap(custom: CustomItem[]): Map<string, TrackItem> {
  const m = new Map<string, TrackItem>();
  curriculumItems().forEach((i) => m.set(i.id, i));
  custom.forEach((c) => m.set(c.id, c));
  return m;
}

/**
 * Retrieves a track item by its id, including custom items in the search.
 *
 * @param custom - Custom items to include in the lookup
 * @returns The track item matching the given id, or `undefined` if not found
 */
export function itemById(id: string, custom: CustomItem[]): TrackItem | undefined {
  return allItemsMap(custom).get(id);
}

/**
 * Calculates the count of completed and total trackable items.
 *
 * @returns An object where `done` is the count of completed items and `total` is the count of all trackable items
 */
export function progressCounts(state: UserState): { done: number; total: number } {
  const ids = new Set<string>(curriculumItems().map((i) => i.id));
  state.custom.forEach((c) => ids.add(c.id));
  let done = 0;
  ids.forEach((id) => {
    if (state.done[id]) done++;
  });
  return { done, total: ids.size };
}
