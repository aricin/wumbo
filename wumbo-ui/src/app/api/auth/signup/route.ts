import { createManagedLoginStartResponse } from "@/lib/auth/managed-login";

export async function GET() {
  return createManagedLoginStartResponse("/signup");
}
