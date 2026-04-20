/**
 * Public demo project — `/demo`
 *
 * No login required. Shows a fully-populated example project (coffee husk
 * pyrolysis in Colombia) using real components — Map, Score, Cross-methodology
 * comparison — wired to in-memory data so visitors can poke around without
 * an account.
 *
 * This is the "Ver en acción" target from the landing page CTA.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, MapPin, Sparkles, Beaker, Flame,
  Clock, Target, Leaf, Building2, Factory, Cpu, Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import ProjectMap from "@/components/ProjectMap";
import RegionalAnalysis from "@/components/RegionalAnalysis";
import MethodologyAssessment from "@/components/MethodologyAssessment";
import MethodologyComparison from "@/components/MethodologyComparison";
import { compute_all, FEEDSTOCK_DB } from "@/lib/biocharModel";

// ─── Hardcoded demo project (locale-independent fields only) ────────────────

const DEMO = {
  id: "demo-huila",
  bopId: "BOP-2026-DEMO",
  // name + description come from i18n (see projectDetail.demo.projectName / projectDescription)
  location: "Neiva, Huila, Colombia",
  latitude: 2.9273,
  longitude: -75.2819,
  country: "Colombia",
  plantCapacityTph: 1.5,
  feedstockId: "coffee_husk",
  temperature: 650,
  residenceTime: 30,
  qualityGoal: "BALANCED" as const,
};

const ANNUAL_HOURS = 8000;
const CORC_PRICE_USD = 150;

export default function Demo() {
  const { t, i18n } = useTranslation(["projectDetail", "feedstocks", "common"]);
  const { t: tFs } = useTranslation("feedstocks");

  const feedstock = FEEDSTOCK_DB[DEMO.feedstockId];
  const feedstockName = tFs(DEMO.feedstockId, { defaultValue: feedstock.name });
  const projectName = t("demo.projectName", { defaultValue: "Huila Coffee Husk Pyrolysis Plant" });
  const projectDescription = t("demo.projectDescription", { defaultValue: "Industrial pyrolysis facility processing coffee husk waste from regional coffee mills in Neiva, Huila — Colombia's second-largest coffee-growing department." });

  const result = useMemo(
    () => compute_all(DEMO.temperature, DEMO.residenceTime, feedstock),
    [feedstock]
  );

  // Annual estimates
  const annualFeedstock = DEMO.plantCapacityTph * ANNUAL_HOURS;        // tonnes/year
  const annualBiochar = annualFeedstock * (result.yield_ / 100);       // tonnes/year
  const annualCO2 = annualFeedstock * result.credits.net;              // t CO2e/year
  const annualRevenue = annualCO2 * CORC_PRICE_USD;                    // USD/year

  const fmtNumber = (n: number, decimals = 1) =>
    n.toLocaleString(i18n.language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

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

      {/* DEMO BANNER */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
                {t("demo.bannerTag", { defaultValue: "Live demo project" })}
              </div>
              <p className="text-sm text-foreground">
                {t("demo.bannerBody", { defaultValue: "This is a working example. Every chart, score, and map is computed live from real data — no mockups. Click around, then build your own." })}
              </p>
            </div>
          </div>
          <Link href="/app">
            <Button size="sm" className="flex-shrink-0">
              {t("demo.bannerCta", { defaultValue: "Try it yourself" })} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Back link */}
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
          </button>
        </Link>

        {/* PROJECT HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{projectName}</h1>
              <a
                href={`/verify/${DEMO.bopId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary px-2 py-0.5 rounded uppercase tracking-wider transition-colors"
                title={t("demo.verifyHint", { defaultValue: "Try the public verify page (opens in new tab)" })}
              >
                {DEMO.bopId}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {DEMO.location}</span>
              <span className="inline-flex items-center gap-1.5"><Beaker className="w-3.5 h-3.5" /> {DEMO.plantCapacityTph} t/h</span>
              <span className="inline-flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" /> {feedstockName}</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{projectDescription}</p>

        {/* MAP + INFO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden h-[360px]">
            <ProjectMap
              latitude={DEMO.latitude}
              longitude={DEMO.longitude}
              zoom={10}
              label={projectName}
              className="h-full"
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{t("info.title")}</h3>
            <div className="space-y-3 text-sm">
              <InfoRow
                label={t("demo.infoDeveloper", { defaultValue: "Developer / Operator" })}
                value="3verde · Emisiones Neutras"
                icon={Building2}
              />
              <InfoRow
                label={t("demo.infoLocation", { defaultValue: "Location" })}
                value={DEMO.location}
                icon={MapPin}
              />
              <InfoRow
                label={t("demo.infoProjectType", { defaultValue: "Project type" })}
                value={t("demo.projectTypeValue", { defaultValue: "Industrial continuous pyrolysis" })}
                icon={Factory}
              />
              <InfoRow
                label={t("demo.infoTechnology", { defaultValue: "Technology" })}
                value={t("demo.technologyValue", { defaultValue: "Continuous screw reactor · mid-temperature regime" })}
                icon={Cpu}
              />
              <InfoRow
                label={t("demo.infoCapacity", { defaultValue: "Capacity" })}
                value={`${DEMO.plantCapacityTph} t/h`}
                icon={Beaker}
              />
              <InfoRow
                label={t("demo.infoFeedstock", { defaultValue: "Feedstock" })}
                value={feedstockName}
                icon={Leaf}
              />
              <InfoRow
                label={t("demo.infoFeedstockOrigin", { defaultValue: "Feedstock origin" })}
                value={t("demo.feedstockOriginValue", { defaultValue: "Regional coffee mills within 80 km" })}
              />
              <InfoRow
                label={t("demo.infoCommissioning", { defaultValue: "Commissioning" })}
                value={t("demo.commissioningValue", { defaultValue: "Q2 2026 (planned)" })}
                icon={Calendar}
              />
              <InfoRow
                label={t("demo.infoCountry", { defaultValue: "Country" })}
                value={DEMO.country}
              />
            </div>
          </div>
        </div>

        {/* NEW: Annual estimates card */}
        <div className="border border-border rounded-xl p-5 bg-gradient-to-br from-card to-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
              {t("demo.annualTitle", { defaultValue: "Annual estimates (at design capacity)" })}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnnualCard
              label={t("demo.annualCO2", { defaultValue: "CO₂ removals" })}
              value={fmtNumber(annualCO2 / 1000, 1)}
              unit={t("demo.annualCO2Unit", { defaultValue: "kt CO₂e / year" })}
              highlight
            />
            <AnnualCard
              label={t("demo.annualBiochar", { defaultValue: "Biochar output" })}
              value={fmtNumber(annualBiochar / 1000, 1)}
              unit={t("demo.annualBiocharUnit", { defaultValue: "kt / year" })}
            />
            <AnnualCard
              label={t("demo.annualFeedstock", { defaultValue: "Feedstock processed" })}
              value={fmtNumber(annualFeedstock / 1000, 1)}
              unit={t("demo.annualFeedstockUnit", { defaultValue: "kt / year" })}
            />
            <AnnualCard
              label={t("demo.annualRevenue", { defaultValue: "CORC revenue potential" })}
              value={fmtNumber(annualRevenue / 1000, 0)}
              unit={t("demo.annualRevenueUnit", { defaultValue: "k USD / year (at $150/tCO₂e)" })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            {t("demo.annualHint", {
              defaultValue: "Estimates assume 8,000 operating hours / year. CO₂ removals reflect net carbon after pyrolysis + transport + soil-incorporation factors per the simulation model. Revenue figure is illustrative at a conservative mid-market CORC price.",
            })}
          </p>
        </div>

        {/* REGIONAL ANALYSIS — climate + soil for the project location */}
        <RegionalAnalysis latitude={DEMO.latitude} longitude={DEMO.longitude} publicEndpoint />

        {/* PROCESS PARAMETERS — read-only display */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">{t("params.title")}</h3>
          <div className="grid grid-cols-3 gap-4">
            <ParamCard icon={Flame} label={t("demo.paramTemperature", { defaultValue: "Temperature" })} value={`${DEMO.temperature} °C`} />
            <ParamCard icon={Clock} label={t("demo.paramResidenceTime", { defaultValue: "Residence time" })} value={`${DEMO.residenceTime} min`} />
            <ParamCard icon={Target} label={t("demo.paramQualityGoal", { defaultValue: "Quality goal" })} value={t("demo.qualityGoalBalanced", { defaultValue: "Balanced" })} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            {t("demo.paramsHint", { defaultValue: "In the live app you can drag sliders to change these values and watch every downstream metric (yield, carbon content, BiocharPro Score) update in real time." })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label={t("demo.kpiYield", { defaultValue: "Biochar yield" })}
            value={`${result.yield_.toFixed(1)}%`}
            sub={t("demo.kpiYieldSub", { defaultValue: "of feedstock dry mass" })}
          />
          <KPI
            label={t("demo.kpiCarbon", { defaultValue: "Fixed carbon" })}
            value={`${result.C.toFixed(1)}%`}
            sub={t("demo.kpiCarbonSub", { defaultValue: "of biochar mass" })}
          />
          <KPI
            label={t("demo.kpiNetCO2", { defaultValue: "Net CO₂ removal" })}
            value={result.credits.net.toFixed(2)}
            sub={t("demo.kpiNetCO2Sub", { defaultValue: "t CO₂e per t feedstock" })}
          />
          <KPI
            label={t("demo.kpiHCorg", { defaultValue: "H:Corg ratio" })}
            value={result.H_Corg.toFixed(3)}
            sub={t("demo.kpiHCorgSub", { defaultValue: "stability indicator" })}
          />
        </div>

        {/* BiocharPro Score — multi-methodology assessment */}
        <MethodologyAssessment
          result={result}
          feedstock={feedstock}
          temperature={DEMO.temperature}
          residenceTime={DEMO.residenceTime}
          plantCapacityTph={DEMO.plantCapacityTph}
          country={DEMO.country}
          projectKey="demo"
          forceUnlocked
        />

        {/* Cross-methodology comparison — forced unlocked for the public demo */}
        <MethodologyComparison
          result={result}
          feedstock={feedstock}
          temperature={DEMO.temperature}
          residenceTime={DEMO.residenceTime}
          plantCapacityTph={DEMO.plantCapacityTph}
          country={DEMO.country}
          projectKey="demo"
          forceUnlocked
        />

        {/* CONVERSION CTA */}
        <div className="border-2 border-primary bg-primary/5 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">{t("demo.ctaTitle", { defaultValue: "Like what you see? Build your own in 2 minutes." })}</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
            {t("demo.ctaBody", { defaultValue: "The simulator is free forever. Add LCA, multi-methodology readiness, project tracking, and PDD generation as you grow — starting at $299/mo." })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/app">
              <Button size="lg">
                {t("demo.ctaPrimary", { defaultValue: "Open the simulator (free)" })} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                {t("demo.ctaSecondary", { defaultValue: "See pricing" })}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <p className="text-foreground inline-flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-primary" />}
        {value}
      </p>
    </div>
  );
}

function ParamCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="text-lg font-mono font-bold">{value}</div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function AnnualCard({ label, value, unit, highlight = false }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "bg-primary/10 border border-primary/30 rounded-lg p-3" : "bg-card border border-border rounded-lg p-3"}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}
