/**
 * Project Journey — landing page section.
 *
 * A live end-to-end walkthrough of what a biochar project looks like INSIDE
 * BiocharPro Optimizer: feedstock → transport → pyrolysis → biochar →
 * carbon credits → certification readiness.
 *
 * All numbers are COMPUTED LIVE from the same biocharModel that runs in the
 * simulator, using the /demo project as the reference (Huila coffee husk,
 * 1.5 t/h, 650°C, 30 min, BALANCED goal). No mockups, no Lorem ipsum —
 * every tile shows the actual model output for that reference plant.
 *
 * Inspired by how Cula shows their supply-chain journey, but grounded in
 * OUR strength: pre-certification modeling.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Leaf, Truck, Flame, Beaker, TrendingUp, Award,
  ArrowRight, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { compute_all, FEEDSTOCK_DB } from "@/lib/biocharModel";
import { METHODOLOGIES } from "@/lib/methodologies";
import { calculateScore } from "@/lib/biocharScore";

// Reference demo project — same values as /demo and BOP-2026-DEMO
const REF = {
  feedstockId: "coffee_husk",
  temperature: 650,
  residenceTime: 30,
  plantCapacityTph: 1.5,
  annualHours: 8000,
  transportKm: 80,
  country: "Colombia",
};

export default function ProjectJourney() {
  const { t, i18n } = useTranslation("landing");
  const feedstock = FEEDSTOCK_DB[REF.feedstockId];

  const result = useMemo(
    () => compute_all(REF.temperature, REF.residenceTime, feedstock),
    [feedstock]
  );

  // Annual throughputs.
  // NOTE: `result.credits.net` is t CO2e per tonne of BIOCHAR (not feedstock).
  // We multiply by annualBiochar, not annualFeedstock.
  const annualFeedstock = REF.plantCapacityTph * REF.annualHours; // t/year
  const annualBiochar = annualFeedstock * (result.yield_ / 100);
  const annualCO2 = annualBiochar * result.credits.net;
  const netCO2PerTFeedstock = result.credits.net * (result.yield_ / 100);

  // Puro.earth score (auto checks only — no manual states in a public landing)
  const puroScore = useMemo(
    () =>
      calculateScore(METHODOLOGIES["puro-earth"], {
        result,
        feedstock,
        temperature: REF.temperature,
        residenceTime: REF.residenceTime,
        plantCapacityTph: REF.plantCapacityTph,
        country: REF.country,
        manualStates: {},
      }),
    [result, feedstock]
  );

  const fmt = (n: number, decimals = 1) =>
    n.toLocaleString(i18n.language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const steps = [
    {
      icon: Leaf,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      labelKey: "journey.step1.label",
      labelFallback: "Biomasa",
      value: fmt(annualFeedstock, 0),
      unit: "t / año",
      subKey: "journey.step1.sub",
      subFallback: "Cáscara de café · beneficios locales",
    },
    {
      icon: Truck,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      labelKey: "journey.step2.label",
      labelFallback: "Transporte",
      value: `< ${REF.transportKm}`,
      unit: "km radius",
      subKey: "journey.step2.sub",
      subFallback: "Logística regional · bajo footprint",
    },
    {
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      labelKey: "journey.step3.label",
      labelFallback: "Pirólisis",
      value: `${REF.temperature}°C`,
      unit: `${REF.residenceTime} min · ${REF.plantCapacityTph} t/h`,
      subKey: "journey.step3.sub",
      subFallback: "Reactor continuo · régimen medio",
    },
    {
      icon: Beaker,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
      labelKey: "journey.step4.label",
      labelFallback: "Biochar",
      value: fmt(annualBiochar, 0),
      unit: "t / año",
      subKey: "journey.step4.sub",
      subFallback: `C ${fmt(result.C)}% · H:Corg ${fmt(result.H_Corg, 3)}`,
    },
    {
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      labelKey: "journey.step5.label",
      labelFallback: "Remoción CO₂",
      value: fmt(annualCO2, 0),
      unit: "t CO₂e / año",
      subKey: "journey.step5.sub",
      subFallback: `Net ${fmt(netCO2PerTFeedstock, 2)} t CO₂e / t feedstock`,
    },
    {
      icon: Award,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      labelKey: "journey.step6.label",
      labelFallback: "Score Puro.earth",
      value: `${puroScore.value}`,
      unit: "/100",
      subKey: "journey.step6.sub",
      subFallback: `${puroScore.passed} / ${puroScore.results.length} checks · submission-ready`,
    },
  ];

  return (
    <section className="py-20 border-t border-border bg-gradient-to-b from-card/30 to-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            {t("journey.badge", { defaultValue: "The carbon journey · biomass → CORC" })}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            {t("journey.title", { defaultValue: "Un proyecto real, de punta a punta" })}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("journey.subtitle", {
              defaultValue:
                "Seguí el viaje del carbono: desde un residuo agrícola hasta un crédito CORC listo para auditoría. Cada número de abajo se calcula en vivo con nuestro modelo.",
            })}
          </p>
        </div>

        {/* Steps grid — horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Desktop connector line */}
          <div className="hidden lg:block absolute top-[52px] left-[6%] right-[6%] h-0.5 bg-gradient-to-r from-green-500/30 via-orange-500/30 via-slate-400/30 to-purple-500/30 pointer-events-none" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-3 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative">
                  {/* Mobile down-arrow connector */}
                  {idx < steps.length - 1 && (
                    <div className="lg:hidden absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
                      <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                  <div className="bg-card border border-border rounded-xl p-4 h-full flex flex-col items-center text-center hover:border-primary/40 transition-colors">
                    {/* Step number + icon */}
                    <div className="relative mb-3">
                      <div className={`w-14 h-14 rounded-2xl ${step.bg} border-2 ${step.border} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${step.color}`} />
                      </div>
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                    </div>
                    {/* Label */}
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t(step.labelKey, { defaultValue: step.labelFallback })}
                    </div>
                    {/* Value */}
                    <div className={`text-2xl font-mono font-bold ${step.color} leading-none mb-0.5`}>
                      {step.value}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mb-2">
                      {step.unit}
                    </div>
                    {/* Sub description */}
                    <div className="text-[11px] text-muted-foreground leading-snug mt-auto">
                      {t(step.subKey, { defaultValue: step.subFallback })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left max-w-md">
            {t("journey.footerText", {
              defaultValue:
                "Ejemplo de referencia: Planta de Pirólisis de Cáscara de Café — Neiva, Huila (Colombia). Todos los KPIs se computan en vivo.",
            })}
          </p>
          <Link href="/demo">
            <Button size="sm" className="gap-1.5">
              {t("journey.cta", { defaultValue: "Ver el proyecto completo" })}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
