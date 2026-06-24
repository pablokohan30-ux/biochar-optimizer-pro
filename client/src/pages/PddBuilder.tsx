import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  Save,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import UpgradeModal from "@/components/UpgradeModal";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { PDD_TEMPLATE, type PddQuestion } from "@/lib/pddTemplate";
import { trpc } from "@/lib/trpc";
import { parseAiHandoffDescription, pddHandoffStorageKey } from "@/lib/aiHandoff";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** localStorage key for a given project's PDD responses */
function storageKey(projectId: string) {
  return `pdd_${projectId}`;
}

/** Count non-empty answers for a set of questions */
function countFilled(questions: PddQuestion[], responses: Record<string, string>): number {
  return questions.filter((q) => (responses[q.id] ?? "").trim().length > 0).length;
}

/** Total questions across the entire template */
const TOTAL_QUESTIONS = PDD_TEMPLATE.reduce((sum, s) => sum + s.questions.length, 0);

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

// ---------------------------------------------------------------------------
// Toast (lightweight inline, no external dependency needed)
// ---------------------------------------------------------------------------

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((msg: string, ms = 3000) => {
    setMessage(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), ms);
  }, []);

  return { message, show };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PddBuilder() {
  const { t } = useTranslation("pdd");
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";
  const projectIdNumber = Number(projectId);
  const [, navigate] = useLocation();

  // Auth & tier
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Section navigation
  const [activeSection, setActiveSection] = useState<string>(PDD_TEMPLATE[0].id);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);

  // Question responses
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [handoffMeta, setHandoffMeta] = useState<{
    sourceAiProjectId?: number;
    sourceAiProjectName?: string | null;
    reusedExistingProject?: boolean;
    linkedProjectCount?: number;
  } | null>(null);

  // Expanded hints (per question id)
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});

  // Toast
  const toast = useToast();

  // Save status indicator
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const projectQuery = trpc.projects.get.useQuery(
    { id: projectIdNumber },
    { enabled: isAuthenticated && Number.isFinite(projectIdNumber) && hasAccess("engineer") },
  );

  // ── Load from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          setResponses(parsed as Record<string, string>);
        }
      }
    } catch {
      // corrupted data — start fresh
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    try {
      const raw = localStorage.getItem(pddHandoffStorageKey(projectId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setHandoffMeta(parsed);
      }
    } catch {
      // Ignore malformed handoff metadata
    }
  }, [projectId]);

  // ── Debounced save to localStorage ─────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateResponse = useCallback(
    (questionId: string, value: string) => {
      setResponses((prev) => {
        const next = { ...prev, [questionId]: value };

        // Debounced persist
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(storageKey(projectId), JSON.stringify(next));
            setLastSaved(new Date());
          } catch {
            // storage full / disabled
          }
        }, 500);

        return next;
      });
    },
    [projectId],
  );

  // ── Manual save ────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(responses));
      setLastSaved(new Date());
      toast.show(t("saved", { defaultValue: "Progress saved" }));
    } catch {
      toast.show(t("saveError", { defaultValue: "Could not save" }));
    }
  }, [projectId, responses, toast, t]);

  // ── Completion stats ───────────────────────────────────────────────────
  const sectionStats = useMemo(() => {
    const map: Record<string, { filled: number; total: number }> = {};
    for (const section of PDD_TEMPLATE) {
      map[section.id] = {
        filled: countFilled(section.questions, responses),
        total: section.questions.length,
      };
    }
    return map;
  }, [responses]);

  const overallFilled = useMemo(
    () => Object.values(sectionStats).reduce((s, v) => s + v.filled, 0),
    [sectionStats],
  );
  const overallPct = TOTAL_QUESTIONS > 0 ? Math.round((overallFilled / TOTAL_QUESTIONS) * 100) : 0;

  // ── Export PDD draft as Markdown ───────────────────────────────────────
  const handleExport = useCallback(() => {
    const projectName = projectQuery.data?.name?.trim() || `project-${projectId}`;
    const lines: string[] = [
      `# ${t("subtitle", { defaultValue: "Project Design Document for Biochar Carbon Removal" })}`,
      "",
      `- ${t("title", { defaultValue: "PDD Builder" })}: ${projectName}`,
      `- ${t("progress", { defaultValue: "Progress" })}: ${overallPct}%`,
      `- ${t("complete", { defaultValue: "Complete" })}: ${overallFilled}/${TOTAL_QUESTIONS}`,
    ];

    if (projectQuery.data?.country) {
      lines.push(`- ${t("country", { defaultValue: "Country" })}: ${projectQuery.data.country}`);
    }

    if (projectQuery.data?.location) {
      lines.push(`- ${t("location", { defaultValue: "Location" })}: ${projectQuery.data.location}`);
    }

    lines.push(
      `- ${t("lastSaved", { defaultValue: "Saved" })}: ${new Date().toLocaleString()}`,
      "",
    );

    for (const section of PDD_TEMPLATE) {
      lines.push(`## ${t(section.titleKey)}`, "");

      for (const question of section.questions) {
        const answer = (responses[question.id] ?? "").trim();
        lines.push(`### ${t(question.labelKey)}`, "");
        lines.push(answer || t("unansweredPlaceholder", { defaultValue: "_Pending input_" }), "");
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFilenamePart(projectName)}__pdd-draft.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.show(t("exportSuccess", { defaultValue: "PDD draft downloaded as Markdown" }));
  }, [overallFilled, overallPct, projectId, projectQuery.data, responses, t, toast]);

  // ── Current section data ───────────────────────────────────────────────
  const currentSection = PDD_TEMPLATE.find((s) => s.id === activeSection) ?? PDD_TEMPLATE[0];
  const aiHandoff = parseAiHandoffDescription(projectQuery.data?.description);
  const sourceAiProjectId = handoffMeta?.sourceAiProjectId ?? aiHandoff.aiProjectId;
  const sourceAiProjectName = handoffMeta?.sourceAiProjectName ?? null;
  const showAiHandoffBanner = aiHandoff.isAiHandoff || !!handoffMeta;
  const reusedExistingDraft = !!handoffMeta?.reusedExistingProject;
  const linkedProjectCount = handoffMeta?.linkedProjectCount ?? 0;

  // ── Toggle hint ────────────────────────────────────────────────────────
  const toggleHint = useCallback((qId: string) => {
    setExpandedHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  }, []);

  // ── Auth gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login?signup=1&from=pdd");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // ── Tier gate — show upgrade modal if below Engineer ───────────────────
  useEffect(() => {
    if (!tierLoading && !hasAccess("engineer")) {
      setShowUpgrade(true);
    }
  }, [tierLoading, hasAccess]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (authLoading || tierLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return null; // redirect effect is handling it
  }

  // ── Page actions for AppLayout top bar ──────────────────────────────────
  const pageTitle = (
    <span className="flex items-center gap-2 min-w-0">
      <Link href={projectId ? `/projects/${projectId}` : "/projects"}>
        <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </Link>
      <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
      <span className="truncate font-bold">{t("title", { defaultValue: "PDD Builder" })}</span>
    </span>
  );

  const pageActions = (
    <>
      {lastSaved && (
        <span className="hidden md:inline text-[10px] text-muted-foreground">
          {t("lastSaved", { defaultValue: "Saved" })}{" "}
          {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      <button
        onClick={handleSave}
        className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("save", { defaultValue: "Save" })}</span>
      </button>
      <button
        onClick={handleExport}
        className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("export", { defaultValue: "Export" })}</span>
      </button>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <AppLayout pageTitle={pageTitle} pageActions={pageActions} fullBleed>
      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div className="h-1 bg-secondary sticky top-14 z-20">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast.message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-lg px-4 py-2 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          {toast.message}
        </div>
      )}

      {showAiHandoffBanner && (
        <div className="container mx-auto px-4 pt-6">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300 mb-1">
              {reusedExistingDraft
                ? t("aiHandoffEyebrowReused", { defaultValue: "Borrador retomado desde AI Builder" })
                : t("aiHandoffEyebrow", { defaultValue: "Handoff desde AI Builder" })}
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {reusedExistingDraft
                ? t("aiHandoffTitleReused", { defaultValue: "Volviste al mismo proyecto editable, no se creó uno nuevo" })
                : t("aiHandoffTitle", { defaultValue: "Aquí ya estás editando el proyecto estándar, no un paquete aparte" })}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {reusedExistingDraft
                ? t("aiHandoffBodyReused", { defaultValue: "Abrimos tu borrador editable existente y respetamos las respuestas guardadas en este navegador. El paquete AI sigue siendo referencia; este PDD es el espacio donde continúas el mismo proyecto." })
                : t("aiHandoffBody", { defaultValue: "El AI Builder te dio un borrador rápido. En esta pantalla completas y corriges ese contenido en el PDD editable. Después seguirás trabajando este mismo proyecto en /projects para operación, evidencia y go-to-market." })}
            </p>
            <GuideLink anchor="como-ai-builder" label="Cómo completar este handoff sin perder el hilo" className="mt-3 inline-flex" />
            {reusedExistingDraft && linkedProjectCount > 1 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("aiHandoffMultipleLinked", { defaultValue: "Encontramos más de un borrador vinculado a este paquete AI y abrimos el más reciente para mantener un único camino de trabajo." })}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {sourceAiProjectId && (
                <Link href={`/ai-builder/${sourceAiProjectId}`}>
                  <button className="px-3 py-2 rounded-lg bg-white dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/60 text-sm font-medium text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60">
                    {sourceAiProjectName
                      ? t("aiHandoffBackToAiNamed", { defaultValue: "Ver paquete AI: {{name}}", name: sourceAiProjectName })
                      : t("aiHandoffBackToAi", { defaultValue: "Ver paquete AI original" })}
                  </button>
                </Link>
              )}
              <Link href={`/projects/${projectId}`}>
                <button className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background">
                  {t("aiHandoffToProject", { defaultValue: "Abrir proyecto operativo" })}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* ── Mobile section selector ─────────────────────────────────────── */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileSectionOpen((o) => !o)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {t(currentSection.titleKey, { defaultValue: currentSection.id })}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {sectionStats[currentSection.id].filled}/{sectionStats[currentSection.id].total}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${mobileSectionOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {mobileSectionOpen && (
            <div className="mt-1 bg-card border border-border rounded-lg overflow-hidden shadow-lg">
              {PDD_TEMPLATE.map((section) => {
                const stats = sectionStats[section.id];
                const isActive = section.id === activeSection;
                const isComplete = stats.filled === stats.total && stats.total > 0;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileSectionOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-border last:border-b-0 ${
                      isActive
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span className="truncate">{t(section.titleKey, { defaultValue: section.id })}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isComplete
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {stats.filled}/{stats.total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-[calc(3.5rem+0.25rem+1px)] space-y-1">
            {/* Overall progress */}
            <div className="bg-card border border-border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t("overallProgress", { defaultValue: "Progress" })}
                </span>
                <span className="text-xs font-mono font-bold text-primary">{overallPct}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {overallFilled}/{TOTAL_QUESTIONS} {t("questionsAnswered", { defaultValue: "answered" })}
              </p>
            </div>

            {/* Section list */}
            <nav className="space-y-0.5" aria-label="PDD Sections">
              {PDD_TEMPLATE.map((section, idx) => {
                const stats = sectionStats[section.id];
                const isActive = section.id === activeSection;
                const isComplete = stats.filled === stats.total && stats.total > 0;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "text-foreground hover:bg-secondary/50 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="truncate">
                        {t(section.titleKey, { defaultValue: section.id })}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                        isComplete
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {stats.filled}/{stats.total}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Main content area ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Section header */}
            <div className="px-6 py-5 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {t("workstream", { defaultValue: "Workstream" })}{" "}
                  {String.fromCharCode(65 + PDD_TEMPLATE.indexOf(currentSection))}
                </span>
                {sectionStats[currentSection.id].filled === sectionStats[currentSection.id].total &&
                  sectionStats[currentSection.id].total > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("complete", { defaultValue: "Complete" })}
                    </span>
                  )}
              </div>
              <h2 className="text-lg font-bold">
                {t(currentSection.titleKey, { defaultValue: currentSection.id })}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {sectionStats[currentSection.id].filled} / {sectionStats[currentSection.id].total}{" "}
                {t("questionsAnswered", { defaultValue: "respondidas" })}
              </p>
            </div>

            {/* Questions */}
            <div className="divide-y divide-border">
              {currentSection.questions.map((question) => {
                const value = responses[question.id] ?? "";
                const hintOpen = expandedHints[question.id] ?? false;
                const isFilled = value.trim().length > 0;
                const guidanceLabel = hintOpen
                  ? t("hideHint", { defaultValue: "Ocultar guía" })
                  : t("showHint", { defaultValue: "Mostrar guía" });

                return (
                  <div key={question.id} className="px-6 py-5">
                    {/* Label row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <label
                        htmlFor={`q-${question.id}`}
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        {isFilled && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        )}
                        {t(question.labelKey, { defaultValue: question.id })}
                        {question.required && (
                          <span className="text-red-400 text-xs">*</span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleHint(question.id)}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-0.5"
                        aria-label={guidanceLabel}
                        title={guidanceLabel}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Hint / guidance (collapsible) */}
                    {hintOpen && (
                      <div className="mb-3 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(question.hintKey, { defaultValue: `Guidance for ${question.id}` })}
                        </p>
                      </div>
                    )}

                    {/* Input */}
                    <textarea
                      id={`q-${question.id}`}
                      rows={4}
                      value={value}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      placeholder={t("responsePlaceholder", {
                        defaultValue: "Escribe tu respuesta aquí...",
                      })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 resize-y"
                    />
                  </div>
                );
              })}
            </div>

            {/* Section navigation footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-between">
              {PDD_TEMPLATE.indexOf(currentSection) > 0 ? (
                <button
                  onClick={() => {
                    const idx = PDD_TEMPLATE.indexOf(currentSection);
                    setActiveSection(PDD_TEMPLATE[idx - 1].id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("previous", { defaultValue: "Anterior" })}
                </button>
              ) : (
                <div />
              )}
              {PDD_TEMPLATE.indexOf(currentSection) < PDD_TEMPLATE.length - 1 ? (
                <button
                  onClick={() => {
                    const idx = PDD_TEMPLATE.indexOf(currentSection);
                    setActiveSection(PDD_TEMPLATE[idx + 1].id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {t("next", { defaultValue: "Siguiente" })}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t("exportPdd", { defaultValue: "Export PDD" })}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
      {/* ── Upgrade Modal (tier gate) ──────────────────────────────────────── */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          navigate("/projects");
        }}
        featureName={t("featureName", { defaultValue: "PDD Builder" })}
        requiredTier="engineer"
      />
    </AppLayout>
  );
}
