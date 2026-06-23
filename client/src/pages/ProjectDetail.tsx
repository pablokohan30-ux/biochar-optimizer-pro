import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, MapPin, Save, Trash2, Thermometer, Clock, Leaf, AlertCircle, Target, Sparkles, FileCheck, Printer, Download, ChevronDown, Copy, Check, ClipboardCheck, Truck, Users, Zap, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { compute_all, find_optimum, FEEDSTOCK_DB, Feedstock } from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import ProjectMap from "@/components/ProjectMap";
import RegionalAnalysis from "@/components/RegionalAnalysis";
import MethodologyAssessment, { type ManualState } from "@/components/MethodologyAssessment";
import MethodologyComparison from "@/components/MethodologyComparison";
import SubmissionGuideButton from "@/components/SubmissionGuide";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import AppLayout from "@/components/AppLayout";
import { resolveProjectFeedstock } from "@/lib/projectFeedstock";
import { parseAiHandoffDescription } from "@/lib/aiHandoff";

type QualityGoal = "MAX_CARBON" | "AGRONOMY" | "BALANCED";

export default function ProjectDetail() {
  const { t } = useTranslation("projectDetail");
  const { t: tFs } = useTranslation("feedstocks");
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const utils = trpc.useUtils();

  const projectQuery = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && hasAccess("analyst") && !Number.isNaN(projectId) }
  );

  // Evidence summary — only relevant for Expert tier (module is Expert-gated).
  // Used to show a "Soil application plan: ✓ Loaded / ⚠ Pending" marker
  // in the Project Info panel when the operator has logged at least one plan.
  const evidenceSummaryQuery = trpc.evidence.summary.useQuery(
    { projectId },
    { enabled: !!user && hasAccess("expert") && !Number.isNaN(projectId) },
  );
  const soilPlanCount = (evidenceSummaryQuery.data?.byType?.soil_application_plan?.total ?? 0);
  const hasSoilPlan = soilPlanCount > 0;

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      utils.projects.list.invalidate();
      setSaveMessage(t("projectUpdated"));
      setTimeout(() => setSaveMessage(null), 2000);
    },
    onError: (err) => setSaveMessage(`Error: ${err.message}`),
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setLocation("/projects");
    },
  });

  const updateManualChecksMutation = trpc.projects.updateManualChecks.useMutation({
    // Silent success — no toast, no invalidation (our local state is already
    // authoritative). Only invalidate on error to force a refresh from
    // server so the UI recovers.
    onError: () => utils.projects.get.invalidate({ id: projectId }),
  });
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedForIdRef = useRef<number | null>(null);

  const [exportLoading, setExportLoading] = useState(false);

  const [T, setT] = useState(650);
  const [resTime, setResTime] = useState(30);
  const [goal, setGoal] = useState<QualityGoal>("BALANCED");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [optimumToast, setOptimumToast] = useState<{ T: number; t: number; goal: string } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [bopIdCopied, setBopIdCopied] = useState(false);

  // Manual pre-assessment check state (methodology → check → boolean | null).
  // `manualStates` renders the UI optimistically; `updateManualChecksMutation`
  // above persists (debounced) so toggles feel instant but sync across devices.
  const [manualStates, setManualStates] = useState<ManualState>({});

  const project = projectQuery.data;

  useEffect(() => {
    if (project) {
      setT(project.temperature ?? 650);
      setResTime(project.residenceTime ?? 30);
      setGoal((project.qualityGoal as QualityGoal) ?? "BALANCED");
    }
  }, [project]);

  // Rehydrate manualStates once the project query resolves. Runs only when
  // the project ID changes — we don't want to clobber in-flight edits.
  useEffect(() => {
    if (!project) return;
    if (hydratedForIdRef.current === project.id) return;
    hydratedForIdRef.current = project.id;
    try {
      const parsed = project.manualChecks ? JSON.parse(project.manualChecks) : {};
      setManualStates(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setManualStates({});
    }
  }, [project]);

  // Flush any pending save on unmount so we don't drop a quick last click.
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    };
  }, []);

  const handleManualStatesChange = (next: ManualState) => {
    // Optimistic UI — render from local state immediately.
    setManualStates(next);
    // Debounce backend save: if the user keeps clicking, only the last
    // state gets persisted after 600ms of quiet.
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      // Normalise undefined → drop so JSON encoding stays clean.
      const normalised: Record<string, Record<string, boolean | null>> = {};
      for (const [methodologyId, checks] of Object.entries(next)) {
        const checksNorm: Record<string, boolean | null> = {};
        for (const [checkId, value] of Object.entries(checks ?? {})) {
          if (value === undefined) continue;
          checksNorm[checkId] = value;
        }
        if (Object.keys(checksNorm).length > 0) {
          normalised[methodologyId] = checksNorm;
        }
      }
      updateManualChecksMutation.mutate({ id: projectId, manualChecks: normalised });
    }, 600);
  };

  // Track unsaved changes so the Save button has real intent
  const hasUnsavedChanges = useMemo(() => {
    if (!project) return false;
    return (
      T !== (project.temperature ?? 650) ||
      resTime !== (project.residenceTime ?? 30) ||
      goal !== ((project.qualityGoal as QualityGoal) ?? "BALANCED")
    );
  }, [project, T, resTime, goal]);

  const feedstock: Feedstock = useMemo(() => {
    if (!project) return FEEDSTOCK_DB["pine_sawdust"];
    return resolveProjectFeedstock(project.feedstockId, project.feedstockData, FEEDSTOCK_DB) ?? FEEDSTOCK_DB["pine_sawdust"];
  }, [project]);

  const result = useMemo(() => compute_all(T, resTime, feedstock), [T, resTime, feedstock]);
  const aiHandoff = useMemo(() => parseAiHandoffDescription(project?.description), [project?.description]);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (!authLoading && !tierLoading && user && !hasAccess("analyst")) setLocation("/projects");
  }, [authLoading, tierLoading, user, hasAccess, setLocation]);

  if (authLoading || tierLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  if (!hasAccess("analyst")) {
    return null;
  }

  if (projectQuery.isLoading) {
    return <PageLoader label={t("loadingProject")} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{t("notFound")}</p>
          <Link href="/projects">
            <button className="text-xs text-primary hover:underline">{t("backToProjects")}</button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate({
      id: project.id,
      data: { temperature: T, residenceTime: resTime, qualityGoal: goal },
    });
  };

  const handleFindOptimum = () => {
    const optimum = find_optimum(feedstock, goal);
    // Round T to nearest slider step (5°C)
    const roundedT = Math.min(Math.max(Math.round(optimum.T / 5) * 5, 400), 850);
    const roundedRes = Math.min(Math.max(Math.round(optimum.t / 5) * 5, 15), 60);
    setT(roundedT);
    setResTime(roundedRes);
    setOptimumToast({ T: roundedT, t: roundedRes, goal });
    setTimeout(() => setOptimumToast(null), 5000);
  };

  const handleDelete = () => {
    if (confirm(t("deleteConfirm", { name: project.name }))) {
      deleteMutation.mutate({ id: project.id });
    }
  };

  const handleExportJson = async (methodologyId: "puro-earth" | "isometric" | "ebc" | "verra-vm0044" | "gold-standard" | "rainbow-standard") => {
    setExportMenuOpen(false);
    setExportLoading(true);
    try {
      const payload = await utils.projects.exportSubmission.fetch({ id: project.id, methodologyId });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeBopId = project.bopId ?? `project-${project.id}`;
      a.href = url;
      a.download = `${safeBopId}__${methodologyId}__submission.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaveMessage(t("export.success", { defaultValue: "Submission JSON downloaded" }));
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: any) {
      alert(err?.message ?? "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPdf = (methodologyId: "puro-earth" | "isometric" | "ebc" | "verra-vm0044" | "gold-standard" | "rainbow-standard") => {
    setExportMenuOpen(false);
    // Open printable page in a new tab with ?autoprint=1 so the browser print
    // dialog fires automatically. User can save as PDF from there.
    const url = `/projects/${project.id}/submission/${methodologyId}?autoprint=1`;
    window.open(url, "_blank");
  };

  const handleCopyBopId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!project.bopId) return;
    try {
      await navigator.clipboard.writeText(project.bopId);
      setBopIdCopied(true);
      setTimeout(() => setBopIdCopied(false), 1800);
    } catch {
      // Ignore — older browsers
    }
  };

  const stage4NeedsEvidence = hasAccess("expert") && !hasSoilPlan && (project.status ?? "draft") === "draft";

  const pageTitle = (
    <span className="flex items-center gap-2 min-w-0">
      <Link href="/projects">
        <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </Link>
      <span className="truncate font-bold">{project.name}</span>
      {project.bopId && (
        <span className="hidden md:inline-flex items-center gap-0 text-[9px] font-mono bg-primary/10 border border-primary/20 text-primary rounded overflow-hidden flex-shrink-0">
          <a
            href={`/verify/${project.bopId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-primary/20 px-1.5 py-0.5 uppercase tracking-wider transition-colors"
            title={t("publicVerifyHint", { defaultValue: "Open the public verify page (in new tab)" })}
          >
            {project.bopId}
          </a>
          <button
            type="button"
            onClick={handleCopyBopId}
            className="border-l border-primary/20 px-1.5 py-0.5 hover:bg-primary/20 transition-colors inline-flex items-center"
            title={bopIdCopied
              ? t("copiedLabel", { defaultValue: "Copied!" })
              : t("copyIdHint", { defaultValue: "Copy BOP ID" })}
            aria-label={t("copyIdHint", { defaultValue: "Copy BOP ID" })}
          >
            {bopIdCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
          </button>
        </span>
      )}
      {project.location && (
        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <MapPin className="w-3 h-3" /> {project.location}
        </span>
      )}
    </span>
  );

  const pageActions = (
    <>
      {saveMessage && (
        <span className="text-xs text-green-500 hidden sm:inline">{saveMessage}</span>
      )}
      {hasUnsavedChanges && !saveMessage && (
        <span className="text-[10px] text-yellow-500 uppercase tracking-wider hidden sm:inline">{t("unsaved")}</span>
      )}
      {hasAccess("engineer") && (
        <Link href={`/pdd/${project.id}`}>
          <button className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 border border-purple-600/20">
            <FileCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDD</span>
          </button>
        </Link>
      )}
      <Link href={`/projects/${project.id}/summary`}>
        <button
          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 border border-blue-600/20"
          title={t("summary.openButtonHint", { defaultValue: "Open the 2-page board-ready Executive Summary (printable PDF)" })}
        >
          <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("summary.openButton", { defaultValue: "Summary" })}</span>
        </button>
      </Link>

      {/* Export submission package — Developer+ tier. Each methodology has
          two formats: JSON (machine-readable) and PDF (printable). */}
      {hasAccess("developer") && (
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen((v) => !v)}
            disabled={exportLoading}
            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 border border-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
            title={t("export.buttonHint", { defaultValue: "Download a structured submission package for a certifier" })}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {exportLoading
                ? t("export.generating", { defaultValue: "Generating…" })
                : t("export.button", { defaultValue: "Export" })}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <>
              {/* Backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[300px] overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  {t("export.menuHeader", { defaultValue: "Submission package · pick certifier & format" })}
                </div>
                {[
                  { id: "puro-earth"    as const, name: "Puro.earth",    desc: t("export.descPuro",         { defaultValue: "CORC methodology · credit-issuing" }) },
                  { id: "isometric"     as const, name: "Isometric",     desc: t("export.descIsometric",    { defaultValue: "200/1000-yr durability protocol" }) },
                  { id: "verra-vm0044"  as const, name: "Verra VM0044",  desc: t("export.descVerra",        { defaultValue: "VCS methodology v1.2 · CCP-approved" }) },
                  { id: "ebc"           as const, name: "EBC",           desc: t("export.descEbc",          { defaultValue: "European Biochar Certificate · quality" }) },
                  { id: "gold-standard" as const, name: "Gold Standard", desc: t("export.descGoldStandard", { defaultValue: "Methodology in development · SDG pre-staging" }) },
                ].map((opt) => (
                  <div key={opt.id} className="border-b border-border last:border-b-0">
                    <div className="px-3 pt-2.5 pb-1">
                      <div className="text-xs font-semibold">{opt.name}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </div>
                    <div className="flex gap-0 px-2 pb-2">
                      <button
                        onClick={() => handleExportJson(opt.id)}
                        className="flex-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded mr-1 border border-emerald-600/20 inline-flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {t("export.json", { defaultValue: "JSON" })}
                      </button>
                      <button
                        onClick={() => handleExportPdf(opt.id)}
                        className="flex-1 text-[10px] font-semibold uppercase tracking-wider bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-600/20 inline-flex items-center justify-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        {t("export.pdf", { defaultValue: "PDF" })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={updateMutation.isPending || !hasUnsavedChanges}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{updateMutation.isPending ? t("saving") : t("save")}</span>
      </button>
      <button
        onClick={handleDelete}
        className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <AppLayout pageTitle={pageTitle} pageActions={pageActions}>
      <div className="space-y-6">
        {/* Location + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden h-[360px]">
            <ProjectMap
              latitude={project.latitude}
              longitude={project.longitude}
              zoom={10}
              label={project.name}
              className="h-full"
            />
          </div>

          {/* Project info sidebar */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{t("info.title")}</h3>
            <div className="space-y-3 text-sm">
              {project.description && !aiHandoff.isAiHandoff && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("info.description")}</div>
                  <p className="text-foreground">{project.description}</p>
                </div>
              )}
              {project.plantCapacityTph !== null && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("info.plantCapacity")}</div>
                  <p className="text-foreground font-mono flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-primary" /> {project.plantCapacityTph} t/h
                  </p>
                </div>
              )}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("info.feedstock")}</div>
                <p className="text-foreground">{getFeedstockName(project.feedstockId, feedstock.name, tFs)}</p>
              </div>
              {project.country && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("info.country")}</div>
                  <p className="text-foreground">{project.country}</p>
                </div>
              )}

              {/* Soil application plan status marker — only for Expert users */}
              {hasAccess("expert") && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t("info.soilPlanLabel", { defaultValue: "Soil application plan" })}
                  </div>
                  <Link href={`/projects/${project.id}/evidence`}>
                    <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:opacity-90"
                      style={hasSoilPlan
                        ? { background: "rgb(34 197 94 / 0.1)", borderColor: "rgb(34 197 94 / 0.3)", color: "rgb(22 163 74)" }
                        : { background: "rgb(245 158 11 / 0.1)", borderColor: "rgb(245 158 11 / 0.3)", color: "rgb(217 119 6)" }}>
                      <span className="flex items-center gap-1.5">
                        {hasSoilPlan ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {hasSoilPlan
                          ? t("info.soilPlanLoaded", { defaultValue: "Loaded ({{count}})", count: soilPlanCount })
                          : t("info.soilPlanPending", { defaultValue: "Pending — add a plan" })}
                      </span>
                      <span className="text-[10px] opacity-70">→</span>
                    </button>
                  </Link>
                </div>
              )}

              {/* Public visibility selector — controls /verify/:bopId page */}
              {project.bopId && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t("info.publicVisibility", { defaultValue: "Public verify page" })}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { id: "summary", label: t("info.visibilitySummary", { defaultValue: "Summary (default)" }), hint: t("info.visibilitySummaryHint", { defaultValue: "Shows name, country, status, methodology, dates" }) },
                      { id: "full",    label: t("info.visibilityFull",    { defaultValue: "Full" }),                hint: t("info.visibilityFullHint",    { defaultValue: "Above + city location + pyrolysis params (no lab data)" }) },
                      { id: "private", label: t("info.visibilityPrivate", { defaultValue: "Private (404)" }),       hint: t("info.visibilityPrivateHint", { defaultValue: "The verify page returns not-found" }) },
                    ] as const).map((v) => {
                      const isActive = (project.publicVisibility ?? "summary") === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => updateMutation.mutate({ id: project.id, data: { publicVisibility: v.id } })}
                          disabled={updateMutation.isPending}
                          title={v.hint}
                          className={`px-2 py-1.5 rounded-md text-[11px] text-left border transition-colors ${
                            isActive
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "bg-background border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                  <a
                    href={`/verify/${project.bopId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline mt-2 inline-block"
                  >
                    {t("info.viewPublicPage", { defaultValue: "→ Preview public page" })}
                  </a>
                </div>
              )}

              {/* Project lifecycle status */}
              {project.bopId && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t("info.projectStatus", { defaultValue: "Project status" })}
                  </div>
                  <select
                    value={project.status ?? "draft"}
                    onChange={(e) => updateMutation.mutate({ id: project.id, data: { status: e.target.value as "draft" | "submitted" | "approved" | "rejected" } })}
                    disabled={updateMutation.isPending}
                    className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md focus:border-primary focus:outline-none"
                  >
                    <option value="draft">{t("info.statusDraft", { defaultValue: "Draft" })}</option>
                    <option value="submitted">{t("info.statusSubmitted", { defaultValue: "Submitted to certifier" })}</option>
                    <option value="approved">{t("info.statusApproved", { defaultValue: "Approved" })}</option>
                    <option value="rejected">{t("info.statusRejected", { defaultValue: "Rejected" })}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {aiHandoff.isAiHandoff && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 mb-1">
              {t("handoff.eyebrow", { defaultValue: "Origen del proyecto" })}
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {t("handoff.title", { defaultValue: "Este proyecto nació como borrador del Constructor IA" })}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("handoff.body", { defaultValue: "El paquete generado con IA fue la primera pasada. Aquí ya estás viendo el proyecto estándar: el espacio donde ajustas el PDD, cargas evidencia real y llevas el proyecto hacia operación, auditoría y salida comercial." })}
            </p>
            <GuideLink anchor="como-ai-builder" label="Cómo seguir desde el Constructor IA al proyecto real" className="mt-3 inline-flex" />
            <div className="flex flex-wrap gap-2 mt-3">
              {aiHandoff.aiProjectId && (
                <Link href={`/ai-builder/${aiHandoff.aiProjectId}`}>
                  <button className="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-sm font-medium text-indigo-700 hover:bg-indigo-100/60">
                    {t("handoff.viewAiPackage", { defaultValue: "Ver paquete original generado con IA" })}
                  </button>
                </Link>
              )}
              {hasAccess("engineer") && (
                <Link href={`/pdd/${project.id}`}>
                  <button className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background">
                    {t("handoff.continuePdd", { defaultValue: "Seguir en el constructor de PDD" })}
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${hasAccess("expert") ? "xl:grid-cols-3" : ""}`}>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-600/20">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("workflow.dossierEyebrow", { defaultValue: "Paso 1" })}
                </div>
                <h3 className="text-base font-semibold">
                  {t("workflow.dossierTitle", { defaultValue: "Ordena el dossier" })}
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("workflow.dossierBody", { defaultValue: "Aquí conviene cerrar primero qué quieres mostrar: resumen ejecutivo, PDD y paquete exportable. Lo demás gana sentido cuando el dossier base ya está sólido." })}
            </p>
            <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {t("workflow.dossierStatus", {
                defaultValue: "Estado actual: {{status}}. Si este proyecto viene desde el Constructor IA, revisa y limpia campos pendientes antes de compartirlo.",
                status: project.status ?? "draft",
              })}
            </div>
            <div className="space-y-2">
              <Link href={`/projects/${project.id}/summary`}>
                <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-blue-600/20 bg-blue-600/10 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-600/20">
                  <span>{t("summary.openButton", { defaultValue: "Resumen" })}</span>
                  <Printer className="w-4 h-4" />
                </button>
              </Link>
              {hasAccess("engineer") && (
                <Link href={`/pdd/${project.id}`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-purple-600/20 bg-purple-600/10 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-600/20">
                    <span>{t("workflow.openPdd", { defaultValue: "Abrir el constructor de PDD" })}</span>
                    <FileCheck className="w-4 h-4" />
                  </button>
                </Link>
              )}
              <div className="flex">
                <SubmissionGuideButton projectName={project.name} projectId={project.id} />
              </div>
            </div>
          </div>

          {hasAccess("expert") && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-600/20">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("workflow.operationsEyebrow", { defaultValue: "Paso 2" })}
                  </div>
                  <h3 className="text-base font-semibold">
                    {t("workflow.operationsTitle", { defaultValue: "Carga evidencia operativa" })}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("workflow.operationsBody", { defaultValue: "Cuando empieces a operar, registra lotes, envíos y trazabilidad. Esa capa es la que después alimenta auditoría, preparación comercial y priorización de buyers." })}
              </p>
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {hasSoilPlan
                  ? t("workflow.operationsReady", { defaultValue: "Ya tienes al menos una pieza de evidencia cargada. Buen momento para completar operación real." })
                  : t("workflow.operationsEmpty", { defaultValue: "Todavía no hay evidencia cargada. Este proyecto sigue viéndose más como dossier que como planta operando." })}
              </div>
              <div className="space-y-2">
                <Link href={`/projects/${project.id}/evidence`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-600/20">
                    <span>{t("workflow.evidence", { defaultValue: "Evidencia operativa" })}</span>
                    <ClipboardCheck className="w-4 h-4" />
                  </button>
                </Link>
                <Link href={`/projects/${project.id}/offtake`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-teal-600/20 bg-teal-600/10 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-600/20">
                    <span>{t("workflow.offtake", { defaultValue: "Trazabilidad de envíos" })}</span>
                    <Truck className="w-4 h-4" />
                  </button>
                </Link>
                <Link href={`/projects/${project.id}/community`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-pink-600/20 bg-pink-600/10 px-3 py-2 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-600/20">
                    <span>{t("workflow.community", { defaultValue: "Impacto comunitario" })}</span>
                    <Users className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          )}

          {hasAccess("expert") && (
            <div className={`bg-card border rounded-xl p-5 space-y-4 ${stage4NeedsEvidence ? "border-dashed border-border/80 opacity-80" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-600/20">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("workflow.marketEyebrow", { defaultValue: "Paso 3" })}
                  </div>
                  <h3 className="text-base font-semibold">
                    {t("workflow.marketTitle", { defaultValue: "Activa salida comercial" })}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("workflow.marketBody", { defaultValue: "Preparación para buyers, Priorización de buyers y Paquete de auditoría son potentes, pero rinden mejor cuando ya tienes algo de operación y trazabilidad cargada." })}
              </p>
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {stage4NeedsEvidence
                  ? t("workflow.marketWarning", { defaultValue: "Todavía es temprano para vender esto como listo para buyers. Primero conviene cargar evidencia y trazabilidad de envíos." })
                  : t("workflow.marketReady", { defaultValue: "Ya puedes empezar a contrastar el proyecto contra buyers y armar un paquete de auditoría." })}
              </div>
              <div className="space-y-2">
                <Link href={`/projects/${project.id}/buyer-readiness`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-indigo-600/20 bg-indigo-600/10 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20">
                    <span>{t("workflow.buyerReadiness", { defaultValue: "Preparación para buyers" })}</span>
                    <Zap className="w-4 h-4" />
                  </button>
                </Link>
                <Link href={`/projects/${project.id}/buyer-match`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-600/20">
                    <span>{t("workflow.buyerMatch", { defaultValue: "Priorización de buyers" })}</span>
                    <Trophy className="w-4 h-4" />
                  </button>
                </Link>
                <Link href={`/projects/${project.id}/audit-package`}>
                  <button className="w-full flex items-center justify-between gap-2 rounded-lg border border-fuchsia-600/20 bg-fuchsia-600/10 px-3 py-2 text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-600/20">
                    <span>{t("workflow.auditPackage", { defaultValue: "Paquete de auditoría" })}</span>
                    <FileCheck className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Regional Analysis — climate + soil */}
        <RegionalAnalysis latitude={project.latitude} longitude={project.longitude} />

        {/* Parameters */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{t("params.title")}</h3>
          </div>

          {/* Quality goal selector — with explanations */}
          <div className="mb-5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Target className="w-3 h-3" /> {t("params.goal")}
              <span className="text-muted-foreground/70 normal-case font-normal ml-1">— {t("params.goalDescription", { defaultValue: "Qué quieres priorizar:" })}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "MAX_CARBON", label: t("params.maxCarbon"), hint: t("params.maxCarbonHint") },
                { id: "BALANCED", label: t("params.balanced"), hint: t("params.balancedHint") },
                { id: "AGRONOMY", label: t("params.agronomy"), hint: t("params.agronomyHint") },
              ] as const).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  title={g.hint}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    goal === g.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {/* Goal explanation + optimize button */}
            <div className="mt-2 bg-secondary/30 border border-border rounded-lg p-3 flex items-start gap-3">
              <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {goal === "MAX_CARBON" && t("params.maxCarbonHintFull", { defaultValue: "Maximizar el CO₂e capturado por tonelada de biomasa. Prioriza yield × créditos. Ideal para proyectos con objetivo principal de carbono." })}
                  {goal === "BALANCED" && t("params.balancedHintFull", { defaultValue: "Balance 60/40 entre captura de carbono y calidad agronómica. Recomendado cuando el biochar va a uso mixto (venta de créditos + aplicación al suelo)." })}
                  {goal === "AGRONOMY" && t("params.agronomyHintFull", { defaultValue: "Optimizar propiedades agronómicas: BET alto, pH 7.5–8.5, estabilidad. Ideal si el biochar va a uso agrícola como enmienda." })}
                </div>
              </div>
              <button
                onClick={handleFindOptimum}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 shadow-sm hover:shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {goal === "MAX_CARBON" && t("params.optimizeForCarbon", { defaultValue: "Optimizar para carbono" })}
                {goal === "BALANCED" && t("params.optimizeBalanced", { defaultValue: "Optimizar balanceado" })}
                {goal === "AGRONOMY" && t("params.optimizeForAgronomy", { defaultValue: "Optimizar para agronomía" })}
              </button>
            </div>
            {/* Optimum toast */}
            {optimumToast && (
              <div className="mt-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-green-500">
                    {t("params.optimumFound", { defaultValue: "Óptimo encontrado" })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {t("params.optimumDesc", {
                      T: optimumToast.T,
                      t: optimumToast.t,
                      defaultValue: `Los sliders se ajustaron a T=${optimumToast.T}°C y tiempo=${optimumToast.t} min — valores que maximizan tu objetivo actual para este feedstock.`,
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> {t("params.temperature")}
                </label>
                <span className="text-primary font-mono font-bold">{T} °C</span>
              </div>
              <input
                type="range" min="400" max="850" step="5" value={T}
                onChange={(e) => setT(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>400</span><span>850</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t("params.residenceTime")}
                </label>
                <span className="text-primary font-mono font-bold">{resTime} min</span>
              </div>
              <input
                type="range" min="15" max="60" step="5" value={resTime}
                onChange={(e) => setResTime(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>15</span><span>60</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.totalCarbon")}</div>
            <div className="text-2xl font-mono font-bold text-primary my-1">{result.C.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">{t("kpi.dryMass")}</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.hcorgRatio")}</div>
            <div className="text-2xl font-mono font-bold my-1">{result.H_Corg.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">
              {result.H_Corg < 0.4 ? "BC-1" : result.H_Corg < 0.7 ? "BC-2" : "FAIL"}
            </div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.netCo2e")}</div>
            <div className="text-2xl font-mono font-bold my-1">{result.credits.net.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">{t("kpi.ttBiochar")}</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-cyan-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.yield")}</div>
            <div className="text-2xl font-mono font-bold text-cyan-500 my-1">{result.yield_.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">{t("kpi.dryMass")}</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-purple-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.betSurface")}</div>
            <div className="text-2xl font-mono font-bold text-purple-500 my-1">{Math.round(result.BET)}</div>
            <div className="text-[10px] text-muted-foreground">{t("kpi.betUnit")}</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-yellow-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("kpi.ph")}</div>
            <div className="text-2xl font-mono font-bold text-yellow-500 my-1">{result.pH.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">{result.pH > 7.5 ? t("kpi.alkaline") : t("kpi.neutral")}</div>
          </div>
        </div>

        {/* BiocharPro Score — multi-methodology assessment.
            `manualStates` is controlled from ProjectDetail and synced to the
            backend so check toggles follow the user across devices. */}
        <div className="flex items-center justify-end mb-2">
          <GuideLink anchor="resultados-score" label="Cómo leer el BiocharPro Score" />
        </div>
        <MethodologyAssessment
          result={result}
          feedstock={feedstock}
          temperature={T}
          residenceTime={resTime}
          plantCapacityTph={project.plantCapacityTph}
          country={project.country}
          projectKey={`project-${project.id}`}
          manualStates={manualStates}
          onManualStatesChange={handleManualStatesChange}
        />

        {/* Cross-methodology comparison — killer feature for Engineer+ */}
        <MethodologyComparison
          result={result}
          feedstock={feedstock}
          temperature={T}
          residenceTime={resTime}
          plantCapacityTph={project.plantCapacityTph}
          country={project.country}
          projectKey={`project-${project.id}`}
        />
      </div>
    </AppLayout>
  );
}
