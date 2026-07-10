# Lapse

Lapse is a shared streak tracker where two users upload one daily timelapse video each.

## Project Architecture (Where To Edit What)

This is the quick map for making changes without hunting through the codebase.

### Frontend routes (what users see)

- `app/page.js`
	- App entry route (`/`).
	- Edit this if you want to change the app's startup behavior (for example, where users are redirected first).

- `app/login/page.js`
	- Login screen and sign-in logic.
	- Edit this for login form text, validation messages, and auth flow UX.

- `app/dashboard/page.js`
	- Main authenticated page.
	- Edit this for streak UI, feed layout, sorting, and what data is shown.

- `app/record/page.js`
	- Camera recording page.
	- Edit this for camera constraints, recording controls, preview behavior, and upload/DB save behavior.

- `app/layout.js`
	- Global page wrapper and metadata.
	- Edit this if you want to change app title/description, manifest wiring, or shared shell structure.

- `app/globals.css`
	- Global styling.
	- Edit this for app-wide visual updates (colors, spacing, shared component styles).

### Backend connection (Supabase client)

- `lib/supabase-browser.js`
	- Browser-side Supabase client setup.
	- Edit this only if connection setup or client options need to change.

### Database and security

- `supabase/schema.sql`
	- Source of truth for database tables, triggers, and RLS policies.
	- Edit this when changing data structure (new columns/tables), auth-related triggers, or access rules.

### PWA setup

- `public/manifest.webmanifest`
	- Installable app metadata.
	- Edit this for app name, theme colors, and install behavior.

### Project config and environment

- `.env.example`
	- Template of required environment variables.
	- Update this whenever a new env var is introduced.

- `next.config.mjs`
	- Next.js runtime/build configuration.
	- Touch this only for framework-level behavior.

- `jsconfig.json`
	- Path aliases and editor config.
	- Edit this if import alias structure changes.

- `package.json`
	- Scripts and dependencies.
	- Edit this when adding/removing packages or changing run/build commands.

## Keep This README Updated

When you add a feature, update these sections in the same PR/commit:

1. `Current Scope` (what works now)
2. `Project Architecture` (new file responsibilities)
3. `Routes` (if a route was added/changed)
4. Setup steps (if env vars, SQL, or scripts changed)

Small rule that helps: if you created or renamed a file, add one line about it here.

## Current Scope

This first setup includes:
- Next.js app scaffold (App Router)
- Supabase email/password login flow
- Initial database schema for daily timelapses and streak tracking
- Supabase Storage bucket + policies for authenticated uploads
- Camera recording page with upload + daily DB save flow

Streak calculation is currently computed in the recorder flow before saving today's row.

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 3) Create database schema in Supabase

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the SQL in `supabase/schema.sql`
4. If you already ran an older version of this SQL, run the current file again so storage bucket policies are applied.

## 4) Create your two accounts

Because signup is closed in the app, create users in:
- Supabase Dashboard -> Authentication -> Users -> Add user

Then create matching profile rows (if they are not auto-created by trigger), or keep the trigger from the SQL enabled.

## 5) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` checks auth state and redirects to `/login` or `/dashboard`
- `/login` email/password sign in
- `/dashboard` shows current streak summary and recent timelapse feed (from DB)
- `/record` camera access + recording + preview + upload + save daily entry
