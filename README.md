# Lapse

Lapse is a shared streak tracker where two users upload one daily timelapse video each.

## Current Scope

This first setup includes:
- Next.js app scaffold (App Router)
- Supabase email/password login flow
- Initial database schema for daily timelapses and streak tracking

Camera recording and storage upload UI will be added next.

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
