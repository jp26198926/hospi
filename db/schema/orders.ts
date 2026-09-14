import { pgTable, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { encounters } from "./encounters";
import { consultations } from "./consultations";
import { departments } from "./master";

export const clinicalOrders = pgTable("clinical_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  type: text("type").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "restrict" }),
  encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "restrict" }),
  consultationId: text("consultation_id").references(() => consultations.id, { onDelete: "set null" }),
  orderingProviderId: text("ordering_provider_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("ordered"),
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("orders_patient_idx").on(t.patientId),
  index("orders_encounter_idx").on(t.encounterId),
  index("orders_type_status_idx").on(t.type, t.status),
  index("orders_provider_idx").on(t.orderingProviderId),
  index("orders_department_idx").on(t.departmentId),
  uniqueIndex("orders_type_seq_unique").on(t.type, t.sequenceNumber),
]);
