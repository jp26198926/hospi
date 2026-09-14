import "dotenv/config";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/lib/permissions/constants";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function createUser(email: string, name: string, password: string, roleName: string) {
  const { hashPassword } = await import("better-auth/crypto");
  const hashedPassword = await hashPassword(password);

  // Insert user (idempotent)
  await db
    .insert(schema.user)
    .values({ id: randomUUID(), name, email, emailVerified: true })
    .onConflictDoNothing();

  // Look up actual user ID (insert may have been skipped)
  const existing = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (!existing[0]) throw new Error(`Failed to create user: ${email}`);
  const userId = existing[0].id;

  // Insert credential account (idempotent)
  await db
    .insert(schema.account)
    .values({ id: randomUUID(), accountId: userId, providerId: "credential", userId, password: hashedPassword })
    .onConflictDoNothing();

  // Assign role
  const role = await db.select().from(schema.roles).where(eq(schema.roles.name, roleName)).limit(1);
  if (role[0]) {
    await db
      .insert(schema.userRoles)
      .values({ userId, roleId: role[0].id })
      .onConflictDoNothing();
  }

  return userId;
}

async function seed() {
  console.log("Seeding...");

  // 1. Permissions
  for (const [constName, value] of Object.entries(PERMISSIONS)) {
    const [module, action] = value.split(".");
    await db
      .insert(schema.permissions)
      .values({ id: randomUUID(), key: value, module, action, description: constName.replace(/_/g, " ").toLowerCase() })
      .onConflictDoNothing();
  }
  console.log("Permissions seeded.");

  // 2. Roles + role-permissions
  const permRows = await db.select().from(schema.permissions);
  const permMap = new Map(permRows.map((p) => [p.key, p.id]));

  for (const [constName, roleValue] of Object.entries(ROLES)) {
    await db
      .insert(schema.roles)
      .values({ id: randomUUID(), name: roleValue, displayName: constName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })
      .onConflictDoNothing();

    const existingRole = await db.select().from(schema.roles).where(eq(schema.roles.name, roleValue)).limit(1);
    if (!existingRole[0]) continue;
    const roleId = existingRole[0].id;

    const permKeys = ROLE_PERMISSIONS[roleValue as keyof typeof ROLE_PERMISSIONS];
    for (const pk of permKeys) {
      const permId = permMap.get(pk);
      if (permId) {
        await db.insert(schema.rolePermissions).values({ roleId, permissionId: permId }).onConflictDoNothing();
      }
    }
  }
  console.log("Roles seeded.");

  // 3. Users
  const adminId = await createUser("admin@hospi.local", "System Administrator", "Admin123!", ROLES.ADMIN);
  const doctorId = await createUser("doctor@hospi.local", "Dr. Juan Dela Cruz", "Doctor123!", ROLES.DOCTOR);
  const nurseId = await createUser("nurse@hospi.local", "Maria Santos", "Nurse123!", ROLES.NURSE);
  const receptionistId = await createUser("receptionist@hospi.local", "Ana Reyes", "Reception123!", ROLES.RECEPTIONIST);
  console.log("Users seeded.");

  // 4. Departments
  const deptData = [
    { id: randomUUID(), name: "Outpatient", code: "OPD", description: "General outpatient services" },
    { id: randomUUID(), name: "Emergency", code: "ER", description: "Emergency department" },
    { id: randomUUID(), name: "Laboratory", code: "LAB", description: "Laboratory services" },
  ];
  for (const dept of deptData) {
    await db.insert(schema.departments).values(dept).onConflictDoNothing();
  }
  const deptRows = await db.select().from(schema.departments);
  const deptMap = new Map(deptRows.map((d) => [d.code, d.id]));
  console.log("Departments seeded.");

  // 5. Services
  const svcData = [
    { id: randomUUID(), name: "General Consultation", code: "GEN-CONS", departmentId: deptMap.get("OPD")! },
    { id: randomUUID(), name: "Follow-up Visit", code: "FU-VISIT", departmentId: deptMap.get("OPD")! },
    { id: randomUUID(), name: "Emergency Care", code: "EMER-CARE", departmentId: deptMap.get("ER")! },
    { id: randomUUID(), name: "Blood Test", code: "BLOOD-TEST", departmentId: deptMap.get("LAB")! },
    { id: randomUUID(), name: "Urinalysis", code: "URINE", departmentId: deptMap.get("LAB")! },
  ];
  for (const svc of svcData) {
    await db.insert(schema.services).values(svc).onConflictDoNothing();
  }
  console.log("Services seeded.");

  // 6. Staff profiles
  const staffData = [
    { id: randomUUID(), userId: doctorId, employeeId: "EMP-001", firstName: "Juan", lastName: "Dela Cruz", departmentId: deptMap.get("OPD")!, title: "MD" },
    { id: randomUUID(), userId: nurseId, employeeId: "EMP-002", firstName: "Maria", lastName: "Santos", departmentId: deptMap.get("OPD")!, title: "RN" },
    { id: randomUUID(), userId: receptionistId, employeeId: "EMP-003", firstName: "Ana", lastName: "Reyes", departmentId: deptMap.get("OPD")!, title: "Receptionist" },
  ];
  for (const staff of staffData) {
    await db.insert(schema.staffProfiles).values(staff).onConflictDoNothing();
  }
  console.log("Staff profiles seeded.");

  // 7. Diagnosis codes
  const diagCodes = [
    { id: randomUUID(), code: "J06.9", name: "Acute upper respiratory infection, unspecified", system: "ICD-10" },
    { id: randomUUID(), code: "R51", name: "Headache", system: "ICD-10" },
    { id: randomUUID(), code: "R50.9", name: "Fever, unspecified", system: "ICD-10" },
    { id: randomUUID(), code: "K59.1", name: "Functional diarrhea", system: "ICD-10" },
    { id: randomUUID(), code: "I10", name: "Essential (primary) hypertension", system: "ICD-10" },
    { id: randomUUID(), code: "E11.9", name: "Type 2 diabetes mellitus without complications", system: "ICD-10" },
    { id: randomUUID(), code: "J44.1", name: "COPD with (acute) exacerbation", system: "ICD-10" },
    { id: randomUUID(), code: "R07.9", name: "Chest pain, unspecified", system: "ICD-10" },
    { id: randomUUID(), code: "A09", name: "Infectious gastroenteritis and colitis, unspecified", system: "ICD-10" },
    { id: randomUUID(), code: "R10.9", name: "Unspecified abdominal pain", system: "ICD-10" },
  ];
  for (const dc of diagCodes) {
    await db.insert(schema.diagnosisCodes).values(dc).onConflictDoNothing();
  }
  console.log("Diagnosis codes seeded.");

  // 8. Sample patients
  const patientData = [
    { id: randomUUID(), mrn: "MRN-000001", firstName: "Pedro", lastName: "Penduko", dateOfBirth: "1985-03-15", sex: "male", phone: "+639171234567", bloodType: "O+", addressLine1: "123 Rizal St", city: "Manila", province: "Metro Manila", postalCode: "1000", country: "PH", emergencyContactName: "Family Member", emergencyContactPhone: "+639170000000", emergencyContactRelationship: "Spouse", createdBy: adminId },
    { id: randomUUID(), mrn: "MRN-000002", firstName: "Maria", lastName: "Clara", dateOfBirth: "1990-07-22", sex: "female", phone: "+639179876543", bloodType: "A+", addressLine1: "123 Rizal St", city: "Manila", province: "Metro Manila", postalCode: "1000", country: "PH", emergencyContactName: "Family Member", emergencyContactPhone: "+639170000000", emergencyContactRelationship: "Parent", createdBy: adminId },
    { id: randomUUID(), mrn: "MRN-000003", firstName: "Jose", lastName: "Rizal", dateOfBirth: "1978-11-30", sex: "male", phone: "+639175551234", bloodType: "B+", addressLine1: "123 Rizal St", city: "Manila", province: "Metro Manila", postalCode: "1000", country: "PH", emergencyContactName: "Family Member", emergencyContactPhone: "+639170000000", emergencyContactRelationship: "Sibling", createdBy: adminId },
  ];
  for (const p of patientData) {
    await db.insert(schema.patients).values(p).onConflictDoNothing();
  }
  console.log("Patients seeded.");

  console.log("\nSeed complete.");
  console.log("Logins:");
  console.log("  admin@hospi.local / Admin123!");
  console.log("  doctor@hospi.local / Doctor123!");
  console.log("  nurse@hospi.local / Nurse123!");
  console.log("  receptionist@hospi.local / Reception123!");
}

seed()
  .then(() => client.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
