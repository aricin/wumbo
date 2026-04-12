import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AuthConfig } from "@/lib/auth/config";

interface AuthConfigCardProps {
  config: AuthConfig;
  hostedAuthReady: boolean;
}

export function AuthConfigCard({ config, hostedAuthReady }: AuthConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <Badge variant={hostedAuthReady ? "success" : "warning"}>
          {hostedAuthReady ? "Managed Login Ready" : "Managed Login Incomplete"}
        </Badge>
        <CardTitle>Cognito configuration</CardTitle>
        <CardDescription>
          This app only needs the browser-facing Cognito wiring for now. Domain APIs stay out of
          scope until we decide the long-term core access pattern.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <DefinitionList
          items={[
            ["Cognito domain", config.cognitoDomain ?? "Missing"],
            ["UI client id", config.clientId ?? "Missing"],
            ["Redirect URI", config.redirectUri ?? "Missing"],
            ["Logout URI", config.logoutUri ?? "Missing"],
            ["Scopes", config.scopes.join(" ") || "Missing"],
            ["UI build label", config.buildLabel ?? "Missing"],
          ]}
        />

        <Separator />

        <div className="rounded-[24px] border border-dashed border-line bg-white/45 p-4 text-sm leading-6 text-olive-700">
          {hostedAuthReady
            ? "This is ready to validate Cognito managed sign-up, sign-in, callback handling, and the local browser session."
            : "Finish the Cognito hosted-login domain and callback/logout values in deploy config for this environment, then try again."}
        </div>
      </CardContent>
    </Card>
  );
}

function DefinitionList({ items }: { items: Array<readonly [string, string]> }) {
  return (
    <dl className="grid gap-4">
      {items.map(([label, value]) => (
        <div className="grid gap-1" key={label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-600">{label}</dt>
          <dd className="break-words text-sm leading-6 text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
