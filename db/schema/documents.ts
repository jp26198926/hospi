import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  secureUrl: text("secure_url").notNull(),
  resourceType: text("resource_type").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename"),
  size: integer("size").notNull(),
  ownerEntity: text("owner_entity").notNull(),
  ownerId: text("owner_id").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("docs_owner_idx").on(t.ownerEntity, t.ownerId),
  index("docs_uploaded_by_idx").on(t.uploadedBy),
]);
