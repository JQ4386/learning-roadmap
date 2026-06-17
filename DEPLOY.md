# Deploying

This app runs on **Vercel** (Next.js host) and uses **Firebase** for Auth +
Firestore. No secrets live in this repo; you set them in the Vercel and Firebase
dashboards. Nothing here requires a CLI on your machine except the optional local
rules deploy.

## 1. Vercel (hosting + auto-deploy) — GitHub App

The Vercel Git integration is a GitHub App, so once connected every push to
`main` deploys to production and every PR gets a preview URL.

1. <https://vercel.com> → **Add New → Project → Import Git Repository**.
2. Authorize the **Vercel GitHub App** and pick `JQ4386/learning-roadmap`.
3. Framework is auto-detected as **Next.js** — no build config needed.
4. **Settings → Environment Variables** — add all of these (see
   `.env.local.example` for the exact list):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `GEMINI_API_KEY` ← **server-only**, must NOT have the `NEXT_PUBLIC_` prefix.
5. **Deploy.**

After this, redeploys are automatic on push — no further action.

> Add your Vercel domain to **Firebase console → Authentication → Settings →
> Authorized domains** so Google sign-in popups work in production.

## 2. Firestore security rules

Rules live in `firestore.rules` (owner-only access to `users/{uid}`).

### Automated (GitHub Action — recommended)

`.github/workflows/firestore-rules.yml` deploys the rules on every change to
`main`. One-time setup:

1. **Firebase console → Project settings → Service accounts → Generate new
   private key** (downloads a JSON file).
2. **GitHub repo → Settings → Secrets and variables → Actions → New repository
   secret** named `FIREBASE_SERVICE_ACCOUNT`; paste the entire JSON as the value.

The workflow reads the project ID from the service-account JSON, so there's
nothing else to configure. It also runs on demand via **Actions → firestore
rules → Run workflow**.

### Manual (alternative)

- Paste `firestore.rules` into **Firebase console → Firestore → Rules →
  Publish**, or
- Run locally: `npx firebase login` then `npm run deploy:rules`.

## 3. Sign-in allowlist

`lib/auth.ts` gates sign-in to `ALLOWLIST`. It's currently set to
`jq4386@gmail.com`, so only that Google account can sign in; anyone else is
signed out immediately. Add more emails to the array (and redeploy) to widen
access, or set it back to `[]` to allow any Google account.
