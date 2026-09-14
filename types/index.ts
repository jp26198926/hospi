export * from "@/lib/types/enums";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}
