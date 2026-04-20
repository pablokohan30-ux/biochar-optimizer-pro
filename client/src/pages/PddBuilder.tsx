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
import SiteFooter from "@/components/SiteFooter";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { PDD_TEMPLATE, type PddQuestion } from "@/lib/pddTemplate";

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

  // Expanded hints (per question id)
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});

  // Toast
  const toast = useToast();

  // Save status indicator
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  // ── Export placeholder ─────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    toast.show(t("exportComingSoon", { defaultValue: "Export coming soon" }));
  }, [toast, t]);

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

  // ── Current section data ───────────────────────────────────────────────
  const currentSection = PDD_TEMPLATE.find((s) => s.id === activeSection) ?? PDD_TEMPLATE[0];

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
                {t("questionsAnswered", { defaultValue: "answered" })}
              </p>
            </div>

            {/* Questions */}
            <div className="divide-y divide-border">
              {currentSection.questions.map((question) => {
                const value = responses[question.id] ?? "";
                const hintOpen = expandedHints[question.id] ?? false;
                const isFilled = value.trim().length > 0;

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
                        aria-label={t("toggleGuidance", { defaultValue: "Toggle guidance" })}
                        title={t("toggleGuidance", { defaultValue: "Toggle guidance" })}
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
                      placeholder={t("placeholder", {
                        defaultValue: "Type your response here...",
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
                  {t("prevSection", { defaultValue: "Previous" })}
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
                  {t("nextSection", { defaultValue: "Next" })}
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

      <SiteFooter />

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
