"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  configured: boolean;
  connected: boolean;
  environment: string;
  redirectUri: string | null;
  clientIdHint: string | null;
  validationErrors: string[];
  validationWarnings: string[];
  connection: {
    realmId: string;
    companyName: string | null;
    connectedAt: string;
    accessTokenExpiresAt: string;
  } | null;
  flashConnected?: boolean;
  flashError?: string | null;
};

export function ConnectionPanel({
  configured,
  connected,
  environment,
  redirectUri,
  clientIdHint,
  validationErrors,
  validationWarnings,
  connection,
  flashConnected,
  flashError,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection status</CardTitle>
        <CardDescription>
          Use an Intuit Developer app with Accounting scope. Sandbox is recommended for demos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={configured ? "secondary" : "destructive"}>
            {configured ? "Env configured" : "Configuration incomplete"}
          </Badge>
          <Badge variant={connected ? "secondary" : "outline"}>
            {connected ? `Connected (${environment})` : "Disconnected"}
          </Badge>
        </div>

        {flashConnected ? (
          <p className="text-sm text-green-700 dark:text-green-400">QuickBooks connected successfully.</p>
        ) : null}
        {flashError ? (
          <p className="text-destructive text-sm whitespace-pre-wrap">{flashError}</p>
        ) : null}

        {!configured && validationErrors.length > 0 ? (
          <ul className="text-destructive list-disc space-y-1 pl-5 text-sm">
            {validationErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        {validationWarnings.length > 0 ? (
          <ul className="text-amber-700 dark:text-amber-400 list-disc space-y-1 pl-5 text-sm">
            {validationWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        {configured ? (
          <dl className="text-muted-foreground grid gap-2 text-sm">
            {clientIdHint ? (
              <div>
                <dt>Client ID (prefix)</dt>
                <dd className="font-mono text-foreground">{clientIdHint}</dd>
              </div>
            ) : null}
            {redirectUri ? (
              <div>
                <dt>Redirect URI</dt>
                <dd className="font-mono text-foreground break-all">{redirectUri}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {connection ? (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Realm / company ID</dt>
              <dd className="font-mono">{connection.realmId}</dd>
            </div>
            {connection.companyName ? (
              <div>
                <dt className="text-muted-foreground">Company</dt>
                <dd>{connection.companyName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Connected</dt>
              <dd>{new Date(connection.connectedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Access token expires</dt>
              <dd>{new Date(connection.accessTokenExpiresAt).toLocaleString()}</dd>
            </div>
          </dl>
        ) : null}

        {configured ? (
          <a href="/api/quickbooks/auth/connect" className={cn(buttonVariants())}>
            {connected ? "Reconnect QuickBooks" : "Connect with QuickBooks"}
          </a>
        ) : (
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              In{" "}
              <a
                href="https://developer.intuit.com/"
                className="text-foreground underline"
                target="_blank"
                rel="noreferrer"
              >
                Intuit Developer
              </a>
              , open your app -> <strong>Keys &amp; OAuth</strong> -> copy the <strong>Development</strong>{" "}
              Client ID and Client Secret (not Production unless you use a live company).
            </p>
            <p>
              Add redirect URI exactly:{" "}
              <code className="text-foreground">http://localhost:3000/api/quickbooks/auth/callback</code>
            </p>
            <p>
              Copy variables from <code>.env.example</code> into <code>.env.local</code>, then restart{" "}
              <code>npm run dev</code>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
