# PROJECT: Open-Source Modular Hospital Management System

You are a senior software architect and full-stack engineer.

Build a production-grade, open-source Hospital Management System (HMS) designed to be scalable, modular, maintainable, secure, mobile-responsive, and suitable for real-world hospital operations.

The system must be designed as a **modular monolith** initially, while keeping clear domain boundaries so individual modules can later be extracted into services if the system grows.

Do NOT create a collection of disconnected CRUD pages.

The system must have a coherent domain model where all hospital departments share the appropriate patient, encounter, order, result, inventory, billing, insurance, and audit information.

---

# 0. APP NAME

- Hospi

---

# 1. PRIMARY OBJECTIVES

The application must be:

- Mobile responsive
- Desktop friendly
- Modular
- Scalable
- Fast
- Smooth and modern
- Accessible
- Maintainable
- Secure
- Reusable
- Open-source friendly
- Easy for other developers to understand
- Designed for real hospital workflows
- API-first internally
- Strongly typed
- Database-driven
- Transaction-safe
- Auditable

The UI should feel like a modern professional healthcare application rather than a collection of old-fashioned hospital forms.

Avoid unnecessary visual complexity.

Prioritize:

1. Clarity
2. Speed
3. Usability
4. Consistency
5. Accessibility
6. Maintainability

---

# 2. REQUIRED TECHNOLOGY STACK

Use the latest stable versions supported by the official documentation at the time development begins.

Before implementing anything:

1. Check the official documentation for every major technology.
2. Do not rely on outdated tutorials.
3. Prefer official documentation over blogs.
4. If the latest version introduces breaking changes, follow the latest official recommended approach.

Required stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Better Auth
- PostgreSQL
- Drizzle ORM
- Cloudinary
- SMTP configured through environment variables

Use Next.js as BOTH:

- frontend
- backend/API

Do NOT create a separate Express server.

Use the Next.js App Router.

Use Route Handlers for API endpoints where appropriate.

Use Server Components by default.

Use Client Components only when interactivity requires them.

---

# 3. DATABASE

Use:

PostgreSQL

ORM:

Drizzle ORM

Database design must prioritize:

- normalization
- foreign keys
- indexes
- unique constraints
- check constraints where appropriate
- transactions
- referential integrity
- soft deletion where appropriate
- auditability
- scalability

Do NOT use MongoDB.

Do NOT create duplicate patient records unnecessarily.

Do NOT store relational information as JSON when a proper relational table is more appropriate.

Use JSON/JSONB only when it genuinely provides value, such as configurable metadata or structured extensibility.

---

# 4. CORE ARCHITECTURAL PRINCIPLE

The most important entity in the system is the PATIENT.

However, do NOT connect every table directly to patients if the relationship should logically go through an encounter, order, admission, prescription, etc.

Use proper domain relationships.

Example:

Patient
↓
Encounter
↓
Consultation
↓
Clinical Orders
├── Laboratory Order
├── Radiology Order
└── Medication Order

Laboratory Order
↓
Specimen
↓
Lab Result

Radiology Order
↓
Radiology Study
↓
Radiology Report

Medication Order
↓
Prescription
↓
Pharmacy Dispensing

All of these may eventually generate:

Billing Items
Insurance Claims
Audit Events

---

# 5. RECOMMENDED MODULE STRUCTURE

Create the following major modules.

## A. AUTHENTICATION

Use Better Auth.

Support:

- login
- logout
- session management
- password authentication
- email verification
- password reset
- optional two-factor authentication
- user profile
- session expiration
- account security

Design authentication separately from authorization.

---

# 6. AUTHORIZATION / RBAC

Create a reusable permission system.

Do NOT hard-code permissions directly into individual pages.

Use:

Roles
Permissions
Role-Permission relationships
User-Role relationships

Permissions should follow:

MODULE + ACTION

Examples:

reception.view
reception.create
reception.update
reception.delete

patient.view
patient.create
patient.update

laboratory.view
laboratory.create
laboratory.process
laboratory.result

