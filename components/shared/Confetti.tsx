"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const COLORS = ["#FF8A3D", "#7DD3FC", "#C4B5FD", "#FCD34D", "#86EFAC", "#F9A8D4"];

type Piece = { id: number; left: number; delay: number; dur: number; color: string; size: number };

// Fire-and-forget confetti burst. Renders nothing when reduced motion is on.
export function Confetti({ fireKey }: { fireKey: number }) {
  const reduced = useReducedMotion();
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (reduced) {
      setPieces([]); // clear any in-flight burst when reduced-motion turns on
      return;
    }
    if (!fireKey) return;
    const next: Piece[] = Array.from({ length: 80 }, (_, i) => ({
      id: fireKey * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      dur: 1.6 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 3400);
    return () => clearTimeout(t);
  }, [fireKey, reduced]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="anim-confetti absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
