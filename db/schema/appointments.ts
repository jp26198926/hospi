import { pgTable, text, timestamp, date, time, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { departments, services } from "./master";
import { staffProfiles } from "./staff";

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  staffId: text("staff_id")
    .references(() => staffProfiles.id, { onDelete: "set null" }),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  serviceId: text("service_id")
    .references(() => services.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  reason: text("reason"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("appt_staff_date_idx").on(t.staffId, t.date),
  index("appt_patient_idx").on(t.patientId),
  index("appt_date_idx").on(t.date),
  index("appt_status_idx").on(t.status),
  index("appt_department_idx").on(t.departmentId),
]);