radiology.view
radiology.order
radiology.report

pharmacy.view
pharmacy.dispense
pharmacy.inventory

billing.view
billing.create
billing.payment
billing.refund

insurance.view
insurance.claim
insurance.approve

Also support:

- own records
- department restrictions
- facility restrictions
- administrative privileges

Do not implement authorization only on the frontend.

Every protected API operation must verify authorization server-side.

---

# 7. PATIENT MANAGEMENT / MASTER PATIENT INDEX

Create a central Patient module.

Patient should contain information such as:

- patient ID
- hospital number / MRN
- first name
- middle name
- last name
- suffix
- date of birth
- sex
- contact information
- address
- emergency contact
- identification information
- blood type where applicable
- allergies
- medical alerts
- patient status
- profile photo
- created date
- updated date

Do NOT put every medical record directly into the patient table.

Patient is the master identity.

Medical information belongs to appropriate clinical entities.

Prevent accidental duplicate patients.

Support:

- patient search
- MRN search
- name search
- date of birth
- phone
- duplicate detection
- patient merge workflow

---

# 8. ENCOUNTER MANAGEMENT

Create an Encounter system.

An encounter represents a patient's interaction with the hospital.

Types may include:

- outpatient
- emergency
- inpatient
- follow-up
- laboratory-only
- radiology-only
- pharmacy walk-in
- consultation

Every relevant clinical workflow should be associated with an encounter.

Example:

Patient
→ Encounter
→ Triage
→ Consultation
→ Orders
→ Results
→ Billing

---

# 9. RECEPTION

Reception module:

- patient registration
- patient search
- patient verification
- appointment registration
- walk-in registration
- encounter creation
- queue creation
- insurance verification
- billing initiation
- patient information update
- referral registration

Provide a fast workflow.

Reception staff should be able to register a returning patient quickly.

---

# 10. APPOINTMENT & SCHEDULING

Create appointment management.

Support:

- doctors
- departments
- rooms
- schedules
- availability
- appointment status
- cancellation
- rescheduling
- no-show
- check-in

Appointment statuses:

scheduled
confirmed
checked_in
in_progress
completed
cancelled
no_show

Avoid double booking.

---

# 11. QUEUE MANAGEMENT

Create a reusable queue engine.

Queues may be used by:

- reception
- triage
- consultation
- laboratory
- radiology
- pharmacy
- cashier
- emergency

Queue entity should support:

- queue number
- priority
- department
- service
- patient
- encounter
- status
- assigned staff
- created time
- called time
- completed time

Support priority levels:

- normal
- urgent
- emergency

The queue component should be reusable by multiple modules.

---

# 12. TRIAGE

Triage should capture:

- vital signs
- temperature
- blood pressure
- heart rate
- respiratory rate
- oxygen saturation
- weight
- height
- pain score
- chief complaint
- allergies
- triage category
- notes

Allow multiple vital-sign records during an encounter.

Do not overwrite historical vital signs.

Use timestamped records.

---

# 13. CONSULTATION

Create a clinical consultation module.

Support:

- chief complaint
- history
- examination
- assessment
- diagnosis
- treatment plan
- clinical notes
- orders
- prescriptions
- referrals
- follow-up
- attachments

Use structured clinical entities where appropriate.

Do not put the entire consultation into one giant text field.

---

# 14. DIAGNOSIS

Create reusable diagnosis entities.

Support:

- diagnosis code
- diagnosis name
- diagnosis type
- primary/secondary diagnosis
- encounter
- provider
- status

Design the system so ICD or another coding system can be integrated later.

Do not hard-code a single country's coding system into the architecture.

---

# 15. CLINICAL ORDERS

Create a generalized order architecture.

Order types:

- laboratory
- radiology
- medication
- procedure
- referral

Orders should have:

- order number
- patient
- encounter
- ordering provider
- department
- priority
- status
- created date
- clinical notes

Statuses:

draft
ordered
acknowledged
in_progress
completed
cancelled
rejected

---

# 16. LABORATORY

Laboratory module should support:

