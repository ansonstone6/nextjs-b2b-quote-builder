# Monday.com integration — end-to-end test

Verifies the integration with a real Monday workspace: connection, board picker, auto-sync on order conversion, manual sync, idempotency, multi-tenant scoping, failure + retry, and PDF attachment.

Time: ~10 minutes. Requires a Monday account (free trial is fine).

## Configure

### 1. Monday personal API token

1. Sign in at https://monday.com.
2. Avatar (top-right) → **Developers** → **My access tokens**.
3. Click **Show** on the v2 token and copy the `eyJ…` string.

### 2. Target board

Use any board you already have, or create a new one. To exercise every column-mapping path and the PDF attachment, the board should have:

- A **Status** column (any name containing `status` or `stage`)
- A **Numbers** column (name containing `total`, `amount`, or `price`)
- A **Date** column (name containing `due`, `deliver`, or `ship`)
- A **Text** column (name containing `client`, `customer`, or `company`)
- A **Files** column (name containing `quote`, `pdf`, `attach`, or `file`)

Columns the heuristic can't match are skipped — the sync still succeeds, just with fewer populated cells.

### 3. Environment

No new env vars needed. The integration reuses `TOKEN_ENCRYPTION_KEY` (the same key the QuickBooks module uses) and defaults the Monday GraphQL URL to `https://api.monday.com/v2`.

```bash
npm run dev
```

## Walkthrough

### Connect

1. Open http://localhost:3000/monday/connect.
2. Paste the token, click **Connect**.
   - Expected: green "Connected as [Your Name]" message, account name in the badge.
3. The board list appears below. Click **Use this board** on the target board.
4. Open http://localhost:3000/monday — the hub shows "Connected" + "Default board · [board id]".

### Test 1 — Auto-sync on conversion (the headline test)

1. Open `QUO-2026-00001` (Maison Avery draft).
2. Click **Mark approved** → then **Create order from quote**.
3. Switch to your Monday board within 2-3 seconds.

Expected on Monday:

- A new item named `QUO-2026-00001 — Maison Avery Couture`.
- Client column populated with the company name.
- Status column = "Working on it".
- Total column ≈ the quote's grand total.
- Due-date column = today + 14 days.
- Files column has the quote PDF attached (if the column exists).

Back on the quote page: the Monday sync panel shows **Pushed to Monday** with the item id and a clickable **Open item on Monday** link.

### Test 2 — Idempotency

1. Open `/monday/orders`, find an order without an item yet, open it.
2. Click **Push to Monday** manually.
3. Click **Push to Monday** again.

Expected: no duplicate item is created on Monday. The API short-circuits with `alreadySynced: true` and the panel still shows the original item id.

### Test 3 — Multi-tenant scoping

1. Open the demo in an incognito window (or a second browser).
2. Visit `/monday` — that visitor sees **Not connected**. Your token is not leaked across sessions.
3. (Optional) Connect a different Monday workspace from incognito and sync the same seed quote there — the two visitors do not collide. Each has their own `external_references` row scoped by `connectionId`.

### Test 4 — Failure + retry

1. From `/monday/connect`, click **Disconnect**.
2. Open a quote with an order, click **Push to Monday** — disabled, "Connect Monday" link visible.
3. Reconnect, retry the sync.
4. To exercise the retry path: temporarily change the default board id to something invalid (via the API: `POST /api/monday/default-board` with a bogus `boardId`), trigger a sync, watch it fail with a Monday API error logged on the `SyncJob`, restore the real board id, then click **Retry sync** in the panel. The retry reuses the same `SyncJob` id and idempotency key, so no duplicate item is created.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 400 "Not Authorized" on connect | Token wrong / expired / different region | Re-copy from **My access tokens** |
| Connect succeeds but board list is empty | Token's user has no board access | Grant the user access to at least one board |
| Sync 500s with "No default board selected" | Forgot to click "Use this board" | Pick one on `/monday/connect` |
| Item created but no PDF attached | Board has no Files-type column, or its title doesn't match `quote|pdf|attach|file` | Add a Files column named "Quote PDF" |
| Auto-sync doesn't fire after convert | Visitor cookie doesn't have a Monday connection | Connect first, then convert. Manual **Push to Monday** still works either way |
| Status / due-date columns empty | Column titles don't match the heuristic (`status|stage`, `due|deliver|ship`) | Rename them, or accept the heuristic |

## What the integration does (and doesn't)

**Does**

- Personal API token auth, validated with a `me` query before persistence
- Encrypted-at-rest token storage (same key as the QuickBooks module)
- Per-visitor scoping via the `qbo_demo_session` cookie
- GraphQL: `me`, `boards`, `boards.columns`, `create_item`, `add_file_to_column` (multipart)
- Idempotent sync jobs keyed by `(connectionId, orderId)`
- Per-step `sync_logs` for diagnostics; retry reuses the same job row
- `external_references` row per `(quote, provider=monday, entityType=board_item, connectionId)`
- Best-effort PDF upload — item creation still succeeds if no Files column exists
- Auto-trigger from `POST /api/quotes/[id]/convert-order` (fire-and-forget, doesn't block the conversion response)

**Doesn't (yet)**

- Admin UI to map order fields → column ids per board. Today's mapping is heuristic (find-first-matching-column by type + title regex). A production iteration would add a per-board mapping table; the rest of the sync code wouldn't change.
- Monday OAuth. Personal tokens are simpler and match how Monday recommends internal apps; OAuth is a drop-in replacement on the connect route.
- Webhook ingestion (status changes on Monday flowing back into the order). Out of scope for Phase 1.
