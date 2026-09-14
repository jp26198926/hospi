import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { departments } from "./master";

export const encounters = pgTable("encounters", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("registered"),
  departmentId: text("department_id")
    .references(() => departments.id, { onDelete: "set null" }),
  attendingProviderId: text("attending_provider_id")
    .references(() => user.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("encounters_patient_idx").on(t.patientId),
  index("encounters_status_idx").on(t.status),
  index("encounters_type_idx").on(t.type),
  index("encounters_department_idx").on(t.departmentId),
  index("encounters_started_idx").on(t.startedAt),
]);
