# Hospi — Hospital Management System

Open-source modular-monolith Hospital Management System built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, PostgreSQL, Drizzle ORM, and Better Auth.

## Phase Status

| Phase | Status | Scope |
|---|---|---|
| 1. Foundation | ✅ Complete | Auth, RBAC, audit, errors, base layout, UI system |
| 2. Core Patient Flow | ✅ Complete | Patient, Reception, Encounter, Queue, Triage, Consultation, Appointments, Diagnosis |
| 3. Clinical Services | ✅ Complete | Clinical Orders, Laboratory, Radiology, Pharmacy, Inventory, Cloudinary |
| 4. Inpatient | 🔲 Planned | Admission, Rooms/Beds, Nurse Station |
| 5. Operations | 🔲 Planned | Inventory, Procurement, Staff |
| 6. Financial | 🔲 Planned | Billing, Payments, Accounting, Insurance |
| 7. Reporting | 🔲 Planned | Reports, Notifications, Dashboards |

## Phase 3 Features

- **Clinical Orders** — Generalized order architecture (laboratory/radiology/medication), sequential order numbers, status lifecycle (draft→ordered→acknowledged→in_progress→completed)
- **Laboratory** — Test catalog with categories/panels/reference ranges, specimen collection with accession numbers, result entry with auto abnormal-flag, validate/release workflow, amendment pattern for finalized results
- **Radiology** — Imaging modalities and procedures catalog, study scheduling/technician workflow, radiologist report editor with draft/finalize lifecycle
- **Pharmacy** — Medication catalog, prescription management, FEFO dispensing (earliest expiring batch first), walk-in sales
- **Inventory** — Full stock management: batches with expiration, stock movements (IN/OUT/RETURN/ADJUSTMENT/TRANSFER/EXPIRED), suppliers, reorder alerts, expiry tracking
- **Documents** — Cloudinary integration for lab/rad attachments (images, PDFs)
- **Orders UI** — Type-aware order creation form, order list with filters
- **Queue extension** — Laboratory, radiology, pharmacy queue types
- **Appointments** — Booking, double-booking prevention, check-in (creates encounter+queue atomically), cancel, no-show
- **Queue Engine** — Reusable single-table queue with module discriminator (reception/triage/consultation), sequential numbering, priority levels
- **Triage** — Append-only vitals (temperature, BP, HR, RR, SpO2, weight, height, pain), triage categories, chief complaint
- **Consultation** — Structured clinical note (complaint, history, exam, assessment, plan), draft/finalize lifecycle, immutable when finalized
- **Diagnosis** — ICD-10 code master, primary/secondary, pluggable coding system
- **Reception** — Fast walk-in flow (patient search → encounter + queue in one transaction)
- **Master Data** — Departments, services, staff profiles, diagnosis codes

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

# 4. Seed initial data (roles, permissions, users, departments, patients)
npm run db:seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page.

### Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@hospi.local | Admin123! |
| Doctor | doctor@hospi.local | Doctor123! |
| Nurse | nurse@hospi.local | Nurse123! |
| Receptionist | receptionist@hospi.local | Reception123! |
| Lab Technician | labtech@hospi.local | LabTech123! |
| Radiologist | radiologist@hospi.local | Radio123! |
| Pharmacist | pharmacist@hospi.local | Pharma123! |

> **Warning:** Change these passwords in production.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret key (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | Base URL (e.g. `http://localhost:3000`) |
| `CLOUDINARY_*` | No* | Cloudinary config (required for document uploads) |
| `SMTP_*` | No | Email config (Phase 7+) |

> *Cloudinary vars are optional but required for file upload features to work.

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
│   ├── (dashboard)/        # Dashboard pages (patients, orders, lab, rad, pharmacy...)
│   └── api/                # API route handlers (70+ endpoints)
├── components/
│   ├── ui/                 # Reusable UI primitives (18 components)
│   ├── orders/             # Order form, order list
│   ├── laboratory/         # Lab workspace, result entry, catalog
│   ├── radiology/          # Rad workspace, report form, catalog
│   ├── pharmacy/           # Dispense, walk-in, catalog
│   ├── inventory/          # Medication table, batch receive
│   ├── documents/          # Document upload
│   └── ... (patients, queue, triage, consultation, appointments)
├── db/
│   ├── schema/             # Drizzle schemas (17 domain files)
│   └── seed.ts             # Seed script
├── lib/
│   ├── cloudinary/         # Cloudinary config + upload
│   ├── types/              # Status enums
│   └── ... (auth, db, errors, permissions, audit, validation)
├── modules/                # Domain services (14 modules)
│   ├── orders/             # Clinical order management
│   ├── laboratory/         # Lab catalog + workflow
│   ├── radiology/          # Rad catalog + workflow
│   ├── pharmacy/           # Pharmacy + inventory + dispensing
│   ├── documents/          # Document upload
│   └── ... (patients, encounters, queue, triage, consultation, etc.)
└── proxy.ts                # Next.js 16 proxy (auth redirects)
```

## Architecture

- **Layered**: UI → Route Handler → Domain Service → Database
- **RBAC**: Permissions are `module.action` strings (e.g. `patient.view`, `queue.call`)
- **Audit**: All mutations logged via `logAudit()` with user, action, entity, old/new values
- **Errors**: `AppError` hierarchy → `handleApiError()` → consistent JSON envelope
- **Schemas**: Split by domain in `db/schema/` — never one giant file
- **Services**: Business logic in `modules/`, routes are thin wrappers
- **Transactions**: Multi-step operations (walk-in, check-in) use `db.transaction`
- **Clinical immutability**: Triage is append-only, finalized consultations are read-only

## License

TBD
