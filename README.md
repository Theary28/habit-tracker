# Daymark Habit Tracker

A small React and Supabase habit tracker with email auth, session-gated screens, owner-scoped CRUD, daily completion logs, and profile avatars.

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

## Performance pass

`Tracker` is loaded with `React.lazy` + `Suspense`, so signed-out visitors only download the sign-in screen. `react-router-dom` was removed: the session alone picks the screen, and the URL is kept in sync with `history.replaceState`. The avatar `<img>` has explicit `width`/`height` plus `loading="lazy"`.

| Chunk | Before | After |
|---|---|---|
| Entry JS | 489.77 kB (gzip 141.85) | 440.84 kB (gzip 125.74) |
| `Tracker` (lazy) | not split | 10.36 kB (gzip 3.63) |

Full logs and the dependency audit are in `docs/perf/`.

## Deploy to Vercel

1. Import the GitHub repo in Vercel. `vercel.json` sets the Vite build, the SPA rewrite (so refreshing `/login` works), and a no-cache header on `sw.js`. `.vercelignore` leaves `mobile/` out of the upload.
2. Under Project → Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production and Preview.
3. Redeploy once. Vite inlines env vars at build time, so a deploy that ran before they were set has none.
4. In Supabase → Authentication → URL Configuration, add the Vercel URL to Site URL / Redirect URLs.
5. On the live URL: sign in, add a habit, hard-refresh, and confirm the habit is still there.

## Mobile app (`mobile/`)

An Expo (SDK 57) port of the habit list, using Expo Router: `src/app/index.tsx` is the list (a `FlatList`), and `src/app/add.tsx` is the Add screen (a modal). NativeWind reuses the web color tokens as Tailwind classes. It connects to the same Supabase project and tables.

```sh
cd mobile
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start         # scan the QR code with Expo Go, or press a / i for an emulator
```

The only platform branch is `src/lib/share.ts`. `Platform.select` picks `navigator.share` (falling back to the clipboard) on web and `Share.share` on iOS/Android. Its only call site is the Share button in `src/app/index.tsx`.

## Audit checklist

- `git status --short` must not list `.env`; `git check-ignore --no-index .env` should print `.env`.
- Create a second account and confirm it sees an empty state, not another account's habits.
- Add a habit, refresh, toggle today's completion, edit it, and delete it.
- Delete a habit and confirm its `daily_logs` rows are removed by the foreign key cascade.
- Upload a valid image, confirm the preview appears, then reload and confirm the saved avatar appears.
- Confirm a non-image or image over 1 MB shows an inline error and is not uploaded.

If RLS were disabled after deployment, any client holding the anon key could read, insert, change, or delete rows belonging to other users by calling the exposed tables directly.

### Deploy and mobile checks

- The live Vercel URL loads signed-in data, and a new habit survives a refresh.
- `git ls-files | grep -E "(^|/)\.env$"` prints nothing. Only the `.env.example` files are tracked.
- `cd mobile && npx expo start` runs on a phone (Expo Go) or an emulator.
- `grep -rn "navigator\|window\.\|document\." mobile/src` only matches inside the `web:` branch of `src/lib/share.ts`.
