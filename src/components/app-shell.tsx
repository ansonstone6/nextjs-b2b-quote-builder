import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="shrink-0 border-b bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-semibold tracking-tight">
          Quote builder
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Quotes
          </Link>
          <Link href="/quotes/new" className="hover:text-foreground">
            New quote
          </Link>
          <Link href="/chat" className="hover:text-foreground">
            AI assistant
          </Link>
        </nav>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </>
  );
}
