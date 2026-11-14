# 🎓 Campus RecovR — Lost & Found for the University of Zimbabwe

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

A free, community-run lost & found platform for UZ students. Lost your student ID (again — and a replacement costs $20?), your phone, or your laptop? Report it in seconds, search what others found, claim matches, and leave a testimonial. No PII required — just an email and a username.

**Forked from [alamin147/lost-and-found](https://github.com/alamin147/lost-and-found)** — rebranded and set up for local development with a self-contained PostgreSQL cluster.

---

## ✨ Features

- 🔐 Email + password accounts with usernames (no PII) — JWT auth, bcrypt hashing
- 📝 Report lost items (title, description, category, location, date, **photo upload**)
- 🎒 Register found items you picked up on campus
- 🖼️ Image upload — pick a PNG/JPEG/WebP/GIF straight from your device (replaces the old URL field)
- 🔍 Search + filter both listings (name, location, description; sort options)
- 🤝 Claim system for matching lost ↔ found items, with status tracking
- 💬 **On-platform chat** — 1:1 conversations from any item page ("hey, I need this"), live via polling, with unread badges
- 📱 **WhatsApp handoff** — optionally share your number in Settings; your listings then show a "Chat on WhatsApp" button (Zimbabwe +263 numbers handled automatically)
- 🤖 AI-powered search (Google Gemini) with automatic fallback to keyword search
- 🧭 **AI assistant** — floating helper button with quick links and a skippable guided walkthrough of the main features
- 📊 User dashboard (my items, my claims, messages) + admin dashboard (users, claims, categories, stats)
- ⭐ Testimonials / reviews page
- 📱 Responsive dark UI

---

## 🧑‍💻 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Flowbite React, Redux Toolkit (RTK Query), React Router, React Hook Form, React Icons, React Toastify |
| Backend | Node.js 18+, Express, TypeScript, Multer (uploads), Prisma ORM |
| Database | PostgreSQL (local cluster now → **Supabase later**, see below) |
| Auth | JWT + bcrypt |
| AI | Google Gemini API (optional — keyword-search fallback) |

### 👥 User Roles

- 👤 **User** — register, log in, report lost/found items, claim, chat, manage profile & WhatsApp number
- 👨‍💻 **Admin** — everything above plus user management, claims moderation, categories, and dashboard analytics

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
| `POST /api/upload` | Image upload — multipart field `image`, PNG/JPEG/WebP/GIF, max 5 MB (auth) |
| `GET /api/my/lostItem` · `GET /api/my/foundItem` · `GET /api/my/claims` | Own items/claims (auth) |
| `POST /api/claims` | Claim a found item (auth) |
| `GET /api/item-categories` | Categories |
| `POST /api/chats` · `GET /api/my/chats` | Get-or-create a 1:1 conversation · list mine (auth) |
| `GET /api/chats/:id/messages` · `POST /api/chats/:id/messages` · `PUT /api/chats/:id/read` | Thread (supports `?after=` polling) · send · mark read (auth) |
| `PUT /api/user/phone` | Save/remove your WhatsApp number (auth) |
| `POST /api/ai-search` | AI search (falls back to keywords without a key) |

> 🔑 **Auth:** the API accepts both `Bearer <token>` and a raw token in the `Authorization` header (upstream clients send the Bearer form).

> 📅 **Date format:** item dates must be full ISO-8601 (`2026-11-13T12:00:00.000Z`).

---

## 🗂️ Structure

```
Campus_RecovR/
├── frontend/           # React + Vite app (src/pages, src/dashboard, src/components, src/redux)
├── server/             # Express API (src/app/modules, src/app/chat, src/app/upload, prisma, pg.mjs)
├── uploads/            # uploaded item images, served at /uploads (runtime, gitignored)
└── .pgdata/            # local PostgreSQL cluster (gitignored)
```

---

## 📜 Credits & License

Original project: [alamin147/lost-and-found](https://github.com/alamin147/lost-and-found) (ISC). This fork: Campus RecovR for UZ.