- test catalog
- test categories
- panels
- specimen types
- laboratory orders
- specimen collection
- specimen tracking
- accession numbers
- processing
- results
- reference ranges
- abnormal flags
- validation
- result release
- printable reports

Workflow:

Doctor
→ Lab Order
→ Specimen Collection
→ Processing
→ Result Entry
→ Validation
→ Result Release

Do not allow arbitrary result editing after finalization without an audit trail.

---

# 17. RADIOLOGY

Radiology module should support:

- imaging modalities
- radiology procedures
- radiology orders
- scheduling
- imaging status
- technician workflow
- radiologist workflow
- findings
- impressions
- report
- attachments
- Cloudinary integration for appropriate documents/images

Design the architecture so PACS/DICOM integration can be added later.

Do not attempt to implement a full PACS system unless explicitly requested.

---

# 18. PHARMACY

Pharmacy must support both:

1. Hospital patients
2. Walk-in customers

Features:

- medication catalog
- generic name
- brand name
- dosage form
- strength
- unit
- batch
- expiration
- supplier
- stock
- reorder level
- prescriptions
- dispensing
- returns
- adjustments
- stock transfers
- pricing
- walk-in sales

Support FEFO:

First Expired, First Out

Inventory should not simply decrease a single stock number.

Use stock movement records.

Example:

IN
OUT
RETURN
ADJUSTMENT
TRANSFER
EXPIRED

Every stock change should be traceable.

---

# 19. ADMISSION

Admission module:

- admission request
- admission approval
- admission date/time
- attending physician
- admitting diagnosis
- ward
- room
- bed
- admission status
- transfer
- discharge

Admission should connect to:

Patient
Encounter
Room
Bed
Nurse Station
Billing
Insurance

---

# 20. ROOM & BED MANAGEMENT

Create:

- buildings
- floors
- wards
- rooms
- beds

Bed statuses:

available
reserved
occupied
cleaning
maintenance
blocked

Support patient transfer:

Bed A
→ Bed B

Maintain history.

Never simply overwrite the old bed assignment.

---

# 21. EMERGENCY

Emergency department should support:

- emergency registration
- triage
- acuity
- immediate assessment
- emergency encounter
- treatment
- orders
- medications
- procedures
- disposition

Possible dispositions:

- discharge
- admission
- transfer
- referral
- deceased

Emergency should reuse the same patient, encounter, order, laboratory, radiology, pharmacy and billing infrastructure.

Do not create a completely separate patient system for emergency.

---

# 22. NURSE STATION

Nurse station should support:

- assigned patients
- ward
- room
- bed
- vital signs
- nursing notes
- medication administration
- nursing tasks
- care plans
- patient monitoring
- transfers
- alerts

Create a medication administration record architecture where appropriate.

---

# 23. CENTRAL SUPPLY / INVENTORY

Create a generalized inventory engine that can be reused by:

- central supply
- pharmacy
- laboratory
- other departments

Inventory concepts:

Item
Category
Unit
Warehouse
Location
Batch
Expiration
Stock
Stock Movement
Supplier
Purchase Order
Receiving
Transfer
Adjustment
Reorder Level

Support:

- FIFO/FEFO where appropriate
- stock counts
- stock adjustments
- transfers
- low-stock alerts
- expiration alerts
- inventory history

Do not implement inventory as:

item.stock = item.stock - quantity

without creating a stock movement record.

---

# 24. PROCUREMENT

Add procurement.

Support:

- suppliers
- purchase requests
- purchase orders
- receiving
- purchase invoices
- partial receiving
- rejected quantities

Procurement should integrate with inventory.

Workflow:

Purchase Request
→ Purchase Order
→ Receiving
→ Inventory Stock

---

# 25. STAFF MANAGEMENT

Staff module:

- employees
- doctors
- nurses
- technicians
- pharmacists
- receptionists
- accountants
- administrators

Separate:

User Account

from:

Staff Profile

A person may have:

Staff Profile

- User Account
- Roles
- Department assignments

  ***

