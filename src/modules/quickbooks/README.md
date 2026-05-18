# QuickBooks Online invoice sync

Separate module for B2B **quote-to-invoice** sync using the QuickBooks Online Accounting API.

## Routes

| Path | Purpose |
|------|---------|
| `/quickbooks` | Module hub |
| `/quickbooks/connect` | OAuth connection & status |
| `/quickbooks/quotes` | Approved quotes ready to sync |
| `/quickbooks/sync` | Sync jobs dashboard |
| `/quickbooks/sync/[jobId]` | Step-by-step sync logs |

Approved quotes in the main builder (`/quotes/[id]`) show a **Sync to QuickBooks** panel.

## Sandbox setup

1. Create an app at [Intuit Developer](https://developer.intuit.com/).
2. Enable **QuickBooks Online and Payments** -> **Accounting** scope.
3. Add redirect URI: `http://localhost:3000/api/quickbooks/auth/callback` (or your deployed URL).
4. Copy Client ID and Client Secret into `.env.local`.
5. Set `QBO_ENVIRONMENT=sandbox` and a strong `TOKEN_ENCRYPTION_KEY` (32+ characters).
6. Run the app -> **QuickBooks hub** -> **Connect with QuickBooks** -> sign in to a sandbox company.
7. Restart `npm run dev` after editing `.env.local` (Next.js only reads env on startup).

## Troubleshooting OAuth

| Symptom | Fix |
|---------|-----|
| Intuit says **"undefined didn't connect"** | `QBO_CLIENT_ID` is missing, still the `.env.example` placeholder, or wrong app. Copy **Development** Client ID from Intuit -> Keys & OAuth. Restart the dev server. |
| Redirect / connection error | `QBO_REDIRECT_URI` must match **exactly** what is listed in Intuit (including `http` vs `https`, host, port, path). Local default: `http://localhost:3000/api/quickbooks/auth/callback` |
| Works locally, fails on Vercel | Add production redirect URI in Intuit and set `QBO_REDIRECT_URI` to `https://your-app.vercel.app/api/quickbooks/auth/callback` in Vercel env vars. |

The connect page shows validation errors before sending you to Intuit when configuration is incomplete.

## Environment variables

See root `.env.example` for `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT`, `TOKEN_ENCRYPTION_KEY`.

## Database tables

- `integration_connections` - realm ID, encrypted access/refresh tokens
- `external_references` - QuickBooks customer & invoice IDs per quote (idempotency)
- `sync_jobs` - pending / running / success / failed, retry count, idempotency key
- `sync_logs` - steps: token refresh, customer search/create, invoice create, failures, retries

## Sync flow

1. Quote must be **approved** (or already **synced**).
2. **Sync to QuickBooks** creates a job with idempotency key `quickbooks-invoice:{quoteId}`.
3. Customer is found by email or created with billing address from the client record.
4. Invoice line items use quantity, unit price (from line total ÷ qty), and description.
5. On success, quote status becomes **synced**; duplicate syncs return the existing invoice ID.
