import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { departments } from "./master";

export const staffProfiles = pgTable("staff_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  departmentId: text("department_id")
    .references(() => departments.id, { onDelete: "set null" }),
  title: text("title"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("staff_user_unique").on(t.userId),
  index("staff_department_idx").on(t.departmentId),
  index("staff_name_idx").on(t.lastName, t.firstName),
]);
