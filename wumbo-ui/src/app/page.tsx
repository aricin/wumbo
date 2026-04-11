import { Badge } from "@/components/ui/badge";
import { AuthConfigCard } from "@/features/auth/components/auth-config-card";
import { AuthSessionCard } from "@/features/auth/components/auth-session-card";
import { TokenPreviewCard } from "@/features/auth/components/token-preview-card";
import { getAuthConfig, isHostedAuthConfigured } from "@/lib/auth/config";
import { decodeJwtClaims, readAuthSession } from "@/lib/auth/session";

export default async function HomePage() {
  const config = getAuthConfig();
  const session = await readAuthSession();
  const hostedAuthReady = isHostedAuthConfigured(config);
  const accessTokenClaims = session?.accessToken ? decodeJwtClaims(session.accessToken) : null;
  const idTokenClaims = session?.idToken ? decodeJwtClaims(session.idToken) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="space-y-5 pt-2">
        <Badge>Wumbo UI Foundation</Badge>
        <div className="space-y-4">
          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-none tracking-[-0.05em] text-ink sm:text-6xl">
            Prove Cognito cleanly first, then build the real product with confidence.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-olive-700">
            This first pass gives us a real frontend foundation without pretending the rest of the
            app is settled yet. We are keeping the UI intentionally small, preserving the working
            Cognito flow, and putting the long-term standards in place now.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AuthConfigCard config={config} hostedAuthReady={hostedAuthReady} />
        <AuthSessionCard hostedAuthReady={hostedAuthReady} session={session} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <TokenPreviewCard
          description="Decoded locally for inspection only. These claims help confirm the browser session and token issuance path."
          payload={accessTokenClaims ?? { message: "Sign in to inspect the access token claims." }}
          title="Access token claims"
        />
        <TokenPreviewCard
          description="Useful for checking user attributes and group propagation once Cognito is fully wired."
          payload={idTokenClaims ?? { message: "Sign in to inspect the ID token claims." }}
          title="ID token claims"
        />
      </section>
    </main>
  );
}
