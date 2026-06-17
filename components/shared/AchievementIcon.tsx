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

// Resolve a lucide icon by the name stored in the achievement config.
export function AchievementIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name] ?? Award;
  return <Cmp {...props} />;
}
