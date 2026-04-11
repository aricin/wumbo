import { getAuthConfig, isHostedAuthConfigured } from "@/lib/auth/config";

describe("getAuthConfig", () => {
  it("falls back to default scopes when unset", () => {
    delete process.env.NEXT_PUBLIC_COGNITO_SCOPES;

    const config = getAuthConfig();

    expect(config.scopes).toEqual(["openid", "email", "profile"]);
  });

  it("detects whether hosted auth is configured", () => {
    const configured = isHostedAuthConfigured({
      cognitoDomain: "https://example.auth.us-west-2.amazoncognito.com",
      clientId: "abc123",
      redirectUri: "http://localhost:3000/api/auth/callback",
      logoutUri: "http://localhost:3000",
      scopes: ["openid"],
    });

    expect(configured).toBe(true);
  });
});
