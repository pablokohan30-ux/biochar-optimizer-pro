/**
 * /product/modules — full breakdown of every module on the platform.
 *
 * Originally lived as an accordion on the landing. Moved here so the landing
 * can stay tighter; the landing keeps a teaser + CTA pointing here.
 *
 * Each module: icon, title, summary, full description, tier required, feature
 * list, and a CTA to the relevant in-app surface or pricing.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, FlaskConical, FileText, BarChart3,
  Building2, Scale, Map, CheckCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

interface Module {
  id: string;
  icon: any;
  title: string;
  summary: string;
  desc: string;
  tier: string;
  tierColor: string;
  color: string;
  bg: string;
  border: string;
  features: string[];
  /** Where this module lives in-app — opens directly when user clicks. */
  cta?: { href: string; label: string };
}

export default function Modules() {
  const { t } = useTranslation(["landing", "common"]);

  const MODULES: Module[] = useMemo(() => [
    {
      id: "aiProjectBuilder",
      icon: Sparkles,
      title: t("landing:modules.aiProjectBuilder.title", { defaultValue: "Constructor IA de proyectos" }),
      summary: t("landing:modules.aiProjectBuilder.summary", { defaultValue: "Cargas biomasa, capacidad y país. Salida: 17 borradores documentales para inversores o certificadoras." }),
      desc: t("landing:modules.aiProjectBuilder.desc", { defaultValue: "La función principal del plan Expert. Introduces tres datos base y la IA arma un paquete completo de proyecto en minutos: resumen ejecutivo, visión técnica, lista de equipos, paquete eléctrico, plan QA/QC, reporte LCA, resumen financiero, matriz de riesgos, matriz de permisos, matriz metodológica, PDD prellenado para 11 frentes y más. Cada documento se apoya en catálogos curados de equipos reales de pirólisis, aprobaciones metodológicas y factores de emisión por país. Puedes exportar el paquete como un solo PDF. Todo sale como borrador y requiere validación profesional antes de compartirse." }),
      tier: t("landing:modules.aiProjectBuilder.tier", { defaultValue: "Expert" }),
      tierColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      features: [
        t("landing:modules.aiProjectBuilder.features.f1", { defaultValue: "3 inputs de entrada → 17 borradores de salida" }),
        t("landing:modules.aiProjectBuilder.features.f2", { defaultValue: "Apoyado en modelos reales de pirolizadores con aprobaciones metodológicas" }),
        t("landing:modules.aiProjectBuilder.features.f3", { defaultValue: "Factores de emisión de red y autoridades regulatorias por país" }),
        t("landing:modules.aiProjectBuilder.features.f4", { defaultValue: "Chequeo de preparación sobre 6 rutas metodológicas" }),
        t("landing:modules.aiProjectBuilder.features.f5", { defaultValue: "Exportación en un clic del paquete completo en PDF" }),
      ],
      cta: { href: "/ai-builder", label: t("landing:modules.openAiBuilder", { defaultValue: "Abrir constructor IA" }) },
    },
    {
      id: "technicalSimulation",
      icon: FlaskConical,
      title: t("landing:modules.technicalSimulation.title"),
      summary: t("landing:modules.technicalSimulation.summary"),
      desc: t("landing:modules.technicalSimulation.desc"),
      tier: t("landing:modules.technicalSimulation.tier"),
      tierColor: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      features: [
        t("landing:modules.technicalSimulation.features.f1"),
        t("landing:modules.technicalSimulation.features.f2"),
        t("landing:modules.technicalSimulation.features.f3"),
        t("landing:modules.technicalSimulation.features.f4"),
        t("landing:modules.technicalSimulation.features.f5"),
      ],
      cta: { href: "/app", label: t("landing:modules.openSimulator", { defaultValue: "Abrir simulador" }) },
    },
    {
      id: "lca",
      icon: FileText,
      title: t("landing:modules.lca.title"),
      summary: t("landing:modules.lca.summary"),
      desc: t("landing:modules.lca.desc"),
      tier: t("landing:modules.lca.tier"),
      tierColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      features: [
        t("landing:modules.lca.features.f1"),
        t("landing:modules.lca.features.f2"),
        t("landing:modules.lca.features.f3"),
        t("landing:modules.lca.features.f4"),
        t("landing:modules.lca.features.f5"),
      ],
      cta: { href: "/lca", label: t("landing:modules.openLCA", { defaultValue: "Abrir LCA" }) },
    },
    {
      id: "projectDesign",
      icon: BarChart3,
      title: t("landing:modules.projectDesign.title"),
      summary: t("landing:modules.projectDesign.summary"),
      desc: t("landing:modules.projectDesign.desc"),
      tier: t("landing:modules.projectDesign.tier"),
      tierColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      features: [
        t("landing:modules.projectDesign.features.f1"),
        t("landing:modules.projectDesign.features.f2"),
        t("landing:modules.projectDesign.features.f3"),
        t("landing:modules.projectDesign.features.f4"),
        t("landing:modules.projectDesign.features.f5"),
      ],
      cta: { href: "/projects", label: t("landing:modules.openProjects", { defaultValue: "Abrir proyectos" }) },
    },
    {
      id: "plantEngineering",
      icon: Building2,
      title: t("landing:modules.plantEngineering.title"),
      summary: t("landing:modules.plantEngineering.summary"),
      desc: t("landing:modules.plantEngineering.desc"),
      tier: t("landing:modules.plantEngineering.tier"),
      tierColor: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      features: [
        t("landing:modules.plantEngineering.features.f1"),
        t("landing:modules.plantEngineering.features.f2"),
        t("landing:modules.plantEngineering.features.f3"),
        t("landing:modules.plantEngineering.features.f4"),
        t("landing:modules.plantEngineering.features.f5"),
      ],
    },
    {
      id: "regulatory",
      icon: Scale,
      title: t("landing:modules.regulatory.title"),
      summary: t("landing:modules.regulatory.summary"),
      desc: t("landing:modules.regulatory.desc"),
      tier: t("landing:modules.regulatory.tier"),
      tierColor: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      features: [
        t("landing:modules.regulatory.features.f1"),
        t("landing:modules.regulatory.features.f2"),
        t("landing:modules.regulatory.features.f3"),
        t("landing:modules.regulatory.features.f4"),
        t("landing:modules.regulatory.features.f5"),
      ],
    },
    {
      id: "applications",
      icon: Map,
      title: t("landing:modules.applications.title"),
      summary: t("landing:modules.applications.summary"),
      desc: t("landing:modules.applications.desc"),
      tier: t("landing:modules.applications.tier"),
      tierColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      features: [
        t("landing:modules.applications.features.f1"),
        t("landing:modules.applications.features.f2"),
        t("landing:modules.applications.features.f3"),
        t("landing:modules.applications.features.f4"),
        t("landing:modules.applications.features.f5"),
      ],
    },
  ], [t]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/pricing" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">{t("common:nav.pricing")}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="whitespace-nowrap">{t("common:nav.tryForFree")}</Button>
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("landing:modulesPage.badge", { defaultValue: "Plataforma · módulos" })}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            {t("landing:modulesPage.title", { defaultValue: "Una plataforma que crece con tu proyecto" })}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("landing:modulesPage.subtitle", {
              defaultValue:
                "6 módulos. Cada uno resuelve un problema concreto del ciclo de vida del proyecto biochar. Empiezas con simulación gratuita y desbloqueas capas a medida que tu proyecto avanza.",
            })}
          </p>
        </div>
      </section>

      {/* MODULES — full detail */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <article
                key={mod.id}
                className="bg-card border border-border rounded-xl p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl ${mod.bg} border ${mod.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          0{idx + 1}
                        </span>
                        <h2 className="text-xl md:text-2xl font-bold leading-tight">{mod.title}</h2>
                        <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${mod.tierColor}`}>
                          {mod.tier}+
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{mod.summary}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-4 max-w-3xl">{mod.desc}</p>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-5">
                  {mod.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${mod.color} flex-shrink-0 mt-0.5`} />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {mod.cta && (
                    <Link href={mod.cta.href}>
                      <Button size="sm" variant="outline" className="gap-1">
                        {mod.cta.label} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                  <Link href="/pricing">
                    <Button size="sm" variant="ghost" className="text-xs gap-1">
                      {t("landing:modules.viewPlans", { defaultValue: "Ver planes" })} <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
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
            {t("landing:modulesPage.ctaTitle", { defaultValue: "Empieza gratis con el simulador" })}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("landing:modulesPage.ctaBody", {
              defaultValue:
                "El módulo de simulación técnica es gratis para siempre. Desbloquea los demás cuando tu proyecto los requiera.",
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/app">
              <Button size="lg" className="gap-2">
                {t("landing:modulesPage.ctaPrimary", { defaultValue: "Probar simulador" })} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="gap-2">
                {t("landing:modulesPage.ctaSecondary", { defaultValue: "Ver precios completos" })}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
