import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthSession } from "@/lib/auth/session";

interface AuthSessionCardProps {
  hostedAuthReady: boolean;
  session?: AuthSession | undefined;
}

export function AuthSessionCard({ hostedAuthReady, session }: AuthSessionCardProps) {
  const expiresAt = session ? new Date(session.expiresAt).toLocaleString() : "Not signed in";

  return (
    <Card>
      <CardHeader>
        <Badge variant={session ? "success" : "neutral"}>
          {session ? "Session Active" : "No Session"}
        </Badge>
        <CardTitle>Auth smoke flow</CardTitle>
        <CardDescription>
          The current UI intentionally stays small: prove Cognito sign-up and sign-in cleanly
          before we commit to the richer product surface.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <dl className="grid gap-4">
          <div className="grid gap-1">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-600">Expires at</dt>
            <dd className="text-sm leading-6 text-ink">{expiresAt}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-600">Token type</dt>
            <dd className="text-sm leading-6 text-ink">{session?.tokenType ?? "Not signed in"}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-600">Granted scope</dt>
            <dd className="text-sm leading-6 text-ink">{session?.scope ?? "Not signed in"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          {hostedAuthReady ? (
            <Button asChild>
              <a href="/api/auth/signup">Create smoke user</a>
            </Button>
          ) : (
            <Button disabled>Create smoke user</Button>
          )}
          {hostedAuthReady ? (
            <Button asChild variant="secondary">
              <a href="/api/auth/login">Sign in with Cognito</a>
            </Button>
          ) : (
            <Button disabled variant="secondary">
              Sign in with Cognito
            </Button>
          )}
          <Button asChild variant="outline">
            <a href="/api/auth/logout">Sign out</a>
          </Button>
        </div>

        <div className="rounded-[24px] border border-dashed border-line bg-white/45 p-4 text-sm leading-6 text-olive-700">
          Recommended path: start with self sign-up, complete email confirmation in Cognito, land
          back in the app, and confirm the browser session is established.
        </div>
      </CardContent>
    </Card>
  );
}
