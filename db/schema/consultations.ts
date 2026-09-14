import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { encounters } from "./encounters";
import { diagnosisCodes } from "./master";

export const consultations = pgTable("consultations", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id")
    .notNull()
    .references(() => encounters.id, { onDelete: "restrict" }),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  providerId: text("provider_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft"),
  chiefComplaint: text("chief_complaint"),
  history: text("history"),
  examination: text("examination"),
  assessment: text("assessment"),
  treatmentPlan: text("treatment_plan"),
  clinicalNotes: text("clinical_notes"),
  followUpDate: timestamp("follow_up_date"),
  followUpInstructions: text("follow_up_instructions"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: text("finalized_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("consult_encounter_idx").on(t.encounterId),
  index("consult_status_idx").on(t.status),
  index("consult_patient_idx").on(t.patientId),
  index("consult_provider_idx").on(t.providerId),
]);

export const diagnoses = pgTable("diagnoses", {
  id: text("id").primaryKey(),
  consultationId: text("consultation_id")
    .notNull()
    .references(() => consultations.id, { onDelete: "cascade" }),
  encounterId: text("encounter_id")
    .notNull()
    .references(() => encounters.id, { onDelete: "restrict" }),
  diagnosisCodeId: text("diagnosis_code_id")
    .references(() => diagnosisCodes.id, { onDelete: "set null" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("clinical"),
  isPrimary: boolean("is_primary").notNull().default(false),
  providerId: text("provider_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("diag_consultation_idx").on(t.consultationId),
  index("diag_encounter_idx").on(t.encounterId),
  index("diag_provider_idx").on(t.providerId),
]);
