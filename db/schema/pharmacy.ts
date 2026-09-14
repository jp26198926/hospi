import { pgTable, text, timestamp, boolean, integer, numeric, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { patients } from "./patients";
import { encounters } from "./encounters";
import { clinicalOrders } from "./orders";
import { suppliers } from "./inventory";

export const medications = pgTable("medications", {
  id: text("id").primaryKey(),
  genericName: text("generic_name").notNull(),
  brandName: text("brand_name"),
  dosageForm: text("dosage_form").notNull(),
  strength: text("strength").notNull(),
  unit: text("unit").notNull(),
  reorderLevel: integer("reorder_level").notNull().default(0),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("meds_generic_idx").on(t.genericName),
  index("meds_active_idx").on(t.active),
]);

export const medicationBatches = pgTable("medication_batches", {
  id: text("id").primaryKey(),
  medicationId: text("medication_id").notNull().references(() => medications.id, { onDelete: "restrict" }),
  batchNumber: text("batch_number").notNull(),
  expirationDate: date("expiration_date").notNull(),
  quantity: integer("quantity").notNull().default(0),
  supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("batches_medication_idx").on(t.medicationId),
  index("batches_expiration_idx").on(t.expirationDate),
  uniqueIndex("batches_med_batch_unique").on(t.medicationId, t.batchNumber),
]);

export const prescriptions = pgTable("prescriptions", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique().references(() => clinicalOrders.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "restrict" }),
  encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "restrict" }),
  prescriberId: text("prescriber_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rx_patient_idx").on(t.patientId),
  index("rx_encounter_idx").on(t.encounterId),
  index("rx_status_idx").on(t.status),
  index("rx_prescriber_idx").on(t.prescriberId),
]);

export const prescriptionItems = pgTable("prescription_items", {
  id: text("id").primaryKey(),
  prescriptionId: text("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  medicationId: text("medication_id").notNull().references(() => medications.id, { onDelete: "restrict" }),
  dose: text("dose").notNull(),
  route: text("route").notNull(),
  frequency: text("frequency").notNull(),
  durationDays: integer("duration_days"),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("rx_items_prescription_idx").on(t.prescriptionId),
  index("rx_items_medication_idx").on(t.medicationId),
]);

export const dispensings = pgTable("dispensings", {
  id: text("id").primaryKey(),
  prescriptionId: text("prescription_id").references(() => prescriptions.id, { onDelete: "set null" }),
  patientId: text("patient_id").references(() => patients.id, { onDelete: "set null" }),
  encounterId: text("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
  pharmacistId: text("pharmacist_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("pending"),
  dispensedAt: timestamp("dispensed_at"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("dispensing_rx_idx").on(t.prescriptionId),
  index("dispensing_patient_idx").on(t.patientId),
  index("dispensing_status_idx").on(t.status),
  index("dispensing_pharmacist_idx").on(t.pharmacistId),
]);

export const dispensingItems = pgTable("dispensing_items", {
  id: text("id").primaryKey(),
  dispensingId: text("dispensing_id").notNull().references(() => dispensings.id, { onDelete: "cascade" }),
  medicationId: text("medication_id").notNull().references(() => medications.id, { onDelete: "restrict" }),
  batchId: text("batch_id").notNull().references(() => medicationBatches.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  prescriptionItemId: text("prescription_item_id").references(() => prescriptionItems.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("disp_items_dispensing_idx").on(t.dispensingId),
  index("disp_items_medication_idx").on(t.medicationId),
  index("disp_items_batch_idx").on(t.batchId),
]);
