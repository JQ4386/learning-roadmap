// lib/auth.ts — Google sign-in hook (Supabase Auth). One tap, no passwords.
// Optional allowlist: set ALLOWLIST to a few emails to gate sign-in at this
// scale; leave empty to allow anyone who signs in (fine for 2-3 known users).

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";

// Optional email allowlist. Empty = allow all signed-in users.
// Note: this is UX gating only — the authoritative boundary is Supabase RLS,
// which scopes every row to its owner (auth.uid()), so even a non-allowlisted
// session can only ever touch its own empty row, never another user's data.
// Stored normalized (trimmed, lower-cased) so comparison is case-insensitive.
const ALLOWLIST: string[] = ["jq4386@gmail.com"].map((e) =>
  e.trim().toLowerCase()
);

// A storage-agnostic user shape. `uid` mirrors the old Firebase field name so
// the rest of the app (e.g. useUserState(user.uid)) is unaffected by the swap.
export type AuthUser = { uid: string; email: string | null };

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  ready: boolean; // supabase configured
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Manages Supabase authentication state with optional email allowlist gating.
 *
 * If an email allowlist is configured, users whose email is not in the list are
 * automatically signed out. Provides methods to sign in via Google OAuth and
 * sign out.
 *
 * @returns The current authentication state and sign-in/sign-out operations.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setLoading(false);
      return;
    }

    const apply = (sUser: { id: string; email?: string | null } | null) => {
      if (
        sUser &&
        ALLOWLIST.length &&
        (!sUser.email || !ALLOWLIST.includes(sUser.email.trim().toLowerCase()))
      ) {
        // Not on the allowlist — sign back out.
        setError("This account is not on the allowlist.");
        supabase!.auth.signOut();
        setUser(null);
      } else {
        setError(null);
        setUser(sUser ? { uid: sUser.id, email: sUser.email ?? null } : null);
      }
      setLoading(false);
    };

    // Hydrate from any persisted session, then listen for changes (including the
    // redirect back from Google OAuth).
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setError("Supabase is not configured.");
      return;
    }
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Sign-in failed.");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { user, loading, ready: supabaseReady, error, signIn, signOut };
}
