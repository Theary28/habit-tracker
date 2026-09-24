# Daymark Habit Tracker

A small React and Supabase habit tracker with email auth, protected routing, owner-scoped CRUD, daily completion logs, and profile avatars.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and add the project URL and publishable anon key.
3. Run all of `supabase/schema.sql` in the Supabase SQL editor. It creates the tables, the public `avatars` bucket, owner policies, storage policies, and seeds sample rows for the first registered account.
4. Run `npm run dev` and open the local URL.

The browser only receives the Supabase publishable anon key. Never put a service-role key in `.env` for this app or commit `.env`.

## Audit checklist

- `git status --short` must not list `.env`; `git check-ignore --no-index .env` should print `.env`.
- Create a second account and confirm it sees an empty state, not another account's habits.
- Add a habit, refresh, toggle today's completion, edit it, and delete it.
- Delete a habit and confirm its `daily_logs` rows are removed by the foreign key cascade.
- Upload a valid image, confirm the preview appears, then reload and confirm the saved avatar appears.
- Confirm a non-image or image over 1 MB shows an inline error and is not uploaded.

If RLS were disabled after deployment, any client holding the anon key could read, insert, change, or delete rows belonging to other users by calling the exposed tables directly.