# 26. DEPARTMENT MANAGEMENT

Create:

- departments
- services
- staff assignments
- operating schedules

Examples:

Emergency
Laboratory
Radiology
Pharmacy
Outpatient
Inpatient
Accounting

Modules should be able to reference departments without duplicating department information.

---

# 27. BILLING

Create a centralized billing engine.

Billing should be able to receive charges from:

- consultation
- laboratory
- radiology
- pharmacy
- procedures
- admission
- room
- supplies
- emergency
- other services

Use:

Invoice
Invoice Item
Charge
Payment
Payment Allocation
Refund
Discount
Adjustment

Do not directly create random billing records from individual modules.

Modules should create chargeable items/events that the billing engine can process.

---

# 28. ACCOUNTING

Create accounting-ready structures.

Support:

- chart of accounts
- accounts receivable
- payments
- refunds
- expenses
- revenue
- journal entries

Keep the architecture extensible enough for future double-entry accounting.

Do not attempt to build an unnecessarily complicated ERP accounting system in the first version.

---

# 29. INSURANCE

Create insurance management.

Support:

- insurance providers
- insurance plans
- patient insurance
- eligibility
- coverage
- authorizations
- claims
- claim items
- claim status
- insurer payments
- patient responsibility

Claim workflow:

Encounter
→ Charges
→ Insurance Coverage
→ Claim
→ Submission
→ Processing
→ Approval/Denial
→ Payment
→ Patient Balance

Design it so different insurance systems can later be integrated.

---

# 30. DOCUMENT MANAGEMENT

Use Cloudinary where appropriate.

Potential documents:

- patient documents
- referrals
- laboratory attachments
- radiology attachments
- insurance documents
- staff documents
- receipts
- reports

Do NOT store large binary files directly in PostgreSQL.

Store metadata in PostgreSQL and files in Cloudinary.

Include:

- public ID
- secure URL
- resource type
- MIME type
- size
- owner entity
- uploaded by
- created date

Use secure access patterns.

---

# 31. NOTIFICATION SYSTEM

Create reusable notifications.

Support:

- in-app notifications
- email notifications
- SMTP

Examples:

- appointment reminders
- low stock
- expired medication
- abnormal laboratory result
- insurance status
- payment notification
- password reset
- system alerts

Do not tightly couple SMTP logic to individual modules.

Create a reusable notification service.

---

# 32. AUDIT LOGGING

This is mandatory.

Healthcare systems require strong traceability.

Create an audit system recording:

- user
- action
- module
- entity
- entity ID
- old values where appropriate
- new values where appropriate
- timestamp
- IP address where appropriate
- user agent where appropriate

Examples:

PATIENT_UPDATED
LAB_RESULT_FINALIZED
PRESCRIPTION_CREATED
MEDICATION_DISPENSED
INVOICE_VOIDED
PAYMENT_REFUNDED
BED_TRANSFERRED

Do not allow ordinary users to modify audit logs.

---

# 33. REUSABLE UI COMPONENT SYSTEM

Build a reusable component library.

At minimum:

- Button
- Input
- Textarea
- Select
- Combobox
- DatePicker
- DateRangePicker
- TimePicker
- Checkbox
- Radio
- Switch
- Form
- Modal/Dialog
- Drawer
- Toast
- Alert
- Confirm Dialog
- Dropdown
- Tabs
- Accordion
- Tooltip
- Badge
- Avatar
- Card
- Data Table
- Pagination
- Search
- Filter
- Sort
- Empty State
- Loading State
- Skeleton
- Error State
- File Upload
- Image Upload
- Status Badge
- Timeline
- Queue Display
- Patient Header
- Patient Summary
- Patient Search
- Encounter Selector
- Department Selector
- Staff Selector
- Medication Selector
- Diagnosis Selector

Do not recreate these components inside individual modules.

---

# 34. DATA TABLE SYSTEM

Create one reusable DataTable system.

It should support:

- sorting
- filtering
- pagination
- column visibility
- search
- server-side pagination
- server-side filtering
- row actions
- bulk actions where appropriate
- responsive behavior

