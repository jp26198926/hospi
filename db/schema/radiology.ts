import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { clinicalOrders } from "./orders";

export const imagingModalities = pgTable("imaging_modalities", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const radiologyProcedures = pgTable("radiology_procedures", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  modalityId: text("modality_id").notNull().references(() => imagingModalities.id, { onDelete: "restrict" }),
  bodyPart: text("body_part"),
  durationMinutes: integer("duration_minutes").default(30),
  prepInstructions: text("prep_instructions"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rad_proc_modality_idx").on(t.modalityId),
]);

export const radiologyOrders = pgTable("radiology_orders", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique().references(() => clinicalOrders.id, { onDelete: "cascade" }),
  procedureId: text("procedure_id").notNull().references(() => radiologyProcedures.id, { onDelete: "restrict" }),
  clinicalQuestion: text("clinical_question"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("rad_orders_order_idx").on(t.orderId),
]);

export const radiologyStudies = pgTable("radiology_studies", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique().references(() => clinicalOrders.id, { onDelete: "restrict" }),
  modalityId: text("modality_id").references(() => imagingModalities.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at"),
  technicianId: text("technician_id").references(() => user.id, { onDelete: "set null" }),
  status: text("status").notNull().default("scheduled"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  equipment: text("equipment"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rad_studies_order_idx").on(t.orderId),
  index("rad_studies_status_idx").on(t.status),
  index("rad_studies_scheduled_idx").on(t.scheduledAt),
]);

export const radiologyReports = pgTable("radiology_reports", {
  id: text("id").primaryKey(),
  studyId: text("study_id").notNull().references(() => radiologyStudies.id, { onDelete: "restrict" }),
  findings: text("findings").notNull(),
  impressions: text("impressions").notNull(),
  recommendations: text("recommendations"),
  status: text("status").notNull().default("draft"),
  radiologistId: text("radiologist_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: text("finalized_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rad_reports_study_idx").on(t.studyId),
  index("rad_reports_status_idx").on(t.status),
]);
