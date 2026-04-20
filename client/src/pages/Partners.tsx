/**
 * Partners page — `/company/partners`
 *
 * Public page that frames Biochar Optimizer Pro as the digital infrastructure
 * connecting biochar projects to certifiers, MRV platforms, equipment makers,
 * and labs.
 *
 * Tone: "infrastructure layer" / "we get the project to your door".
 * Categories listed are NOT formal partnerships — we're listing the ecosystem
 * we're built to interface with. Mark which ones we have active integrations
 * with (none currently — all "ecosystem-aware" / "coming soon").
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, ShieldCheck, Layers, Wrench,
  FlaskConical, Building2, ExternalLink, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

interface PartnerEntry {
  name: string;
  tagline: string;
  url?: string;
  status: "active" | "ecosystem-aware" | "coming-soon";
}

interface PartnerCategory {
  icon: any;
  titleKey: string;
  descKey: string;
  entries: PartnerEntry[];
}

const CATEGORIES: PartnerCategory[] = [
  {
    icon: Layers,
    titleKey: "partners.cat.certifications.title",
    descKey: "partners.cat.certifications.desc",
    entries: [
      { name: "Puro.earth",      tagline: "CORC methodology Ed. 2025",                url: "https://puro.earth",            status: "ecosystem-aware" },
      { name: "Isometric",       tagline: "Biochar Protocol — 200/1000-year claims",  url: "https://isometric.com",         status: "ecosystem-aware" },
      { name: "EBC",             tagline: "European Biochar Certificate",             url: "https://www.european-biochar.org", status: "ecosystem-aware" },
      { name: "IBI",             tagline: "International Biochar Initiative",         url: "https://biochar-international.org", status: "ecosystem-aware" },
      { name: "Verra (VM0044)",  tagline: "VCS biochar methodology",                  url: "https://verra.org",             status: "coming-soon" },
      { name: "Gold Standard",   tagline: "SOC framework + biochar",                  url: "https://www.goldstandard.org", status: "coming-soon" },
    ],
  },
  {
    icon: ShieldCheck,
    titleKey: "partners.cat.mrv.title",
    descKey: "partners.cat.mrv.desc",
    entries: [
      { name: "Carbon Standards Intl.", tagline: "EBC audit & certification",      url: "https://www.carbon-standards.com", status: "ecosystem-aware" },
      { name: "Isometric Certify",       tagline: "Submission platform",            url: "https://isometric.com/certify",   status: "ecosystem-aware" },
      { name: "Sylvera",                 tagline: "Independent rating agency",       url: "https://www.sylvera.com",         status: "coming-soon" },
      { name: "BeZero Carbon",           tagline: "Independent rating agency",       url: "https://bezerocarbon.com",        status: "coming-soon" },
    ],
  },
  {
    icon: Wrench,
    titleKey: "partners.cat.equipment.title",
    descKey: "partners.cat.equipment.desc",
    entries: [
      { name: "PYREG",       tagline: "German pyrolysis units (PX/P/CO series)",     url: "https://pyreg.com",        status: "ecosystem-aware" },
      { name: "Beston",      tagline: "Continuous pyrolysis (China)",                 url: "https://www.bestongroup.com", status: "ecosystem-aware" },
      { name: "Ankur Scientific", tagline: "Indian biomass gasification + pyrolysis", url: "https://www.ankurscientific.com", status: "ecosystem-aware" },
      { name: "Biowatt",     tagline: "Containerized pyrolysis modules",              url: "https://biowatt.com.br",   status: "ecosystem-aware" },
      { name: "Mingyang",    tagline: "Industrial pyrolysis equipment",               url: "https://www.mingyangbiochar.com", status: "ecosystem-aware" },
    ],
  },
  {
    icon: FlaskConical,
    titleKey: "partners.cat.labs.title",
    descKey: "partners.cat.labs.desc",
    entries: [
      { name: "Eurofins Agro",         tagline: "Heavy metals, PAH, BET (EU)",         status: "coming-soon" },
      { name: "Control Lab Argentina", tagline: "C/H/N/S/O, ash, moisture (LatAm)",   status: "coming-soon" },
      { name: "ALS Global",            tagline: "Biochar full panel (international)", status: "coming-soon" },
      { name: "IBI-recognized labs",   tagline: "See IBI's directory of certified labs", url: "https://biochar-international.org/program/biochar-testing-laboratories/", status: "ecosystem-aware" },
    ],
  },
];

const STATUS_CONFIG: Record<PartnerEntry["status"], { label: string; bg: string; text: string }> = {
  "active":           { label: "Active integration", bg: "bg-green-500/10 border-green-500/30",   text: "text-green-600 dark:text-green-400" },
  "ecosystem-aware":  { label: "Ecosystem-aware",    bg: "bg-blue-500/10 border-blue-500/30",     text: "text-blue-600 dark:text-blue-400" },
  "coming-soon":      { label: "Coming soon",        bg: "bg-amber-500/10 border-amber-500/30",   text: "text-amber-600 dark:text-amber-400" },
};

export default function Partners() {
  const { t } = useTranslation(["partners", "common"]);

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
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("partners:badge", { defaultValue: "Ecosystem & partnerships" })}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            {t("partners:heroTitle", { defaultValue: "We get your project to their door — ready to be reviewed." })}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("partners:heroSubtitle", { defaultValue: "Biochar Optimizer Pro is the digital infrastructure layer between project developers and the rest of the biochar ecosystem: certifiers, MRV platforms, equipment makers, and labs. We don't issue credits or sell pyrolyzers — we make sure the data the next layer needs is structured, audit-ready, and immediately usable." })}
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-12 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx}>
                <div className="flex items-start gap-3 mb-6">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{t(cat.titleKey)}</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t(cat.descKey)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.entries.map((entry, i) => {
                    const cfg = STATUS_CONFIG[entry.status];
                    return (
                      <a
                        key={i}
                        href={entry.url}
                        target={entry.url ? "_blank" : undefined}
                        rel={entry.url ? "noopener noreferrer" : undefined}
                        className={`block bg-card border border-border rounded-lg p-4 ${entry.url ? "hover:border-primary/40 transition-colors" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <span className="font-bold text-sm flex items-center gap-1.5">
                            {entry.name}
                            {entry.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                          </span>
                          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                            {t(`partners:status.${entry.status}`, { defaultValue: cfg.label })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.tagline}</p>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHAT IT MEANS */}
      <section className="py-16 border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">{t("partners:legend.title", { defaultValue: "What these labels mean" })}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LegendItem
              status="active"
              t={t}
              defaultLabel="Active integration"
              defaultDesc="Direct API connection — data flows from Biochar Optimizer Pro into their system."
            />
            <LegendItem
              status="ecosystem-aware"
              t={t}
              defaultLabel="Ecosystem-aware"
              defaultDesc="Our platform is designed to produce the data structure their methodology / hardware / lab pipeline expects. No direct API yet — but exports drop into their workflow with minimal massage."
            />
            <LegendItem
              status="coming-soon"
              t={t}
              defaultLabel="Coming soon"
              defaultDesc="On the roadmap. Reach out below if you'd like to accelerate the work."
            />
          </div>
        </div>
      </section>

      {/* BECOME A PARTNER CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Building2 className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("partners:cta.title", { defaultValue: "Want to plug into BiocharPro?" })}</h2>
          <p className="text-base text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
            {t("partners:cta.body", { defaultValue: "If you're a certifier, MRV platform, pyrolyzer maker, or lab and want to be listed here as an active integration — or just talk about how our data can flow into your workflow — get in touch." })}
          </p>
          <Link href="/pricing#contact">
            <Button size="lg">
              {t("partners:cta.button", { defaultValue: "Contact us" })} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function LegendItem({
  status,
  t,
  defaultLabel,
  defaultDesc,
}: {
  status: PartnerEntry["status"];
  t: (k: string, opts?: any) => string;
  defaultLabel: string;
  defaultDesc: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} mb-2`}>
        {t(`partners:status.${status}`, { defaultValue: defaultLabel })}
      </span>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(`partners:legend.${status}Desc`, { defaultValue: defaultDesc })}
      </p>
    </div>
  );
}
