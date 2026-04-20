import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ArrowRight } from "lucide-react";
import LogoLink from "@/components/LogoLink";

/**
 * Shared marketing footer used on all non-working surfaces (Landing, Pricing,
 * Projects, LCA, Login, legal pages).
 *
 * NOT used on /app (the simulator) — it's a tool, not a marketing page, and the
 * footer would steal vertical space from the charts. Links are still one click
 * away via the top nav on /app.
 *
 * Includes a "Verify project by BOP ID" search so certifiers / partners who
 * receive a PDF stamped with `BOP-YYYY-NNNN` can confirm the project is
 * registered in one keystroke from anywhere on the site.
 */
export default function SiteFooter() {
  const { t } = useTranslation("common");
  const [, setLocation] = useLocation();
  const [bopQuery, setBopQuery] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = bopQuery.trim().toUpperCase();
    if (!raw) return;
    // Normalize — the verify endpoint accepts BOP-YYYY-NNNN format.
    // If the user typed just the numeric suffix, assume current year.
    let id = raw;
    if (/^\d{1,6}$/.test(raw)) {
      id = `BOP-${new Date().getFullYear()}-${raw.padStart(4, "0")}`;
    }
    setLocation(`/verify/${id}`);
  };

  return (
    <footer className="border-t border-border py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col gap-6">
        {/* Row 1: verify search (prominent, certifier-facing) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">
              {t("footer.verifyTitle", { defaultValue: "Verificar un proyecto" })}
            </span>
          </div>
          <form onSubmit={handleVerify} className="flex-1 flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={bopQuery}
              onChange={(e) => setBopQuery(e.target.value)}
              placeholder={t("footer.verifyPlaceholder", { defaultValue: "BOP-2026-0042" })}
              className="flex-1 min-w-0 px-3 py-1.5 text-xs font-mono bg-background border border-border rounded-md focus:border-primary focus:outline-none"
              aria-label={t("footer.verifyAriaLabel", { defaultValue: "Ingresá un BOP ID" })}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex-shrink-0"
            >
              {t("footer.verifyButton", { defaultValue: "Verificar" })}
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground sm:max-w-[220px] leading-snug">
            {t("footer.verifyHint", {
              defaultValue: "¿Recibiste un PDF con un código BOP? Pegá el ID acá para confirmarlo.",
            })}
          </p>
        </div>

        {/* Row 2: classic nav links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <p className="text-xs text-muted-foreground text-center md:text-left flex-1">
            {t("footer.tagline")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/app" className="hover:text-foreground transition-colors">{t("nav.simulator")}</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</Link>
            <Link href="/company/about" className="hover:text-foreground transition-colors">{t("footer.about", { defaultValue: "About" })}</Link>
            <Link href="/company/partners" className="hover:text-foreground transition-colors">{t("footer.partners", { defaultValue: "Partners" })}</Link>
            <Link href="/pricing#contact" className="hover:text-foreground transition-colors">{t("footer.contact")}</Link>
            <span className="text-border">·</span>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <Link href="/legal/security" className="hover:text-foreground transition-colors">{t("footer.security")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
