"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { PHASES, type Phase, type TrackItem } from "@/domain/config";
import type { UserState } from "@/lib/types";
import { ItemRow } from "@/components/shared/ItemRow";
import { useToast } from "@/components/shared/Toast";

export function Track({
  state,
  update,
  onConfetti,
}: {
  state: UserState;
  update: (m: (d: UserState) => void) => void;
  onConfetti: () => void;
}) {
  const toast = useToast();

  // Synthetic section for items added from scans.
  const customPhase: Phase | null = state.custom.length
    ? {
        id: "scanned",
        title: "Added from Scans",
        note: "Items you pulled in from the scout feed.",
        defaultOpen: true,
        items: state.custom as TrackItem[],
      }
    : null;

  const phases: Phase[] = customPhase ? [...PHASES, customPhase] : PHASES;

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    PHASES.forEach((p) => (o[p.id] = p.defaultOpen));
    o["scanned"] = true;
    return o;
  });

  const toggleItem = (phase: Phase, item: TrackItem) => {
    const wasDone = !!state.done[item.id];
    update((d) => {
      if (wasDone) {
        delete d.done[item.id];
        delete d.doneAt[item.id];
      } else {
        d.done[item.id] = true;
        d.doneAt[item.id] = new Date().toISOString().slice(0, 10);
      }
    });
    // If this completion finishes the whole section, celebrate.
    if (!wasDone) {
      const sectionComplete = phase.items.every((it) =>
        it.id === item.id ? true : !!state.done[it.id]
      );
      if (sectionComplete) {
        onConfetti();
        toast(`Section complete — ${phase.title.split("—")[0].trim()} ✓`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const isOpen = open[phase.id];
        const doneCount = phase.items.filter((i) => state.done[i.id]).length;
        const allDone = doneCount === phase.items.length;
        return (
          <section key={phase.id} className="anim-fadeSlideUp">
            <button
              onClick={() => setOpen((o) => ({ ...o, [phase.id]: !o[phase.id] }))}
              className="flex w-full items-center gap-2 text-left"
            >
              {isOpen ? (
                <ChevronDown size={18} className="text-muted" />
              ) : (
                <ChevronRight size={18} className="text-muted" />
              )}
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  {phase.id === "scanned" && <Sparkles size={14} className="text-accent" />}
                  {phase.title}
                  {allDone && <span className="text-accent">✓</span>}
                </h2>
                <p className="text-xs text-muted">{phase.note}</p>
              </div>
              <span className="font-eyebrow shrink-0 text-[10px] text-muted">
                {doneCount}/{phase.items.length}
              </span>
            </button>

            {isOpen && (
              <div className="relative mt-3 space-y-2 pl-3">
                {/* Section rail line behind the nodes */}
                <div className="absolute bottom-3 left-[7px] top-3 w-px bg-border" aria-hidden />
                {phase.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    done={!!state.done[item.id]}
                    onToggle={() => toggleItem(phase, item)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
