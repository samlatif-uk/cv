# Craftfolio (network.samlatif.uk)

Craftfolio is a professional network product (LinkedIn-style) built with Next.js, Prisma, and SQLite.

## Features

- Feed with post creation
- People discovery with connection requests
- Direct messages with conversation history
- Profile editing (overview, tech rows, education)
- Cookie-based auth (login/logout) with server-side authorization checks

## Tech Stack

- Next.js App Router + TypeScript
- Prisma ORM
- SQLite (local MVP database)
- Tailwind CSS

## Local Development

```bash
npm install
npm run db:reset
npm run dev
```

Open http://localhost:3000

## Authentication (MVP)

- OAuth providers: Google and LinkedIn via `next-auth`
- Session strategy: JWT session cookie managed by `next-auth`
- Local `User` records are created/updated on successful OAuth sign-in
- Dedicated auth flow at `/auth` with explicit `Log in` and `Sign up` modes

### Required Environment Variables

```bash
NEXTAUTH_SECRET=your-long-random-secret

AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

AUTH_LINKEDIN_ID=...
AUTH_LINKEDIN_SECRET=...
```

If one provider is missing, only the configured provider button is shown.

## Database Commands

- `npm run db:migrate` — apply/create migration in dev
- `npm run db:seed` — seed demo data
- `npm run db:reset` — reset + migrate + seed

## API Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Feed / Posts

- `GET /api/feed`
- `POST /api/posts` (auth required)

### Profiles

- `GET /api/profiles`
- `GET /api/profiles/[username]`
- `PATCH /api/profiles/[username]` (owner only)
- `PATCH /api/profiles/[username]/overview-stats` (owner only)
- `PATCH /api/profiles/[username]/tech-rows` (owner only)
- `PATCH /api/profiles/[username]/education` (owner only)

### Network / Messaging

- `GET|POST|PATCH /api/connections` (auth required)
- `GET|POST /api/messages` (auth required)
- `GET /api/cv/[username]`

## Deployment Notes

- Production runtime uses `systemd` service `network-samlatif-uk` with Next.js on port `3100`.
- Nginx reverse proxy serves `https://network.samlatif.uk` and forwards to `127.0.0.1:3100`.
- Because the VPS is resource-constrained, deployments are done by building locally and syncing `.next` artifacts to the server.
