import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthConfig } from "@/lib/auth/config";
import { clearAuthSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const config = getAuthConfig();
  const localRedirect = new URL("/", request.url);
  const response = NextResponse.redirect(localRedirect);

  clearAuthSession(response);

  if (config.cognitoDomain && config.clientId && config.logoutUri) {
    const cognitoLogoutUrl = new URL("/logout", config.cognitoDomain);
    cognitoLogoutUrl.searchParams.set("client_id", config.clientId);
    cognitoLogoutUrl.searchParams.set("logout_uri", config.logoutUri);

    const logoutResponse = NextResponse.redirect(cognitoLogoutUrl);
    clearAuthSession(logoutResponse);
    return logoutResponse;
  }

  return response;
}
