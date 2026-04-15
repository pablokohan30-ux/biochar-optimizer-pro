import { Link, useLocation } from "wouter";
import LogoLink from "@/components/LogoLink";
import { ArrowLeft } from "lucide-react";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/security", label: "Security" },
];

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <Link href="/">
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to home
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar nav */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Legal</h3>
              <nav className="space-y-1">
                {LEGAL_PAGES.map(p => (
                  <Link key={p.href} href={p.href}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        location === p.href
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      }`}
                    >
                      {p.label}
                    </button>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <article className="lg:col-span-3 space-y-6">
            <header className="space-y-2 pb-6 border-b border-border">
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
            </header>

            <div className="prose prose-invert prose-sm max-w-none legal-content">
              {children}
            </div>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Biochar Optimizer Pro</span>
          <div className="flex items-center gap-4">
            {LEGAL_PAGES.map(p => (
              <Link key={p.href} href={p.href}>
                <span className="hover:text-foreground cursor-pointer">{p.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        .legal-content section { margin-bottom: 1.75rem; }
        .legal-content h2 { font-size: 1.125rem; font-weight: 700; color: var(--color-foreground); margin-bottom: 0.75rem; margin-top: 0; }
        .legal-content h3 { font-size: 1rem; font-weight: 600; color: var(--color-foreground); margin: 1rem 0 0.5rem; }
        .legal-content p { font-size: 0.875rem; color: var(--color-muted-foreground); line-height: 1.7; margin-bottom: 0.75rem; }
        .legal-content ul { font-size: 0.875rem; color: var(--color-muted-foreground); line-height: 1.7; padding-left: 1.25rem; margin-bottom: 0.75rem; list-style: disc; }
        .legal-content li { margin-bottom: 0.25rem; }
        .legal-content a { color: var(--color-primary); text-decoration: underline; }
        .legal-content strong { color: var(--color-foreground); font-weight: 600; }
      `}</style>
    </div>
  );
}
