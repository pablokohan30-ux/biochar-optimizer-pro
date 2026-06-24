/**
 * AI Project Builder — single project detail view.
 *
 * Shows documents as they're generated (polls every 3s until status = complete).
 *
 * Each doc is rendered either as markdown (rich text) or as a structured JSON
 * view (tables for BOM, risk register, permit matrix).
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Sparkles, CheckCircle2, Clock, AlertTriangle, FileText, RefreshCw,
  Download, ArrowLeft, Copy, Check, Printer, ClipboardList, ThumbsUp, ThumbsDown,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { pddHandoffStorageKey } from "@/lib/aiHandoff";

// ─── Markdown renderer (lightweight, no external deps) ─────────────────────
// Supports headings, bold, italic, code, lists, and paragraphs — enough for
// what Gemini produces. Full markdown is overkill for this.
function MarkdownBlock({ content }: { content: string }) {
  const html = useMemo(() => {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Block elements
    let out = escaped
      // Headings
      .replace(/^###### (.+)$/gm, '<h6 class="font-semibold text-sm mt-4 mb-1">$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5 class="font-semibold text-sm mt-4 mb-1">$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4 class="font-semibold text-base mt-4 mb-2">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-5 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-6 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-semibold text-xl mt-6 mb-3 text-foreground">$1</h1>');

    // Inline: bold, italic, code
    out = out
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-muted text-foreground text-xs rounded font-mono">$1</code>');

    // Lists: convert "- " at line start to bullet items grouped
    const lines = out.split("\n");
    const rebuilt: string[] = [];
    let inList = false;
    for (const line of lines) {
      if (/^[-*] /.test(line)) {
        if (!inList) {
          rebuilt.push('<ul class="list-disc pl-6 space-y-1 my-3 text-foreground/90">');
          inList = true;
        }
        rebuilt.push(`<li>${line.replace(/^[-*] /, "")}</li>`);
      } else {
        if (inList) {
          rebuilt.push("</ul>");
          inList = false;
        }
        rebuilt.push(line);
      }
    }
    if (inList) rebuilt.push("</ul>");

    // Paragraphs: wrap double-newline blocks that aren't headings/lists
    const joined = rebuilt.join("\n");
    const blocks = joined.split(/\n{2,}/).map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|pre|table|div)/.test(trimmed)) return trimmed;
      return `<p class="text-sm text-foreground/90 my-2 leading-relaxed">${trimmed.replace(/\n/g, "<br/>")}</p>`;
    });

    return blocks.join("\n");
  }, [content]);

  return <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Structured renderers for JSON docs ─────────────────────────────────────

function EquipmentBomTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data || !data.items) {
    return <div className="text-sm text-muted-foreground">{tb("noBomData", "No BOM data.")}</div>;
  }

  const byCategory = data.items.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {data.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label={tb("totalConnectedLoad", "Total connected load")} value={`${data.summary.totalConnectedLoadKw?.toLocaleString() ?? "—"} kW`} />
          <SummaryCard label={tb("demandLoad", "Demand load")} value={`${data.summary.demandLoadKw?.toLocaleString() ?? "—"} kW`} />
          <SummaryCard label={tb("mainTransformer", "Main transformer")} value={`${data.summary.mainTransformerKva?.toLocaleString() ?? "—"} kVA`} />
          <SummaryCard label={tb("equipmentCapex", "Equipment CAPEX")} value={`USD ${data.summary.estimatedEquipmentCapexUsd?.toLocaleString() ?? "—"}`} />
        </div>
      )}

      {data.summary?.notes && (
        <p className="text-xs text-muted-foreground italic">{data.summary.notes}</p>
      )}

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{category.replace(/-/g, " ")}</h4>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Tag</th>
                  <th className="text-left px-3 py-2 font-medium">{tb("bomNameModel", "Name / Model")}</th>
                  <th className="text-right px-3 py-2 font-medium">Qty</th>
                  <th className="text-left px-3 py-2 font-medium">{tb("capacityLabel", "Capacity")}</th>
                  <th className="text-right px-3 py-2 font-medium">kW each</th>
                  <th className="text-right px-3 py-2 font-medium">Total kW</th>
                  <th className="text-right px-3 py-2 font-medium">Cost USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(items as any[]).map((item, i) => (
                  <tr key={i} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono">{item.tag}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.modelOrType}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2">{item.capacityDescription}</td>
                    <td className="px-3 py-2 text-right">{item.powerKwEach?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium">{item.totalPowerKw?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{item.estimatedCostUsd?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskRegisterTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data || !data.risks) {
    return <div className="text-sm text-muted-foreground">{tb("noRiskData", "No risk data.")}</div>;
  }
  return (
    <div className="space-y-3">
      {data.risks.map((r: any, i: number) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{r.type}</span>
              <RiskBadge level={r.riskLevel} />
            </div>
            <div className="text-xs text-muted-foreground">
              {tb("likelihood", "Likelihood")} {r.likelihood} · {tb("impact", "Impact")} {r.impact}
            </div>
          </div>
          <p className="text-sm text-foreground/90 mb-2">{r.description}</p>
          <div className="text-xs text-muted-foreground mb-1"><span className="font-medium text-muted-foreground">{tb("mitigation", "Mitigation")}:</span> {r.mitigation}</div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-muted-foreground">{tb("owner", "Owner")}:</span> {r.owner}
            {r.supportingDoc && <> · <span className="font-medium text-muted-foreground">{tb("supporting", "Supporting")}:</span> {r.supportingDoc}</>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colorMap[level] ?? colorMap.LOW}`}>
      {level}
    </span>
  );
}

function PermitMatrixTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data || !data.permits) {
    return <div className="text-sm text-muted-foreground">{tb("noPermitData", "No permit data.")}</div>;
  }
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{tb("countryLabel", "Country")}: <span className="font-medium text-foreground">{data.country}</span></div>
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Permit</th>
              <th className="text-left px-3 py-2 font-medium">Authority</th>
              <th className="text-right px-3 py-2 font-medium">Days</th>
              <th className="text-right px-3 py-2 font-medium">Fee USD</th>
              <th className="text-left px-3 py-2 font-medium">{tb("permitCriticalPath", "Critical path")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.permits.map((p: any, i: number) => (
              <tr key={i} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-foreground/90">{p.issuingAuthority}</div>
                  {p.legalReference && <div className="text-xs text-muted-foreground font-mono">{p.legalReference}</div>}
                </td>
                <td className="px-3 py-2 text-right">{p.typicalTimelineDays}</td>
                <td className="px-3 py-2 text-right">{p.feesEstimateUsd?.toLocaleString()}</td>
                <td className="px-3 py-2"><RiskBadge level={p.criticalPathImpact} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.disclaimer && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 italic">
          {data.disclaimer}
        </p>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function mergePddDraftAnswers(
  projectId: number,
  answers: Record<string, string>,
  reusedExistingProject: boolean,
) {
  const key = `pdd_${projectId}`;
  if (!reusedExistingProject) {
    localStorage.setItem(key, JSON.stringify(answers));
    return;
  }

  const rawExisting = localStorage.getItem(key);
  if (!rawExisting) {
    localStorage.setItem(key, JSON.stringify(answers));
    return;
  }

  try {
    const parsedExisting = JSON.parse(rawExisting);
    if (!parsedExisting || typeof parsedExisting !== "object") {
      localStorage.setItem(key, JSON.stringify(answers));
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        ...answers,
        ...(parsedExisting as Record<string, string>),
      }),
    );
  } catch {
    localStorage.setItem(key, JSON.stringify(answers));
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AiBuilderProject() {
  const { t, i18n } = useTranslation("common");
  const tb = (k: string, fallback: string, opts?: Record<string, any>) =>
    t(`aiBuilder.${k}`, { defaultValue: fallback, ...(opts ?? {}) });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

  const projectQuery = trpc.aiBuilder.get.useQuery(
    { projectId },
    {
      enabled: isAuthenticated && Number.isFinite(projectId),
      refetchInterval: (query) => {
        if (query.state.error) return false;
        const data = query.state.data;
        if (!data) return 3000;
        // Keep polling while generating
        return data.status === "generating" || data.status === "pending" ? 3000 : false;
      },
    },
  );

  const docTypesQuery = trpc.aiBuilder.listDocTypes.useQuery(undefined, { enabled: isAuthenticated });
  const retryMutation = trpc.aiBuilder.retryDoc.useMutation({
    onSuccess: () => projectQuery.refetch(),
  });
  const pddFromAiMutation = trpc.aiBuilder.createPddFromAi.useMutation({
    onSuccess: (data) => {
      // Write flattened answers to localStorage keyed by the new project ID.
      // This is the same key the PDD Builder reads on mount.
      try {
        mergePddDraftAnswers(data.projectId, data.answers, data.reusedExistingProject);
        localStorage.setItem(
          pddHandoffStorageKey(data.projectId),
          JSON.stringify({
            sourceAiProjectId: data.sourceAiProjectId,
            sourceAiProjectName: data.sourceAiProjectName,
            reusedExistingProject: data.reusedExistingProject,
            linkedProjectCount: data.linkedProjectCount,
            createdAtMs: Date.now(),
          }),
        );
      } catch {}
      navigate(`/pdd/${data.projectId}`);
    },
  });

  // Per-doc feedback (thumbs up/down). Stored server-side so admins can
  // aggregate signals across users and iterate on weak prompts.
  const feedbackQuery = trpc.aiBuilder.getFeedback.useQuery(
    { aiProjectId: projectId },
    { enabled: isAuthenticated && Number.isFinite(projectId) },
  );
  const feedbackMutation = trpc.aiBuilder.submitFeedback.useMutation({
    onSuccess: () => feedbackQuery.refetch(),
  });
  const userVotes = feedbackQuery.data?.votes ?? {};
  const submitFeedback = (docId: string, newVote: "up" | "down") => {
    const current = userVotes[docId]?.vote;
    // If the user clicks their current vote, unvote. Otherwise set/flip.
    const vote = current === newVote ? null : newVote;
    feedbackMutation.mutate({ aiProjectId: projectId, docId, vote });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return null;
  }
  if (!Number.isFinite(projectId)) {
    return (
      <AppLayout>
        <div className="p-8">{tb("invalidProjectId", "Invalid project ID.")}</div>
      </AppLayout>
    );
  }

  const project = projectQuery.data;
  const projectErrorMessage = projectQuery.error?.message ?? null;
  const projectMissing = projectErrorMessage === "Project not found";
  const showProjectError = !!projectErrorMessage && !project;
  const docTypes = docTypesQuery.data ?? [];
  const generatedDocs = project?.docs ?? {};
  const completedCount = Object.keys(generatedDocs).filter((k) => !generatedDocs[k].error).length;
  const totalDocs = docTypes.length;
  const canCreateEditableDraft = !!generatedDocs["pdd-pre-fill"] && !generatedDocs["pdd-pre-fill"].error;
  const linkedProjectId = project?.linkedProjectId ?? null;
  const linkedProjectCount = project?.linkedProjectCount ?? 0;
  const hasLinkedProject = typeof linkedProjectId === "number" && linkedProjectId > 0;

  const handleCopy = async (docId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedDoc(docId);
      setTimeout(() => setCopiedDoc(null), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <AppLayout fullBleed>
      <div
        className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden px-3 py-6 sm:px-6 sm:py-8 bg-[linear-gradient(180deg,rgba(238,242,255,0.96),rgba(248,250,252,0.99))] [--background:oklch(0.985_0.004_255)] [--foreground:oklch(0.25_0.02_255)] [--card:oklch(1_0_0)] [--card-foreground:oklch(0.25_0.02_255)] [--popover:oklch(1_0_0)] [--popover-foreground:oklch(0.25_0.02_255)] [--secondary:oklch(0.96_0.008_255)] [--secondary-foreground:oklch(0.32_0.02_255)] [--muted:oklch(0.965_0.008_255)] [--muted-foreground:oklch(0.54_0.02_255)] [--accent:oklch(0.78_0.09_245)] [--accent-foreground:oklch(0.22_0.02_255)] [--border:oklch(0.89_0.01_255)] [--input:oklch(0.94_0.008_255)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_68%)]" />
        <div className="relative mx-auto max-w-5xl rounded-[28px] border border-border/80 bg-background/92 px-4 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm space-y-6 sm:px-6">
        {/* Back link */}
        <button
          onClick={() => navigate("/ai-builder")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> {tb("back", "Back to projects")}
        </button>

        {/* Project header */}
        {showProjectError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <h1 className="text-lg font-semibold text-amber-950">
                  {projectMissing
                    ? tb("projectNotFoundTitle", "Este paquete AI ya no está disponible")
                    : tb("projectLoadErrorTitle", "No pudimos abrir este paquete AI")}
                </h1>
                <p className="text-sm text-amber-900/90 leading-relaxed">
                  {projectMissing
                    ? tb("projectNotFoundBody", "Puede haber sido eliminado, pertenecer a otro usuario o haberse quedado con un link viejo. Vuelve a la lista de proyectos generados para seguir desde un paquete vigente.")
                    : tb("projectLoadErrorBody", "Tuvimos un problema al cargar este paquete. Puedes reintentar ahora o volver a la lista de proyectos generados.")}
                </p>
                {!projectMissing && (
                  <p className="text-xs text-amber-800/80 font-mono">
                    {projectErrorMessage}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => navigate("/ai-builder")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-900 text-white text-sm font-medium hover:bg-amber-950"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {tb("returnToProjectList", "Volver a proyectos generados")}
                  </button>
                  {!projectMissing && (
                    <button
                      onClick={() => projectQuery.refetch()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm font-medium text-amber-900 hover:bg-amber-100"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {tb("retryLoad", "Reintentar carga")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : project ? (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-200">
                    {tb("aiGeneratedBadge", "AI-Generated Project Package")}
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 mb-2">{project.name}</h1>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{project.capacityTnYear.toLocaleString()} tn/yr biomass</span>
                  <span>•</span>
                  <span>{project.country}</span>
                  {project.location && (
                    <>
                      <span>•</span>
                      <span>{project.location}</span>
                    </>
                  )}
                  {project.targetMethodology && (
                    <>
                      <span>•</span>
                      <span>{tb("methodologyLabel", "Methodology")}: {project.targetMethodology}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {tb("documentsOfTotal", `${completedCount} / ${totalDocs} documents`, { done: completedCount, total: totalDocs })}
                  </div>
                  <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                      style={{ width: `${(completedCount / Math.max(totalDocs, 1)) * 100}%` }}
                    />
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {completedCount > 0 && (
                    <a
                      href={`/ai-builder/${projectId}/print?autoprint=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> {tb("exportPdf", "Export package as PDF")}
                    </a>
                  )}
                  {canCreateEditableDraft && (
                    <button
                      onClick={() => pddFromAiMutation.mutate({ aiProjectId: projectId })}
                      disabled={pddFromAiMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-indigo-300 text-indigo-700 text-xs font-medium rounded hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      {pddFromAiMutation.isPending
                        ? tb("openingEditableDraft", "Abriendo borrador editable…")
                        : hasLinkedProject
                          ? tb("openEditableDraft", "Abrir borrador editable en PDD")
                          : tb("createEditableDraft", "Crear borrador editable en PDD")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {canCreateEditableDraft && (
              <div className="mt-4 rounded-lg border border-indigo-200 bg-white/70 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 mb-1">
                  {tb("handoffEyebrow", "Cómo sigue este flujo")}
                </div>
                <h2 className="text-sm font-semibold text-slate-900 mb-2">
                  {tb("handoffTitle", "El paquete AI no es otro proyecto: es el punto de partida del mismo proyecto editable")}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tb("handoffBody", "Cuando pasas a PDD Builder, la plataforma crea o reutiliza tu proyecto editable, precargado con el borrador AI. Desde ahí completas el PDD y luego continúas el mismo proyecto en la vista operativa de /projects.")}
                </p>
                <GuideLink anchor="como-ai-builder" label="Cómo pasar del paquete AI al PDD y al proyecto" className="mt-3 inline-flex" />
                {hasLinkedProject && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {linkedProjectCount > 1
                      ? tb("handoffReuseMultiple", "Ya encontramos más de un borrador editable vinculado a este paquete. Vamos a abrir el más reciente para que sigas en el mismo flujo.")
                      : tb("handoffReuseSingle", "Ya existe un borrador editable vinculado a este paquete. Al abrir PDD retomamos ese mismo proyecto, sin crear otro paralelo.")}
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-3 mt-3 text-xs">
                  <div className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="font-semibold text-foreground">{tb("handoffStepAi", "1. Paquete AI")}</div>
                    <div className="text-muted-foreground mt-1">{tb("handoffStepAiBody", "Salida rápida para explorar el proyecto y revisar el borrador documental.")}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="font-semibold text-foreground">{tb("handoffStepPdd", "2. PDD editable")}</div>
                    <div className="text-muted-foreground mt-1">{tb("handoffStepPddBody", "Aquí refinamos el contenido técnico y completamos los huecos que la AI no debe cerrar sola.")}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="font-semibold text-foreground">{tb("handoffStepProject", "3. Proyecto operativo")}</div>
                    <div className="text-muted-foreground mt-1">{tb("handoffStepProjectBody", "Después trabajas ese mismo proyecto en evidencia, offtake, comunidad y go-to-market.")}</div>
                  </div>
                </div>
                {hasLinkedProject && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={`/projects/${linkedProjectId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
                    >
                      {tb("openOperationalProject", "Abrir proyecto operativo actual")}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <PageLoader />
        )}

        {/* Docs list */}
        {project && (
          <div className="space-y-3">
            {docTypes.map((docType) => {
              const doc = generatedDocs[docType.id];
              const isExpanded = expandedDocs[docType.id] ?? true;
              const toggleExpanded = () =>
                setExpandedDocs((s) => ({ ...s, [docType.id]: !(s[docType.id] ?? true) }));

              return (
                <div key={docType.id} className="bg-card border border-border rounded-lg overflow-x-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/40/50">
                    <button onClick={toggleExpanded} className="flex items-center gap-3 flex-1 text-left">
                      <DocStatusIcon hasDoc={!!doc} hasError={!!doc?.error} generating={!doc && (project.status === "generating" || project.status === "pending")} />
                      <div>
                        <div className="font-medium text-foreground text-sm">{docType.title}</div>
                        <div className="text-xs text-muted-foreground">{docType.description}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      {doc && !doc.error && (
                        <>
                          {/* Feedback thumbs — clicking the active vote unvotes */}
                          <button
                            onClick={(e) => { e.stopPropagation(); submitFeedback(docType.id, "up"); }}
                            disabled={feedbackMutation.isPending}
                            className={`p-1.5 rounded hover:bg-muted disabled:opacity-50 ${userVotes[docType.id]?.vote === "up" ? "text-emerald-600" : "text-muted-foreground/70 hover:text-emerald-600"}`}
                            title={tb("thumbsUp", "Good output")}
                          >
                            <ThumbsUp className={`w-4 h-4 ${userVotes[docType.id]?.vote === "up" ? "fill-emerald-600" : ""}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); submitFeedback(docType.id, "down"); }}
                            disabled={feedbackMutation.isPending}
                            className={`p-1.5 rounded hover:bg-muted disabled:opacity-50 ${userVotes[docType.id]?.vote === "down" ? "text-red-600" : "text-muted-foreground/70 hover:text-red-600"}`}
                            title={tb("thumbsDown", "Needs improvement")}
                          >
                            <ThumbsDown className={`w-4 h-4 ${userVotes[docType.id]?.vote === "down" ? "fill-red-600" : ""}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(docType.id, doc.content); }}
                            className="p-1.5 text-muted-foreground/70 hover:text-foreground/90 rounded"
                            title={tb("copyContent", "Copy content")}
                          >
                            {copiedDoc === docType.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                      {doc?.error && (
                        <button
                          onClick={(e) => { e.stopPropagation(); retryMutation.mutate({ projectId, docId: docType.id, lang: i18n.language }); }}
                          disabled={retryMutation.isPending}
                          className="p-1.5 text-muted-foreground/70 hover:text-indigo-700 rounded disabled:opacity-50"
                          title={tb("retry", "Retry")}
                        >
                          <RefreshCw className={`w-4 h-4 ${retryMutation.isPending ? "animate-spin" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  {isExpanded && (
                    <div className="px-5 py-4">
                      {!doc && (
                        <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-pulse" /> {tb("waitingToGenerate", "Waiting to generate…")}
                        </div>
                      )}
                      {doc?.error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                          <div className="font-medium mb-1">{tb("generationFailed", "Generation failed")}</div>
                          <div className="text-xs">
                            {tb("generationFailedHint", "We couldn't generate this document. Please retry — if it persists, the team has been notified.")}
                          </div>
                          <button
                            onClick={() => retryMutation.mutate({ projectId, docId: docType.id, lang: i18n.language })}
                            className="mt-2 text-xs text-red-900 underline"
                          >
                            {tb("retryDoc", "Retry this document")}
                          </button>
                          <details className="mt-2 text-[11px] text-red-900/70">
                            <summary className="cursor-pointer">{tb("technicalDetails", "Technical details")}</summary>
                            <code className="block mt-1 break-all">{doc.error}</code>
                          </details>
                        </div>
                      )}
                      {doc && !doc.error && <DocRenderer doc={doc} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer footer */}
        {project && (
          <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
            {tb("draftNote", "BORRADOR — generado con IA. Estos documentos son un punto de partida y deben ser revisados por profesionales calificados antes de cualquier envío a certificadora o inversor. Verifica todos los números, referencias legales y especificaciones de equipo con asesoría legal local y socios de ingeniería.")}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
}

function DocRenderer({ doc }: { doc: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (doc.format === "markdown") {
    return <MarkdownBlock content={doc.content} />;
  }
  if (doc.format === "json") {
    let parsed: any = null;
    try {
      parsed = JSON.parse(doc.content);
    } catch {
      return (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{doc.content}</pre>
      );
    }
    // Pick a structured renderer by doc ID
    if (doc.docId === "equipment-bom") return <EquipmentBomTable data={parsed} />;
    if (doc.docId === "risk-register") return <RiskRegisterTable data={parsed} />;
    if (doc.docId === "permit-matrix") return <PermitMatrixTable data={parsed} />;
    if (doc.docId === "electrical-package") return <ElectricalPackageView data={parsed} />;
    if (doc.docId === "financial-summary") return <FinancialSummaryView data={parsed} />;
    if (doc.docId === "methodology-compliance") return <MethodologyComplianceView data={parsed} />;
    if (doc.docId === "stakeholder-mapping") return <StakeholderMappingView data={parsed} />;
    if (doc.docId === "pdd-pre-fill") return <PddPreFillView data={parsed} />;
    // Generic JSON fallback
    return (
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded max-h-96 overflow-auto">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  }
  return <div className="text-sm text-muted-foreground">{tb("unsupportedFormat", "Unsupported format")}</div>;
}

// ─── Electrical Package renderer ────────────────────────────────────────────
function ElectricalPackageView({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (!data) return <div className="text-sm text-muted-foreground">{tb("noData", "No data.")}</div>;
  const s = data.systemSummary ?? {};
  return (
    <div className="space-y-5">
      {/* System summary */}
      <div>
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("systemSummary", "System Summary")}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label={tb("mainSupply", "Main supply")} value={`${s.mainSupplyVoltage ?? "—"} / ${s.frequency ?? "—"} / ${s.phases ?? "—"}`} />
          <SummaryCard label={tb("connectedLoad", "Connected load")} value={`${s.totalConnectedLoadKw?.toLocaleString() ?? "—"} kW`} />
          <SummaryCard label={tb("demandLoad", "Demand load")} value={`${s.demandLoadKw?.toLocaleString() ?? "—"} kW`} />
          <SummaryCard label={tb("transformer", "Transformer")} value={`${s.mainTransformerKva?.toLocaleString() ?? "—"} kVA`} />
          <SummaryCard label={tb("switchboard", "Switchboard")} value={`${s.mainSwitchboardRatingA?.toLocaleString() ?? "—"} A`} />
          <SummaryCard label={tb("backupGenerator", "Backup gen")} value={`${s.emergencyGeneratorKw?.toLocaleString() ?? "—"} kW`} />
          <SummaryCard label="PF" value={s.powerFactor?.toString() ?? "—"} />
          <SummaryCard label={tb("annualEnergy", "Annual energy")} value={`${s.estimatedAnnualEnergyMwh?.toLocaleString() ?? "—"} MWh`} />
        </div>
      </div>

      {/* Load centers */}
      {Array.isArray(data.loadCenters) && data.loadCenters.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("loadCenters", "Load Centers")}</h4>
          <table className="w-full text-xs border border-border rounded-lg overflow-x-auto">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Area</th>
                <th className="text-right px-3 py-2 font-medium">kW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.loadCenters.map((lc: any, i: number) => (
                <tr key={i}><td className="px-3 py-2">{lc.name}</td><td className="px-3 py-2 text-right">{lc.kw?.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MCCs */}
      {Array.isArray(data.mccs) && data.mccs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("motorControlCenters", "Motor Control Centers")}</h4>
          <div className="space-y-3">
            {data.mccs.map((mcc: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="text-sm font-medium text-foreground mb-1">{mcc.id} · {mcc.location}</div>
                <div className="text-xs text-muted-foreground mb-2">{tb("capacityLabel", "Capacity")}: {mcc.capacityA} A · {mcc.voltage}</div>
                <table className="w-full text-xs mt-2">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left py-1">{tb("equipment", "Equipment")}</th>
                      <th className="text-right py-1">{tb("currentAmps", "Current (A)")}</th>
                      <th className="text-left py-1 pl-3">{tb("notes", "Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(mcc.feeders ?? []).map((f: any, j: number) => (
                      <tr key={j} className="border-t border-border/60">
                        <td className="py-1">{f.equipment}</td>
                        <td className="py-1 text-right">{f.currentA}</td>
                        <td className="py-1 pl-3 text-muted-foreground">{f.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zones */}
      {Array.isArray(data.zones) && data.zones.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("equipmentLayoutZones", "Equipment Layout Zones")}</h4>
          <div className="space-y-2">
            {data.zones.map((z: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="text-sm font-medium text-foreground mb-0.5">{z.name}</div>
                <div className="text-xs text-muted-foreground mb-1">Equipment: {z.equipment}</div>
                <div className="text-xs text-muted-foreground">{z.electricalRequirements}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single-line diagram */}
      {data.singleLineDiagramDescription && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("singleLineDescription", "Single-Line Diagram (Description)")}</h4>
          <p className="text-sm text-foreground/90 bg-muted/40 border border-border rounded-lg p-3 leading-relaxed">{data.singleLineDiagramDescription}</p>
        </div>
      )}

      {data.status && (
        <div className="text-xs italic text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {data.status}
        </div>
      )}
    </div>
  );
}

// ─── Financial Summary renderer ─────────────────────────────────────────────
function FinancialSummaryView({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (!data) return <div className="text-sm text-muted-foreground">{tb("noData", "No data.")}</div>;
  const capex = data.capex ?? {};
  const opex = data.opex ?? {};
  const revenue = data.revenueStack ?? {};
  const econ = data.economics ?? {};
  const add = data.additionality ?? {};

  return (
    <div className="space-y-5">
      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={tb("totalCapex", "Total CAPEX")} value={`USD ${capex.totalUsd?.toLocaleString() ?? "—"}`} />
        <SummaryCard label={tb("annualOpex", "Annual OPEX")} value={`USD ${opex.annualTotalUsd?.toLocaleString() ?? "—"}`} />
        <SummaryCard label={tb("revenueYear3", "Rev. (Yr 3)")} value={`USD ${revenue.annualTotalUsdYear3?.toLocaleString() ?? "—"}`} />
        <SummaryCard label="IRR" value={`${econ.irrPercentage?.toFixed(1) ?? "—"}%`} />
        <SummaryCard label="NPV" value={`USD ${econ.npvUsd?.toLocaleString() ?? "—"}`} />
        <SummaryCard label={tb("payback", "Payback")} value={`${econ.paybackYears ?? "—"} yrs`} />
        <SummaryCard label={tb("creditsPerYear", "CDR credits/yr")} value={`${revenue.carbonCreditsAnnualTco2e?.toLocaleString() ?? "—"} tCO2e`} />
        <SummaryCard label={tb("biocharPerYear", "Biochar/yr")} value={`${revenue.biocharAnnualTonnes?.toLocaleString() ?? "—"} t`} />
      </div>

      {/* CAPEX breakdown */}
      {Array.isArray(capex.breakdown) && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("capexBreakdown", "CAPEX Breakdown")}</h4>
          <table className="w-full text-xs border border-border rounded-lg overflow-x-auto">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{tb("category", "Category")}</th>
                <th className="text-right px-3 py-2 font-medium">USD</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
                <th className="text-left px-3 py-2 font-medium">{tb("notes", "Notes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {capex.breakdown.map((b: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2">{b.category}</td>
                  <td className="px-3 py-2 text-right">{b.usd?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{b.percentage?.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {capex.notes && <p className="text-xs text-muted-foreground italic mt-2">{capex.notes}</p>}
        </div>
      )}

      {/* OPEX breakdown */}
      {Array.isArray(opex.breakdown) && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("opexBreakdown", "OPEX Breakdown (Annual)")}</h4>
          <table className="w-full text-xs border border-border rounded-lg overflow-x-auto">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{tb("category", "Category")}</th>
                <th className="text-right px-3 py-2 font-medium">{tb("usdPerYear", "USD/year")}</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
                <th className="text-left px-3 py-2 font-medium">{tb("notes", "Notes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {opex.breakdown.map((b: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2">{b.category}</td>
                  <td className="px-3 py-2 text-right">{b.annualUsd?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{b.percentage?.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue stack */}
      <div>
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("revenueStackYear3", "Revenue Stack (Year 3)")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-border rounded-lg p-3">
            <div className="text-sm font-medium text-foreground mb-1">{tb("carbonCredits", "Carbon Credits")}</div>
            <div className="text-xs text-muted-foreground">{revenue.carbonCreditsAnnualTco2e?.toLocaleString()} tCO2e × USD {revenue.carbonCreditPriceUsdPerTon}/t = <span className="font-semibold text-foreground">USD {revenue.carbonCreditAnnualRevenueUsd?.toLocaleString()}/yr</span></div>
          </div>
          <div className="border border-border rounded-lg p-3">
            <div className="text-sm font-medium text-foreground mb-1">{tb("biocharSales", "Biochar sales")}</div>
            <div className="text-xs text-muted-foreground">{revenue.biocharAnnualTonnes?.toLocaleString()} t × USD {revenue.biocharPriceUsdPerTonne}/t = <span className="font-semibold text-foreground">USD {revenue.biocharAnnualRevenueUsd?.toLocaleString()}/yr</span></div>
          </div>
        </div>
        {revenue.otherRevenueStreams && <p className="text-xs text-muted-foreground italic mt-2">{tb("otherRevenue", "Other")}: {revenue.otherRevenueStreams}</p>}
      </div>

      {/* Additionality */}
      {add.narrative && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-indigo-900 mb-1">{tb("financialAdditionality", "Financial Additionality")}</div>
          <p className="text-sm text-indigo-800 mb-2">{add.narrative}</p>
          <div className="text-xs text-indigo-700">
            Carbon revenue = <strong>{add.carbonRevenueShareOfTotalPercentage?.toFixed(1)}%</strong> of total revenue.
            Unsubsidized project cost: <strong>USD {add.unsubsidizedCostUsd?.toLocaleString()}</strong>.
          </div>
        </div>
      )}

      {data.disclaimer && (
        <div className="text-xs italic text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {data.disclaimer}
        </div>
      )}
    </div>
  );
}

// ─── Methodology Compliance renderer ────────────────────────────────────────
function MethodologyComplianceView({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (!data || !Array.isArray(data.methodologies)) return <div className="text-sm text-muted-foreground">{tb("noData", "No data.")}</div>;
  const statusColor: Record<string, string> = {
    MEETS: "bg-emerald-100 text-emerald-800",
    PARTIAL: "bg-amber-100 text-amber-800",
    PENDING: "bg-muted text-foreground/90",
    DOES_NOT_MEET: "bg-red-100 text-red-800",
    NOT_APPLICABLE: "bg-muted/40 text-muted-foreground",
  };
  const fitColor: Record<string, string> = {
    STRONG: "bg-emerald-600 text-white",
    MODERATE: "bg-amber-500 text-white",
    WEAK: "bg-red-500 text-white",
  };

  return (
    <div className="space-y-4">
      {data.bestFitMethodology && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
          <div className="text-xs text-indigo-600 uppercase tracking-wide mb-1">{tb("recommendedMethodology", "Recommended methodology")}</div>
          <div className="text-sm font-semibold text-indigo-900 mb-1">{data.bestFitMethodology}</div>
          {data.rationale && <div className="text-xs text-indigo-800">{data.rationale}</div>}
        </div>
      )}

      {data.methodologies.map((m: any, i: number) => (
        <div key={i} className="border border-border rounded-lg overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-foreground">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.status}</div>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded ${fitColor[m.overallFit] ?? "bg-slate-200"}`}>{m.overallFit}</span>
          </div>
          <div className="p-3 space-y-2">
            {(m.criteria ?? []).map((c: any, j: number) => (
              <div key={j} className="flex items-start gap-3 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusColor[c.projectStatus] ?? statusColor.PENDING}`}>
                  {c.projectStatus.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{c.criterion}</div>
                  <div className="text-muted-foreground mt-0.5">{c.requirement}</div>
                  {c.notes && <div className="text-muted-foreground italic mt-0.5">{c.notes}</div>}
                </div>
              </div>
            ))}
          </div>
          {m.recommendation && (
            <div className="px-4 py-2 bg-muted/40 border-t border-border text-xs text-foreground/90">
              <span className="font-medium">{tb("nextSteps", "Próximos pasos")}:</span> {m.recommendation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Stakeholder Mapping renderer ───────────────────────────────────────────
function StakeholderMappingView({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (!data || !Array.isArray(data.stakeholders)) {
    return <div className="text-sm text-muted-foreground">{tb("noData", "No data.")}</div>;
  }
  const influenceColor: Record<string, string> = {
    LOW: "bg-muted text-foreground/90",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-indigo-100 text-indigo-800",
  };
  const strategyColor: Record<string, string> = {
    "Manage closely": "bg-red-50 text-red-700 border-red-200",
    "Keep satisfied": "bg-amber-50 text-amber-700 border-amber-200",
    "Keep informed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Monitor": "bg-muted/40 text-foreground/90 border-border",
  };
  const strategyLabel = (value: string) => {
    if (value === "Manage closely") return tb("stakeholderManageClosely", "Manage closely");
    if (value === "Keep satisfied") return tb("stakeholderKeepSatisfied", "Keep satisfied");
    if (value === "Keep informed") return tb("stakeholderKeepInformed", "Keep informed");
    if (value === "Monitor") return tb("monitor", "Monitor");
    return value;
  };
  return (
    <div className="space-y-4">
      {data.methodology && (
        <p className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded p-3">{data.methodology}</p>
      )}

      {data.influenceInterestMatrix && (
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("influenceInterestMatrix", "Influence × Interest Matrix")}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-red-200 bg-red-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-800 uppercase tracking-wider">{tb("stakeholderManageClosely", "Manage closely")}</div>
              <div className="text-xs text-muted-foreground">{tb("highInfluenceHighInterest", "High infl. × High interest")}</div>
              <div className="text-2xl font-bold text-red-700 mt-1">{data.influenceInterestMatrix.highInfluenceHighInterest}</div>
            </div>
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">{tb("stakeholderKeepSatisfied", "Keep satisfied")}</div>
              <div className="text-xs text-muted-foreground">{tb("highInfluenceLowInterest", "High infl. × Low interest")}</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{data.influenceInterestMatrix.highInfluenceLowInterest}</div>
            </div>
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">{tb("stakeholderKeepInformed", "Keep informed")}</div>
              <div className="text-xs text-muted-foreground">{tb("lowInfluenceHighInterest", "Low infl. × High interest")}</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{data.influenceInterestMatrix.lowInfluenceHighInterest}</div>
            </div>
            <div className="border border-border bg-muted/40 rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tb("monitor", "Monitor")}</div>
              <div className="text-xs text-muted-foreground">{tb("lowInfluenceLowInterest", "Low infl. × Low interest")}</div>
              <div className="text-2xl font-bold text-foreground/90 mt-1">{data.influenceInterestMatrix.lowInfluenceLowInterest}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">{tb("stakeholdersCount", "Stakeholders")} ({data.stakeholders.length})</h4>
        <div className="space-y-2">
          {data.stakeholders.map((s: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.category}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${influenceColor[s.influence] ?? ""}`} title={tb("influence", "Influence")}>{tb("influenceShort", "I")}: {s.influence}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${influenceColor[s.interest] ?? ""}`} title={tb("interest", "Interest")}>{tb("interestShort", "J")}: {s.interest}</span>
                </div>
              </div>
              <div className="text-xs text-foreground/90 mt-1">{s.role}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-block px-2 py-0.5 text-xs rounded border ${strategyColor[s.engagementStrategy] ?? "bg-muted/40 text-foreground/90 border-border"}`}>{strategyLabel(s.engagementStrategy)}</span>
                <span className="text-xs text-muted-foreground">· {s.cadence}</span>
                {s.supportingDoc && <span className="text-xs text-muted-foreground">· {s.supportingDoc}</span>}
              </div>
              {s.risks && <div className="text-xs text-muted-foreground italic mt-1">{tb("riskIfIgnored", "Risk if ignored")}: {s.risks}</div>}
            </div>
          ))}
        </div>
      </div>

      {data.notes && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 italic">{data.notes}</div>
      )}
    </div>
  );
}

// ─── PDD Pre-fill renderer ──────────────────────────────────────────────────
function PddPreFillView({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });

  if (!data || !Array.isArray(data.workstreams)) return <div className="text-sm text-muted-foreground">{tb("noData", "No data.")}</div>;
  const confidenceColor: Record<string, string> = {
    HIGH: "bg-emerald-100 text-emerald-800",
    MEDIUM: "bg-amber-100 text-amber-800",
    LOW: "bg-red-100 text-red-800",
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground italic">
        {tb("prefilledDraftNote", "Respuestas borrador precargadas para el constructor de PDD. Llévalas a esa pantalla para editarlas y cerrar cada respuesta.")}
      </p>
      {data.workstreams.map((ws: any, i: number) => (
        <details key={i} className="border border-border rounded-lg overflow-x-auto">
          <summary className="px-4 py-2 bg-muted/40 font-medium text-sm text-foreground cursor-pointer hover:bg-muted">
            {ws.id.toUpperCase()}. {ws.title} <span className="text-xs text-muted-foreground font-normal">· {ws.answers?.length ?? 0} {tb("questions", "preguntas")}</span>
          </summary>
          <div className="p-3 space-y-3">
            {(ws.answers ?? []).map((a: any, j: number) => (
              <div key={j} className="border-l-2 border-indigo-200 pl-3 py-1">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{a.questionLabel}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceColor[a.confidence] ?? "bg-muted text-foreground/90"}`}>{a.confidence}</span>
                  {a.requiresUserInput && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">{tb("needsUserInput", "Needs user input")}</span>}
                </div>
                <div className="text-xs text-foreground/90 whitespace-pre-wrap">{a.draftAnswer}</div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function DocStatusIcon({ hasDoc, hasError, generating }: { hasDoc: boolean; hasError: boolean; generating: boolean }) {
  if (hasError) return <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (hasDoc) return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (generating) return <Clock className="w-4 h-4 text-indigo-500 animate-pulse flex-shrink-0" />;
  return <FileText className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (status === "complete") return <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> {tb("statusComplete", "Complete")}</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200"><AlertTriangle className="w-3 h-3" /> {tb("statusError", "Error")}</span>;
  return <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-200"><Clock className="w-3 h-3 animate-pulse" /> {tb("statusGenerating", "Generating")}</span>;
}
