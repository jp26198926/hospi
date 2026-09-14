<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hospi — Hospital Management System

Open-source modular-monolith HMS. The full product spec (69 sections) is in `Instructions.md` — read it before implementing any feature.

## Stack

- Next.js 16 (App Router, Route Handlers for API, Server Components by default)
- React 19, TypeScript strict, Tailwind CSS v4
- PostgreSQL + Drizzle ORM (not MongoDB, not Prisma)
- Better Auth for authentication
- Cloudinary for file/document storage (never store binaries in PostgreSQL)
- SMTP for email (configured via env vars)

## Commands

```bash
npm run dev    # dev server
npm run build  # production build
npm run lint   # eslint (flat config: next/core-web-vitals + next/typescript)
```

No test suite is set up yet. No CI.

## Project layout

- `app/` is at the repo root (no `src/` wrapper).
- Path alias: `@/*` → project root (not `./src/*`).
- Planned structure: `app/` (pages + API), `db/schema/` (domain-split Drizzle schemas), `lib/` (auth, db, permissions, validation, audit, notifications), `components/` (shared UI), `modules/` (domain services). See `Instructions.md` §50.
- Split Drizzle schemas by domain (`patients.ts`, `encounters.ts`, `billing.ts`, etc.) — never one giant `schema.ts`.

## Architecture rules (from Instructions.md — agents get these wrong)

- **Layered**: UI → Route Handler → Domain Service → Repository → DB. No DB calls from React components. No business logic in `route.ts` files.
- **Modular monolith**: clear domain boundaries, directional dependencies. No microservices, Kafka, or Redis without demonstrated need.
- **Core domain chain**: Patient → Encounter → Consultation → Orders (lab/rad/medication) → Results/Dispensing → Billing. Don't link everything directly to Patient.
- **RBAC**: permissions are `module.action` strings (e.g. `patient.view`, `billing.payment`, `pharmacy.dispense`). Enforce server-side on every protected API — never rely on frontend checks alone.
- **Inventory**: always use stock-movement records (IN/OUT/RETURN/ADJUSTMENT/TRANSFER/EXPIRED). Never just decrement a stock counter. Support FEFO.
- **Clinical records**: soft-delete / correction-based. Finalized lab results and similar records must not be silently modified — use amendment + audit trail.
- **Transactions**: wrap multi-step operations (dispense, admission, bed transfer) in PostgreSQL transactions.
- **Audit logging is mandatory** — user, action, module, entity, entity ID, old/new values, timestamp.
- **Status enums**: centralize as typed constants (`EncounterStatus`, `OrderStatus`, `InvoiceStatus`, etc.). No magic strings.
- **API responses**: always `{ success, data }` or `{ success, error: { code, message } }`. Never leak internal DB errors to clients.
- **Mobile-first UI**: don't shrink desktop layouts. Navigation → drawer, tables → responsive cards/scroll, forms → single-column on mobile.
- **Configurable**: departments, services, billing rules, roles, etc. must not be hard-coded hospital-specific values.

## Development phases

Build incrementally — do not scaffold all modules at once.

1. Foundation: DB, Drizzle, Better Auth, base layout, UI system, RBAC, audit, error handling
2. Core patient flow: Patient → Reception → Encounter → Queue → Triage → Consultation
3. Clinical services: Laboratory, Radiology, Pharmacy
4. Inpatient: Admission, Rooms/Beds, Nurse Station
5. Operations: Inventory, Procurement, Staff
6. Financial: Billing, Payments, Accounting, Insurance
7. Reporting, Notifications, Dashboards

Before writing significant code, produce architecture overview + ERD + module map first (Instructions.md §59, §69).

## Environment

Create `.env.example` with: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLOUDINARY_*`, `SMTP_*`. Never commit `.env`.
