import { Link } from "wouter";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  return (
    <footer className="border-t border-border py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
        <p className="text-xs text-muted-foreground text-center md:text-left flex-1">
          {t("footer.tagline")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link href="/app" className="hover:text-foreground transition-colors">{t("nav.simulator")}</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</Link>
          <span className="text-border">·</span>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
          <Link href="/legal/security" className="hover:text-foreground transition-colors">{t("footer.security")}</Link>
        </div>
      </div>
    </footer>
  );
}