Do not load thousands of records into the browser unnecessarily.

---

# 35. FORM SYSTEM

Create reusable form infrastructure.

Forms must support:

- validation
- errors
- loading state
- server validation
- field-level validation
- submission state
- reusable schemas

Prefer schema-based validation.

Keep validation reusable between API and UI where practical.

---

# 36. API ARCHITECTURE

Use Next.js Route Handlers.

Example:

/api/patients
/api/patients/[id]

/api/encounters
/api/encounters/[id]

/api/laboratory/orders
/api/laboratory/results

/api/radiology/orders
/api/radiology/reports

/api/pharmacy/products
/api/pharmacy/dispensing

/api/billing/invoices
/api/billing/payments

/api/insurance/claims

API design must be consistent.

Every API endpoint must:

1. authenticate
2. authorize
3. validate input
4. execute business logic
5. handle errors
6. return consistent responses
7. log important actions
8. use transactions when necessary

Do not put large amounts of business logic directly inside route handlers.

Route handlers should call domain/service functions.

---

# 37. SERVICE / DOMAIN LAYER

Separate:

UI
↓
API
↓
Domain Service
↓
Repository / Database
↓
PostgreSQL

Do not allow UI components to directly manipulate the database.

Avoid putting business logic into React components.

Avoid putting all business logic into route.ts files.

Create reusable services.

Example:

PatientService
EncounterService
QueueService
BillingService
InventoryService
PharmacyService
LaboratoryService
RadiologyService
InsuranceService
AdmissionService

---

# 38. DATABASE ARCHITECTURE

Organize schemas by domain.

Example:

src/db/
schema/
auth.ts
patients.ts
encounters.ts
appointments.ts
queue.ts
clinical.ts
laboratory.ts
radiology.ts
pharmacy.ts
inventory.ts
admission.ts
nursing.ts
billing.ts
accounting.ts
insurance.ts
staff.ts
facilities.ts
documents.ts
notifications.ts
audit.ts

Do not create one gigantic schema.ts containing the entire hospital database.

Use Drizzle relations appropriately.

Create indexes for commonly searched fields.

Examples:

patients.mrn
patients.lastName
patients.dateOfBirth
encounters.patientId
encounters.status
appointments.staffId
appointments.date
labOrders.patientId
labOrders.status
inventoryItems.itemId
inventoryBatches.expirationDate
invoices.patientId
insuranceClaims.status

---

# 39. TRANSACTIONS

Use PostgreSQL transactions for operations involving multiple related changes.

Examples:

Dispensing medication:

Prescription

- Stock Movement
- Inventory update
- Billing Charge
- Audit Log

should be atomic where business rules require it.

Admission:

Admission

- Bed assignment
- Encounter update
- Billing initialization

should use appropriate transactions.

Do not perform multi-step critical operations without considering transaction integrity.

---

# 40. SOFT DELETE

Do not physically delete important clinical records casually.

For appropriate entities use:

deletedAt
deletedBy
deletionReason

Clinical records should generally be immutable or correction-based rather than freely deleted.

For example:

A finalized laboratory result should not simply be deleted.

Create a correction/amendment process.

---

# 41. STATUS DESIGN

Avoid arbitrary strings scattered throughout the application.

Centralize status definitions.

Use typed enums/constants where appropriate.

Example:

EncounterStatus
AppointmentStatus
OrderStatus
SpecimenStatus
InvoiceStatus
PaymentStatus
ClaimStatus
BedStatus
StockMovementType

---

# 42. DASHBOARD

Create role-aware dashboards.

Administrator:

- patient count
- admissions
- occupancy
- revenue
- outstanding balances
- inventory alerts
- system activity

Doctor:

- appointments
- waiting patients
- active encounters
- pending results
- follow-ups

Nurse:

- assigned patients
- vital-sign tasks
- medication tasks
- alerts

Laboratory:

- pending orders
- specimens
- pending results

Pharmacy:

- prescriptions
- dispensing queue
- low stock
- expiring items

