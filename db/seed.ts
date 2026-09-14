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

  // 9. Phase 3 departments
  const p3Depts = [
    { id: randomUUID(), name: "Radiology", code: "RAD", description: "Radiology and imaging services" },
    { id: randomUUID(), name: "Pharmacy", code: "PHARM", description: "Hospital pharmacy" },
  ];
  for (const d of p3Depts) {
    await db.insert(schema.departments).values(d).onConflictDoNothing();
  }
  const allDepts = await db.select().from(schema.departments);
  const dMap = new Map(allDepts.map((d) => [d.code, d.id]));
  console.log("Phase 3 departments seeded.");

  // 10. Phase 3 users
  const labTechId = await createUser("labtech@hospi.local", "Lab Technician", "LabTech123!", ROLES.LAB_TECH);
  const radiologistId = await createUser("radiologist@hospi.local", "Dr. Radiologist", "Radio123!", ROLES.RADIOLOGIST);
  const pharmacistId = await createUser("pharmacist@hospi.local", "Pharmacist", "Pharma123!", ROLES.PHARMACIST);
  console.log("Phase 3 users seeded.");

  // 11. Phase 3 staff profiles
  const p3Staff = [
    { id: randomUUID(), userId: labTechId, employeeId: "EMP-004", firstName: "Lab", lastName: "Technician", departmentId: dMap.get("LAB")!, title: "RMT" },
    { id: randomUUID(), userId: radiologistId, employeeId: "EMP-005", firstName: "Dr.", lastName: "Radiologist", departmentId: dMap.get("RAD")!, title: "MD Radiology" },
    { id: randomUUID(), userId: pharmacistId, employeeId: "EMP-006", firstName: "Pharma", lastName: "Cist", departmentId: dMap.get("PHARM")!, title: "RPh" },
  ];
  for (const s of p3Staff) {
    await db.insert(schema.staffProfiles).values(s).onConflictDoNothing();
  }
  console.log("Phase 3 staff seeded.");

  // 12. Lab test categories
  const catData = [
    { id: randomUUID(), name: "Hematology", code: "HEM" },
    { id: randomUUID(), name: "Clinical Chemistry", code: "CHEM" },
    { id: randomUUID(), name: "Urinalysis", code: "UA" },
  ];
  for (const c of catData) {
    await db.insert(schema.labTestCategories).values(c).onConflictDoNothing();
  }
  const catRows = await db.select().from(schema.labTestCategories);
  const catMap = new Map(catRows.map((c) => [c.code, c.id]));
  console.log("Lab categories seeded.");

  // 13. Specimen types
  const specData = [
    { id: randomUUID(), name: "Blood", code: "BLOOD", handlingNotes: "Lavender top for CBC; red top for chemistry" },
    { id: randomUUID(), name: "Urine", code: "URINE", handlingNotes: "Midstream clean catch; 10mL sterile container" },
    { id: randomUUID(), name: "Stool", code: "STOOL", handlingNotes: "Sterile container; deliver within 1 hour" },
  ];
  for (const s of specData) {
    await db.insert(schema.specimenTypes).values(s).onConflictDoNothing();
  }
  console.log("Specimen types seeded.");

  // 14. Lab tests
  const testData = [
    { id: randomUUID(), code: "HGB", name: "Hemoglobin", categoryId: catMap.get("HEM")!, specimenType: "Blood", unit: "g/dL", referenceRangeLow: "12.0", referenceRangeHigh: "17.0" },
    { id: randomUUID(), code: "WBC", name: "White Blood Cell Count", categoryId: catMap.get("HEM")!, specimenType: "Blood", unit: "x10^3/uL", referenceRangeLow: "4.0", referenceRangeHigh: "11.0" },
    { id: randomUUID(), code: "PLT", name: "Platelet Count", categoryId: catMap.get("HEM")!, specimenType: "Blood", unit: "x10^3/uL", referenceRangeLow: "150", referenceRangeHigh: "450" },
    { id: randomUUID(), code: "GLU", name: "Blood Glucose (Fasting)", categoryId: catMap.get("CHEM")!, specimenType: "Blood", unit: "mg/dL", referenceRangeLow: "70", referenceRangeHigh: "100" },
    { id: randomUUID(), code: "CREA", name: "Serum Creatinine", categoryId: catMap.get("CHEM")!, specimenType: "Blood", unit: "mg/dL", referenceRangeLow: "0.6", referenceRangeHigh: "1.2" },
    { id: randomUUID(), code: "CHOL", name: "Total Cholesterol", categoryId: catMap.get("CHEM")!, specimenType: "Blood", unit: "mg/dL", referenceRangeLow: "0", referenceRangeHigh: "200" },
    { id: randomUUID(), code: "UA-APPEARANCE", name: "Urine Appearance", categoryId: catMap.get("UA")!, specimenType: "Urine", referenceRangeText: "Clear" },
    { id: randomUUID(), code: "UA-PROTEIN", name: "Urine Protein", categoryId: catMap.get("UA")!, specimenType: "Urine", referenceRangeText: "Negative" },
    { id: randomUUID(), code: "UA-GLU", name: "Urine Glucose", categoryId: catMap.get("UA")!, specimenType: "Urine", referenceRangeText: "Negative" },
  ];
  for (const t of testData) {
    await db.insert(schema.labTests).values(t).onConflictDoNothing();
  }
  const testRows = await db.select().from(schema.labTests);
  const testMap = new Map(testRows.map((t) => [t.code, t.id]));
  console.log("Lab tests seeded.");

  // 15. Lab panels
  const panelData = [
    { id: randomUUID(), code: "CBC-PANEL", name: "CBC with Differential", description: "Complete blood count" },
    { id: randomUUID(), code: "FBS-PANEL", name: "Fasting Blood Sugar", description: "Fasting glucose" },
    { id: randomUUID(), code: "UA-Routine", name: "Routine Urinalysis", description: "Basic urine examination" },
  ];
  for (const p of panelData) {
    await db.insert(schema.labPanels).values(p).onConflictDoNothing();
  }
  const panelRows = await db.select().from(schema.labPanels);
  const panelMap = new Map(panelRows.map((p) => [p.code, p.id]));
  // Link panel tests
  const panelTests = [
    { panelId: panelMap.get("CBC-PANEL")!, testIds: ["HGB", "WBC", "PLT"] },
    { panelId: panelMap.get("FBS-PANEL")!, testIds: ["GLU"] },
    { panelId: panelMap.get("UA-Routine")!, testIds: ["UA-APPEARANCE", "UA-PROTEIN", "UA-GLU"] },
  ];
  for (const pt of panelTests) {
    for (const tc of pt.testIds) {
      const tid = testMap.get(tc);
      if (tid) {
        await db.insert(schema.labPanelTests).values({ id: randomUUID(), panelId: pt.panelId, testId: tid }).onConflictDoNothing();
      }
    }
  }
  console.log("Lab panels seeded.");

  // 16. Imaging modalities
  const modData = [
    { id: randomUUID(), code: "XRAY", name: "X-Ray" },
    { id: randomUUID(), code: "CT", name: "Computed Tomography" },
    { id: randomUUID(), code: "MRI", name: "Magnetic Resonance Imaging" },
    { id: randomUUID(), code: "US", name: "Ultrasound" },
  ];
  for (const m of modData) {
    await db.insert(schema.imagingModalities).values(m).onConflictDoNothing();
  }
  const modRows = await db.select().from(schema.imagingModalities);
  const modMap = new Map(modRows.map((m) => [m.code, m.id]));
  console.log("Imaging modalities seeded.");

  // 17. Radiology procedures
  const procData = [
    { id: randomUUID(), code: "CXR-PA", name: "Chest X-Ray PA", modalityId: modMap.get("XRAY")!, bodyPart: "Chest", durationMinutes: 15, prepInstructions: "Remove metal above waist" },
    { id: randomUUID(), code: "ABD-US", name: "Abdominal Ultrasound", modalityId: modMap.get("US")!, bodyPart: "Abdomen", durationMinutes: 30, prepInstructions: "NPO 8 hours" },
    { id: randomUUID(), code: "CT-HEAD", name: "CT Head Non-Contrast", modalityId: modMap.get("CT")!, bodyPart: "Head", durationMinutes: 20, prepInstructions: "Remove jewelry" },
    { id: randomUUID(), code: "MRI-BRAIN", name: "MRI Brain", modalityId: modMap.get("MRI")!, bodyPart: "Brain", durationMinutes: 45, prepInstructions: "No contraindicated metal implants" },
    { id: randomUUID(), code: "KUB-XR", name: "KUB X-Ray", modalityId: modMap.get("XRAY")!, bodyPart: "Abdomen", durationMinutes: 15, prepInstructions: "Empty bladder" },
  ];
  for (const p of procData) {
    await db.insert(schema.radiologyProcedures).values(p).onConflictDoNothing();
  }
  console.log("Radiology procedures seeded.");

  // 18. Suppliers
  const supplierData = [
    { id: randomUUID(), name: "PharmaCorp Distribution", contactPerson: "Juan Supplier", phone: "+639170000001" },
    { id: randomUUID(), name: "MedSupply PH", contactPerson: "Maria Supply", phone: "+639170000002" },
  ];
  for (const s of supplierData) {
    await db.insert(schema.suppliers).values(s).onConflictDoNothing();
  }
  const supplierRows = await db.select().from(schema.suppliers);
  const supMap = new Map(supplierRows.map((s) => [s.name, s.id]));
  console.log("Suppliers seeded.");

  // 19. Medications
  const medData = [
    { id: randomUUID(), genericName: "Paracetamol", brandName: "Biogesic", dosageForm: "tablet", strength: "500mg", unit: "tablet", reorderLevel: 100, sellingPrice: "2.50" },
    { id: randomUUID(), genericName: "Amoxicillin", brandName: "Amoxil", dosageForm: "capsule", strength: "500mg", unit: "capsule", reorderLevel: 80, sellingPrice: "15.00" },
    { id: randomUUID(), genericName: "Metformin", brandName: "Glucophage", dosageForm: "tablet", strength: "500mg", unit: "tablet", reorderLevel: 60, sellingPrice: "5.00" },
    { id: randomUUID(), genericName: "Losartan", brandName: "Cozaar", dosageForm: "tablet", strength: "50mg", unit: "tablet", reorderLevel: 60, sellingPrice: "12.00" },
    { id: randomUUID(), genericName: "Omeprazole", brandName: "Losec", dosageForm: "capsule", strength: "20mg", unit: "capsule", reorderLevel: 50, sellingPrice: "8.00" },
  ];
  for (const m of medData) {
    await db.insert(schema.medications).values(m).onConflictDoNothing();
  }
  const medRows = await db.select().from(schema.medications);
  const medMap = new Map(medRows.map((m) => [m.genericName, m.id]));
  console.log("Medications seeded.");

  // 20. Medication batches
  const now = new Date();
  const addMonths = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  };
  const batchData = [
    { id: randomUUID(), medicationId: medMap.get("Paracetamol")!, batchNumber: "B-PARA-001", expirationDate: addMonths(18), quantity: 500, supplierId: supMap.get("PharmaCorp Distribution")! },
    { id: randomUUID(), medicationId: medMap.get("Paracetamol")!, batchNumber: "B-PARA-002", expirationDate: addMonths(6), quantity: 300, supplierId: supMap.get("PharmaCorp Distribution")! },
    { id: randomUUID(), medicationId: medMap.get("Amoxicillin")!, batchNumber: "B-AMOX-001", expirationDate: addMonths(12), quantity: 400, supplierId: supMap.get("MedSupply PH")! },
    { id: randomUUID(), medicationId: medMap.get("Metformin")!, batchNumber: "B-MET-001", expirationDate: addMonths(24), quantity: 200, supplierId: supMap.get("MedSupply PH")! },
    { id: randomUUID(), medicationId: medMap.get("Losartan")!, batchNumber: "B-LOS-001", expirationDate: addMonths(9), quantity: 150, supplierId: supMap.get("PharmaCorp Distribution")! },
    { id: randomUUID(), medicationId: medMap.get("Omeprazole")!, batchNumber: "B-OME-001", expirationDate: addMonths(3), quantity: 250, supplierId: supMap.get("MedSupply PH")! },
  ];
  for (const b of batchData) {
    await db.insert(schema.medicationBatches).values(b).onConflictDoNothing();
  }
  console.log("Medication batches seeded.");

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
