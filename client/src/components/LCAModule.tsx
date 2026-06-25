import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Flame, Leaf, Factory, Truck, Activity, CheckCircle2, AlertTriangle, XCircle, RotateCcw, FileText, ChevronDown, ChevronRight, FileSpreadsheet,
} from "lucide-react";
import {
  calculateLCA,
  DEFAULT_LCA_INPUTS,
  type LCAInputs,
  type LCAResult,
  type FacilityType,
  type ApplicationType,
} from "@/lib/lcaModel";
import { BRAND_NAME } from "@/lib/brand";

// ============================================================================
// Helpers
// ============================================================================

const fmt = (n: number, digits = 0) =>
  isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

const fmtTCO2 = (n: number) => `${fmt(n, 0)} tCO₂eq/yr`;

// ============================================================================
// Small UI primitives
// ============================================================================

function Section({
  title,
  icon: Icon,
  color,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <div className="flex-1">
        <div className="text-[11px] font-medium text-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex items-center w-10 h-5 flex-shrink-0 rounded-full px-0.5 transition-colors ${
          value ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

// ============================================================================
// CSV Export (opens in Excel / Google Sheets)
// ============================================================================

function csvEscape(val: string | number | boolean): string {
  const s = String(val);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(label: string, value: string | number | boolean, unit = "", note = ""): string {
  return [csvEscape(label), csvEscape(value), csvEscape(unit), csvEscape(note)].join(",");
}

function exportLCAToCSV(inputs: LCAInputs, result: LCAResult): void {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(`${BRAND_NAME} — LCA Export`);
  push(`Methodology,Puro.earth Biochar Ed. 2025 V1`);
  push(`Exported,${new Date().toISOString().slice(0, 19).replace("T", " ")}`);
  push();
  push("INPUTS,Value,Unit,Note");
  push(csvRow("Project name", inputs.projectName));
  push(csvRow("Country", inputs.country));
  push(csvRow("Facility type", inputs.facilityType));
  push(csvRow("Monitoring period", inputs.monitoringPeriodYears, "years"));
  push(csvRow("Crediting period", inputs.creditingPeriodYears, "years"));
  push(csvRow("Facility lifetime", inputs.facilityLifetimeYears, "years"));
  push(csvRow("Wet biomass", inputs.wetBiomassTonsPerYear, "t/yr"));
  push(csvRow("Biomass moisture", inputs.biomassMoisturePct, "%"));
  push(csvRow("Biomass type", inputs.biomassType));
  push(csvRow("Soil temperature", inputs.soilTemperatureC, "°C", "Drives Permanence Factor (Table 6.1)"));
  push(csvRow("Application type", inputs.applicationType));
  push(csvRow("Yield", inputs.yieldPct, "%", "dry biochar / dry biomass"));
  push(csvRow("Biochar moisture", inputs.biocharMoisturePct, "%"));
  push(csvRow("C_tot", inputs.C_tot_pct, "%", "Total carbon, dry basis"));
  push(csvRow("C_inorg", inputs.C_inorg_pct, "%", "Inorganic carbon"));
  push(csvRow("H", inputs.H_pct, "%", "Hydrogen"));
  if (inputs.O_pct !== undefined) push(csvRow("O", inputs.O_pct, "%", "Oxygen (optional)"));
  push(csvRow("Biomass is residue (burden-free)", inputs.biomassIsResidue, "", "Rule 7.3.4"));
  push(csvRow("Biomass transport distance", inputs.biomassTransportDistanceKm, "km"));
  push(csvRow("Pre-processing electricity", inputs.preProcessingElectricityKwhPerYear, "kWh/yr"));
  push(csvRow("Production electricity", inputs.productionElectricityKwhPerYear, "kWh/yr"));
  push(csvRow("Production LPG", inputs.productionLPGKgPerYear, "kg/yr"));
  if (inputs.productionDieselLitersPerYear !== undefined) push(csvRow("Production diesel", inputs.productionDieselLitersPerYear, "L/yr"));
  if (inputs.productionNaturalGasM3PerYear !== undefined) push(csvRow("Production natural gas", inputs.productionNaturalGasM3PerYear, "m³/yr"));
  push(csvRow("Biochar transport distance", inputs.biocharTransportDistanceKm, "km"));
  if (inputs.applicationEmissionsTPerYear !== undefined) push(csvRow("Application emissions", inputs.applicationEmissionsTPerYear, "tCO2eq/yr"));
  push(csvRow("Infrastructure manufacturing", inputs.infrastructureManufacturingTCO2, "tCO2", "One-time, amortized"));
  push(csvRow("Infrastructure transport", inputs.infrastructureTransportTCO2, "tCO2", "One-time, amortized"));
  push(csvRow("Has land-use change", inputs.hasLandUseChange));
  if (inputs.dLUCAnnualTCO2 !== undefined) push(csvRow("dLUC annual", inputs.dLUCAnnualTCO2, "tCO2/yr"));
  push(csvRow("Ecological leakage mitigated", inputs.ecologicalLeakageMitigated, "", "Rule 8.2.1c"));
  if (inputs.absoluteEcologicalLeakageTotal !== undefined) push(csvRow("AEL total", inputs.absoluteEcologicalLeakageTotal, "tCO2"));
  push(csvRow("Feedstock diverted from productive use", inputs.feedstockDivertedFromProductiveUse));
  if (inputs.iLUCCropType) push(csvRow("iLUC crop type", inputs.iLUCCropType));
  if (inputs.iLUCEnergyContentMJPerYear !== undefined) push(csvRow("iLUC energy content", inputs.iLUCEnergyContentMJPerYear, "MJ/yr"));
  if (inputs.electricityEF !== undefined) push(csvRow("Electricity EF override", inputs.electricityEF, "tCO2eq/kWh"));

  push();
  push("INTERMEDIATE VALUES,Value,Unit,Note");
  push(csvRow("Dry biomass", result.dryBiomassTPerYear.toFixed(2), "t/yr"));
  push(csvRow("Dry biochar", result.dryBiocharTPerYear.toFixed(2), "t/yr"));
  push(csvRow("Wet biochar", result.wetBiocharTPerYear.toFixed(2), "t/yr"));
  push(csvRow("C_org", result.C_org_pct.toFixed(2), "%", "C_tot - C_inorg"));
  push(csvRow("H/C_org molar", result.HC_org_molar.toFixed(3), "molar", "Drives PF — must be < 0.7"));
  if (result.OC_molar !== null) push(csvRow("O/C molar", result.OC_molar.toFixed(3), "molar"));
  push(csvRow("Permanence Factor M", result.permanenceFactor_M.toFixed(4), "", "From Table 6.1"));
  push(csvRow("Permanence Factor a", result.permanenceFactor_a.toFixed(4), "", "From Table 6.1"));
  push(csvRow("Permanence Factor", result.permanenceFactorPct.toFixed(2), "%", "PF = M - a·(H/C_org)"));

  push();
  push("E_PROJECT BREAKDOWN (Eq. 7.1 - 7.3),Value,Unit");
  push(csvRow("E_biomass — transport", result.E_biomass_transport.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_biomass — pre-processing", result.E_biomass_preProcessing.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_biomass — production", result.E_biomass_production.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_biomass — subtotal", result.E_biomass_subtotal.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_production — electricity", result.E_production_electricity.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_production — fuel", result.E_production_fuel.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_production — CH4 syngas", result.E_production_CH4_syngas.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_production — subtotal", result.E_production_subtotal.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_use — transport", result.E_use_transport.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_use — application", result.E_use_application.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_use — subtotal", result.E_use_subtotal.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_ops (sum)", result.E_ops.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_infra total", result.E_infra_total.toFixed(2), "tCO2"));
  push(csvRow("Amortization years", result.amortizationYears, "yr"));
  push(csvRow("E_infra annual", result.E_infra_annual.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_dLUC", result.E_dLUC.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_emb", result.E_emb.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_project TOTAL", result.E_project_tCO2PerYear.toFixed(2), "tCO2eq/yr"));

  push();
  push("LEAKAGE (Eq. 8.1),Value,Unit");
  push(csvRow("L_ECO — ecological", result.L_ECO.toFixed(2), "tCO2eq/yr"));
  push(csvRow("L_MA — iLUC", result.L_MA_iLUC.toFixed(2), "tCO2eq/yr"));
  push(csvRow("L_MA — feedstock", result.L_MA_feedstock.toFixed(2), "tCO2eq/yr"));
  push(csvRow("L_MA — subtotal", result.L_MA.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_leakage TOTAL", result.E_leakage_tCO2PerYear.toFixed(2), "tCO2eq/yr"));

  push();
  push("FINAL RESULT (Eq. 5.1),Value,Unit");
  push(csvRow("C_stored", result.C_stored_tCO2PerYear.toFixed(2), "tCO2eq/yr", "Eq. 6.1"));
  push(csvRow("C_baseline", result.C_baseline_tCO2PerYear.toFixed(2), "tCO2eq/yr"));
  push(csvRow("C_loss", result.C_loss_tCO2PerYear.toFixed(2), "tCO2eq/yr", "Non-permanent fraction"));
  push(csvRow("E_project", result.E_project_tCO2PerYear.toFixed(2), "tCO2eq/yr"));
  push(csvRow("E_leakage", result.E_leakage_tCO2PerYear.toFixed(2), "tCO2eq/yr"));
  push(csvRow("CORCs NET", result.CORCs_tCO2PerYear.toFixed(2), "tCO2eq/yr", "= C_stored - C_baseline - C_loss - E_project - E_leakage"));
  push(csvRow("CORCs per ton dry biochar", result.CORCsPerTonDryBiochar.toFixed(3), "tCO2/t"));
  push(csvRow("Removal efficiency", result.removalEfficiencyPct.toFixed(1), "%", "CORCs / C_stored"));

  push();
  push("VALIDATIONS,Status,Detail");
  for (const v of result.validations) {
    push(`${csvEscape(v.label)},${csvEscape(v.status)},${csvEscape(v.detail ?? "")}`);
  }

  // Add UTF-8 BOM so Excel recognizes encoding
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (inputs.projectName || "LCA").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.href = url;
  a.download = `${safeName}_LCA_Puro2025.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main LCA Module
// ============================================================================

export default function LCAModule({
  initialInputs,
  onResultChange,
  readOnly = false,
}: {
  initialInputs?: Partial<LCAInputs>;
  onResultChange?: (result: LCAResult) => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation("lcaModule");
  const [inputs, setInputs] = useState<LCAInputs>({
    ...DEFAULT_LCA_INPUTS,
    ...(initialInputs ?? {}),
  });

  const result = useMemo(() => calculateLCA(inputs), [inputs]);

  // Emit result changes to parent
  useMemo(() => {
    onResultChange?.(result);
  }, [result, onResultChange]);

  const update = <K extends keyof LCAInputs>(key: K, value: LCAInputs[K]) => {
    setInputs((p) => ({ ...p, [key]: value }));
  };

  const reset = () => setInputs(DEFAULT_LCA_INPUTS);

  const disabled = readOnly;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:h-[calc(100vh-10rem)]">
      {/* LEFT — INPUTS (6 sections) — fixed header + scrollable form */}
      <div className="lg:col-span-3 lg:flex lg:flex-col lg:min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2 lg:flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              {t("header.title")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {t("header.subtitle")}
            </p>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => exportLCAToCSV(inputs, result)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/30 rounded whitespace-nowrap"
                title={t("buttons.exportCsvTooltip")}
              >
                <FileSpreadsheet className="w-3 h-3" /> {t("buttons.exportCsv")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary rounded whitespace-nowrap"
                title={t("buttons.resetTooltip")}
              >
                <RotateCcw className="w-3 h-3" /> {t("buttons.reset")}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:min-h-0">
        {/* 1. PROJECT PARAMETERS */}
        <Section title={t("sections.project.title")} icon={FileText} color="text-blue-500">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <TextField label={t("sections.project.projectName")} value={inputs.projectName} onChange={(v) => update("projectName", v)} />
            <TextField label={t("sections.project.country")} value={inputs.country} onChange={(v) => update("country", v)} />
            <SelectField<FacilityType>
              label={t("sections.project.facilityType")}
              value={inputs.facilityType}
              onChange={(v) => update("facilityType", v)}
              options={[
                { value: "New Facility", label: t("sections.project.newFacility") },
                { value: "Existing Facility", label: t("sections.project.existingFacility") },
              ]}
            />
            <NumberField
              label={t("sections.project.monitoringPeriod")}
              unit={t("units.years")}
              value={inputs.monitoringPeriodYears}
              onChange={(v) => update("monitoringPeriodYears", v)}
              min={1}
            />
            <NumberField
              label={t("sections.project.creditingPeriod")}
              unit={t("units.years")}
              value={inputs.creditingPeriodYears}
              onChange={(v) => update("creditingPeriodYears", v)}
              hint={t("sections.project.creditingPeriodHint")}
              min={1}
              max={15}
            />
            <NumberField
              label={t("sections.project.facilityLifetime")}
              unit={t("units.years")}
              value={inputs.facilityLifetimeYears}
              onChange={(v) => update("facilityLifetimeYears", v)}
              min={1}
            />
          </div>
        </Section>

        {/* 2. BIOMASS */}
        <Section title={t("sections.biomass.title")} icon={Leaf} color="text-green-500">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <NumberField
              label={t("sections.biomass.wetBiomass")}
              unit="t/yr"
              value={inputs.wetBiomassTonsPerYear}
              onChange={(v) => update("wetBiomassTonsPerYear", v)}
              step={100}
            />
            <NumberField
              label={t("sections.biomass.biomassMoisture")}
              unit="%"
              value={inputs.biomassMoisturePct}
              onChange={(v) => update("biomassMoisturePct", v)}
              step={0.01}
              min={0}
              max={100}
            />
            <TextField label={t("sections.biomass.biomassType")} value={inputs.biomassType} onChange={(v) => update("biomassType", v)} />
            <NumberField
              label={t("sections.biomass.soilTemperature")}
              unit={t("sections.biomass.soilTemperatureUnit")}
              value={inputs.soilTemperatureC}
              onChange={(v) => update("soilTemperatureC", Math.round(v))}
              min={7}
              max={40}
              hint={t("sections.biomass.soilTemperatureHint")}
            />
            <NumberField
              label={t("sections.biomass.biomassTransportDistance")}
              unit="km"
              value={inputs.biomassTransportDistanceKm}
              onChange={(v) => update("biomassTransportDistanceKm", v)}
            />
            <SelectField<ApplicationType>
              label={t("sections.biomass.application")}
              value={inputs.applicationType}
              onChange={(v) => update("applicationType", v)}
              options={[
                { value: "Soil improver", label: t("sections.biomass.soilImprover") },
                { value: "Concrete", label: t("sections.biomass.concrete") },
                { value: "Asphalt", label: t("sections.biomass.asphalt") },
                { value: "Other", label: t("sections.biomass.other") },
              ]}
            />
          </div>
          <div className="mt-3 border-t border-border pt-2">
            <ToggleField
              label={t("sections.biomass.biomassIsResidue")}
              hint={t("sections.biomass.biomassIsResidueHint")}
              value={inputs.biomassIsResidue}
              onChange={(v) => update("biomassIsResidue", v)}
            />
          </div>
        </Section>

        {/* 3. BIOCHAR PROPERTIES */}
        <Section title={t("sections.biochar.title")} icon={Flame} color="text-amber-500">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <NumberField
              label={t("sections.biochar.yield")}
              unit="%"
              value={inputs.yieldPct}
              onChange={(v) => update("yieldPct", v)}
              step={0.01}
              min={0}
              max={100}
            />
            <NumberField
              label={t("sections.biochar.biocharMoisture")}
              unit="%"
              value={inputs.biocharMoisturePct}
              onChange={(v) => update("biocharMoisturePct", v)}
              step={0.01}
              min={0}
              max={100}
            />
            <NumberField
              label={t("sections.biochar.cTot")}
              unit="%"
              value={inputs.C_tot_pct}
              onChange={(v) => update("C_tot_pct", v)}
              step={0.1}
              hint={t("sections.biochar.cTotHint")}
            />
            <NumberField
              label={t("sections.biochar.cInorg")}
              unit="%"
              value={inputs.C_inorg_pct}
              onChange={(v) => update("C_inorg_pct", v)}
              step={0.1}
              hint={t("sections.biochar.cInorgHint")}
            />
            <NumberField
              label={t("sections.biochar.hydrogen")}
              unit="%"
              value={inputs.H_pct}
              onChange={(v) => update("H_pct", v)}
              step={0.01}
              hint={t("sections.biochar.hydrogenHint")}
            />
            <NumberField
              label={t("sections.biochar.oxygen")}
              unit="%"
              value={inputs.O_pct ?? 0}
              onChange={(v) => update("O_pct", v)}
              step={0.1}
            />
          </div>
        </Section>

        {/* 4. ENERGY & PROCESS */}
        <Section title={t("sections.energy.title")} icon={Factory} color="text-purple-500" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <NumberField
              label={t("sections.energy.preProcessingElectricity")}
              unit="kWh/yr"
              value={inputs.preProcessingElectricityKwhPerYear}
              onChange={(v) => update("preProcessingElectricityKwhPerYear", v)}
              step={10000}
            />
            <NumberField
              label={t("sections.energy.productionElectricity")}
              unit="kWh/yr"
              value={inputs.productionElectricityKwhPerYear}
              onChange={(v) => update("productionElectricityKwhPerYear", v)}
              step={10000}
            />
            <NumberField
              label={t("sections.energy.lpg")}
              unit="kg/yr"
              value={inputs.productionLPGKgPerYear}
              onChange={(v) => update("productionLPGKgPerYear", v)}
              step={100}
            />
            <NumberField
              label={t("sections.energy.diesel")}
              unit="L/yr"
              value={inputs.productionDieselLitersPerYear ?? 0}
              onChange={(v) => update("productionDieselLitersPerYear", v)}
              step={100}
            />
            <NumberField
              label={t("sections.energy.naturalGas")}
              unit="m³/yr"
              value={inputs.productionNaturalGasM3PerYear ?? 0}
              onChange={(v) => update("productionNaturalGasM3PerYear", v)}
              step={100}
            />
            <NumberField
              label={t("sections.energy.gridEF")}
              unit="tCO₂/kWh"
              value={inputs.electricityEF ?? 0.00023}
              onChange={(v) => update("electricityEF", v)}
              step={0.00001}
              hint={t("sections.energy.gridEFHint")}
            />
          </div>
        </Section>

        {/* 5. TRANSPORT & INFRASTRUCTURE */}
        <Section title={t("sections.transport.title")} icon={Truck} color="text-cyan-500" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <NumberField
              label={t("sections.transport.biocharTransportDistance")}
              unit="km"
              value={inputs.biocharTransportDistanceKm}
              onChange={(v) => update("biocharTransportDistanceKm", v)}
            />
            <NumberField
              label={t("sections.transport.applicationEmissions")}
              unit="tCO₂/yr"
              value={inputs.applicationEmissionsTPerYear ?? 0}
              onChange={(v) => update("applicationEmissionsTPerYear", v)}
              step={1}
            />
            <NumberField
              label={t("sections.transport.infraManufacturing")}
              unit="tCO₂"
              value={inputs.infrastructureManufacturingTCO2}
              onChange={(v) => update("infrastructureManufacturingTCO2", v)}
              step={10}
              hint={t("sections.transport.infraManufacturingHint")}
            />
            <NumberField
              label={t("sections.transport.infraTransport")}
              unit="tCO₂"
              value={inputs.infrastructureTransportTCO2}
              onChange={(v) => update("infrastructureTransportTCO2", v)}
              step={1}
              hint={t("sections.transport.infraTransportHint")}
            />
          </div>
          <div className="mt-3 border-t border-border pt-2">
            <ToggleField
              label={t("sections.transport.dLUC")}
              hint={t("sections.transport.dLUCHint")}
              value={inputs.hasLandUseChange}
              onChange={(v) => update("hasLandUseChange", v)}
            />
            {inputs.hasLandUseChange && (
              <div className="mt-2">
                <NumberField
                  label={t("sections.transport.dLUCAnnual")}
                  unit="tCO₂/yr"
                  value={inputs.dLUCAnnualTCO2 ?? 0}
                  onChange={(v) => update("dLUCAnnualTCO2", v)}
                />
              </div>
            )}
          </div>
        </Section>

        {/* 6. LEAKAGE */}
        <Section title={t("sections.leakage.title")} icon={Activity} color="text-pink-500" defaultOpen={false}>
          <ToggleField
            label={t("sections.leakage.ecologicalLeakageMitigated")}
            hint={t("sections.leakage.ecologicalLeakageMitigatedHint")}
            value={inputs.ecologicalLeakageMitigated}
            onChange={(v) => update("ecologicalLeakageMitigated", v)}
          />
          {!inputs.ecologicalLeakageMitigated && (
            <div className="mt-2">
              <NumberField
                label={t("sections.leakage.absoluteEcologicalLeakage")}
                unit="tCO₂"
                value={inputs.absoluteEcologicalLeakageTotal ?? 0}
                onChange={(v) => update("absoluteEcologicalLeakageTotal", v)}
              />
            </div>
          )}
          <div className="mt-2 border-t border-border pt-2">
            <ToggleField
              label={t("sections.leakage.feedstockDiverted")}
              hint={t("sections.leakage.feedstockDivertedHint")}
              value={inputs.feedstockDivertedFromProductiveUse}
              onChange={(v) => update("feedstockDivertedFromProductiveUse", v)}
            />
          </div>
        </Section>
        </div>
      </div>

      {/* RIGHT — RESULTS — scrolls independently */}
      <div className="lg:col-span-2 space-y-3 lg:overflow-y-auto lg:pr-1 lg:min-h-0">
        {/* HERO RESULT */}
        <div
          className={`rounded-xl border-2 p-4 ${
            result.isValid
              ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/40"
              : "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/40"
          }`}
        >
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            {t("results.hero.label")}
          </div>
          <div className={`text-3xl font-bold ${result.isValid ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {fmt(result.CORCs_tCO2PerYear, 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">tCO₂eq / year</div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
            <div>
              <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{t("results.hero.perTBiochar")}</div>
              <div className="text-sm font-semibold">{fmt(result.CORCsPerTonDryBiochar, 2)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{t("results.hero.efficiency")}</div>
              <div className="text-sm font-semibold">{fmt(result.removalEfficiencyPct, 1)}%</div>
            </div>
          </div>
        </div>

        {/* BREAKDOWN */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("results.corcCalc.title")}</h3>
          </div>
          <div className="divide-y divide-border text-[11px]">
            <Row label="C_stored" value={result.C_stored_tCO2PerYear} positive eq="6.1" />
            <Row label="− C_baseline" value={-result.C_baseline_tCO2PerYear} eq="6.3" />
            <Row
              label={`− C_loss (PF ${fmt(result.permanenceFactorPct, 1)}%)`}
              value={-result.C_loss_tCO2PerYear}
              eq="6.3"
            />
            <Row label="− E_project" value={-result.E_project_tCO2PerYear} eq="7.1" />
            <Row label="− E_leakage" value={-result.E_leakage_tCO2PerYear} eq="8.1" />
            <div className="px-4 py-2 bg-secondary/20 flex justify-between items-center">
              <span className="font-bold text-foreground">= {t("results.corcCalc.netCORCs")}</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {fmtTCO2(result.CORCs_tCO2PerYear)}
              </span>
            </div>
          </div>
        </div>

        {/* E_PROJECT BREAKDOWN */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("results.eProject.title")}
            </h3>
          </div>
          <div className="divide-y divide-border text-[11px]">
            <Row label={t("results.eProject.eBiomass")} value={result.E_biomass_subtotal} />
            <Row label={t("results.eProject.eProduction")} value={result.E_production_subtotal} />
            <Row label={t("results.eProject.eUse")} value={result.E_use_subtotal} />
            <Row label={t("results.eProject.eOps")} value={result.E_ops} bold />
            <Row label={t("results.eProject.eEmb", { years: result.amortizationYears })} value={result.E_emb} />
            <div className="px-4 py-2 bg-secondary/20 flex justify-between items-center">
              <span className="font-bold text-foreground">{t("results.eProject.total")}</span>
              <span className="font-bold">{fmtTCO2(result.E_project_tCO2PerYear)}</span>
            </div>
          </div>
        </div>

        {/* VALIDATIONS */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("results.validations.title")}</h3>
            {result.isValid ? (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{t("results.validations.allOk")}</span>
            ) : (
              <span className="text-[10px] font-bold text-red-500">{t("results.validations.errors")}</span>
            )}
          </div>
          <div className="divide-y divide-border">
            {result.validations.map((v) => (
              <div key={v.id} className="px-4 py-2 flex items-start gap-2">
                {v.status === "ok" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : v.status === "warning" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-[11px] font-medium">{v.label}</div>
                  {v.detail && <div className="text-[10px] text-muted-foreground">{v.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEEDSTOCK + BIOCHAR STATS */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("results.massBalance.title")}</h3>
          </div>
          <div className="divide-y divide-border text-[11px]">
            <Row label={t("results.massBalance.dryBiomass")} value={result.dryBiomassTPerYear} unit="t/yr" />
            <Row label={t("results.massBalance.dryBiochar")} value={result.dryBiocharTPerYear} unit="t/yr" />
            <Row label={t("results.massBalance.wetBiochar")} value={result.wetBiocharTPerYear} unit="t/yr" />
            <Row label="C_org" value={result.C_org_pct} unit="%" digits={2} />
            <Row label={t("results.massBalance.hcOrgMolar")} value={result.HC_org_molar} unit="" digits={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  unit = "tCO₂eq/yr",
  bold = false,
  positive = false,
  eq,
  digits = 0,
}: {
  label: string;
  value: number;
  unit?: string;
  bold?: boolean;
  positive?: boolean;
  eq?: string;
  digits?: number;
}) {
  const isNegativeSign = value < 0;
  return (
    <div className={`px-4 py-1.5 flex items-center justify-between gap-2 ${bold ? "bg-secondary/10" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`${bold ? "font-bold" : "text-muted-foreground"} truncate`}>{label}</span>
        {eq && <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">§ {eq}</span>}
      </div>
      <span
        className={`tabular-nums font-mono ${
          bold ? "font-bold text-foreground" : positive ? "text-green-600 dark:text-green-400" : isNegativeSign ? "text-red-500" : ""
        }`}
      >
        {fmt(value, digits)}
        {unit && <span className="text-[9px] text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}
