# Hospi — Hospital Management System

Open-source modular-monolith Hospital Management System built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, PostgreSQL, Drizzle ORM, and Better Auth.

## Phase 1 Status: Complete

Phase 1 Foundation is fully implemented. This phase establishes the infrastructure that all future modules build upon.

### What Phase 1 Delivers

- **Authentication** — Better Auth with email/password, session management, secure cookie-based sessions
- **RBAC** — Database-backed roles and permissions system (`module.action` format), server-side enforcement
- **Audit Logging** — Immutable audit trail recording user actions, entity changes, IP, and user agent
- **Error Handling** — Centralized AppError hierarchy with consistent API response envelope (`{success, data}` / `{success, error}`)
- **Database** — PostgreSQL with Drizzle ORM, domain-split schemas (auth, permissions, audit)
- **Base Layout** — Auth layout (login) and Dashboard layout (sidebar + header + content shell)
- **UI Components** — 12 reusable components: Button, Input, Label, Card, Badge, Alert, Skeleton, Spinner, EmptyState, FormField, Dialog, Sidebar
- **Proxy** — Next.js 16 proxy.ts for auth redirects (cookie presence check, no DB calls)
- **Seed Data** — 9 hospital roles, Phase 1 permissions, admin user

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 20.9+
- PostgreSQL running locally (or a connection string)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string and auth secret

# 3. Push database schema
npm run db:push

# 4. Seed initial data (roles, permissions, admin user)
npm run db:seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page.

### Default Admin Credentials

```
Email:    admin@hospi.local
Password: Admin123!
```

> **Warning:** Change this password in production.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret key (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | Base URL (e.g. `http://localhost:3000`) |
| `CLOUDINARY_*` | No | Cloudinary config (Phase 2+) |
| `SMTP_*` | No | Email config (Phase 2+) |

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly to database
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed database with initial data
```

## Project Structure

```
hospi/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group (login)
│   ├── (dashboard)/        # Dashboard route group
│   └── api/                # API route handlers
├── components/ui/          # Reusable UI components
├── db/
│   ├── schema/             # Drizzle schemas (domain-split)
│   └── seed.ts             # Seed script
├── lib/
│   ├── api/                # Route handler utilities
│   ├── audit/              # Audit logging
│   ├── auth/               # Better Auth config
│   ├── db/                 # Drizzle client
│   ├── errors/             # Error classes + API responses
│   ├── permissions/        # RBAC constants + checks
│   └── validation/         # Zod schemas
├── proxy.ts                # Next.js 16 proxy (auth redirects)
└── types/                  # Shared TypeScript types
```

## Architecture

- **Layered**: UI → Route Handler → Domain Service → Database
- **RBAC**: Permissions are `module.action` strings (e.g. `user.view`, `billing.payment`)
- **Audit**: All sensitive operations logged via `logAudit()`
- **Errors**: `AppError` hierarchy → `handleApiError()` → consistent JSON envelope
- **Schemas**: Split by domain in `db/schema/` — never one giant file

## Development Phases

| Phase | Status | Scope |
|---|---|---|
| 1. Foundation | ✅ Complete | Auth, RBAC, audit, errors, base layout, UI system |
| 2. Core Patient Flow | 🔲 Planned | Patient, Reception, Encounter, Queue, Triage, Consultation |
| 3. Clinical Services | 🔲 Planned | Laboratory, Radiology, Pharmacy |
| 4. Inpatient | 🔲 Planned | Admission, Rooms/Beds, Nurse Station |
| 5. Operations | 🔲 Planned | Inventory, Procurement, Staff |
| 6. Financial | 🔲 Planned | Billing, Payments, Accounting, Insurance |
| 7. Reporting | 🔲 Planned | Reports, Notifications, Dashboards |

## License

TBD
