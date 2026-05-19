import Link from "next/link";

const mainNav = [
  { href: "/", label: "Quotes" },
  { href: "/quotes/new", label: "New quote" },
  { href: "/catalog", label: "Catalog" },
  { href: "/admin", label: "Admin" },
];

const quickbooksNav = [
  { href: "/quickbooks", label: "QuickBooks hub" },
  { href: "/quickbooks/connect", label: "Connect" },
  { href: "/quickbooks/quotes", label: "QB quotes" },
  { href: "/quickbooks/sync", label: "Sync dashboard" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="shrink-0 border-b bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            Custom Framing Studio · CPQ
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <span className="text-border hidden sm:inline">|</span>
            {quickbooksNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link href="/chat" className="hover:text-foreground">
              AI assistant
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </>
  );
}
