# Craftfolio (network.samlatif.uk)

Craftfolio is a professional network product (LinkedIn-style) built with Next.js, Prisma, and SQLite.

## Features

- Feed with post creation
- People discovery with connection requests
- Direct messages with conversation history
- JSON API routes for feed, profiles, posts, connections, and messages

## Tech Stack

- Next.js App Router + TypeScript
- Prisma ORM
- SQLite (local MVP database)
- Tailwind CSS

## Setup

```bash
npm install
npm run db:reset
npm run dev
```

Open http://localhost:3000

## Database Commands

- `npm run db:migrate` — apply migrations
- `npm run db:seed` — seed demo data
- `npm run db:reset` — reset + migrate + seed

## API Endpoints

- `GET /api/feed`
- `GET /api/profiles`
- `GET /api/profiles/[username]`
- `POST /api/posts`
- `GET|POST|PATCH /api/connections`
- `GET|POST /api/messages`
