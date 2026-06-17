"use client";

import { catColor, catShort } from "@/lib/curriculum";

/**
 * Renders a small styled chip displaying a category label, colored according to the category.
 *
 * @param cat - The category identifier, used to derive the chip's color and display text
 * @param className - Optional CSS classes to append to the component's base styles
 */
export function CategoryChip({ cat, className = "" }: { cat: string; className?: string }) {
  const color = catColor(cat);
  return (
    <span
      className={`font-eyebrow inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${className}`}
      style={{ color, backgroundColor: color + "1f", border: `1px solid ${color}33` }}
    >
      {catShort(cat)}
    </span>
  );
}
