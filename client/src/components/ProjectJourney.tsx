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
 * Inspired by how Cula shows their supply-chain journey with explicit
 * "data inputs" per step — transparency about what the model uses.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Leaf, Truck, Flame, Beaker, TrendingUp, Award,
  ArrowRight,
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

interface DataInput {
  label: string;
  value: string;
}

interface Step {
  icon: any;
  color: string;
  bg: string;
  border: string;
  labelKey: string;
  labelFallback: string;
  value: string;
  unit: string;
  subKey: string;
  subFallback: string;
  inputs: DataInput[];
}

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

  const steps: Step[] = [
    // ─── 1. Biomass ──────────────────────────────────────────────────────
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
      inputs: [
        { label: t("journey.inputs.feedstockType", { defaultValue: "Biomasa" }), value: feedstock.name },
        { label: t("journey.inputs.elementalC",    { defaultValue: "Carbono" }),   value: `${fmt(feedstock.C, 1)}%` },
        { label: t("journey.inputs.elementalH",    { defaultValue: "Hidrógeno" }), value: `${fmt(feedstock.H, 2)}%` },
        { label: t("journey.inputs.capacity",      { defaultValue: "Capacidad" }), value: `${REF.plantCapacityTph} t/h` },
        { label: t("journey.inputs.hoursYear",     { defaultValue: "Operación" }), value: `${REF.annualHours.toLocaleString()} h/año` },
      ],
    },

    // ─── 2. Transport ────────────────────────────────────────────────────
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
      inputs: [
        { label: t("journey.inputs.sourceRadius", { defaultValue: "Radio de recolección" }), value: `≤ ${REF.transportKm} km` },
        { label: t("journey.inputs.truckType",    { defaultValue: "Camión" }),                value: "Clase 8 · diésel" },
        { label: t("journey.inputs.payload",      { defaultValue: "Carga útil" }),            value: "18 t" },
        { label: t("journey.inputs.roundTrips",   { defaultValue: "Viajes/año (est.)" }),     value: `≈ ${fmt(annualFeedstock / 18, 0)}` },
        { label: t("journey.inputs.emissionFactor", { defaultValue: "Factor emisión" }),      value: "0.08 kg CO₂e/t·km" },
      ],
    },

    // ─── 3. Pyrolysis ────────────────────────────────────────────────────
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
      inputs: [
        { label: t("journey.inputs.temperature",    { defaultValue: "Temperatura" }),       value: `${REF.temperature} °C` },
        { label: t("journey.inputs.residenceTime",  { defaultValue: "Tiempo residencia" }), value: `${REF.residenceTime} min` },
        { label: t("journey.inputs.reactorType",    { defaultValue: "Reactor" }),            value: "Tornillo continuo" },
        { label: t("journey.inputs.atmosphere",     { defaultValue: "Atmósfera" }),          value: "Anóxica / bajo O₂" },
        { label: t("journey.inputs.modelCalibration", { defaultValue: "Modelo" }),           value: "CINDECA/CONICET" },
      ],
    },

    // ─── 4. Biochar ──────────────────────────────────────────────────────
    {
      icon: Beaker,
      color: "text-muted-foreground/70",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
      labelKey: "journey.step4.label",
      labelFallback: "Biochar",
      value: fmt(annualBiochar, 0),
      unit: "t / año",
      subKey: "journey.step4.sub",
      subFallback: `C ${fmt(result.C)}% · H:Corg ${fmt(result.H_Corg, 3)}`,
      inputs: [
        { label: t("journey.inputs.yield",      { defaultValue: "Rendimiento de biochar" }),   value: `${fmt(result.yield_, 1)}%` },
        { label: t("journey.inputs.carbonPct",  { defaultValue: "Carbono fijo" }),    value: `${fmt(result.C, 1)}%` },
        { label: t("journey.inputs.hCorg",      { defaultValue: "H:Corg molar" }),    value: fmt(result.H_Corg, 3) },
        { label: t("journey.inputs.bet",        { defaultValue: "BET superficie" }),   value: `${fmt(result.BET, 0)} m²/g` },
        { label: t("journey.inputs.ph",         { defaultValue: "pH" }),               value: fmt(result.pH, 1) },
      ],
    },

    // ─── 5. CO₂ removal ──────────────────────────────────────────────────
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
      subFallback: `Neto ${fmt(netCO2PerTFeedstock, 2)} t CO₂e / t biomasa`,
      inputs: [
        { label: t("journey.inputs.durabilityClass", { defaultValue: "Clase durabilidad" }), value: result.credits.class },
        { label: t("journey.inputs.stabilityFactor", { defaultValue: "Factor de estabilidad" }),  value: fmt(result.credits.sf, 2) },
        { label: t("journey.inputs.gross",           { defaultValue: "CO₂e bruto/t biochar" }), value: `${fmt(result.credits.gross, 2)} t` },
        { label: t("journey.inputs.netPerFeedstock", { defaultValue: "CO₂e neto/t feedstock" }), value: `${fmt(netCO2PerTFeedstock, 2)} t` },
        { label: t("journey.inputs.corcPrice",       { defaultValue: "Precio ref. CORC" }),   value: "USD 150/tCO₂e" },
      ],
    },

    // ─── 6. Score ────────────────────────────────────────────────────────
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
      subFallback: `${puroScore.passed} / ${puroScore.results.length} chequeos · listo para enviar`,
      inputs: [
        { label: t("journey.inputs.methodology",    { defaultValue: "Metodología" }),       value: "Puro.earth Ed. 2025" },
        { label: t("journey.inputs.autoChecks",     { defaultValue: "Chequeos automáticos" }),       value: `${puroScore.passed} / ${puroScore.results.length}` },
        { label: t("journey.inputs.minTemp",        { defaultValue: "T ≥ 350°C" }),         value: REF.temperature >= 350 ? "✓" : "✗" },
        { label: t("journey.inputs.hCorgCheck",     { defaultValue: "H:Corg < 0.7" }),       value: result.H_Corg < 0.7 ? "✓" : "✗" },
        { label: t("journey.inputs.netPositive",    { defaultValue: "CO₂e neto > 0" }),      value: result.credits.net > 0 ? "✓" : "✗" },
      ],
    },
  ];

  return (
    <section className="py-20 border-t border-border bg-gradient-to-b from-card/30 to-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            {t("journey.badge", { defaultValue: "El recorrido del carbono · biomasa → CORC" })}
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

        {/* Steps — responsive grid with data density per step */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex flex-col hover:border-primary/40 transition-colors"
              >
                {/* Icon + step number */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="text-[10px] font-bold font-mono text-muted-foreground">
                    0{idx + 1}
                  </div>
                </div>

                {/* Label */}
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t(step.labelKey, { defaultValue: step.labelFallback })}
                </div>

                {/* Value */}
                <div className={`text-xl font-mono font-bold ${step.color} leading-none mb-0.5`}>
                  {step.value}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mb-3">
                  {step.unit}
                </div>

                {/* Sub description */}
                <div className="text-[11px] text-muted-foreground leading-snug mb-3 pb-3 border-b border-border">
                  {t(step.subKey, { defaultValue: step.subFallback })}
                </div>

                {/* Data inputs — the Cula-inspired transparency layer */}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                    {t("journey.dataInputs", { defaultValue: "Datos de entrada" })}
                  </div>
                  <div className="space-y-0.5">
                    {step.inputs.map((input, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-2 text-[10px] leading-tight"
                      >
                        <span className="text-muted-foreground truncate">{input.label}</span>
                        <span className="font-mono font-semibold text-right flex-shrink-0 max-w-[50%] truncate">
                          {input.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
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
