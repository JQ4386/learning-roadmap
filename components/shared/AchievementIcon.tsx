"use client";

import {
  Sparkles, Compass, BookOpen, Wind, Layers, Orbit, Grid3x3, Target,
  Trophy, Swords, Flag, CheckCheck, Radar, Flame, Award, type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const MAP: Record<string, ComponentType<LucideProps>> = {
  Sparkles, Compass, BookOpen, Wind, Layers, Orbit, Grid3x3, Target,
  Trophy, Swords, Flag, CheckCheck, Radar, Flame,
};

/**
 * Renders a lucide icon component based on the provided achievement icon name.
 *
 * @param name - The name of the icon to render from the achievement icon set
 * @returns A React element rendering the specified icon, or the Award icon if the name is not found
 */
export function AchievementIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name] ?? Award;
  return <Cmp {...props} />;
}
