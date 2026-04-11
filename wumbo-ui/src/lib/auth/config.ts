export interface AuthConfig {
  cognitoDomain?: string | undefined;
  clientId?: string | undefined;
  redirectUri?: string | undefined;
  logoutUri?: string | undefined;
  scopes: string[];
}

export function getAuthConfig(): AuthConfig {
  return {
    cognitoDomain: normalizeUrl(process.env.NEXT_PUBLIC_COGNITO_DOMAIN),
    clientId: readOptional("NEXT_PUBLIC_COGNITO_CLIENT_ID"),
    redirectUri: readOptional("NEXT_PUBLIC_COGNITO_REDIRECT_URI"),
    logoutUri: readOptional("NEXT_PUBLIC_COGNITO_LOGOUT_URI"),
    scopes: readScopes(),
  };
}

export function isHostedAuthConfigured(config: AuthConfig): config is AuthConfig & {
  cognitoDomain: string;
  clientId: string;
  redirectUri: string;
} {
  return Boolean(config.cognitoDomain && config.clientId && config.redirectUri);
}

function readScopes(): string[] {
  const rawValue = process.env.NEXT_PUBLIC_COGNITO_SCOPES?.trim();

  if (!rawValue) {
    return ["openid", "email", "profile"];
  }

  return rawValue
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope !== "");
}

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/\/+$/, "");
}
