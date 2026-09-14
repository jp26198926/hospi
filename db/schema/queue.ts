import { pgTable, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { encounters } from "./encounters";
import { departments, services } from "./master";

export const queueEntries = pgTable("queue_entries", {
  id: text("id").primaryKey(),
  queueNumber: integer("queue_number").notNull(),
  queueType: text("queue_type").notNull(),
  priority: text("priority").notNull().default("normal"),
  departmentId: text("department_id")
    .references(() => departments.id, { onDelete: "set null" }),
  serviceId: text("service_id")
    .references(() => services.id, { onDelete: "set null" }),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  encounterId: text("encounter_id")
    .notNull()
    .references(() => encounters.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("waiting"),
  assignedStaffId: text("assigned_staff_id")
    .references(() => user.id, { onDelete: "set null" }),
  calledTime: timestamp("called_time"),
  completedTime: timestamp("completed_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("queue_type_status_idx").on(t.queueType, t.status),
  index("queue_encounter_idx").on(t.encounterId),
  index("queue_patient_idx").on(t.patientId),
  index("queue_department_idx").on(t.departmentId),
  uniqueIndex("queue_type_number_unique").on(t.queueType, t.queueNumber),
]);
