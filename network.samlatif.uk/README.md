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

- Session cookie: `network_username` (httpOnly, SameSite Lax, Secure in production)
- Login endpoint: `POST /api/auth/login` with `{ "username": "samlatif" }`
- Logout endpoint: `POST /api/auth/logout`
- The navigation bar includes a user selector + Login/Logout controls for local/demo usage.

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