Reception:

- today's appointments
- waiting patients
- queue

---

# 43. MOBILE RESPONSIVENESS

The application must be designed mobile-first.

Do not simply shrink desktop screens.

On mobile:

- navigation becomes a drawer
- tables become responsive cards or horizontal scroll where appropriate
- forms become single-column
- actions remain accessible
- important information stays visible
- touch targets must be comfortable
- dialogs should adapt to mobile
- queue screens should remain usable

---

# 44. PERFORMANCE

Optimize for:

- server rendering
- minimal client JavaScript
- pagination
- indexed queries
- caching where appropriate
- lazy loading
- efficient database queries
- avoiding unnecessary re-renders

Do not fetch entire tables when only 20 records are needed.

---

# 45. ERROR HANDLING

Create centralized error handling.

Use consistent API responses.

Example:

{
success: false,
error: {
code: "PATIENT_NOT_FOUND",
message: "Patient was not found."
}
}

Success:

{
success: true,
data: {}
}

Do not expose internal database errors to users.

Log technical details server-side.

---

# 46. ENVIRONMENT VARIABLES

Create:

.env.example

Never hard-code credentials.

Expected configuration should include variables such as:

DATABASE_URL

BETTER_AUTH_SECRET
BETTER_AUTH_URL

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM

Add additional variables only when necessary.

Never commit .env.

---

# 47. SECURITY

Treat this as a healthcare application.

Implement:

- authentication
- authorization
- secure sessions
- input validation
- CSRF protections where applicable
- rate limiting where appropriate
- secure cookies
- secure file handling
- audit logs
- server-side authorization
- protection against SQL injection
- protection against XSS
- protection against IDOR
- sensitive-data minimization
- secure error handling

Do not assume frontend permission checks are sufficient.

---

# 48. PRIVACY

Design the system so patient information is only accessible to authorized users.

Use least privilege.

Do not expose patient information unnecessarily through:

- URLs
- client-side state
- logs
- error messages
- browser storage
- public Cloudinary URLs

Review every API endpoint for authorization.

---

# 49. OPEN-SOURCE ARCHITECTURE

The project should be easy for another developer to clone and understand.

Include:

README.md

LICENSE

.env.example

CONTRIBUTING.md

docs/

Architecture documentation.

Database documentation.

Setup documentation.

Development documentation.

Deployment documentation.

Do not depend on proprietary hospital infrastructure.

---

# 50. PROJECT STRUCTURE

Prefer a structure similar to:

src/
app/
(auth)/
(dashboard)/
patients/
reception/
triage/
consultation/
laboratory/
radiology/
pharmacy/
emergency/
admission/
nursing/
inventory/
rooms/
staff/
billing/
accounting/
insurance/
settings/

    api/
      auth/
      patients/
      encounters/
      appointments/
      queue/
      laboratory/
      radiology/
      pharmacy/
      inventory/
      admission/
      nursing/
      billing/
      accounting/
      insurance/

components/
ui/
forms/
tables/
dialogs/
patients/
clinical/
inventory/
billing/

modules/
patients/
encounters/
reception/
triage/
consultation/
laboratory/
radiology/
pharmacy/
inventory/
admission/
nursing/
billing/
accounting/
insurance/
staff/
facilities/

lib/
auth/
db/
cloudinary/
email/
permissions/
validation/
errors/
audit/
notifications/

db/
schema/
migrations/

types/

Do not blindly follow this structure if official Next.js conventions or better domain architecture suggest an improvement.

Explain architectural decisions before making major structural changes.

---

# 51. MODULE BOUNDARIES

Every module should contain its own:

- types
- schemas
- services
- repositories where necessary
- validation
- business rules

But modules may communicate through well-defined service interfaces.

Avoid circular dependencies.

Example:

Pharmacy should not directly manipulate billing tables everywhere.

Instead:

PharmacyService
→ BillingService.createCharge()

InventoryService
→ PharmacyService / Inventory domain

Keep dependencies directional and intentional.

---

# 52. MASTER DATA

