# Deploying

This app runs on **Vercel** (Next.js host) and uses **Supabase** for Auth +
Postgres (with Realtime for live cross-device sync). No secrets live in this
repo — they're set in the Vercel/Supabase dashboards.

## 1. Vercel + Supabase (hosting + database) — integrations

Both connect as GitHub/Vercel integrations, so deploys are automatic.

1. **Vercel → Add New → Project → Import** `JQ4386/learning-roadmap` (authorize
   the Vercel GitHub App). Next.js is auto-detected — no build config.
2. **Vercel → Integrations → Supabase**: add it to this project. It provisions /
   links a Supabase project and injects `NEXT_PUBLIC_SUPABASE_URL` +
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` automatically.
3. **Vercel → Settings → Environment Variables**: add the server-only
   `GEMINI_API_KEY` (the Supabase vars are already there from step 2).
4. **Deploy.** Every push to `main` redeploys; every PR gets a preview URL.

## 2. Database schema + security

Apply [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
it creates the `user_state` table, enables **Row-Level Security** (each user can
read/write only their own row), and registers the table for **Realtime**.

- **Easiest:** Supabase dashboard → **SQL Editor** → paste the file → Run.
- **CLI:** `supabase link` then `supabase db push`.

## 3. Google sign-in

1. **Supabase → Authentication → Providers → Google → enable**, paste your
   Google OAuth client ID + secret (from Google Cloud Console → Credentials).
2. **Supabase → Authentication → URL Configuration**: set the Site URL and add
   redirect URLs for your Vercel domain(s) (`https://<app>.vercel.app` and any
   custom domain). Add the Supabase callback URL to the Google OAuth client's
   authorized redirect URIs as shown in the Supabase provider page.

## 4. Sign-in allowlist

`lib/auth.ts` gates sign-in to `ALLOWLIST`, currently `jq4386@gmail.com` — only
that Google account can sign in; anyone else is signed out immediately. Add more
emails to the array (and redeploy) to widen access, or set it to `[]` to allow
any Google account.
