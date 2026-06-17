# Agent Pipeline Mastery

A personal, mobile-first **learning tracker PWA** for studying agent-pipeline
orchestration. Installable to your phone home screen, works offline (shell), and
syncs your progress across devices via Supabase. A built-in **scout** uses
Gemini (free tier) to surface genuinely-new research from the last ~14 days.

Built with Next.js (App Router) + TypeScript + Tailwind, deployed to Vercel.

---

## What's in the box

- **Track** — the curriculum as collapsible phases; tap to complete, with an
  accent sweep + confetti on finishing a whole section.
- **Progress** — day streak, achievements, an 8-week activity chart, and a
  "concepts learned this week" revision card.
- **Quiz** — test recent learning (questions about what you just completed),
  Curveball 5, or per-category; scanned stories become "FRESH INTEL" questions.
- **Gaps** — log what you didn't understand; resolve them over time.
- **Scan** — the Gemini scout: a browsable feed of new items, deduped against
  what you've already seen, each addable to your Track.

## Forkability — respin for a different subject

All opinionated content lives in **one file: [`domain/config.ts`](domain/config.ts)**.
It exports `CATEGORIES`, `PHASES` (curriculum), `QUESTIONS` (quiz bank), and
`SCOUT_PROMPT`. Everything in `components/` and `lib/` is domain-agnostic and
reads only from that file. To make a med-student / law-student / other variant,
edit `domain/config.ts` only — no other code changes needed. (IDs are stable
handles: quiz questions reference curriculum item IDs via their `src` array, so
if you renumber curriculum IDs, update the quiz `src` references too.)

---

## Setup

### 1. Install

```bash
npm install
```

Dependencies: `next`, `react`, `react-dom`, `@supabase/supabase-js`,
`lucide-react`, plus dev: `typescript`, `tailwindcss`, `postcss`,
`autoprefixer`, and the `@types/*` packages.

### 2. Supabase (Postgres + Google Auth)

1. Create a Supabase project at <https://supabase.com/dashboard> — or, in
   Vercel, add the **Supabase integration** to this project, which provisions a
   project and injects `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   automatically.
2. Apply the schema in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
   it creates the `user_state` table, enables Row-Level Security (each user may
   read/write **only** their own row), and adds the table to the Realtime
   publication. Run it via the **SQL Editor** (paste + Run) or
   `supabase db push` with the Supabase CLI.
3. **Authentication → Providers → Google → enable**, and add your Google OAuth
   client ID/secret.
4. **Authentication → URL Configuration** → add your site URL + redirect URLs
   (Vercel gives you `*.vercel.app`; add your custom domain too).

### 3. Gemini scout API key (free tier)

1. Create an API key in **Google AI Studio** (<https://aistudio.google.com/apikey>).
2. **Leave billing DISABLED** on the project.
   ⚠️ **Critical gotcha:** enabling billing on a Gemini project *deletes the free
   tier on that project entirely* — every call becomes billable from token 1.
   Keep this project billing-disabled. If you ever want a paid fallback, use a
   *separate* Google Cloud project.
3. Put the key in `.env.local` as `GEMINI_API_KEY` (server-only — **not**
   `NEXT_PUBLIC_`).

Free-tier Flash limits are ~1,500 requests/day and ~10–15 RPM **per project**
(shared across all users). For 2–3 people that's ~1% of quota. Note: free-tier
prompts may be used by Google for training — fine for scouting public AI news;
**don't pipe private data through the scout.**

### 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase (anon key is public by design)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Gemini scout (SERVER ONLY)
GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-3.5-flash   # optional override
```

### 5. Run locally

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

### 6. Deploy to Vercel

```bash
vercel deploy
```

If you use the **Vercel Supabase integration**, the `NEXT_PUBLIC_SUPABASE_*`
vars are injected for you; you only need to add the server-only `GEMINI_API_KEY`
in **Vercel → Project → Settings → Environment Variables**. Then add your Vercel
domain to **Supabase → Authentication → URL Configuration** (redirect URLs).

### 7. Add your users

Sign-in is gated by `ALLOWLIST` in [`lib/auth.ts`](lib/auth.ts), currently set
to a single email. Add more emails to that array to widen access, or set it back
to `[]` to allow any Google account (each gets their own synced row).

---

## Architecture notes

- **State**: one row per user in `public.user_state` (`user_id`, `state jsonb`,
  `updated_at`), mirroring the `UserState` shape in [`lib/types.ts`](lib/types.ts).
  Writes are debounced (400 ms) so a burst of checkbox taps is a single upsert;
  reads subscribe via Supabase **Realtime** (Postgres Changes) for live
  cross-device updates. On first load, any completed item missing a `doneAt`
  date is stamped (migration).
- **Scout** ([`app/api/scan/route.ts`](app/api/scan/route.ts)): server-side
  Route Handler holding `GEMINI_API_KEY`. Calls `gemini-3.5-flash` (falls back
  to `gemini-3-flash`) with Google Search grounding, parses the JSON robustly
  (brace-balanced, string-aware), dedups against your knowledge bank
  (canonical-URL + 32-bit SimHash / LSH), and returns up to 10 items plus the
  real grounding queries. Rate-limit guarded (≥15 s cooldown + daily soft cap),
  and 429s are distinguished (RPM "try again shortly" vs RPD "back tomorrow").
  Kept items are filed to the bank (cap 200, FIFO) and resurface as quiz
  "FRESH INTEL".
- **Dedup** ([`lib/dedup.ts`](lib/dedup.ts)) and **achievements**
  ([`lib/achievements.ts`](lib/achievements.ts)) are pure, isomorphic modules.
- **PWA**: `public/manifest.json` + `public/sw.js` (network-first navigations
  with an offline-shell fallback; never caches the scout API or Supabase).
  The service worker registers only in production builds.
- **Accessibility**: all animations are hand-rolled CSS keyframes and are fully
  disabled under `prefers-reduced-motion`.

## Security

- The Gemini key is read only from the server env (`GEMINI_API_KEY`) and never
  ships to the client (verified: it does not appear in `.next/static`).
- The Supabase URL + anon key are public by design; access is enforced by
  Row-Level Security policies + Auth, not by hiding them.
