import { createManagedLoginStartResponse } from "@/lib/auth/managed-login";

export async function GET() {
  return createManagedLoginStartResponse("/oauth2/authorize");
}
