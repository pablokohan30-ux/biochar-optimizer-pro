import { Link } from "wouter";
import LogoLink from "@/components/LogoLink";

/**
 * Shared marketing footer used on all non-working surfaces (Landing, Pricing,
 * Projects, LCA, Login, legal pages).
 *
 * NOT used on /app (the simulator) — it's a tool, not a marketing page, and the
 * footer would steal vertical space from the charts. Links are still one click
 * away via the top nav on /app.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
        <p className="text-xs text-muted-foreground text-center md:text-left flex-1">
          Empirical model calibrated with peer-reviewed pyrolysis literature data.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link href="/app" className="hover:text-foreground transition-colors">Simulator</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <span className="text-border">·</span>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/legal/security" className="hover:text-foreground transition-colors">Security</Link>
        </div>
      </div>
    </footer>
  );
}
