# Monday.com module

Pushes approved orders to a Monday.com board as production items, with the quote PDF attached. Same reliability shape as the QuickBooks module (idempotent sync jobs, retries, per-job step logs, visitor-scoped connections).

## Surface

- `/monday` — hub: connection status, default board, order count, recent sync activity.
- `/monday/connect` — paste personal API token, pick a default board.
- `/monday/orders` — every order with its Monday item link (if synced).
- A panel on the quote view (when an order exists) lets you push / retry manually.

Conversion `POST /api/quotes/[id]/convert-order` auto-fires a Monday sync if the visitor has a connected board.

## Connection

Monday uses personal API tokens, not OAuth. The user pastes a token on `/monday/connect`; we validate it with a `me` query and persist the encrypted token (same `TOKEN_ENCRYPTION_KEY` the QuickBooks module uses) plus the Monday account id + name. Connections are scoped by `qbo_demo_session` cookie so every visitor connects their own Monday workspace.

## Sync contract

`syncOrderToMonday(orderId, { demoSessionId })`:

1. Look up the visitor's Monday connection + selected `defaultBoardId`.
2. Idempotency check on `(quoteId, provider=monday, entityType=board_item, connectionId)`. If a Monday item already exists for this order in this realm, return early.
3. Idempotency key: `monday-item:{connectionId}:{orderId}`. Reuses the same `SyncJob` row across retries.
4. Fetch the board's columns. Heuristically route order fields → first matching column:
   - text + title ~ `client|customer|company` → client company name
   - status + title ~ `status|stage` → mapped from `OrderStatus`
   - numbers + title ~ `total|amount|price` → quote grand total
   - date + title ~ `due|deliver|ship` → today + 14 days
   - file + title ~ `quote|pdf|attach|file` → quote PDF (uploaded via multipart `add_file_to_column`)
5. `create_item` mutation. Record the new item id + url in `external_references` with `connectionId`.
6. Best-effort: render the quote PDF via the shared renderer (`src/lib/pdf/render-quote.tsx`) and upload to the first Files-type column on the item. Upload failure does NOT fail the sync — the item creation already succeeded.

All steps emit `sync_logs` rows. Failures set the `SyncJob` to `failed` with the error message; the Retry button replays the job (reusing the same idempotency key, so we don't create duplicate items on the second pass).

## Column mapping

Heuristic for the demo (find-first-matching-column). A production iteration would either:

- Add an admin page to map order fields → column ids per board, OR
- Standardize on a Monday board template the studio creates, with known column ids.

Either path drops in without changing `syncOrderToMonday` — the column resolution is the only piece that knows about column types.