Create reusable master-data management.

Examples:

- countries
- provinces
- cities
- departments
- services
- diagnosis codes
- laboratory tests
- radiology procedures
- medications
- units
- insurance providers
- payment methods
- room types
- bed types

Avoid hard-coding these values throughout the UI.

---

# 53. REPORTING

Create a reporting architecture.

Reports should eventually support:

- patient census
- admissions
- discharges
- occupancy
- laboratory workload
- radiology workload
- pharmacy sales
- inventory
- expiring stock
- revenue
- payments
- insurance claims
- outstanding balances
- staff activity

Use database queries/views where appropriate rather than loading massive datasets into the frontend.

---

# 54. AUDITABLE CLINICAL WORKFLOW

Clinical records must have lifecycle states.

Example:

Draft
→ Submitted
→ Reviewed
→ Finalized

Once finalized, important clinical data should not be silently modified.

Changes should create:

- amendment
- correction
- audit event

---

# 55. SEED DATA

Create development seed data.

Include:

- administrator
- doctor
- nurse
- receptionist
- laboratory technician
- radiologist
- pharmacist
- cashier
- inventory officer

Include sample:

- departments
- rooms
- beds
- medications
- laboratory tests
- radiology procedures
- services
- payment methods

Never use real patient information in seed data.

---

# 56. TESTING

Create a testing strategy.

At minimum test:

- authentication
- permissions
- patient creation
- duplicate patient detection
- encounter creation
- appointment booking
- queue processing
- laboratory order
- laboratory result
- pharmacy dispensing
- inventory movement
- admission
- bed transfer
- billing
- payment
- insurance claim
- audit logging

Test business logic independently from UI.

---

# 57. DOCUMENTATION-FIRST DEVELOPMENT

Before implementing a technology integration, consult its official documentation.

Priority sources:

Next.js official documentation
Tailwind CSS official documentation
Better Auth official documentation
Drizzle official documentation
PostgreSQL official documentation
Cloudinary official documentation

Do not invent APIs based on memory.

If documentation has changed, follow the current documented approach.

When uncertain, stop and verify the official documentation before implementing.

---

# 58. DEVELOPMENT STRATEGY

DO NOT attempt to build the entire hospital system in one step.

Build incrementally.

Phase 1:

Foundation

- Next.js
- Tailwind
- PostgreSQL
- Drizzle
- Better Auth
- base layout
- UI system
- permissions
- audit logging
- error handling
- environment configuration

Phase 2:

Core Patient Flow

Patient
→ Reception
→ Encounter
→ Queue
→ Triage
→ Consultation

Phase 3:

Clinical Services

Laboratory
Radiology
Pharmacy

Phase 4:

Inpatient

Admission
Rooms
Beds
Nurse Station
Discharge

Phase 5:

Operations

Inventory
Central Supply
Procurement
Staff

Phase 6:

Financial

Billing
Payments
Accounting
Insurance

Phase 7:

Reporting
Notifications
Advanced dashboards
Integrations

---

# 59. VERY IMPORTANT IMPLEMENTATION RULE

Before writing significant code:

FIRST produce:

1. Architecture overview
2. Module dependency diagram
3. Database entity relationship design
4. Core database tables
5. Permission architecture
6. API architecture
7. Folder structure
8. UI component architecture
9. Development phases
10. Risks and architectural decisions

Do not immediately generate hundreds of files.

Get the architecture right first.

---

# 60. DATABASE-FIRST THINKING

Before creating UI screens, determine:

What entity is being created?

Who owns it?

What entity does it belong to?

What is its lifecycle?

Who can modify it?

Who can view it?

What happens when it is cancelled?

What happens when it is finalized?

What happens when it is corrected?

What should be audited?

What happens to related financial records?

What happens to insurance?

What happens to inventory?

This is especially important for:

- clinical orders
- laboratory results
- medication dispensing
- admissions
- billing
- payments
- insurance claims

---

# 61. DO NOT OVERENGINEER

Do NOT create microservices initially.

Do NOT introduce Kafka unless there is a demonstrated need.

