export const PatientStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DECEASED: "deceased",
  MERGED: "merged",
} as const;
export type PatientStatus = (typeof PatientStatus)[keyof typeof PatientStatus];

export const Sex = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  UNKNOWN: "unknown",
} as const;
export type Sex = (typeof Sex)[keyof typeof Sex];

export const BloodType = {
  A_POS: "A+", A_NEG: "A-",
  B_POS: "B+", B_NEG: "B-",
  AB_POS: "AB+", AB_NEG: "AB-",
  O_POS: "O+", O_NEG: "O-",
} as const;
export type BloodType = (typeof BloodType)[keyof typeof BloodType];

export const EncounterType = {
  OUTPATIENT: "outpatient",
  EMERGENCY: "emergency",
  INPATIENT: "inpatient",
  FOLLOW_UP: "follow_up",
  LABORATORY_ONLY: "laboratory_only",
  RADIOLOGY_ONLY: "radiology_only",
  PHARMACY_WALK_IN: "pharmacy_walk_in",
  CONSULTATION: "consultation",
} as const;
export type EncounterType = (typeof EncounterType)[keyof typeof EncounterType];

export const EncounterStatus = {
  REGISTERED: "registered",
  WAITING: "waiting",
  IN_TRIAGE: "in_triage",
  READY: "ready",
  IN_CONSULTATION: "in_consultation",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type EncounterStatus = (typeof EncounterStatus)[keyof typeof EncounterStatus];

export const AppointmentStatus = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const QueueType = {
  RECEPTION: "reception",
  TRIAGE: "triage",
  CONSULTATION: "consultation",
  LABORATORY: "laboratory",
  RADIOLOGY: "radiology",
  PHARMACY: "pharmacy",
} as const;
export type QueueType = (typeof QueueType)[keyof typeof QueueType];

export const QueuePriority = {
  NORMAL: "normal",
  URGENT: "urgent",
  EMERGENCY: "emergency",
} as const;
export type QueuePriority = (typeof QueuePriority)[keyof typeof QueuePriority];

export const QueueStatus = {
  WAITING: "waiting",
  CALLED: "called",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

export const TriageCategory = {
  EMERGENCY: "emergency",
  URGENT: "urgent",
  SEMI_URGENT: "semi-urgent",
  NON_URGENT: "non-urgent",
  STABLE: "stable",
} as const;
export type TriageCategory = (typeof TriageCategory)[keyof typeof TriageCategory];

export const ConsultationStatus = {
  DRAFT: "draft",
  FINALIZED: "finalized",
} as const;
export type ConsultationStatus = (typeof ConsultationStatus)[keyof typeof ConsultationStatus];

export const DiagnosisType = {
  CLINICAL: "clinical",
  PROVISIONAL: "provisional",
  ADMITTING: "admitting",
  DISCHARGE: "discharge",
  FINAL: "final",
} as const;
export type DiagnosisType = (typeof DiagnosisType)[keyof typeof DiagnosisType];

export const DiagnosisStatus = {
  ACTIVE: "active",
  ENTERED_IN_ERROR: "entered-in-error",
  RESOLVED: "resolved",
} as const;
export type DiagnosisStatus = (typeof DiagnosisStatus)[keyof typeof DiagnosisStatus];

export const OrderType = {
  LABORATORY: "laboratory",
  RADIOLOGY: "radiology",
  MEDICATION: "medication",
  PROCEDURE: "procedure",
  REFERRAL: "referral",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  DRAFT: "draft",
  ORDERED: "ordered",
  ACKNOWLEDGED: "acknowledged",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SpecimenStatus = {
  COLLECTED: "collected",
  IN_PROCESSING: "in_processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;
export type SpecimenStatus = (typeof SpecimenStatus)[keyof typeof SpecimenStatus];

export const LabResultStatus = {
  ENTERED: "entered",
  VALIDATED: "validated",
  RELEASED: "released",
  AMENDED: "amended",
} as const;
export type LabResultStatus = (typeof LabResultStatus)[keyof typeof LabResultStatus];

export const StudyStatus = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;
export type StudyStatus = (typeof StudyStatus)[keyof typeof StudyStatus];

export const ReportStatus = {
  DRAFT: "draft",
  FINALIZED: "finalized",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const PrescriptionStatus = {
  PENDING: "pending",
  DISPENSED: "dispensed",
  CANCELLED: "cancelled",
} as const;
export type PrescriptionStatus = (typeof PrescriptionStatus)[keyof typeof PrescriptionStatus];

export const DispensingStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
} as const;
export type DispensingStatus = (typeof DispensingStatus)[keyof typeof DispensingStatus];

export const StockMovementType = {
  IN: "IN",
  OUT: "OUT",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER: "TRANSFER",
  EXPIRED: "EXPIRED",
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
