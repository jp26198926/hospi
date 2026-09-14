export const PERMISSIONS = {
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",
  AUDIT_VIEW: "audit.view",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
  DASHBOARD_VIEW: "dashboard.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
  LAB_TECH: "lab_technician",
  RADIOLOGIST: "radiologist",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
  INVENTORY_OFFICER: "inventory_officer",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.DOCTOR]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.NURSE]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.RECEPTIONIST]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.LAB_TECH]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.RADIOLOGIST]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.PHARMACIST]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.CASHIER]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.INVENTORY_OFFICER]: [PERMISSIONS.DASHBOARD_VIEW],
};
