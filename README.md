# Daymark Habit Tracker

A small React and Supabase habit tracker with email auth, protected routing, owner-scoped CRUD, daily completion logs, and profile avatars.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and add the project URL and publishable anon key.
3. Run all of `supabase/schema.sql` in the Supabase SQL editor. It creates the tables, the public `avatars` bucket, owner policies, storage policies, and seeds sample rows for the first registered account.
4. Run `npm run dev` and open the local URL.

The browser only receives the Supabase publishable anon key. Never put a service-role key in `.env` for this app or commit `.env`.

## PWA verification

Run `npm run generate:icons && npm run build && npm run preview` and open the HTTPS preview URL printed by Vite. Icons are generated at 48 to 512 px, with maskable 192/512 and a 180 px `apple-touch-icon`. The app uses `vite-plugin-pwa` with `registerType: "prompt"`; the update prompt is rendered by `useRegisterSW` in `UpdateToast`.

### Caching rules

| Asset | Strategy | Why it earns it |
|---|---|---|
| App shell (HTML, JS, CSS, icons, manifest) | Precache | These files are versioned by hash at build time, so caching them on install is always correct, and the app can open with zero network. |
| Images (avatars, icons) | CacheFirst, 40 entries / 30 days | Images are large and rarely change, so showing the cached copy instantly beats paying a network round-trip for bytes we already have. |
| Supabase API | NetworkFirst, 3 s timeout, 5 min expiry | Habit data changes on other devices, so we always try for fresh data first and only fall back to the recent cached response when the network is slow or gone. |

Offline writes are not a cache rule: a habit added while offline is stored per user in localStorage. It shows in the list with a "Queued" badge (its edit, delete and complete actions stay disabled until it has a server id), and it is inserted into Supabase on the next `online` event.

### Offline test

1. `npm run build && npm run preview` (never the dev server, which has no service worker).
2. Open the HTTPS URL, sign in, then in DevTools go to Application → Service workers and confirm it is activated.
3. Network → Offline, then reload. The app shell loads and the red offline banner appears.
4. Add a habit. It shows as queued. Switch back online, and it syncs and the badge disappears.
5. Update test: change any text, run `npm run build` again, and reload the preview twice. The "New version available" toast appears.

### Lighthouse (production preview, mobile preset)

Before: commit `e60f746`, the build before the PWA work. After: this branch. Both runs were taken on the signed-out landing page, because Lighthouse cannot sign in. Performance is the median of 3 runs. Full reports are in `docs/lighthouse/`.

| Category | Before | After |
|---|---|---|
| Performance | 97 | 98 |
| Accessibility | 94 | 100 |
| Best Practices | 100 | 100 |
| SEO | 82 | 100 |

What changed the scores: text contrast fixes (Accessibility), plus a meta description and a real `robots.txt` (SEO). Before the fix, `/robots.txt` fell through to `index.html`.

## Audit checklist

- `git status --short` must not list `.env`; `git check-ignore --no-index .env` should print `.env`.
- Create a second account and confirm it sees an empty state, not another account's habits.
- Add a habit, refresh, toggle today's completion, edit it, and delete it.
- Delete a habit and confirm its `daily_logs` rows are removed by the foreign key cascade.
- Upload a valid image, confirm the preview appears, then reload and confirm the saved avatar appears.
- Confirm a non-image or image over 1 MB shows an inline error and is not uploaded.

If RLS were disabled after deployment, any client holding the anon key could read, insert, change, or delete rows belonging to other users by calling the exposed tables directly.