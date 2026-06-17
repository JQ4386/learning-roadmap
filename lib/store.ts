// lib/store.ts — Supabase-backed state, replacing the prototype's window.storage.
//
// Strategy:
//   - One row per user in public.user_state: { user_id, state jsonb, updated_at }.
//   - Read once on auth, then subscribe (Postgres Changes / Realtime) for
//     cross-device live updates.
//   - Debounce writes (400ms) so a burst of checkbox taps is one upsert.
//   - Migration: on first load, stamp doneAt for any done item missing a date.
//   - Achievements are evaluated on every change; newly-earned ids are surfaced
//     for the UI to celebrate and the unlock dates are persisted.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { emptyState, type UserState } from "@/lib/types";
import { diffAchievements } from "@/lib/achievements";

const DEBOUNCE_MS = 400;
const TABLE = "user_state";

/**
 * Gets the current date and time in ISO 8601 format.
 *
 * @returns The current date and time in ISO 8601 format.
 */
function todayIso(): string {
  return new Date().toISOString();
}

// Merge a possibly-partial stored document onto a complete default shape so
/**
 * Merges partial data with defaults to produce a complete UserState.
 *
 * @param raw - Partial or invalid user state data
 * @returns A complete UserState with all fields initialized to safe defaults
 */
function hydrate(raw: any): UserState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  return {
    done: raw.done ?? base.done,
    doneAt: raw.doneAt ?? base.doneAt,
    gaps: Array.isArray(raw.gaps) ? raw.gaps : base.gaps,
    custom: Array.isArray(raw.custom) ? raw.custom : base.custom,
    quiz: {
      stats: raw.quiz?.stats ?? {},
      history: Array.isArray(raw.quiz?.history) ? raw.quiz.history : [],
    },
    achievements: raw.achievements ?? base.achievements,
    bank: Array.isArray(raw.bank) ? raw.bank : base.bank,
    scan: {
      trace: Array.isArray(raw.scan?.trace) ? raw.scan.trace : [],
      recs: Array.isArray(raw.scan?.recs) ? raw.scan.recs : [],
      date: raw.scan?.date ?? null,
      suppressed: raw.scan?.suppressed ?? 0,
      scanDays: Array.isArray(raw.scan?.scanDays)
        ? raw.scan.scanDays
        : raw.scan?.date
          ? [String(raw.scan.date).slice(0, 10)]
          : [],
    },
    coach: {
      messages: Array.isArray(raw.coach?.messages) ? raw.coach.messages : [],
      lastCheckIn: raw.coach?.lastCheckIn,
    },
    scoutMeta: raw.scoutMeta ?? {},
  };
}

// Stamp doneAt for any completed item missing a date (prototype added dating
/**
 * Adds missing completion timestamps for items marked as done.
 *
 * @returns `true` if any timestamps were added, `false` otherwise.
 */
function migrate(state: UserState): boolean {
  let changed = false;
  const today = todayIso().slice(0, 10);
  Object.keys(state.done).forEach((id) => {
    if (state.done[id] && !state.doneAt[id]) {
      state.doneAt[id] = today;
      changed = true;
    }
  });
  return changed;
}

export type Store = {
  state: UserState;
  ready: boolean;
  update: (mutator: (draft: UserState) => void) => void;
  newlyEarned: string[];
  clearNewlyEarned: () => void;
};

/**
 * Loads and synchronizes user state from Supabase with live updates and debounced writes.
 *
 * Hydrates the initial row and performs a one-time migration of missing completion timestamps.
 * Subsequent changes from other devices are reflected in real-time via Postgres Changes.
 * Local mutations are debounced (400ms) before persisting. Achievements are recomputed on
 * every local change, and newly earned IDs are tracked.
 *
 * @param uid - The user ID. If null, the subscription is disabled.
 * @returns A Store object containing the current user state, a ready flag, an update function, and accumulated newly earned achievement IDs.
 */
export function useUserState(uid: string | null): Store {
  const [state, setState] = useState<UserState>(() => emptyState());
  const [ready, setReady] = useState(false);
  const [newlyEarned, setNewlyEarned] = useState<string[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timestamp of our most recent successful-intent write, used to recognize and
  // ignore the Realtime echo of our own change (see the channel handler below).
  const lastWrittenAt = useRef<string | null>(null);
  const pending = useRef<UserState | null>(null);

  const flush = useCallback(() => {
    if (!uid || !supabase || !pending.current) return;
    const payload = pending.current;
    const stamp = todayIso();
    lastWrittenAt.current = stamp;
    supabase
      .from(TABLE)
      .upsert({ user_id: uid, state: payload, updated_at: stamp })
      .then(({ error }) => {
        if (error) {
          // Keep the payload pending so the next flush retries it, unless a
          // newer mutation has already queued in its place. Never drop data.
          console.error("Supabase write failed", error);
          if (!pending.current) pending.current = payload;
          return;
        }
        // Clear only the payload we just wrote; a newer one may be queued.
        if (pending.current === payload) pending.current = null;
      });
  }, [uid]);

  const scheduleWrite = useCallback(
    (next: UserState) => {
      pending.current = next;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush]
  );

  // Read once + subscribe for cross-device updates.
  useEffect(() => {
    if (!uid || !supabase) {
      setReady(false);
      return;
    }
    setReady(false);
    let cancelled = false;

    // Initial read.
    supabase
      .from(TABLE)
      .select("state")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Stay not-ready on a failed read: rendering with empty/stale state
          // here would let a subsequent write clobber the real persisted row.
          console.error("Supabase read failed", error);
          return;
        }
        const hydrated = hydrate(data?.state ?? null);
        const changed = migrate(hydrated);
        setState(hydrated);
        setReady(true);
        // Persist a migration touch-up, or create the row if it didn't exist.
        if (changed || !data) scheduleWrite(hydrated);
      });

    // Realtime: live cross-device updates. RLS still applies, so this channel
    // only delivers changes to the caller's own row.
    const channel = supabase
      .channel(`user_state:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as any;
          const next = row?.state;
          if (!next) return;
          // Ignore only the echo of our own write (same updated_at), so genuine
          // cross-device updates — which carry a different timestamp — always
          // hydrate, even if they land right after a local change.
          if (
            lastWrittenAt.current &&
            row.updated_at &&
            Date.parse(row.updated_at) === Date.parse(lastWrittenAt.current)
          ) {
            return;
          }
          setState(hydrate(next));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
      if (writeTimer.current) clearTimeout(writeTimer.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const update = useCallback(
    (mutator: (draft: UserState) => void) => {
      const draft: UserState = structuredClone(stateRef.current);
      mutator(draft);
      // Evaluate achievements on every change.
      const { newlyEarned: gained, merged } = diffAchievements(draft, todayIso());
      draft.achievements = merged;
      setState(draft);
      stateRef.current = draft;
      if (gained.length) setNewlyEarned((q) => [...q, ...gained]);
      scheduleWrite(draft);
    },
    [scheduleWrite]
  );

  const clearNewlyEarned = useCallback(() => setNewlyEarned([]), []);

  return { state, ready, update, newlyEarned, clearNewlyEarned };
}
