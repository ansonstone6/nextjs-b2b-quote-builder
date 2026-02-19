# Configurable Quote Builder

Next.js app for B2B configurable pricing and quotes: **Prisma** + **Postgres** (e.g. Supabase), server-side pricing rules, PDF export, and optional **AI chat** (OpenAI, Vercel AI SDK, shadcn/ui).

## Tech stack

| Layer | Package |
|-------|---------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Prisma ORM, Postgres |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui + Base UI |
| PDF | `@react-pdf/renderer` |
| AI (optional) | Vercel AI SDK (`ai`), `@ai-sdk/openai` |
| Validation | Zod |

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and adjust.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | **Yes** (for app + Prisma) | Postgres connection string |
| `OPENAI_API_KEY` | No | Only for `/chat` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Only if you use Supabase JS helpers (`src/lib/supabase/*`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Same; falls back to legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | No | Only for `createSupabaseAdminClient`; legacy `SUPABASE_SERVICE_ROLE_KEY` also works |
| `QUOTING_BRAND_NAME` | No | PDF header line |

### Supabase Postgres and IPv4

The **direct** host `db.<project>.supabase.co:5432` is often **IPv6-only**. On many home or office networks you will see Prisma **`P1001` (can’t reach database server)**.

Use the **Session pooler** URI from the dashboard instead: **Project → Connect → Connection pooling → Session mode** (host like `*.pooler.supabase.com`, port `5432`). Put that full URI in `DATABASE_URL`.

Prisma CLI and `tsx` scripts load env in this order (see [`prisma.config.ts`](./prisma.config.ts) and [`prisma/load-env.ts`](./prisma/load-env.ts)):

1. `.env`
2. `.env.local` (overrides)

So you can keep secrets only in `.env.local`. Next.js also reads `.env.local` for `next dev` / `next build`.

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL (use Session pooler on IPv4-only networks).

npx prisma migrate deploy
npm run db:seed

npm run dev
```

- App: [http://localhost:3000](http://localhost:3000) — quotes list and builder.
- AI chat: [http://localhost:3000/chat](http://localhost:3000/chat) — needs `OPENAI_API_KEY`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Production server |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:push` | Push schema without migrations (dev shortcut) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Run [`prisma/seed.ts`](./prisma/seed.ts) (loads `.env` / `.env.local` via `prisma/load-env.ts`) |
| `npm run db:studio` | Prisma Studio |

Seed is also configured in [`prisma.config.ts`](./prisma.config.ts) (`prisma db seed`).

## App routes (high level)

| Path | Description |
|------|-------------|
| `/` | Quotes dashboard (server-rendered) |
| `/quotes/new` | Create quote (client) |
| `/quotes/[id]` | Quote builder: lines, server recalc, PDF, approve, convert to order |
| `/chat` | Optional streaming chat |

REST handlers under `src/app/api/quotes/*`, `src/app/api/clients`, `src/app/api/catalog`, and `src/app/api/chat`.

## Project structure

```
prisma/
  schema.prisma
  migrations/
  seed.ts              # Sample catalog + quotes (imports ./load-env first)
  load-env.ts          # Loads .env + .env.local for tsx scripts
prisma.config.ts       # Prisma CLI: env load, migrations path, seed command

src/
  app/
    page.tsx           # Quotes home
    chat/page.tsx      # AI chat
    quotes/
      new/page.tsx
      [id]/page.tsx
    api/
      quotes/...
      clients/route.ts
      catalog/route.ts
      chat/route.ts
  components/
    app-shell.tsx      # Nav: Quotes, New quote, AI assistant
    quotes/quote-editor.tsx
    chat/...
    ui/
      button.tsx       # Client Button (+ re-exports buttonVariants)
      button-styles.ts # Server-safe buttonVariants (cva)
  lib/
    prisma.ts
    pricing/           # Engine + recalculateQuote
    quotes/            # Serialize, quote numbers
    pdf/               # Quote PDF document
    supabase/          # Optional Supabase clients + key resolution
    ai/...
```

## Quote workflow (short)

1. Create a quote for a client; add line items (product, material, dimensions, quantity, options).
2. Pricing and breakdown are computed on the **server** (`recalculateQuote`); the UI only displays API results.
3. Save header (tax, notes), download PDF, mark **approved**, then **create order** when allowed.

## Optional: AI provider

See existing registration in `src/lib/ai/`. To add a provider: implement an adapter in `src/lib/ai/providers/`, register it in `src/lib/ai/index.ts`, and document env vars in `.env.example`.

### `POST /api/chat`

Streams a chat response. Body includes `messages`, `provider`, `model`, optional `system`, `temperature`, `maxTokens`.

### `GET /api/chat`

Returns registered providers and models.
