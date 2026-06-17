// lib/supabase.ts — client-side Supabase init.
// The URL + anon key are public by design (security is enforced by Row-Level
// Security policies + Auth, not by hiding these). The Gemini key is NOT here —
// it lives server-side only (see app/api/scan/route.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True only when the essential config is present, so the UI can show a helpful
// "configure Supabase" message instead of crashing during local setup.
export const supabaseReady = Boolean(url && anonKey);

export const supabase: SupabaseClient | undefined = supabaseReady
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : undefined;
