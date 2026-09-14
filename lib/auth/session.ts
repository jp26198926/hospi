import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors/classes";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
