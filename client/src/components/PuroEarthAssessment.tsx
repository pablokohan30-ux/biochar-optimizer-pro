import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import type { BiocharResult, Feedstock } from "@/lib/biocharModel";

/* ─── Types ─── */

type CheckStatus = "pass" | "fail" | "manual_pass" | "manual_fail" | "pending";

interface Check {
  id: string;
  auto: boolean; // auto-evaluated from simulation data
  status: CheckStatus;
  detail?: string;
}

interface PuroEarthAssessmentProps {
  result: BiocharResult;
  feedstock: Feedstock;
  temperature: number;
  residenceTime: number;
  plantCapacityTph: number | null;
  country: string | null;
}

/* ─── Constants ─── */

const AUTO_CHECKS = [
  "minTemperature",
  "hcorgRatio",
  "carbonContent",
  "netRemoval",
  "residenceTime",
] as const;

const MANUAL_CHECKS = [
  "wasteFeedstock",
  "noLandUseChange",
  "contaminantTesting",
  "soilIncorporation",
  "applicationSite",
  "additionality",
  "noDoubleCounting",
  "monitoringPlan",
  "productionLogging",
  "thirdPartyVerification",
] as const;

/* ─── Component ─── */

export default function PuroEarthAssessment({
  result,
  feedstock,
  temperature,
  residenceTime,
  plantCapacityTph,
  country,
}: PuroEarthAssessmentProps) {
  const { t } = useTranslation("projectDetail");
  const [expanded, setExpanded] = useState(true);

  // Manual check states — stored locally (user toggles)
  const [manualStates, setManualStates] = useState<Record<string, boolean>>({});

  const toggleManual = (id: string) => {
    setManualStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Evaluate auto checks
  const checks: Check[] = useMemo(() => {
    const auto: Check[] = [
      {
        id: "minTemperature",
        auto: true,
        status: temperature >= 350 ? "pass" : "fail",
        detail: `${temperature} °C ${temperature >= 350 ? "≥" : "<"} 350 °C`,
      },
      {
        id: "hcorgRatio",
        auto: true,
        status: result.H_Corg < 0.7 ? "pass" : "fail",
        detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg < 0.7 ? "<" : "≥"} 0.7`,
      },
      {
        id: "carbonContent",
        auto: true,
        status: result.C > 10 ? "pass" : "fail",
        detail: `C = ${result.C.toFixed(1)}% ${result.C > 10 ? ">" : "≤"} 10%`,
      },
      {
        id: "netRemoval",
        auto: true,
        status: result.credits.net > 0 ? "pass" : "fail",
        detail: `Net CO₂e = ${result.credits.net.toFixed(2)} t/t`,
      },
      {
        id: "residenceTime",
        auto: true,
        status: residenceTime >= 10 ? "pass" : "fail",
        detail: `${residenceTime} min ${residenceTime >= 10 ? "≥" : "<"} 10 min`,
      },
    ];

    const manual: Check[] = MANUAL_CHECKS.map((id) => ({
      id,
      auto: false,
      status: manualStates[id] === true ? "manual_pass" : manualStates[id] === false ? "pending" : "pending",
    }));

    return [...auto, ...manual];
  }, [result, temperature, residenceTime, manualStates]);

  const totalChecks = checks.length;
  const passed = checks.filter(
    (c) => c.status === "pass" || c.status === "manual_pass",
  ).length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = totalChecks - passed - failed;
  const score = Math.round((passed / totalChecks) * 100);

  // Score color
  const scoreColor =
    score >= 80
      ? "text-green-500"
      : score >= 50
        ? "text-yellow-500"
        : "text-red-500";
  const scoreBg =
    score >= 80
      ? "bg-green-500/10 border-green-500/20"
      : score >= 50
        ? "bg-yellow-500/10 border-yellow-500/20"
        : "bg-red-500/10 border-red-500/20";

  return (
    <div className="space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
            {t("puro.title")}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Score overview — always visible */}
      <div className={`border rounded-xl p-4 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              {t("puro.complianceScore")}
            </div>
            <div className={`text-3xl font-mono font-bold ${scoreColor}`}>
              {score}%
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>{passed} {t("puro.passed")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <XCircle className="w-3 h-3 text-red-500" />
              <span>{failed} {t("puro.failed")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-3 h-3 text-muted-foreground" />
              <span>{pending} {t("puro.pending")}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-background rounded-full overflow-hidden flex">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${(passed / totalChecks) * 100}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${(failed / totalChecks) * 100}%` }}
          />
          <div
            className="bg-muted transition-all"
            style={{ width: `${(pending / totalChecks) * 100}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Auto-evaluated section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("puro.autoChecks")}
              </span>
            </div>
            <div className="space-y-1.5">
              {checks
                .filter((c) => c.auto)
                .map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5"
                  >
                    {check.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{t(`puro.checks.${check.id}`)}</div>
                      <div className="text-[10px] text-muted-foreground">{t(`puro.checksDesc.${check.id}`)}</div>
                    </div>
                    {check.detail && (
                      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                        {check.detail}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Manual checks section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldQuestion className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("puro.manualChecks")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                — {t("puro.manualHint")}
              </span>
            </div>
            <div className="space-y-1.5">
              {checks
                .filter((c) => !c.auto)
                .map((check) => (
                  <button
                    key={check.id}
                    type="button"
                    onClick={() => toggleManual(check.id)}
                    className="w-full flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
                  >
                    {check.status === "manual_pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{t(`puro.checks.${check.id}`)}</div>
                      <div className="text-[10px] text-muted-foreground">{t(`puro.checksDesc.${check.id}`)}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Methodology note */}
          <div className="bg-secondary/20 border border-border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("puro.disclaimer")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
