import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { medications, medicationBatches } from "./pharmacy";

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  medicationId: text("medication_id").notNull().references(() => medications.id, { onDelete: "restrict" }),
  batchId: text("batch_id").notNull().references(() => medicationBatches.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  quantityAfter: integer("quantity_after"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  performedBy: text("performed_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("stock_mv_medication_idx").on(t.medicationId),
  index("stock_mv_batch_idx").on(t.batchId),
  index("stock_mv_type_idx").on(t.type),
  index("stock_mv_created_idx").on(t.createdAt),
  index("stock_mv_ref_idx").on(t.referenceType, t.referenceId),
]);
