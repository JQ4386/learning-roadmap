// lib/store.ts — Firestore-backed state, replacing the prototype's window.storage.
//
// Strategy:
//   - One document per user at users/{uid}.
//   - Read once on auth, then subscribe for cross-device live updates.
//   - Debounce writes (400ms) so a burst of checkbox taps is one write.
//   - Migration: on first load, stamp doneAt for any done item missing a date.
//   - Achievements are evaluated on every change; newly-earned ids are surfaced
//     for the UI to celebrate and the unlock dates are persisted.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { emptyState, type UserState } from "@/lib/types";
import { diffAchievements } from "@/lib/achievements";

const DEBOUNCE_MS = 400;
const ECHO_SUPPRESS_MS = 1500; /**
 * Gets the current date and time in ISO 8601 format.
 *
 * @returns The current date and time in ISO 8601 format.
 */

function todayIso(): string {
  return new Date().toISOString();
}

// Merge a possibly-partial Firestore document onto a complete default shape so
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
 * Loads and synchronizes user state from Firestore with live updates and debounced writes.
 *
 * Hydrates the initial document and performs a one-time migration of missing completion timestamps.
 * Subsequent changes from other devices are reflected in real-time. Local mutations are debounced
 * (400ms) before persisting. Achievements are recomputed on every local change, and newly earned IDs are tracked.
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
  const suppressUntil = useRef(0);
  const pending = useRef<UserState | null>(null);

  const flush = useCallback(() => {
    if (!uid || !db || !pending.current) return;
    const payload = pending.current;
    pending.current = null;
    suppressUntil.current = Date.now() + ECHO_SUPPRESS_MS;
    setDoc(doc(db, "users", uid), payload as any, { merge: false }).catch((e) => {
      console.error("Firestore write failed", e);
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
    if (!uid || !db) {
      setReady(false);
      return;
    }
    setReady(false);
    const ref = doc(db, "users", uid);
    let first = true;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // Ignore echoes of our own recent write.
        if (Date.now() < suppressUntil.current && !first) return;
        const hydrated = hydrate(snap.exists() ? snap.data() : null);
        if (first) {
          const changed = migrate(hydrated);
          setState(hydrated);
          setReady(true);
          first = false;
          if (changed) scheduleWrite(hydrated);
          if (!snap.exists()) scheduleWrite(hydrated); // create the doc
        } else {
          setState(hydrated);
        }
      },
      (err) => {
        console.error("Firestore subscribe failed", err);
        setReady(true);
      }
    );
    return () => {
      unsub();
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
