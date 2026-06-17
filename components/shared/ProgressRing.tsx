"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
};

/**
 * Renders an animated circular progress ring with an overlaid label.
 *
 * The displayed percentage smoothly animates toward the `value` prop using a cubic ease-out
 * curve over 900ms, continuing from the previously displayed value. When reduced motion is
 * preferred, the value updates immediately without animation.
 *
 * @param value - Target percentage value, expected to be 0–100
 * @param size - SVG and container width/height in pixels. Default: 96
 * @param stroke - Ring stroke width in pixels. Default: 8
 * @param label - Center text display; defaults to the current percentage
 * @param sublabel - Secondary text below the main label
 * @param color - Ring stroke color. Default: "#FF8A3D"
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
  color = "#FF8A3D",
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const raf = useRef<number | null>(null);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = displayRef.current; // animate from current value, not 0
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, reduced]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - display / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#262C38" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: reduced ? "none" : "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>
          {label ?? `${display}%`}
        </span>
        {sublabel && <span className="font-eyebrow text-[9px] text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
