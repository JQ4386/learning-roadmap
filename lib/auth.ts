// lib/auth.ts — Google sign-in hook. One tap, no passwords.
// Optional allowlist: set ALLOWLIST to a few emails to gate sign-in at this
// scale; leave empty to allow anyone who signs in (fine for 2-3 known users).

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "@/lib/firebase";

// Optional email allowlist. Empty = allow all signed-in users.
const ALLOWLIST: string[] = [];

export type AuthState = {
  user: User | null;
  loading: boolean;
  ready: boolean; // firebase configured
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && ALLOWLIST.length && (!u.email || !ALLOWLIST.includes(u.email))) {
        // Not on the allowlist — sign back out.
        setError("This account is not on the allowlist.");
        fbSignOut(auth!);
        setUser(null);
      } else {
        setError(null);
        setUser(u);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async () => {
    if (!firebaseReady || !auth) {
      setError("Firebase is not configured.");
      return;
    }
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user") return;
      setError(e?.message || "Sign-in failed.");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
  }, []);

  return { user, loading, ready: firebaseReady, error, signIn, signOut };
}
