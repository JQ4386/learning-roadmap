"use client";

import { useEffect, useState } from "react";

// True when the user prefers reduced motion. CSS already neutralizes keyframe
/**
 * Determines if the user prefers reduced motion.
 *
 * @returns `true` if the user prefers reduced motion, `false` otherwise.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
