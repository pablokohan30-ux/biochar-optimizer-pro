import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis,
  ReferenceLine, ReferenceDot
} from "recharts";
import { Settings, Zap, Activity, Beaker, BarChart3, Download, Save, X, Plus, Edit2, Search, Loader2, AlertCircle, Lock, Eye, FolderOpen, MapPin, FileText, Layers, Code2, CheckCircle2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useReactToPrint } from "react-to-print";
import { FEEDSTOCK_DB, compute_all, find_optimum, Feedstock, safeAnchorH, searchFeedstockLocal, FREE_FEEDSTOCK_IDS, isFreeFeedstock } from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import { trpc } from "@/lib/trpc";
import { useTier } from "@/hooks/useTier";
import UpgradeModal from "@/components/UpgradeModal";
import SocialShareUnlock from "@/components/SocialShareUnlock";
import PassActivatedBanner from "@/components/PassActivatedBanner";
import SubscribedBanner from "@/components/SubscribedBanner";
import PageLoader from "@/components/PageLoader";
import { Link, useLocation } from "wouter";

// UI Components (inline for simplicity, using Tailwind)
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-card border border-border rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode, variant?: "default" | "success" | "warning" | "danger" }) => {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-green-500/10 text-green-500 border border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
};

const BlurredValue = ({ children, isPremium }: { children: React.ReactNode, isPremium: boolean }) => {
  if (!isPremium) return <>{children}</>;
  return (
    <span className="relative inline-block">
      <span className="blur-[6px] select-none pointer-events-none">{children}</span>
      <Lock className="w-3 h-3 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </span>
  );
};

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  const { user, loading, error, isAuthenticated, logout } = useAuth();
  const { t: tr } = useTranslation("home");
  const { t: tFs } = useTranslation("feedstocks");

  // State
  const [activeFeedstock, setActiveFeedstock] = useState<string>("pine_sawdust");
  const [goal, setGoal] = useState<"MAX_CARBON" | "AGRONOMY" | "BALANCED">("BALANCED");
  const [T, setT] = useState<number>(650);
  const [t, setT_res] = useState<number>(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customFs, setCustomFs] = useState<Feedstock>({
    name: "Custom Biomass",
    C: 48.0, H: 6.0, O: 40.0, N: 0.5, S: 0.0, ash: 5.5, moisture: 15.0,
    anchor_T: 650, anchor_t: 30,
    anchor_C: 84.0, anchor_H: 1.8,
    source: "Custom"
  });
  
  // Custom Feedstocks DB
  const [savedCustomFs, setSavedCustomFs] = useState<Record<string, Feedstock>>({});
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingFsId, setEditingFsId] = useState<string | null>(null);

  // Subscription tier
  const { tier, hasAccess } = useTier();
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; requiredTier: "analyst" | "developer" | "engineer" | "expert" }>({
    open: false, feature: "", requiredTier: "analyst"
  });
  const openUpgrade = (feature: string, requiredTier: "analyst" | "developer" | "engineer" | "expert") => {
    setUpgradeModal({ open: true, feature, requiredTier });
  };

  // Report preview modal
  const [showPreview, setShowPreview] = useState(false);
  const isFree = !hasAccess("analyst");

  // Social share unlock modal
  const [showShareUnlock, setShowShareUnlock] = useState(false);
  const creditsQuery = trpc.biomass.getCredits.useQuery(undefined, { enabled: isAuthenticated });
  const aiCredits = creditsQuery.data;

  // Save as Project modal
  const [showSaveProject, setShowSaveProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  // Selected lat/lon/country from the autocomplete dropdown — avoids re-geocoding on save.
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lon: number; country: string | null } | null>(null);
  // Debounced query for location autocomplete
  const [locationQuery, setLocationQuery] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLocationQuery(projectLocation.trim()), 300);
    return () => clearTimeout(id);
  }, [projectLocation]);
  const locationSearch = trpc.projects.searchLocation.useQuery(
    { query: locationQuery },
    { enabled: locationQuery.length >= 3 && showLocationDropdown, staleTime: 60_000 },
  );
  const [projectCapacity, setProjectCapacity] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [, navigate] = useLocation();
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: (result) => {
      setShowSaveProject(false);
      navigate(`/projects/${result.id}`);
    },
  });

  // AI Biomass Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const biomassSearch = trpc.biomass.search.useMutation({
    onSuccess: (data) => {
      if (!data) {
        setSearchError(tr("noDataFound"));
        setSearchSuccess(null);
        return;
      }
      const id = `ai_${Date.now()}`;
      const newFs: Feedstock = {
        name: data.name,
        C: data.C, H: data.H, O: data.O, N: data.N, S: data.S,
        ash: data.ash, moisture: data.moisture,
        anchor_T: data.anchor_T, anchor_t: data.anchor_t,
        anchor_C: data.anchor_C, anchor_H: safeAnchorH(data.anchor_H, data.anchor_C),
        source: data.source
      };
      setSavedCustomFs(prev => ({ ...prev, [id]: newFs }));
      setActiveFeedstock(id);
      setIsCustom(true);
      setSearchQuery("");
      setSearchError(null);
      setSearchSuccess(`"${data.name}" ${tr("loadedSuccess")} ${data.source}`);
      setTimeout(() => setSearchSuccess(null), 5000);
    },
    onError: (err) => {
      const msg = err.message ?? "";
      if (msg.startsWith("SHARE_REQUIRED:")) {
        // Free user needs to share first — open the social share unlock modal
        setShowShareUnlock(true);
        setSearchError(null);
      } else if (msg.startsWith("LIMIT_REACHED:")) {
        // All credits used up — prompt upgrade
        setSearchError(tr("allCreditsUsed"));
      } else {
        setSearchError(tr("connectionError"));
      }
      setSearchSuccess(null);
    }
  });

  // Search handler: local DB first, then AI fallback
  const handleSearch = (query: string) => {
    setSearchError(null);
    setSearchSuccess(null);
    const result = searchFeedstockLocal(query, isFree);
    if (result.status === "found") {
      const id = `local_${Date.now()}`;
      setSavedCustomFs(prev => ({ ...prev, [id]: result.feedstock }));
      setActiveFeedstock(id);
      setIsCustom(true);
      setSearchQuery("");
      setSearchSuccess(`"${result.feedstock.name}" ${tr("loadedSource")} ${result.feedstock.source}`);
      return;
    }
    if (result.status === "locked") {
      setSearchError(`"${result.feedstock.name}" ${tr("premiumLocked")}`);
      setTimeout(() => openUpgrade(tr("fullBiomassDBShort"), "analyst"), 100);
      return;
    }
    // Fallback to AI search — requires login
    if (!isAuthenticated) {
      navigate("/login?signup=1&from=app");
      return;
    }
    biomassSearch.mutate({ query });
  };

  // Current feedstock object
  const fs = isCustom ? (savedCustomFs[activeFeedstock] || customFs || FEEDSTOCK_DB["pine_sawdust"]) : (FEEDSTOCK_DB[activeFeedstock] || FEEDSTOCK_DB["pine_sawdust"]);
  const currentFs = fs || FEEDSTOCK_DB["pine_sawdust"];
  // Display name: translated if it's a DB feedstock, otherwise the raw name (custom/AI)
  const currentFsName = getFeedstockName(isCustom ? null : activeFeedstock, currentFs.name, tFs);

  // Compute current results
  const result = useMemo(() => {
    return compute_all(T, t, currentFs);
  }, [T, t, currentFs]);

  // Saved scenario for comparison
  const [savedScenario, setSavedScenario] = useState<{
    name: string;
    T: number;
    t: number;
    result: ReturnType<typeof compute_all>;
  } | null>(null);

  const handleSaveScenario = () => {
    setSavedScenario({
      name: currentFs.name,
      T,
      t,
      result
    });
  };

  const handleClearScenario = () => {
    setSavedScenario(null);
  };

  // Handle optimization
  const handleOptimize = () => {
    const opt = find_optimum(currentFs, goal);
    setT(opt.T);
    setT_res(opt.t);
  };

  // Run LCA on current biochar — pre-fills LCA form with simulator output
  // (C, H, yield, moisture, feedstock name) via localStorage. Plant capacity,
  // transport distances, energy inputs etc. remain user-entered.
  const handleRunLCA = () => {
    if (!hasAccess("analyst")) {
      openUpgrade(tr("runLCAFeature"), "analyst");
      return;
    }
    const prefill = {
      projectName: `${currentFs.name} @ ${T}°C`,
      biomassType: currentFs.name,
      biomassMoisturePct: currentFs.moisture,
      C_tot_pct: parseFloat(result.C.toFixed(2)),
      H_pct: parseFloat(result.H.toFixed(2)),
      yieldPct: parseFloat(result.yield_.toFixed(2)),
      // O is optional — we have it from the feedstock itself (dry basis)
      O_pct: currentFs.O,
    };
    try {
      localStorage.setItem("lca:prefill", JSON.stringify(prefill));
      localStorage.setItem("lca:prefillTimestamp", String(Date.now()));
    } catch {
      // localStorage might be disabled — navigate anyway
    }
    navigate("/lca");
  };

  // ─── Lab analysis PDF upload ────────────────────────────────────────────
  const [extractingLab, setExtractingLab] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);
  const [labSuccess, setLabSuccess] = useState<string | null>(null);
  const [allowPublicUse, setAllowPublicUse] = useState(true);
  const extractLabMutation = trpc.biomass.extractLabAnalysis.useMutation();

  const handleLabUpload = async (file: File) => {
    setLabError(null);
    setLabSuccess(null);
    if (!file) return;
    if (file.type !== "application/pdf") {
      setLabError(tr("labUpload.errNotPdf", { defaultValue: "Please upload a PDF file." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLabError(tr("labUpload.errTooLarge", { defaultValue: "PDF is too large (max 10 MB)." }));
      return;
    }
    setExtractingLab(true);
    try {
      // Read as base64
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);

      const result = await extractLabMutation.mutateAsync({
        pdfBase64,
        pdfName: file.name,
        allowPublicUse,
      });

      // Pre-fill the custom feedstock form with extracted values
      const bm = result?.biomass ?? {};
      const bc = result?.biochar ?? {};
      const py = result?.pyrolysis ?? {};

      setCustomFs((prev) => ({
        ...prev,
        name: result?.biomassName || prev.name,
        C: bm.C ?? prev.C,
        H: bm.H ?? prev.H,
        O: bm.O ?? prev.O,
        N: bm.N ?? prev.N,
        S: bm.S ?? prev.S,
        ash: bm.ash ?? prev.ash,
        moisture: bm.moisture ?? prev.moisture,
        anchor_T: py.temperature ?? prev.anchor_T,
        anchor_t: py.residenceTime ?? prev.anchor_t,
        anchor_C: bc.C ?? prev.anchor_C,
        anchor_H: bc.H ?? prev.anchor_H,
        source: result?.source || prev.source,
      }));

      // Fill pyrolysis params for the main simulator if present
      if (py.temperature) setT(py.temperature);
      if (py.residenceTime) setT_res(py.residenceTime);

      const extractedFields = [
        bm.C != null && "C",
        bm.H != null && "H",
        bm.O != null && "O",
        bc.BET != null && "BET",
        py.temperature != null && "T°",
      ].filter(Boolean).length;
      setLabSuccess(tr("labUpload.success", {
        count: extractedFields,
        defaultValue: `Extracted ${extractedFields} fields. Review and save.`,
      }));
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.startsWith("UPGRADE_REQUIRED")) {
        setLabError(tr("labUpload.errUpgrade", { defaultValue: "Lab upload requires Analyst plan or higher." }));
      } else if (msg.startsWith("PDF_TOO_LARGE")) {
        setLabError(tr("labUpload.errTooLarge", { defaultValue: "PDF is too large (max 10 MB)." }));
      } else if (msg.startsWith("AI_QUOTA_EXCEEDED")) {
        setLabError(tr("labUpload.errQuota", { defaultValue: "AI service temporarily over capacity. Try again in a few minutes, or fill the form manually." }));
      } else if (msg.startsWith("AI_TIMEOUT")) {
        setLabError(tr("labUpload.errTimeout", { defaultValue: "Extraction took too long. Try a smaller PDF or fill in manually." }));
      } else if (msg.startsWith("AI_UNAVAILABLE")) {
        setLabError(tr("labUpload.errUnavailable", { defaultValue: "AI extraction is currently unavailable. Please fill the form manually." }));
      } else if (msg.startsWith("EXTRACTION_FAILED")) {
        setLabError(tr("labUpload.errExtraction", { defaultValue: "Couldn't read this PDF. Try a clearer scan or fill in manually." }));
      } else {
        // Show the raw message for unknown errors — helps diagnose real issues
        setLabError(msg.length < 200 ? msg : tr("labUpload.errGeneric", { defaultValue: "Upload failed. Please try again." }));
      }
    } finally {
      setExtractingLab(false);
    }
  };

  // Handle Custom Feedstock Save
  const handleSaveCustomFs = () => {
    const id = editingFsId || `custom_${Date.now()}`;
    setSavedCustomFs(prev => ({
      ...prev,
      [id]: { ...customFs }
    }));
    setActiveFeedstock(id);
    setIsCustom(true);
    setShowCustomModal(false);
    setEditingFsId(null);
  };

  const handleEditCustomFs = (id: string) => {
    setCustomFs({ ...savedCustomFs[id] });
    setEditingFsId(id);
    setLabError(null);
    setLabSuccess(null);
    setShowCustomModal(true);
  };

  const handleCreateNewFs = () => {
    setCustomFs({
      name: "New Biomass",
      C: 48.0, H: 6.0, O: 40.0, N: 0.5, S: 0.0, ash: 5.5, moisture: 15.0,
      anchor_T: 650, anchor_t: 30,
      anchor_C: 84.0, anchor_H: 1.8,
      source: "Custom"
    });
    setEditingFsId(null);
    setLabError(null);
    setLabSuccess(null);
    setShowCustomModal(true);
  };

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    const data = [];
    for (let temp = 400; temp <= 850; temp += 10) {
      const res = compute_all(temp, t, currentFs);
      data.push({
        T: temp,
        C: res.C,
        yield: res.yield_,
        CO2e: res.credits.net,
        HCorg: res.H_Corg,
        BET: res.BET,
        pH: res.pH
      });
    }
    return data;
  }, [t, currentFs]);

  // Radar data
  const radarData = useMemo(() => {
    const data = [
      { subject: 'C%', A: Math.min(1, result.C / 95), fullMark: 1 },
      { subject: 'Stability', A: Math.max(0, 1 - result.H_Corg / 0.7), fullMark: 1 },
      { subject: 'CO₂e', A: Math.min(1, result.credits.net / 3.5), fullMark: 1 },
      { subject: 'BET', A: Math.min(1, result.BET / 500), fullMark: 1 },
      { subject: 'pH', A: Math.max(0, 1 - Math.abs(result.pH - 8.5) / 4), fullMark: 1 },
      { subject: 'Yield', A: Math.min(1, result.yield_ / 35), fullMark: 1 },
    ];
    
    if (savedScenario) {
      data[0] = { ...data[0], B: Math.min(1, savedScenario.result.C / 95) } as any;
      data[1] = { ...data[1], B: Math.max(0, 1 - savedScenario.result.H_Corg / 0.7) } as any;
      data[2] = { ...data[2], B: Math.min(1, savedScenario.result.credits.net / 3.5) } as any;
      data[3] = { ...data[3], B: Math.min(1, savedScenario.result.BET / 500) } as any;
      data[4] = { ...data[4], B: Math.max(0, 1 - Math.abs(savedScenario.result.pH - 8.5) / 4) } as any;
      data[5] = { ...data[5], B: Math.min(1, savedScenario.result.yield_ / 35) } as any;
    }
    
    return data;
  }, [result, savedScenario]);

  // Determine badge colors
  const hCorgVariant = result.H_Corg < 0.4 ? "success" : (result.H_Corg < 0.7 ? "warning" : "danger");
  const co2Variant = result.credits.net >= 2.0 ? "success" : "warning";

  // Export to PDF using react-to-print
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportPDF = useReactToPrint({
    contentRef,
    documentTitle: `BiocharOptimizerPro_Report_${currentFs.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${T}C`,
    onBeforePrint: () => {
      setIsExporting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsExporting(false);
    },
    onPrintError: (error) => {
      console.error("Error exporting PDF:", error);
      alert(tr("pdfError"));
      setIsExporting(false);
    }
  });

  // ─── Auth gate ──────────────────────────────────────────────────────────────
  // The simulator is free to USE but requires a corporate-email signup so we
  // can see who (and from which company) is using the platform. We redirect
  // unauthenticated visitors to /login?signup=1 which defaults the auth page
  // to register mode. Registration itself blocks personal email providers
  // (Gmail, Yahoo, etc.) on the server side — see server/routers.ts.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login?signup=1&from=simulator");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // useEffect above is already navigating; render nothing for a clean hand-off.
    return null;
  }

  // Page-specific actions for the AppLayout top bar
  const pageActions = (
    <>
      <button
        onClick={() => {
          if (isFree) {
            openUpgrade(tr("saveProjectsFeature"), "analyst");
            return;
          }
          setProjectName(currentFsName);
          setProjectLocation("");
          setProjectCapacity("");
          setProjectDescription("");
          setShowSaveProject(true);
        }}
        className="hidden sm:flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded text-xs transition-colors"
        title={tr("saveAsProject")}
      >
        {isFree && <Lock className="w-3 h-3" />}
        <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden lg:inline">{tr("saveAsProject")}</span>
      </button>
      <button
        onClick={handleRunLCA}
        className="hidden sm:flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded text-xs transition-colors"
        title={hasAccess("analyst") ? tr("runLCAHint") : tr("analystRequired")}
      >
        {!hasAccess("analyst") && <Lock className="w-3 h-3" />}
        <FileText className="w-3.5 h-3.5" /> <span className="hidden lg:inline">{tr("runLCA")}</span>
      </button>
      <button
        onClick={() => {
          if (!hasAccess("analyst")) { setShowPreview(true); return; }
          handleExportPDF();
        }}
        disabled={isExporting}
        className="hidden sm:flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
        title={hasAccess("analyst") ? tr("exportPDF") : tr("previewReport")}
      >
        {hasAccess("analyst") ? <Download className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden lg:inline">
          {isExporting ? tr("exporting") : hasAccess("analyst") ? tr("exportPDF") : tr("previewReport")}
        </span>
      </button>
    </>
  );

  return (
    <AppLayout
      pageTitle={<span className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> {tr("pageTitle", { defaultValue: "Simulador" })}</span>}
      pageActions={pageActions}
      banner={<><PassActivatedBanner /><SubscribedBanner /></>}
      fullBleed
    >
      <main ref={contentRef} id="pdf-content" className="container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 print:bg-background print:text-foreground">
        
        {/* LEFT PANEL: CONTROLS */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
          
          <Card className="p-5 space-y-6">
            {/* AI Biomass Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3" /> {tr("aiSearch")}
                </label>
                {isAuthenticated && aiCredits && !aiCredits.unlimited && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${aiCredits.credits > 0 ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20"}`}
                    onClick={aiCredits.credits <= 0 ? () => setShowShareUnlock(true) : undefined}
                  >
                    {aiCredits.credits > 0
                      ? `${aiCredits.credits} ${tr("aiCreditsRemaining")}`
                      : tr("shareToAnalyze")}
                  </span>
                )}
                {isAuthenticated && aiCredits?.unlimited && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                    {tr("aiCreditsUnlimited")}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={tr("searchPlaceholder")}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim() && !biomassSearch.isPending) {
                      handleSearch(searchQuery.trim());
                    }
                  }}
                />
                <button
                  onClick={() => searchQuery.trim() && handleSearch(searchQuery.trim())}
                  disabled={!searchQuery.trim() || biomassSearch.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {biomassSearch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {searchError && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {searchError}
                </p>
              )}
              {searchSuccess && (
                <p className="text-[10px] text-green-500">{searchSuccess}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-primary tracking-wider">{tr("feedstock")}</label>

              {/* Upload-your-own CTA — prominent card above the dropdown */}
              <button
                onClick={handleCreateNewFs}
                className="w-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:to-primary/5 border border-primary/40 hover:border-primary/60 rounded-lg p-3 text-left transition-all group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-primary leading-tight">
                      {tr("newBiomassTitle", { defaultValue: "Nueva biomasa" })}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {tr("newBiomassHint", { defaultValue: "Subí tu análisis de laboratorio (PDF) y extraemos C/H/N/S/O, ash, humedad y condiciones de pirólisis automáticamente." })}
                    </div>
                  </div>
                </div>
              </button>

              {/* Subtle "or pick from database" separator */}
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {tr("orPickFromDB", { defaultValue: "o elegí de la base" })}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={activeFeedstock}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__locked__") {
                      openUpgrade(tr("fullBiomassDB"), "analyst");
                      return;
                    }
                    if (val.startsWith('custom_')) {
                      setIsCustom(true);
                      setActiveFeedstock(val);
                    } else {
                      setIsCustom(false);
                      setActiveFeedstock(val);
                    }
                  }}
                >
                  <optgroup label={isFree ? tr("freeDatabase") : tr("database")}>
                    {Object.entries(FEEDSTOCK_DB)
                      .filter(([k]) => !isFree || isFreeFeedstock(k))
                      .map(([k, v]) => (
                        <option key={k} value={k}>{getFeedstockName(k, v.name, tFs)}</option>
                      ))}
                  </optgroup>
                  {isFree && (
                    <optgroup label={tr("premiumAnalyst")}>
                      <option value="__locked__">{tr("unlockMore")}</option>
                    </optgroup>
                  )}
                  {Object.keys(savedCustomFs).filter(k => !k.startsWith('ai_') && !k.startsWith('local_')).length > 0 && (
                    <optgroup label={tr("custom")}>
                      {Object.entries(savedCustomFs).filter(([k]) => !k.startsWith('ai_') && !k.startsWith('local_')).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {Object.keys(savedCustomFs).filter(k => k.startsWith('ai_') || k.startsWith('local_')).length > 0 && (
                    <optgroup label={tr("searchResults")}>
                      {Object.entries(savedCustomFs).filter(([k]) => k.startsWith('ai_') || k.startsWith('local_')).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {isCustom && (
                  <button 
                    onClick={() => handleEditCustomFs(activeFeedstock)}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 rounded-md transition-colors"
                    title={tr("editFeedstock")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-primary tracking-wider">{tr("qualityGoal")}</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "MAX_CARBON"} onChange={() => setGoal("MAX_CARBON")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">{tr("maxCarbon")}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "AGRONOMY"} onChange={() => setGoal("AGRONOMY")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">{tr("maxAgronomy")}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "BALANCED"} onChange={() => setGoal("BALANCED")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">{tr("balanced")}</span>
                </label>
              </div>
              <button 
                onClick={() => {
                  if (!hasAccess("analyst")) {
                    openUpgrade(tr("optimizerFeature"), "analyst");
                    return;
                  }
                  handleOptimize();
                }}
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-md transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 relative"
              >
                {!hasAccess("analyst") && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-primary-foreground/20 text-primary-foreground px-1 rounded">{tr("pro")}</span>}
                <Zap className="w-4 h-4" /> {tr("optimize")}
              </button>
            </div>

            <div className="pt-4 border-t border-border space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary tracking-wider">
                  <label>{tr("temperature")}</label>
                  <span>{T} °C</span>
                </div>
                <input
                  type="range" min="400" max="850" step="5"
                  value={T} onChange={(e) => setT(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>400</span><span>850</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary tracking-wider">
                  <label>{tr("resTime")}</label>
                  <span>{t} min</span>
                </div>
                <input 
                  type="range" min="15" max="60" step="1" 
                  value={t} onChange={(e) => setT_res(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>15</span><span>60</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-[10px] text-muted-foreground text-center px-4">
            {tr("modelDisclaimer")}
          </div>
        </aside>

        {/* RIGHT PANEL: RESULTS */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{tr("totalCarbon")}</span>
              <div className="text-2xl font-mono font-bold text-primary my-1">{result.C.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">{tr("dryMass")}</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{tr("hCorgRatio")}</span>
              <div className="text-2xl font-mono font-bold text-foreground my-1">{result.H_Corg.toFixed(3)}</div>
              <div><Badge variant={hCorgVariant}>{result.H_Corg < 0.4 ? "BC-1" : (result.H_Corg < 0.7 ? "BC-2" : "FAIL")}</Badge></div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{tr("netCO2e")}</span>
              <div className="text-2xl font-mono font-bold text-foreground my-1">{result.credits.net.toFixed(2)}</div>
              <span className="text-[10px] text-muted-foreground">{tr("ttBiochar")}</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-cyan-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{tr("yield")}</span>
              <div className="text-2xl font-mono font-bold text-cyan-500 my-1">{result.yield_.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">{tr("dryMass")}</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-purple-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{tr("betSurface")}</span>
              <div className="text-2xl font-mono font-bold text-purple-500 my-1">{Math.round(result.BET)}</div>
              <span className="text-[10px] text-muted-foreground">{tr("m2g")}</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-yellow-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">pH</span>
              <div className="text-2xl font-mono font-bold text-yellow-500 my-1">{result.pH.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">{result.pH > 7.5 ? tr("alkaline") : tr("neutral")}</span>
            </Card>
            

          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <Card className="p-4 lg:col-span-2 h-[350px] flex flex-col">
              <h2 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> {tr("thermalSensitivity")}
              </h2>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensitivityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="T" stroke="var(--color-muted-foreground)" fontSize={10} tickMargin={10} />
                    <YAxis yAxisId="left" stroke="var(--color-primary)" fontSize={10} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--color-purple-500)" fontSize={10} domain={[0, 4]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="C" name="C%" stroke="var(--color-primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="left" type="monotone" dataKey="yield" name="Yield %" stroke="var(--color-cyan-500)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="CO2e" name="CO₂e" stroke="var(--color-purple-500)" strokeWidth={2} dot={false} isAnimationActive={false} />

                    {/* Vertical line + dot markers at current temperature */}
                    <ReferenceLine
                      yAxisId="left"
                      x={T}
                      stroke="var(--color-foreground)"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{ value: `${T}°C`, position: "top", fill: "var(--color-foreground)", fontSize: 10, fontWeight: 700 }}
                    />
                    <ReferenceDot yAxisId="left" x={T} y={result.C} r={5} fill="var(--color-primary)" stroke="var(--color-foreground)" strokeWidth={2} isFront />
                    <ReferenceDot yAxisId="left" x={T} y={result.yield_} r={5} fill="var(--color-cyan-500)" stroke="var(--color-foreground)" strokeWidth={2} isFront />
                    <ReferenceDot yAxisId="right" x={T} y={result.credits.net} r={5} fill="var(--color-purple-500)" stroke="var(--color-foreground)" strokeWidth={2} isFront />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 h-[350px] flex flex-col relative">
              <div className="flex justify-between items-start mb-0">
                <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <Beaker className="w-4 h-4" /> {tr("qualityProfile")}
                </h2>
                <div className="flex flex-col items-end gap-1">
                  {!savedScenario ? (
                    <button
                      onClick={() => {
                        if (isFree) {
                          openUpgrade(tr("compareFeature"), "analyst");
                          return;
                        }
                        handleSaveScenario();
                      }}
                      className="text-[10px] flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 rounded transition-colors relative"
                    >
                      {isFree && <Lock className="w-2.5 h-2.5" />}
                      <Save className="w-3 h-3" /> {tr("saveToCompare")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 px-2 py-1 rounded">
                      <div className="w-2 h-2 rounded-full bg-accent"></div>
                      <span className="text-[10px] text-accent truncate max-w-[100px]" title={savedScenario.name}>
                        {savedScenario.name} ({savedScenario.T}°C)
                      </span>
                      <button onClick={handleClearScenario} className="text-muted-foreground hover:text-foreground ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 -mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                    <Radar name="Current" dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} isAnimationActive={false} />
                    {savedScenario && (
                      <Radar name="Saved" dataKey="B" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.3} isAnimationActive={false} />
                    )}
                    {savedScenario && <Legend wrapperStyle={{ fontSize: '10px' }} />}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
          </div>

          {/* CUSTOM FEEDSTOCK MODAL */}
          {showCustomModal && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md p-6 space-y-4 border-primary/50 shadow-lg shadow-primary/10">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {editingFsId ? tr("editFeedstock") : tr("newFeedstock")}
                  </h2>
                  <button onClick={() => setShowCustomModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Lab analysis PDF upload — Analyst+ only */}
                  <div className="border border-dashed border-primary/40 bg-primary/5 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Beaker className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-primary">
                          {tr("labUpload.title", { defaultValue: "Upload lab analysis (PDF)" })}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {tr("labUpload.hint", {
                            defaultValue: "We'll extract C/H/N/S/O, ash, moisture, pyrolysis conditions and biochar properties to pre-fill this form.",
                          })}
                        </div>
                      </div>
                    </div>
                    {extractingLab ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {tr("labUpload.extracting", { defaultValue: "Extracting data from PDF…" })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                          !hasAccess("analyst")
                            ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                            : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                        }`}>
                          {!hasAccess("analyst") && <Lock className="w-3 h-3" />}
                          <FileText className="w-3.5 h-3.5" />
                          {tr("labUpload.choose", { defaultValue: "Choose PDF…" })}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            disabled={!hasAccess("analyst")}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLabUpload(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowPublicUse}
                            onChange={(e) => setAllowPublicUse(e.target.checked)}
                            className="accent-primary"
                          />
                          {tr("labUpload.sharePlatform", {
                            defaultValue: "Contribute anonymized data to improve the model",
                          })}
                        </label>
                      </div>
                    )}
                    {labError && (
                      <div className="mt-2 text-[11px] text-red-500 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {labError}
                      </div>
                    )}
                    {labSuccess && (
                      <div className="mt-2 text-[11px] text-green-500">
                        ✓ {labSuccess}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{tr("name")}</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                      value={customFs.name}
                      onChange={e => setCustomFs({...customFs, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("carbonC")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.C}
                        onChange={e => setCustomFs({...customFs, C: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("hydrogenH")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.H}
                        onChange={e => setCustomFs({...customFs, H: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("oxygenO")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.O}
                        onChange={e => setCustomFs({...customFs, O: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("nitrogenN")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.N}
                        onChange={e => setCustomFs({...customFs, N: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("ash")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.ash}
                        onChange={e => setCustomFs({...customFs, ash: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">{tr("moisture")}</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.moisture}
                        onChange={e => setCustomFs({...customFs, moisture: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-2">
                    <button 
                      onClick={() => setShowCustomModal(false)}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {tr("cancel")}
                    </button>
                    <button
                      onClick={handleSaveCustomFs}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> {tr("save")}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* DETAILED TABLE */}
          <Card className="p-4 mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">{tr("parameter")}</th>
                  <th className="px-4 py-3">{tr("currentValue")}</th>
                  <th className="px-4 py-3">{tr("puroThreshold")}</th>
                  <th className="px-4 py-3 rounded-tr-md">{tr("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{tr("tempTime")}</td>
                  <td className="px-4 py-3 font-mono">{T} °C / {t} min</td>
                  <td className="px-4 py-3 text-muted-foreground">400–850 °C / 15–60 min</td>
                  <td className="px-4 py-3"><Badge variant="success">✓</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{tr("totalCarbonC")}</td>
                  <td className="px-4 py-3 font-mono">{result.C.toFixed(1)} %</td>
                  <td className="px-4 py-3 text-muted-foreground">&gt; 50%</td>
                  <td className="px-4 py-3"><Badge variant={result.C > 50 ? "success" : "danger"}>{result.C > 50 ? "✓" : "✗"}</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{tr("molarHCorg")}</td>
                  <td className="px-4 py-3 font-mono">{result.H_Corg.toFixed(3)}</td>
                  <td className="px-4 py-3 text-muted-foreground">&lt; 0.7 (BC-2) / &lt; 0.4 (BC-1)</td>
                  <td className="px-4 py-3"><Badge variant={hCorgVariant}>{result.H_Corg < 0.4 ? "BC-1" : (result.H_Corg < 0.7 ? "BC-2" : "FAIL")}</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{tr("co2ePerTonne")}</td>
                  <td className="px-4 py-3 font-mono">{result.credits.net.toFixed(2)} t</td>
                  <td className="px-4 py-3 text-muted-foreground">{tr("naLCA")}</td>
                  <td className="px-4 py-3"><Badge variant="default">INFO</Badge></td>
                </tr>

              </tbody>
            </table>
          </Card>

          {/* Print-only footer — watermark + generation metadata. Only visible in PDF exports. */}
          <div className="hidden print:block mt-6 pt-4 border-t border-gray-300 text-[9px] text-gray-500">
            <div className="flex justify-between items-center">
              <span>
                Generated with <strong>Biochar Optimizer Pro</strong> · biocharpro.io
              </span>
              <span className="font-mono">
                {new Date().toLocaleDateString()} · {currentFs.name}
              </span>
            </div>
            <div className="mt-1 text-[8px] text-gray-400">
              This report was produced by an empirical pyrolysis model calibrated against peer-reviewed literature. Simulation parameters: T={T}°C, residence time={t} min. Model predictions are subject to ±5–8% uncertainty for feedstocks within the calibration range.
            </div>
          </div>

        </div>
      </main>

      {/* SAVE AS PROJECT MODAL */}
      {showSaveProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <h2 className="font-bold">{tr("saveAsProjectTitle")}</h2>
              </div>
              <button onClick={() => setShowSaveProject(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {tr("projectName")}
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={tr("projectNamePlaceholder")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {tr("locationLabel")}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <input
                    type="text"
                    value={projectLocation}
                    onChange={(e) => {
                      setProjectLocation(e.target.value);
                      setSelectedLocationCoords(null);
                      setShowLocationDropdown(true);
                    }}
                    onFocus={() => setShowLocationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                    placeholder={tr("locationPlaceholder")}
                    className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    autoComplete="off"
                  />
                  {selectedLocationCoords && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" title="Geolocated">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {locationSearch.isFetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Suggestions dropdown */}
                  {showLocationDropdown && projectLocation.length >= 3 && !locationSearch.isFetching && (locationSearch.data?.length ?? 0) > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {(locationSearch.data ?? []).map((s, idx) => (
                        <button
                          key={`${s.lat}-${s.lon}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            // onMouseDown fires before onBlur — prevents the dropdown from closing before selection
                            e.preventDefault();
                            setProjectLocation(s.displayName);
                            setSelectedLocationCoords({ lat: s.lat, lon: s.lon, country: s.country });
                            setShowLocationDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
                        >
                          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-foreground line-clamp-2">{s.displayName}</div>
                            {s.country && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{s.country}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showLocationDropdown && projectLocation.length >= 3 && !locationSearch.isFetching && locationSearch.data?.length === 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      {tr("locationNoResults", { defaultValue: "No matches found. You can still save with this text." })}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedLocationCoords
                    ? tr("locationSelected", { defaultValue: "✓ Location confirmed." })
                    : tr("geocodeHint")}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {tr("plantCapacity")}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={projectCapacity}
                  onChange={e => setProjectCapacity(e.target.value)}
                  placeholder="1.5"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {tr("description")}
                </label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder={tr("descriptionPlaceholder")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              {createProjectMutation.error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-400">{createProjectMutation.error.message}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowSaveProject(false)} className="text-sm text-muted-foreground hover:text-foreground">
                {tr("cancel")}
              </button>
              <button
                onClick={() => {
                  if (!projectName.trim()) return;
                  createProjectMutation.mutate({
                    name: projectName.trim(),
                    description: projectDescription.trim() || null,
                    location: projectLocation.trim() || null,
                    // If the user picked a suggestion, pass coords so the server
                    // doesn't re-geocode (faster + exact match)
                    latitude: selectedLocationCoords?.lat ?? null,
                    longitude: selectedLocationCoords?.lon ?? null,
                    country: selectedLocationCoords?.country ?? null,
                    plantCapacityTph: projectCapacity ? Number(projectCapacity) : null,
                    feedstockId: activeFeedstock,
                    feedstockData: JSON.stringify(currentFs),
                    temperature: T,
                    residenceTime: t,
                    qualityGoal: goal,
                  });
                }}
                disabled={!projectName.trim() || createProjectMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {createProjectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {tr("saveProject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        featureName={upgradeModal.feature}
        requiredTier={upgradeModal.requiredTier}
      />

      {/* REPORT PREVIEW MODAL (Free users) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground">{tr("reportPreview")}</h2>
                <p className="text-xs text-muted-foreground">Biochar Optimizer Pro — {currentFsName}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Conditions */}
              <div className="text-sm text-muted-foreground">
                Pyrolysis conditions: <span className="text-foreground font-mono">{T}°C</span> / <span className="text-foreground font-mono">{t} min</span>
              </div>

              {/* KPI Preview Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background border border-border rounded-lg p-3 border-l-2 border-l-primary">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Carbon</div>
                  <div className="text-xl font-mono font-bold text-primary">{result.C.toFixed(1)}%</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 border-l-2 border-l-primary">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">H:Corg Ratio</div>
                  <div className="text-xl font-mono font-bold">{result.H_Corg.toFixed(3)}</div>
                  <Badge variant={hCorgVariant}>{result.H_Corg < 0.4 ? "BC-1" : (result.H_Corg < 0.7 ? "BC-2" : "FAIL")}</Badge>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 border-l-2 border-l-cyan-500">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Yield</div>
                  <div className="text-xl font-mono font-bold text-cyan-500">{result.yield_.toFixed(1)}%</div>
                </div>
              </div>

              {/* Blurred premium KPIs */}
              <div className="grid grid-cols-3 gap-3 relative">
                <div className="bg-background border border-border rounded-lg p-3 blur-[5px] select-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Net CO₂e</div>
                  <div className="text-xl font-mono font-bold">3.04</div>
                  <div className="text-[10px] text-muted-foreground">t/t biochar</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 blur-[5px] select-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">BET Surface</div>
                  <div className="text-xl font-mono font-bold">419</div>
                  <div className="text-[10px] text-muted-foreground">m²/g</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 blur-[5px] select-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">pH</div>
                  <div className="text-xl font-mono font-bold">8.7</div>
                  <div className="text-[10px] text-muted-foreground">alkaline</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card/90 border border-border rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-lg">
                    <Lock className="w-3.5 h-3.5 text-primary" /> {tr("upgradeToUnlock")}
                  </span>
                </div>
              </div>

              {/* Blurred compliance table */}
              <div className="relative">
                <table className="w-full text-sm text-left blur-[4px] select-none">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                    <tr>
                      <th className="px-3 py-2">Parameter</th>
                      <th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Threshold</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-3 py-2">Temperature</td><td className="px-3 py-2">650°C</td><td className="px-3 py-2">400-850°C</td><td className="px-3 py-2">Pass</td></tr>
                    <tr><td className="px-3 py-2">Total Carbon</td><td className="px-3 py-2">87.4%</td><td className="px-3 py-2">&gt;50%</td><td className="px-3 py-2">Pass</td></tr>
                    <tr><td className="px-3 py-2">H:Corg</td><td className="px-3 py-2">0.200</td><td className="px-3 py-2">&lt;0.7</td><td className="px-3 py-2">BC-1</td></tr>
                    <tr><td className="px-3 py-2">CO₂e net</td><td className="px-3 py-2">3.04 t</td><td className="px-3 py-2">LCA</td><td className="px-3 py-2">Info</td></tr>
                  </tbody>
                </table>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card/90 border border-border rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-lg">
                    <Lock className="w-3.5 h-3.5 text-primary" /> {tr("complianceTable")}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-border bg-primary/5 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {tr("unlockFullReport")}
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setShowPreview(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  {tr("close")}
                </button>
                <button
                  onClick={() => { setShowPreview(false); openUpgrade(tr("exportPDFFeature"), "analyst"); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" /> {tr("upgradeAnalyst")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL SHARE UNLOCK MODAL */}
      <SocialShareUnlock
        open={showShareUnlock}
        onClose={() => setShowShareUnlock(false)}
        onUnlocked={() => {
          creditsQuery.refetch();
        }}
      />

      {/* Mini footer */}
      <footer className="border-t border-border py-4 mt-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <Link href="/pricing">{tr("footer.pricing", { defaultValue: "Precios" })}</Link>
          <Link href="/pricing#contact">{tr("footer.contact", { defaultValue: "Contacto" })}</Link>
          <span className="text-border">·</span>
          <Link href="/legal/terms">{tr("footer.terms", { defaultValue: "Términos" })}</Link>
          <Link href="/legal/privacy">{tr("footer.privacy", { defaultValue: "Privacidad" })}</Link>
          <Link href="/legal/security">{tr("footer.security", { defaultValue: "Seguridad" })}</Link>
        </div>
      </footer>
    </AppLayout>
  );
}
