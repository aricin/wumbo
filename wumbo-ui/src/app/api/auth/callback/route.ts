import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthConfig, isHostedAuthConfigured } from "@/lib/auth/config";
import { logServerEvent } from "@/lib/server/logger";
import {
  attachAuthSession,
  clearPkceCookies,
  readPkceFromRequest,
  type AuthSession,
} from "@/lib/auth/session";

interface TokenExchangeResponse {
  access_token: string;
  expires_in: number;
  id_token?: string | undefined;
  scope?: string | undefined;
  token_type: string;
}

export async function GET(request: NextRequest) {
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

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const pkce = readPkceFromRequest(request);

  if (!code || !state || !pkce || pkce.state !== state) {
    logServerEvent("WARN", "Rejected Cognito callback request.", {
      hasCode: Boolean(code),
      hasPkceState: Boolean(pkce?.state),
      stateMatches: pkce?.state === state,
    });

    return NextResponse.json(
      {
        error: "Invalid or incomplete Cognito callback.",
      },
      {
        status: 400,
      },
    );
  }

  const tokenResponse = await fetch(new URL("/oauth2/token", config.cognitoDomain), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: pkce.verifier,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text();

    logServerEvent("ERROR", "Cognito token exchange failed.", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
    });

    return NextResponse.json(
      {
        error: "Token exchange failed.",
        detail,
      },
      {
        status: 502,
      },
    );
  }

  const tokens = (await tokenResponse.json()) as TokenExchangeResponse;

  const session: AuthSession = {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    tokenType: tokens.token_type,
    scope: tokens.scope,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  const response = NextResponse.redirect(new URL("/", request.url));
  clearPkceCookies(response);
  attachAuthSession(response, session);

  return response;
}
