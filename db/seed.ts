import "dotenv/config";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/lib/permissions/constants";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding...");

  // Insert permissions
  for (const [constName, value] of Object.entries(PERMISSIONS)) {
    const [module, action] = value.split(".");
    await db
      .insert(schema.permissions)
      .values({
        id: randomUUID(),
        key: value,
        module,
        action,
        description: constName.replace(/_/g, " ").toLowerCase(),
      })
      .onConflictDoNothing();
  }
  console.log("Permissions seeded.");

  // Insert roles + link permissions
  const permRows = await db.select().from(schema.permissions);
  const permMap = new Map(permRows.map((p) => [p.key, p.id]));

  for (const [constName, roleValue] of Object.entries(ROLES)) {
    const roleId = randomUUID();
    await db
      .insert(schema.roles)
      .values({
        id: roleId,
        name: roleValue,
        displayName: constName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      })
      .onConflictDoNothing();

    const permKeys = ROLE_PERMISSIONS[roleValue as keyof typeof ROLE_PERMISSIONS];
    for (const pk of permKeys) {
      const permId = permMap.get(pk);
      if (permId) {
        await db
          .insert(schema.rolePermissions)
          .values({ roleId, permissionId: permId })
          .onConflictDoNothing();
      }
    }
  }
  console.log("Roles seeded.");

  // Create admin user
  const { hashPassword } = await import("better-auth/crypto");
  const adminPassword = await hashPassword("Admin123!");
  const adminId = randomUUID();

  await db
    .insert(schema.user)
    .values({
      id: adminId,
      name: "System Administrator",
      email: "admin@hospi.local",
      emailVerified: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.account)
    .values({
      id: randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: adminPassword,
    })
    .onConflictDoNothing();

  const adminRole = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.name, ROLES.ADMIN))
    .limit(1);

  if (adminRole[0]) {
    await db
      .insert(schema.userRoles)
      .values({ userId: adminId, roleId: adminRole[0].id })
      .onConflictDoNothing();
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@hospi.local / Admin123!");
}

seed()
  .then(() => client.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
