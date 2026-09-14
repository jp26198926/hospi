import { pgTable, text, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { encounters } from "./encounters";

export const triageRecords = pgTable("triage_records", {
  id: text("id").primaryKey(),
  encounterId: text("encounter_id")
    .notNull()
    .references(() => encounters.id, { onDelete: "restrict" }),
  temperature: real("temperature"),
  bpSystolic: integer("bp_systolic"),
  bpDiastolic: integer("bp_diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: real("oxygen_saturation"),
  weight: real("weight"),
  height: real("height"),
  painScore: integer("pain_score"),
  chiefComplaint: text("chief_complaint"),
  allergies: text("allergies"),
  triageCategory: text("triage_category"),
  notes: text("notes"),
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
}, (t) => [
  index("triage_encounter_idx").on(t.encounterId),
  index("triage_recorded_idx").on(t.recordedAt),
]);
