# ResourceGrid

A lightweight, mobile-first **mutual-aid dashboard** for localized crises (wildfires,
storms, outages). Drop color-coded pins on a map for resources you can **offer** or help
you **need** — updates appear live for everyone, no account required.

> Signal, not noise.

## Highlights
- **Zero friction** — anonymous, no login. Scan a QR code, drop a pin.
- **Realtime** — pins appear/update/disappear instantly via Socket.IO.
- **Map-first** — react-leaflet + OpenStreetMap (no API key).
- **PWA** — installable, mobile-first.

## Stack
| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router) PWA, react-leaflet, socket.io-client, Tailwind |
| Backend | NestJS, Socket.IO gateway, Prisma |
| Database | PostgreSQL |
| Monorepo | Turborepo + pnpm; shared types in `packages/shared` |

## Layout
```
apps/web        Next.js PWA
apps/api        NestJS API + realtime gateway
packages/shared Shared TS types + zod schemas + socket event contracts
```

## Getting started
```bash
pnpm install
pnpm db:up                 # start Postgres in Docker
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate            # create the schema
pnpm dev                   # runs web (:3000) + api (:3001)
```

Open http://localhost:3000 in two windows to see realtime updates.

## Scripts
- `pnpm dev` — run web + api in watch mode
- `pnpm db:up` / `pnpm db:down` — Postgres via Docker Compose
- `pnpm db:migrate` — apply Prisma migrations
- `pnpm test` — run all tests