Do NOT introduce Redis unless there is a demonstrated need.

Do NOT create unnecessary abstractions.

Do NOT create generic frameworks for everything.

Start with a well-designed modular monolith.

The architecture must allow future extraction into services without requiring the entire application to be rewritten.

---

# 62. USER EXPERIENCE

The interface should feel:

- modern
- clean
- professional
- calm
- fast
- medical/clinical
- information-dense but not overwhelming

Use consistent:

- spacing
- typography
- colors
- buttons
- status indicators
- forms
- tables
- dialogs
- alerts

Avoid excessive animations.

Use subtle transitions.

Do not sacrifice usability for visual effects.

---

# 63. ACCESSIBILITY

Follow modern accessibility practices.

Use:

- semantic HTML
- keyboard navigation
- visible focus states
- accessible dialogs
- proper labels
- appropriate contrast
- screen-reader-friendly controls
- accessible tables
- accessible form errors

Do not rely on color alone to communicate status.

---

# 64. FUTURE INTEGRATIONS

Keep the architecture extensible for future integrations such as:

- HL7
- FHIR
- DICOM
- PACS
- SMS
- payment gateways
- national health systems
- insurance APIs
- laboratory analyzers
- barcode scanners
- QR codes
- RFID

Do not implement these integrations now unless requested.

Design extension points instead.

---

# 65. IMPORTANT BUSINESS RULE

Never assume that all hospitals operate exactly the same way.

Make configurable where appropriate:

- departments
- services
- queues
- appointment types
- billing rules
- insurance rules
- room types
- bed types
- pharmacy pricing
- inventory locations
- roles
- permissions
- workflows

Avoid hard-coding hospital-specific business rules.

---

# 66. WHAT I EXPECT FROM YOU

You are not simply generating code.

You are acting as the:

- system architect
- database architect
- backend engineer
- frontend engineer
- security engineer
- UX engineer

Prioritize long-term maintainability over short-term speed.

When a requirement is ambiguous:

1. Identify the ambiguity.
2. Make a reasonable assumption.
3. Explain the assumption.
4. Continue without blocking development unless the decision could cause major architectural problems.

Do not repeatedly ask unnecessary questions.

---

# 67. CODING STYLE

Use:

- TypeScript
- strict typing
- async/await
- reusable functions
- small focused modules
- meaningful names
- clear comments only where necessary
- server-side validation
- typed API responses
- typed database schemas

Avoid:

- any
- duplicated logic
- massive components
- massive route handlers
- magic strings
- hard-coded IDs
- direct database calls from UI
- business logic inside JSX
- unnecessary client components

---

# 68. FINAL QUALITY REQUIREMENT

Before considering any module complete, verify:

- UI works on mobile
- UI works on desktop
- API is protected
- permissions are enforced
- database relationships are correct
- validation exists
- errors are handled
- audit logging exists where necessary
- transactions are used where necessary
- loading states exist
- empty states exist
- error states exist
- accessibility is considered
- reusable components are used
- no duplicated business logic exists
- no secrets are committed
- documentation is updated

---

# 69. START HERE

DO NOT START BY BUILDING ALL MODULES.

Start by producing the architecture for Phase 1.

First provide:

## A. System Architecture

Show the complete high-level architecture.

## B. Module Dependency Map

Show how:

Patient
Encounter
Reception
Triage
Consultation
Laboratory
Radiology
Pharmacy
Admission
Nursing
Inventory
Billing
Accounting
Insurance

are connected.

## C. Database ERD

Design the core entities and relationships.

## D. Folder Structure

Design the scalable Next.js project structure.

## E. Authentication & Authorization

Design Better Auth + RBAC.

## F. Shared UI Architecture

Design reusable components.

## G. API Architecture

Define the conventions for Route Handlers and services.

## H. Phase 1 Implementation Plan

Define the exact files that should be created first.

Only after the architecture is reviewed should implementation begin.

When implementing, proceed incrementally and explain what each major part does.

Never generate the entire project blindly in one response.
