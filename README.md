# 🎓 Campus RecovR — Lost & Found for the University of Zimbabwe

A free, community-run lost & found platform for UZ students. Lost your student ID (again — and a replacement costs $20?), your phone, or your laptop? Report it in seconds, search what others found, claim matches, and leave a testimonial. No PII required — just an email and a username.

**Forked from [alamin147/lost-and-found](https://github.com/alamin147/lost-and-found)** — rebranded and set up for local development with a self-contained PostgreSQL cluster.

---

## ✨ Features

- 🔐 Email + password accounts with usernames (no PII) — JWT auth, bcrypt hashing
- 📝 Report lost items (title, description, category, location, date, image)
- 🎒 Register found items you picked up on campus
- 🔍 Search + filter both listings (name, location, description; sort options)
- 🤝 Claim system for matching lost ↔ found items, with status tracking
- 🤖 AI-powered search (Google Gemini) with automatic fallback to keyword search
- 📊 User dashboard (my items, my claims) + admin dashboard (users, claims, categories, stats)
- ⭐ Testimonials / reviews page
- 📱 Responsive dark UI

---

## 🧑‍💻 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Flowbite React, Redux Toolkit, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (local cluster now → **Supabase later**, see below) |
| Auth | JWT + bcrypt |

---

## 🚀 Local Setup (this machine)

### 1. Database — self-contained local PostgreSQL cluster

The DB is **not** the system Postgres service and **not** Docker — it's a project-local cluster in `.pgdata/` built from the PostgreSQL 18 binaries already installed, on **port 5435** (the system service on 5432, Black Heron on 5433 and Loopback on 5434 are untouched).

> ⚠️ **Why the cluster must start via `server/pg.mjs`**: the postmaster is launched with a **minimal environment** on purpose. When Postgres is started from an agent/Hermes shell, its large env block is inherited by postgres child processes, which crash with `0xC0000142` (STATUS_DLL_INIT_FAILED) on Windows. `pg.mjs` sanitizes the env and redirects start output to a file.

```bash
cd server
node pg.mjs start    # start the cluster (also: stop | status)
```

`server/.env` (already configured, gitignored):

```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres@localhost:5435/campus_recover?schema=public"
JWT_SECRETS=<secret>
JWT_EXPIRES_IN=7d
BCRYPT_SALTROUNDS=12
CLIENT_URL=http://localhost:5173
```

### 2. Backend

```bash
cd server
npm install          # runs prisma generate via postinstall
npx prisma db push   # create tables (migrations are gitignored in the upstream repo)
npm run seed         # admin/demo users, categories, sample items
npm start            # API on http://localhost:5001
```

### 3. Frontend

```bash
cd frontend
npm install          # frontend/.env already sets VITE_SERVER_URL=http://localhost:5001
npm run dev          # app on http://localhost:5173
```

### 👤 Seeded accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `demo` | `demo1234` |

**Quick reboot routine:** `cd server && node pg.mjs start`, then `npm start` in `server/` and `npm run dev` in `frontend/`.

---

## ☁️ Supabase later

Prisma makes the swap a one-liner: change `DATABASE_URL` in `server/.env` to the Supabase connection string (`postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres`), run `npx prisma db push` against it, done — no code changes. (For Supabase poolers use port `6543` + `?pgbouncer=true`.)

---

## 🗺️ API quick reference

| Route | Purpose |
|-------|---------|
| `POST /api/register` / `POST /api/login` | Accounts (login body: `{ username, password }` — username field accepts email too) |
| `GET /api/found-items` · `GET /api/lostItem` | Public listings with filtering |
| `POST /api/lostItem` · `POST /api/found-items` | Report items (auth) |
| `GET /api/my/lostItem` · `GET /api/my/foundItem` · `GET /api/my/claims` | Own items/claims (auth) |
| `POST /api/claims` | Claim a found item (auth) |
| `GET /api/item-categories` | Categories |
| `POST /api/ai-search` | AI search (falls back to keywords without a key) |

> 🔑 **Auth quirk (upstream behavior):** the API expects the raw JWT in the `Authorization` header — **no `Bearer` prefix**.

> 📅 **Date format:** item dates must be full ISO-8601 (`2026-11-13T12:00:00.000Z`).

---

## 🗂️ Structure

```
Campus_RecovR/
├── frontend/           # React + Vite app (src/pages, src/dashboard, src/components, src/redux)
├── server/             # Express API (src/app/modules, prisma/schema.prisma, pg.mjs)
└── .pgdata/            # local PostgreSQL cluster (gitignored)
```

---

## 📜 Credits & License

Original project: [alamin147/lost-and-found](https://github.com/alamin147/lost-and-found) (ISC). This fork: Campus RecovR for UZ.
