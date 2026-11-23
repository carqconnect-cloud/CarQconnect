# Fioner Control — QR Rakshak Super Admin Panel (Next.js + TypeScript)

This is a Next.js 14 (App Router) + TypeScript port of the original
single-file `index.html` build. It is a **frontend-only demo** — there is
still no backend; all data is generated on first load and persisted to the
browser's `localStorage`, exactly like the original.

## How to run
 
```bash
npm install
npm run dev
```

Then open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

> `node_modules` is not included in this zip — `npm install` will fetch
> everything needed (Next.js, React, TypeScript, and their type
> definitions).

## What changed vs. the original `index.html`

- **Structure**: the single `<style>` block became `app/globals.css`, the
  `<body>` markup became JSX in `app/page.tsx`, and the ~2,000-line
  `<script>` became `lib/adminApp.ts`.
- **Same behavior, same code paths**: `lib/adminApp.ts` is a close port of
  the original script — same hash-based router, same template-string
  rendering, same 15 admin sections (Dashboard, Users, Vehicles, QR Codes,
  GPS Devices, Orders, Inventory, Membership, SOS Console, Support Desk, AI
  Console, CRM Activity, Content & Campaigns, Reports, Roles &
  Permissions, Integrations), same `localStorage` persistence
  (`loadDB()` / `saveDB()` / the `DB` object, unchanged). It's exported as
  `initAdminApp()` and started once from a `useEffect` in `app/page.tsx`.
- **CSV export now actually downloads a file.** The original's "Export
  CSV" buttons used a `window.claude` capability that only exists inside
  Claude.ai's preview. That's been replaced with a normal browser
  download (`Blob` + a temporary `<a download>` link), so exports work in
  any browser, in this Next.js app.
- **TypeScript**: `tsconfig.json` has `strict: false` (see the comment in
  that file for why) because `lib/adminApp.ts` manages the DOM directly —
  the same way the original vanilla JS did — rather than being rewritten
  as idiomatic typed React components. A few call sites use small `$`,
  `$q`, `$$` helper wrappers around `getElementById`/`querySelector`/
  `querySelectorAll` so that pattern type-checks cleanly. Everything else
  (`app/layout.tsx`, `app/page.tsx`) is normally typed. The project
  builds cleanly with `tsc --noEmit` and `next build` with no errors.

## Connecting to a real backend later

The data layer is still isolated in one place inside `lib/adminApp.ts` —
look for `loadDB()`, `saveDB()`, and the `DB` object. That's the spot to
swap `localStorage` reads/writes for real HTTP calls (e.g. via
`fetch`/React Query) when you're ready to wire this up to an API.

## Notes

- Requires an internet connection for the two Google Fonts (Manrope / IBM
  Plex), loaded the same way as the original via `<link>` tags in
  `app/layout.tsx`.
- This was built and verified against Next.js 14.2.35 / React 18 /
  TypeScript 5. `npm audit` will flag some advisories for Next 14 that
  mostly concern server-side hosting features this app doesn't use (Image
  Optimization API, Middleware, Server Actions) — this app has none of
  those (no API routes, no `next/image`, no middleware). Upgrading to
  Next 15/16 later is straightforward if you want to clear those, but is
  a larger jump (React 19) so it wasn't done automatically here.
