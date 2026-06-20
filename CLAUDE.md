# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ResourceGrid is a mobile-first, **anonymous** mutual-aid map for localized crises. Users
drop color-coded pins to **offer** resources or request **help**; pins update live for
everyone via Socket.IO. No accounts — see the ownership model below.

## Commands

Run from the repo root unless noted. Package manager is **pnpm** (workspaces + Turborepo).

```bash
pnpm install                 # install all workspaces
pnpm db:up                   # start Postgres (Docker) — host port 5433, NOT 5432
pnpm db:migrate              # apply Prisma migrations (apps/api)
pnpm db:generate             # regenerate Prisma client after schema edits
pnpm dev                     # turbo: web (:3000) + api (:3001) in watch mode
pnpm build | pnpm lint | pnpm test   # turbo across all workspaces
```

Per-app (use `pnpm --filter @resourcegrid/api ...` or `cd apps/api`):

```bash
# API (NestJS, Jest)
pnpm --filter @resourcegrid/api test                 # all API unit tests (*.spec.ts)
cd apps/api && pnpm exec jest pins.service           # one test file
cd apps/api && pnpm exec jest -t "claims an open offer"   # one test by name

# Web (Next.js, Vitest)
pnpm --filter @resourcegrid/web test                 # all web tests
cd apps/web && pnpm exec vitest run src/lib/store.test.ts   # one test file
cd apps/web && pnpm exec tsc --noEmit                # typecheck only (fast feedback)
```

After `pnpm install` you must run `pnpm db:generate` (or `db:migrate`) — the Prisma client
is a built dependency listed in `pnpm-workspace.yaml` under `onlyBuiltDependencies`.

## Architecture

Monorepo: `apps/web` (Next.js App Router PWA) + `apps/api` (NestJS) + `packages/shared`.

### `packages/shared` is the contract — change it first
It is the **single source of truth** for types, zod schemas, and socket event names, imported
by BOTH apps. Its `package.json` `main` points at `src/index.ts` (raw TS, no build step);
the web app consumes it via `transpilePackages` in `next.config.mjs`, and the API via Jest's
`moduleNameMapper`. Key exports: `createPinSchema` / `updatePinSchema` / `pinDetailsSchema`
(form-only, omits lat/lng) / `bboxSchema`; `Pin` (public) vs `OwnedPin` (adds `ownerToken`);
`SocketEvents`; `OWNER_TOKEN_HEADER`. Add new fields/validation here, not in the apps.

### Anonymous ownership model (central to the whole app)
On create, the API mints a random `ownerToken`, persists it, and returns it **once** inside
`OwnedPin`. The web client stores it in `localStorage` keyed by pin id (`apps/web/src/lib/ownership.ts`).
- `ownerToken` is **stripped from every list response and every socket broadcast** — only the
  creator ever holds it (`pins.mapper.ts` `toPublicPin` vs `toOwnedPin`).
- Mutations (PATCH / resolve / DELETE) require the token via the `x-owner-token` header and a
  constant-time compare in `PinsService.assertOwner`.
- **Claim is intentionally token-free** (anyone can take an offer).

### Data flow / realtime
REST seeds and mutates; Socket.IO only carries deltas. `PinsService` performs the DB write,
then calls `PinsGateway.emit*` to broadcast `pin:created|updated|resolved|deleted`. On the web,
`apps/web/src/lib/socket.ts` is a singleton that wires those events into the Zustand store
(`apps/web/src/lib/store.ts`); the map re-renders from the store. A `@nestjs/schedule` cron
(`PinsService.sweepExpired`, every 5 min) deletes expired pins and broadcasts their removal.

Pin lifecycle: `OPEN → CLAIMED` (offers only) / `→ RESOLVED`, plus TTL auto-expiry
(`PIN_TTL_HOURS`, default 24). **Resolved pins are dropped from the active map** — the store's
`upsert` deletes any pin whose status becomes `RESOLVED`, and the API excludes resolved/expired
pins from `GET /pins`.

### Pin creation is a two-step flow
`AppShell` drives it: tap Need/Offer → `CreateSheet` collects details (validated with
`pinDetailsSchema`) → on submit, enter **placement mode** (`placing`) where tapping/dragging the
map sets the location → confirm calls `createPin`. Location is chosen on the map, not auto-placed.

## Gotchas specific to this repo

- **Zustand selectors must return stable references.** Subscribe to the `pins` record and derive
  arrays with `useMemo` (see `AppShell`); a selector returning `Object.values(...)` makes
  `useSyncExternalStore` loop forever → React error #185.
- **Leaflet is client-only.** The map is imported via `next/dynamic` with `ssr: false`
  (`apps/web/src/components/Map.tsx`); never import `react-leaflet`/`leaflet` in server code.
- **PWA service worker (`apps/web/public/sw.js`) caches the app shell** and only registers in
  production (`next start`), not `next dev`. After CSS/JS changes, a stale SW can serve old assets
  — hard-refresh or clear site data. It deliberately bypasses `/api`.
- **Postgres runs on host port 5433** (5432 was taken in the dev environment). `DATABASE_URL`
  in `apps/api/.env` and the `docker-compose.yml` mapping reflect this.
- **Styling palette is centralized** in `apps/web/tailwind.config.ts` tokens (`brand`/`offer`/
  `need`/`claimed`); map markers in `globals.css` (`.rg-marker--*`) reuse the same colors. Keep
  marker `iconSize`/`iconAnchor` in `MapView.tsx` in sync with the `.rg-marker` CSS size.
- API uses a global `api` prefix (`/api/...`) and CORS/socket origins from `WEB_ORIGIN`.
