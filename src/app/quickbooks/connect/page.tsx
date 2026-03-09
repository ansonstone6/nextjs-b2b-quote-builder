import Link from "next/link";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import { getQboConfig } from "@/modules/quickbooks/lib/config";
import { ConnectionPanel } from "@/modules/quickbooks/components/connection-panel";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ connected?: string; error?: string }> };

export default async function QuickBooksConnectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cfg = getQboConfig();
  const connection = await getActiveQuickBooksConnection();

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connect QuickBooks</h1>
        <p className="text-muted-foreground text-sm">
          Link your QuickBooks Online sandbox or production company. Tokens are encrypted at rest and
          refreshed automatically.
        </p>
      </div>
      <ConnectionPanel
        configured={cfg.configured}
        connected={!!connection}
        redirectUri={cfg.redirectUri || null}
        clientIdHint={cfg.clientIdHint}
        validationErrors={cfg.validation.errors}
        validationWarnings={cfg.validation.warnings}
        connection={
          connection
            ? {
                realmId: connection.realmId,
                companyName: connection.companyName,
                connectedAt: connection.connectedAt.toISOString(),
                accessTokenExpiresAt: connection.accessTokenExpiresAt.toISOString(),
              }
            : null
        }
        environment={cfg.environment}
        flashConnected={params.connected === "1"}
        flashError={params.error ?? null}
      />
      <Link href="/quickbooks" className={cn(buttonVariants({ variant: "ghost" }))}>
        Back to QuickBooks hub
      </Link>
    </main>
  );
}
