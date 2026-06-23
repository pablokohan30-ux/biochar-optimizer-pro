/**
 * /product/project-package — full breakdown of the Engineer-tier deliverables.
 *
 * 6 entregables: PDD, Equipment specs, Plant layout, Electrical design,
 * Quality control, Certification documentation.
 *
 * Originally lived as a 6-card grid on the landing. Moved here so the
 * landing stays light. Landing keeps a teaser + CTA pointing here.
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, ClipboardList, Factory, Map, Plug,
  Microscope, Shield, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

interface PackageItem {
  icon: any;
  titleKey: string;
  descKey: string;
  longDescKey: string;
  color: string;
  bg: string;
  border: string;
}

const ITEMS: PackageItem[] = [
  {
    icon: ClipboardList,
    titleKey: "landing:projectPackage.items.pdd.title",
    descKey: "landing:projectPackage.items.pdd.desc",
    longDescKey: "landing:projectPackagePage.items.pdd.long",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  {
    icon: Factory,
    titleKey: "landing:projectPackage.items.equipment.title",
    descKey: "landing:projectPackage.items.equipment.desc",
    longDescKey: "landing:projectPackagePage.items.equipment.long",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    icon: Map,
    titleKey: "landing:projectPackage.items.layout.title",
    descKey: "landing:projectPackage.items.layout.desc",
    longDescKey: "landing:projectPackagePage.items.layout.long",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  {
    icon: Plug,
    titleKey: "landing:projectPackage.items.electrical.title",
    descKey: "landing:projectPackage.items.electrical.desc",
    longDescKey: "landing:projectPackagePage.items.electrical.long",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    icon: Microscope,
    titleKey: "landing:projectPackage.items.quality.title",
    descKey: "landing:projectPackage.items.quality.desc",
    longDescKey: "landing:projectPackagePage.items.quality.long",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  {
    icon: Shield,
    titleKey: "landing:projectPackage.items.certification.title",
    descKey: "landing:projectPackage.items.certification.desc",
    longDescKey: "landing:projectPackagePage.items.certification.long",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
];

export default function ProjectPackage() {
  const { t } = useTranslation(["landing", "common"]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/pricing">
              <Button variant="ghost" size="sm">{t("common:nav.pricing")}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm">{t("common:nav.tryForFree")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-6 w-full">
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
          </button>
        </Link>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-background to-background pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("landing:projectPackage.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            {t("landing:projectPackage.title")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("landing:projectPackage.subtitle")}
          </p>
        </div>
      </section>

      {/* ITEMS — full detail */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 space-y-5">
          {ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <article
                key={item.titleKey}
                className="bg-card border border-border rounded-xl p-6 md:p-7 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        0{idx + 1}
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold leading-tight">
                        {t(item.titleKey)}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {t(item.descKey)}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {t(item.longDescKey, { defaultValue: t(item.descKey) })}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border bg-secondary/20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            {t("landing:projectPackagePage.ctaTitle", { defaultValue: "El paquete completo está en el plan Engineer" })}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("landing:projectPackagePage.ctaBody", {
              defaultValue:
                "PDD, equipos, layout, eléctrico, control de calidad y documentación de certificación — todo generado desde tu proyecto.",
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing">
              <Button size="lg" className="gap-2">
                {t("landing:projectPackagePage.ctaPrimary", { defaultValue: "Ver precios" })} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" className="gap-2">
                {t("landing:projectPackagePage.ctaSecondary", { defaultValue: "Empezar gratis" })}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
