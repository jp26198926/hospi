import { pgTable, text, timestamp, boolean, integer, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { clinicalOrders } from "./orders";

export const labTestCategories = pgTable("lab_test_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const labTests = pgTable("lab_tests", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id").references(() => labTestCategories.id, { onDelete: "set null" }),
  specimenType: text("specimen_type"),
  unit: text("unit"),
  referenceRangeLow: numeric("reference_range_low", { precision: 12, scale: 3 }),
  referenceRangeHigh: numeric("reference_range_high", { precision: 12, scale: 3 }),
  referenceRangeText: text("reference_range_text"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("lab_tests_category_idx").on(t.categoryId),
  index("lab_tests_active_idx").on(t.active),
]);

export const labPanels = pgTable("lab_panels", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const labPanelTests = pgTable("lab_panel_tests", {
  id: text("id").primaryKey(),
  panelId: text("panel_id").notNull().references(() => labPanels.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull().references(() => labTests.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("lab_panel_test_unique").on(t.panelId, t.testId),
]);

export const specimenTypes = pgTable("specimen_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  handlingNotes: text("handling_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const labOrders = pgTable("lab_orders", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique().references(() => clinicalOrders.id, { onDelete: "cascade" }),
  panelId: text("panel_id").references(() => labPanels.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("lab_orders_order_idx").on(t.orderId),
]);

export const labOrderTests = pgTable("lab_order_tests", {
  id: text("id").primaryKey(),
  labOrderId: text("lab_order_id").notNull().references(() => labOrders.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull().references(() => labTests.id, { onDelete: "restrict" }),
}, (t) => [
  uniqueIndex("lab_order_test_unique").on(t.labOrderId, t.testId),
  index("lab_order_tests_test_idx").on(t.testId),
]);

export const specimens = pgTable("specimens", {
  id: text("id").primaryKey(),
  labOrderId: text("lab_order_id").notNull().references(() => labOrders.id, { onDelete: "restrict" }),
  accessionNumber: text("accession_number").notNull().unique(),
  sequenceNumber: integer("sequence_number").notNull(),
  specimenTypeId: text("specimen_type_id").references(() => specimenTypes.id, { onDelete: "set null" }),
  collectedBy: text("collected_by").references(() => user.id, { onDelete: "set null" }),
  collectedAt: timestamp("collected_at"),
  status: text("status").notNull().default("collected"),
  notes: text("notes"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("specimens_lab_order_idx").on(t.labOrderId),
  index("specimens_status_idx").on(t.status),
  uniqueIndex("specimens_seq_unique").on(t.sequenceNumber),
]);

export const labResults = pgTable("lab_results", {
  id: text("id").primaryKey(),
  labOrderId: text("lab_order_id").notNull().references(() => labOrders.id, { onDelete: "restrict" }),
  specimenId: text("specimen_id").references(() => specimens.id, { onDelete: "set null" }),
  testId: text("test_id").notNull().references(() => labTests.id, { onDelete: "restrict" }),
  value: text("value").notNull(),
  unit: text("unit"),
  referenceRangeLow: numeric("reference_range_low", { precision: 12, scale: 3 }),
  referenceRangeHigh: numeric("reference_range_high", { precision: 12, scale: 3 }),
  referenceRangeText: text("reference_range_text"),
  isAbnormal: boolean("is_abnormal").notNull().default(false),
  abnormalFlag: text("abnormal_flag"),
  status: text("status").notNull().default("entered"),
  amendmentOfId: text("amendment_of_id"),
  amendmentReason: text("amendment_reason"),
  enteredBy: text("entered_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  enteredAt: timestamp("entered_at").notNull().defaultNow(),
  validatedBy: text("validated_by").references(() => user.id, { onDelete: "set null" }),
  validatedAt: timestamp("validated_at"),
  releasedBy: text("released_by").references(() => user.id, { onDelete: "set null" }),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("lab_results_order_idx").on(t.labOrderId),
  index("lab_results_test_idx").on(t.testId),
  index("lab_results_status_idx").on(t.status),
  index("lab_results_specimen_idx").on(t.specimenId),
]);
