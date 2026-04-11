import { NextResponse } from "next/server";

import { getAuthConfig, isHostedAuthConfigured } from "@/lib/auth/config";
import { createPkcePair, createState } from "@/lib/auth/pkce";
import { attachPkceCookies } from "@/lib/auth/session";

type ManagedLoginPath = "/oauth2/authorize" | "/signup";

export function createManagedLoginStartResponse(pathname: ManagedLoginPath): NextResponse {
  const config = getAuthConfig();

  if (!isHostedAuthConfigured(config)) {
    return NextResponse.json(
      {
        error: "Cognito managed-login configuration is incomplete.",
      },
      {
        status: 500,
      },
    );
  }

  const { challenge, verifier } = createPkcePair();
  const state = createState();

  const managedLoginUrl = new URL(pathname, config.cognitoDomain);
  managedLoginUrl.searchParams.set("client_id", config.clientId);
  managedLoginUrl.searchParams.set("redirect_uri", config.redirectUri);
  managedLoginUrl.searchParams.set("response_type", "code");
  managedLoginUrl.searchParams.set("scope", config.scopes.join(" "));
  managedLoginUrl.searchParams.set("state", state);
  managedLoginUrl.searchParams.set("code_challenge_method", "S256");
  managedLoginUrl.searchParams.set("code_challenge", challenge);

  const response = NextResponse.redirect(managedLoginUrl);
  attachPkceCookies(response, {
    state,
    verifier,
  });

  return response;
}
