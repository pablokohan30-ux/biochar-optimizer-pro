/**
 * About / Company Story page — `/company/about`
 *
 * Product-first narrative (no team). Explains the problem,
 * the digital-infrastructure approach, and the values driving the product.
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, Zap, TrendingUp,
  FlaskConical, Database, ShieldCheck, Globe,
  AlertTriangle, Sparkles, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

const VALUES = [
  { icon: FlaskConical, key: "scienceFirst" },
  { icon: ShieldCheck, key: "compliantByDesign" },
  { icon: Database, key: "dataDriven" },
  { icon: Globe, key: "accessible" },
];

export default function About() {
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

      <div className="max-w-5xl mx-auto px-4 pt-6 w-full">
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
          </button>
        </Link>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-24 relative">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("landing:about.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            {t("landing:about.heroTitle")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("landing:about.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" />
                {t("landing:about.problem.badge")}
              </div>
              <h2 className="text-3xl font-bold leading-tight">{t("landing:about.problem.title")}</h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>{t("landing:about.problem.p1")}</p>
              <p>{t("landing:about.problem.p2")}</p>
              <p>{t("landing:about.problem.p3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section className="py-16 border-t border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                {t("landing:about.approach.badge")}
              </div>
              <h2 className="text-3xl font-bold leading-tight">{t("landing:about.approach.title")}</h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>{t("landing:about.approach.p1")}</p>
              <p>{t("landing:about.approach.p2")}</p>
              <p>{t("landing:about.approach.p3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-16 border-t border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 bg-card border border-border text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <CheckCircle className="w-3 h-3 text-primary" />
              {t("landing:about.values.badge")}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t("landing:about.values.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing:about.values.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div key={v.key} className="bg-card border border-border rounded-xl p-5">
                <v.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold text-sm mb-1.5">{t(`landing:about.values.items.${v.key}.title`)}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t(`landing:about.values.items.${v.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="py-16 border-t border-border bg-gradient-to-b from-green-500/5 via-transparent to-transparent">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" />
            {t("landing:about.vision.badge")}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">{t("landing:about.vision.title")}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">{t("landing:about.vision.body")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/app">
              <Button size="lg" className="gap-2">
                <Zap className="w-4 h-4" />
                {t("landing:about.vision.ctaPrimary")}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="gap-2">
                {t("landing:about.vision.ctaSecondary")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
