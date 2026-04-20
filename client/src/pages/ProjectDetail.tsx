import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, MapPin, Save, Trash2, Thermometer, Clock, Leaf, AlertCircle, Target, Sparkles, FileCheck, Printer, Download, ChevronDown, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { compute_all, find_optimum, FEEDSTOCK_DB, Feedstock } from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import ProjectMap from "@/components/ProjectMap";
import RegionalAnalysis from "@/components/RegionalAnalysis";
import MethodologyAssessment from "@/components/MethodologyAssessment";
import MethodologyComparison from "@/components/MethodologyComparison";
import SiteFooter from "@/components/SiteFooter";
import PageLoader from "@/components/PageLoader";
import AppLayout from "@/components/AppLayout";

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

  const [exportLoading, setExportLoading] = useState(false);

  const [T, setT] = useState(650);
  const [resTime, setResTime] = useState(30);
  const [goal, setGoal] = useState<QualityGoal>("BALANCED");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [optimumToast, setOptimumToast] = useState<{ T: number; t: number; goal: string } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [bopIdCopied, setBopIdCopied] = useState(false);

  const project = projectQuery.data;

  useEffect(() => {
    if (project) {
      setT(project.temperature ?? 650);
      setResTime(project.residenceTime ?? 30);
      setGoal((project.qualityGoal as QualityGoal) ?? "BALANCED");
    }
  }, [project]);

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
    // Try feedstockData (JSON) first
    if (project.feedstockData) {
      try {
        return JSON.parse(project.feedstockData) as Feedstock;
      } catch {}
    }
    // Try feedstockId against the DB
    if (project.feedstockId && FEEDSTOCK_DB[project.feedstockId]) {
      return FEEDSTOCK_DB[project.feedstockId];
    }
    return FEEDSTOCK_DB["pine_sawdust"];
  }, [project]);

  const result = useMemo(() => compute_all(T, resTime, feedstock), [T, resTime, feedstock]);

  if (authLoading || tierLoading) {
    return <PageLoader />;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!hasAccess("analyst")) {
    setLocation("/projects");
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

  const handleExportJson = async (methodologyId: "puro-earth" | "isometric" | "ebc" | "ibi") => {
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

  const handleExportPdf = (methodologyId: "puro-earth" | "isometric" | "ebc" | "ibi") => {
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
                  { id: "puro-earth" as const, name: "Puro.earth", desc: t("export.descPuro",      { defaultValue: "CORC methodology · credit-issuing" }) },
                  { id: "isometric" as const,  name: "Isometric",  desc: t("export.descIsometric", { defaultValue: "200/1000-yr durability protocol" }) },
                  { id: "ebc" as const,        name: "EBC",        desc: t("export.descEbc",       { defaultValue: "European Biochar Certificate · quality" }) },
                  { id: "ibi" as const,        name: "IBI",        desc: t("export.descIbi",       { defaultValue: "International Biochar Initiative · quality" }) },
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
              {project.description && (
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
              <span className="text-muted-foreground/70 normal-case font-normal ml-1">— {t("params.goalDescription", { defaultValue: "Qué querés priorizar:" })}</span>
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

        {/* BiocharPro Score — multi-methodology assessment */}
        <MethodologyAssessment
          result={result}
          feedstock={feedstock}
          temperature={T}
          residenceTime={resTime}
          plantCapacityTph={project.plantCapacityTph}
          country={project.country}
          projectKey={`project-${project.id}`}
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
      <div className="mt-8">
        <SiteFooter />
      </div>
    </AppLayout>
  );
}
