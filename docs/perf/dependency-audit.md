# Dependency audit (web app)

Generated with AI assistance, then checked against `npm run build` output. Raw logs: [build-before.txt](build-before.txt), [build-after.txt](build-after.txt).

## Runtime dependencies

| Package | Used for | Verdict |
|---|---|---|
| `@supabase/supabase-js` | Auth, habits/logs queries, avatar storage | **Keep.** This is most of the entry chunk. The auth screen needs it too, so it can't sit behind the lazy split. |
| `react`, `react-dom` | UI | Keep. |
| `react-router-dom` | Three routes: `/login`, `/`, and a catch-all redirect | **Dropped.** Every route decision already depended on whether a session exists, so the router only mirrored `session` into the URL. `App.tsx` now picks the screen from `session` and keeps the URL in sync with `history.replaceState`. |
| `workbox-window` | Service worker registration via `virtual:pwa-register/react` | Keep. It's already its own 5.65 kB chunk and the update toast needs it. |

Dev dependencies don't ship to the browser, so they aren't part of this audit.

## Build output (`npm run build`)

| Chunk | Before | After |
|---|---|---|
| `index-*.js` (entry) | 489.77 kB · gzip 141.85 kB | **440.84 kB · gzip 125.74 kB** |
| `Tracker-*.js` (lazy) | (not a separate chunk) | 10.36 kB · gzip 3.63 kB |
| `workbox-window.prod.es5-*.js` | 5.65 kB · gzip 2.20 kB | 5.65 kB · gzip 2.20 kB |
| `index-*.css` | 8.58 kB · gzip 2.63 kB | 8.58 kB · gzip 2.63 kB |

The signed-out first load shrank by 48.93 kB minified (16.11 kB gzip). About 10 kB of that is the Tracker code, which now loads only after sign-in. The rest is `react-router-dom` leaving the bundle.

## Lazy-split decision

Only `Tracker` is lazy. It is the heaviest route by app code: CRUD handlers, the avatar uploader with drag-and-drop, the offline queue and sync, and the share fallback. None of that is needed before sign-in. `AuthPage` stays in the entry chunk because it is the first thing a signed-out visitor sees, and splitting it would only add a round-trip.

## Images

The only `<img>` is the profile avatar. It has `width`/`height` (58 × 58, matching `.avatar-frame`) so it can't cause layout shift, plus `loading="lazy"` and `decoding="async"`. On phones the stats block stacks, which puts it below the fold.
