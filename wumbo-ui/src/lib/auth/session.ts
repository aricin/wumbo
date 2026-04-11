import { Buffer } from "node:buffer";

import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "wumbo_auth_session";
const PKCE_STATE_COOKIE_NAME = "wumbo_pkce_state";
const PKCE_VERIFIER_COOKIE_NAME = "wumbo_pkce_verifier";

export interface AuthSession {
  accessToken: string;
  idToken?: string | undefined;
  expiresAt: number;
  scope?: string | undefined;
  tokenType: string;
}

export interface PkceCookieState {
  state: string;
  verifier: string;
}

export async function readAuthSession(): Promise<AuthSession | undefined> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    return undefined;
  }
}

export function attachAuthSession(response: NextResponse, session: AuthSession): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: JSON.stringify(session),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export function clearAuthSession(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(0),
  });
}

export function attachPkceCookies(response: NextResponse, pkce: PkceCookieState): void {
  const commonCookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(),
    path: "/",
  };

  response.cookies.set({
    name: PKCE_STATE_COOKIE_NAME,
    value: pkce.state,
    ...commonCookie,
  });
  response.cookies.set({
    name: PKCE_VERIFIER_COOKIE_NAME,
    value: pkce.verifier,
    ...commonCookie,
  });
}

export function clearPkceCookies(response: NextResponse): void {
  for (const cookieName of [PKCE_STATE_COOKIE_NAME, PKCE_VERIFIER_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie(),
      path: "/",
      expires: new Date(0),
    });
  }
}

export function readPkceFromRequest(request: NextRequest): PkceCookieState | undefined {
  const state = request.cookies.get(PKCE_STATE_COOKIE_NAME)?.value;
  const verifier = request.cookies.get(PKCE_VERIFIER_COOKIE_NAME)?.value;

  if (!state || !verifier) {
    return undefined;
  }

  return {
    state,
    verifier,
  };
}

export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const segments = token.split(".");

  if (segments.length < 2 || !segments[1]) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}
