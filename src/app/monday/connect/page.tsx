import { getMondayConfig } from "@/modules/monday/lib/config";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";
import { MondayConnectPanel } from "@/modules/monday/components/monday-connect-panel";

export const dynamic = "force-dynamic";

export default async function MondayConnectPage() {
  const cfg = getMondayConfig();
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveMondayConnection(demoSessionId);
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connect Monday.com</h1>
        <p className="text-muted-foreground text-sm">
          Paste a personal API token from monday.com → Profile → Developer → My access tokens.
          Token is encrypted at rest with the same key the QuickBooks module uses.
        </p>
      </div>
      <MondayConnectPanel
        configured={cfg.configured}
        validationErrors={cfg.validation.errors}
        connection={
          connection
            ? {
                id: connection.id,
                accountId: connection.realmId,
                accountName: connection.companyName,
                defaultBoardId: connection.defaultBoardId,
                connectedAt: connection.connectedAt.toISOString(),
              }
            : null
        }
      />
    </main>
  );
}
