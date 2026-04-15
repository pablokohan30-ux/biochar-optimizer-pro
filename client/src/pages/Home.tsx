import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from "recharts";
import { Settings, Zap, Activity, Beaker, BarChart3, Download, Save, X, Plus, Edit2, Search, Loader2, AlertCircle, Lock, Eye, FolderOpen, MapPin, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { FEEDSTOCK_DB, compute_all, find_optimum, Feedstock, safeAnchorH, searchFeedstockLocal, FREE_FEEDSTOCK_IDS, isFreeFeedstock } from "@/lib/biocharModel";
import { trpc } from "@/lib/trpc";
import { useTier } from "@/hooks/useTier";
import UpgradeModal from "@/components/UpgradeModal";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PassActivatedBanner from "@/components/PassActivatedBanner";
import SubscribedBanner from "@/components/SubscribedBanner";
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

  // Save as Project modal
  const [showSaveProject, setShowSaveProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
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
        setSearchError("No data found for that biomass. Try a more specific name.");
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
      setSearchSuccess(`"${data.name}" loaded successfully. Source: ${data.source}`);
      setTimeout(() => setSearchSuccess(null), 5000);
    },
    onError: () => {
      setSearchError("Connection error. Please try again.");
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
      setSearchSuccess(`"${result.feedstock.name}" loaded. Source: ${result.feedstock.source}`);
      return;
    }
    if (result.status === "locked") {
      setSearchError(`"${result.feedstock.name}" is in the premium database. Upgrade to Analyst to unlock 50+ biomasses.`);
      setTimeout(() => openUpgrade("Access the full biomass database", "analyst"), 100);
      return;
    }
    // Fallback to AI search
    biomassSearch.mutate({ query });
  };

  // Current feedstock object
  const fs = isCustom ? (savedCustomFs[activeFeedstock] || customFs || FEEDSTOCK_DB["pine_sawdust"]) : (FEEDSTOCK_DB[activeFeedstock] || FEEDSTOCK_DB["pine_sawdust"]);
  const currentFs = fs || FEEDSTOCK_DB["pine_sawdust"];

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
      openUpgrade("Run LCA on this biochar", "analyst");
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
    setShowCustomModal(true);
  };

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    const data = [];
    for (let temp = 400; temp <= 750; temp += 10) {
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
      alert("There was an error exporting the PDF. Please try again.");
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // useEffect above is already navigating; render nothing for a clean hand-off.
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">

      {/* Carbon Forum Pass activation banner (only renders when ?pass=... in URL) */}
      <PassActivatedBanner />

      {/* Regular subscription activation banner (only renders when ?subscribed=1 in URL) */}
      <SubscribedBanner />

      {/* HEADER */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink iconType="activity" />
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            {user && (
              <span className="text-xs text-muted-foreground">
                Hi, <span className="text-foreground font-medium">{user.name || user.email}</span>
              </span>
            )}
            <button
              onClick={() => {
                if (isFree) {
                  openUpgrade("Save projects with location data", "analyst");
                  return;
                }
                // Fresh form every time (don't carry over location/capacity from a previous save)
                setProjectName(currentFs.name);
                setProjectLocation("");
                setProjectCapacity("");
                setProjectDescription("");
                setShowSaveProject(true);
              }}
              className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded transition-colors"
            >
              {isFree && <Lock className="w-3 h-3" />}
              <FolderOpen className="w-4 h-4" /> Save as Project
            </button>
            {!isFree && (
              <Link href="/projects">
                <button className="text-xs text-muted-foreground hover:text-foreground">My Projects</button>
              </Link>
            )}
            <button
              onClick={handleRunLCA}
              className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded transition-colors"
              title={hasAccess("analyst") ? "Run LCA on this biochar — pre-fills Puro.earth Ed. 2025 form with C, H, yield and moisture" : "Analyst plan required"}
            >
              {!hasAccess("analyst") && <Lock className="w-3 h-3" />}
              <FileText className="w-4 h-4" /> Run LCA
            </button>
            <button
              onClick={() => {
                if (!hasAccess("analyst")) {
                  setShowPreview(true);
                  return;
                }
                handleExportPDF();
              }}
              disabled={isExporting}
              className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {hasAccess("analyst") ? <Download className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isExporting ? "Exporting..." : hasAccess("analyst") ? "Export PDF" : "Preview Report"}
            </button>
            <Link href="/pricing">
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                {tier === "free" ? "FREE PLAN" : tier.toUpperCase()}
              </span>
            </Link>
            <LanguageSwitcher />
            {user && (
              <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={contentRef} id="pdf-content" className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 print:bg-background print:text-foreground">
        
        {/* LEFT PANEL: CONTROLS */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
          
          <Card className="p-5 space-y-6">
            {/* AI Biomass Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3" /> AI BIOMASS SEARCH
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. walnut shell, sugarcane bagasse..."
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-primary tracking-wider">FEEDSTOCK</label>
                <button 
                  onClick={handleCreateNewFs}
                  className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={activeFeedstock}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__locked__") {
                      openUpgrade("Access the full biomass database (50+ biomasses)", "analyst");
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
                  <optgroup label={isFree ? "Free Database" : "Database"}>
                    {Object.entries(FEEDSTOCK_DB)
                      .filter(([k]) => !isFree || isFreeFeedstock(k))
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                  </optgroup>
                  {isFree && (
                    <optgroup label="🔒 Premium (Analyst+)">
                      <option value="__locked__">Unlock 35+ more biomasses →</option>
                    </optgroup>
                  )}
                  {Object.keys(savedCustomFs).filter(k => !k.startsWith('ai_') && !k.startsWith('local_')).length > 0 && (
                    <optgroup label="Custom">
                      {Object.entries(savedCustomFs).filter(([k]) => !k.startsWith('ai_') && !k.startsWith('local_')).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {Object.keys(savedCustomFs).filter(k => k.startsWith('ai_') || k.startsWith('local_')).length > 0 && (
                    <optgroup label="Search Results">
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
                    title="Edit feedstock"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-primary tracking-wider">QUALITY GOAL</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "MAX_CARBON"} onChange={() => setGoal("MAX_CARBON")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">Max Carbon Capture (CO₂e)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "AGRONOMY"} onChange={() => setGoal("AGRONOMY")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">Max Agronomy (BET/pH)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input type="radio" name="goal" checked={goal === "BALANCED"} onChange={() => setGoal("BALANCED")} className="accent-primary" />
                  <span className="group-hover:text-primary transition-colors">Balanced (60% C / 40% Agro)</span>
                </label>
              </div>
              <button 
                onClick={() => {
                  if (!hasAccess("analyst")) {
                    openUpgrade("Automatic temperature/time optimizer", "analyst");
                    return;
                  }
                  handleOptimize();
                }}
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-md transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 relative"
              >
                {!hasAccess("analyst") && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-primary-foreground/20 text-primary-foreground px-1 rounded">PRO</span>}
                <Zap className="w-4 h-4" /> OPTIMIZE
              </button>
            </div>

            <div className="pt-4 border-t border-border space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary tracking-wider">
                  <label>TEMPERATURE</label>
                  <span>{T} °C</span>
                </div>
                <input 
                  type="range" min="400" max="750" step="5" 
                  value={T} onChange={(e) => setT(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>400</span><span>750</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary tracking-wider">
                  <label>RES. TIME</label>
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
            Empirical model calibrated with peer-reviewed pyrolysis literature data.
          </div>
        </aside>

        {/* RIGHT PANEL: RESULTS */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Carbon</span>
              <div className="text-2xl font-mono font-bold text-primary my-1">{result.C.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">% dry mass</span>
            </Card>
            
            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">H:Corg Ratio</span>
              <div className="text-2xl font-mono font-bold text-foreground my-1">{result.H_Corg.toFixed(3)}</div>
              <div><Badge variant={hCorgVariant}>{result.H_Corg < 0.4 ? "BC-1" : (result.H_Corg < 0.7 ? "BC-2" : "FAIL")}</Badge></div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-primary">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Net CO₂e</span>
              <div className="text-2xl font-mono font-bold text-foreground my-1">{result.credits.net.toFixed(2)}</div>
              <span className="text-[10px] text-muted-foreground">t/t biochar</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-cyan-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Yield</span>
              <div className="text-2xl font-mono font-bold text-cyan-500 my-1">{result.yield_.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">% dry mass</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-purple-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">BET Surface</span>
              <div className="text-2xl font-mono font-bold text-purple-500 my-1">{Math.round(result.BET)}</div>
              <span className="text-[10px] text-muted-foreground">m²/g (est.)</span>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-l-2 border-l-yellow-500">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">pH</span>
              <div className="text-2xl font-mono font-bold text-yellow-500 my-1">{result.pH.toFixed(1)}</div>
              <span className="text-[10px] text-muted-foreground">{result.pH > 7.5 ? "alkaline" : "neutral"}</span>
            </Card>
            

          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <Card className="p-4 lg:col-span-2 h-[350px] flex flex-col">
              <h2 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Thermal Sensitivity
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
                    <Line yAxisId="left" type="monotone" dataKey="C" name="C%" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="yield" name="Yield %" stroke="var(--color-cyan-500)" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="CO2e" name="CO₂e" stroke="var(--color-purple-500)" strokeWidth={2} dot={false} />
                    
                    {/* Current point marker */}
                    <Scatter yAxisId="left" data={[{ T, C: result.C }]} fill="var(--color-foreground)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 h-[350px] flex flex-col relative">
              <div className="flex justify-between items-start mb-0">
                <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <Beaker className="w-4 h-4" /> Quality Profile
                </h2>
                <div className="flex flex-col items-end gap-1">
                  {!savedScenario ? (
                    <button
                      onClick={() => {
                        if (isFree) {
                          openUpgrade("Save and compare scenarios", "analyst");
                          return;
                        }
                        handleSaveScenario();
                      }}
                      className="text-[10px] flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 rounded transition-colors relative"
                    >
                      {isFree && <Lock className="w-2.5 h-2.5" />}
                      <Save className="w-3 h-3" /> Save to compare
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
                    <Radar name="Current" dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} />
                    {savedScenario && (
                      <Radar name="Saved" dataKey="B" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.3} />
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
                    {editingFsId ? "Edit Feedstock" : "New Feedstock"}
                  </h2>
                  <button onClick={() => setShowCustomModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                      value={customFs.name}
                      onChange={e => setCustomFs({...customFs, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Carbon (C %)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.C}
                        onChange={e => setCustomFs({...customFs, C: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Hydrogen (H %)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.H}
                        onChange={e => setCustomFs({...customFs, H: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Oxygen (O %)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.O}
                        onChange={e => setCustomFs({...customFs, O: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Nitrogen (N %)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.N}
                        onChange={e => setCustomFs({...customFs, N: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Ash (%)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                        value={customFs.ash}
                        onChange={e => setCustomFs({...customFs, ash: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Moisture (%)</label>
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
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveCustomFs}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save
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
                  <th className="px-4 py-3 rounded-tl-md">Parameter</th>
                  <th className="px-4 py-3">Current Value</th>
                  <th className="px-4 py-3">Puro.earth Threshold</th>
                  <th className="px-4 py-3 rounded-tr-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">Temperature / Time</td>
                  <td className="px-4 py-3 font-mono">{T} °C / {t} min</td>
                  <td className="px-4 py-3 text-muted-foreground">400–750 °C / 15–60 min</td>
                  <td className="px-4 py-3"><Badge variant="success">✓</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">Total Carbon (C%)</td>
                  <td className="px-4 py-3 font-mono">{result.C.toFixed(1)} %</td>
                  <td className="px-4 py-3 text-muted-foreground">&gt; 50%</td>
                  <td className="px-4 py-3"><Badge variant={result.C > 50 ? "success" : "danger"}>{result.C > 50 ? "✓" : "✗"}</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">Molar H:Corg Ratio</td>
                  <td className="px-4 py-3 font-mono">{result.H_Corg.toFixed(3)}</td>
                  <td className="px-4 py-3 text-muted-foreground">&lt; 0.7 (BC-2) / &lt; 0.4 (BC-1)</td>
                  <td className="px-4 py-3"><Badge variant={hCorgVariant}>{result.H_Corg < 0.4 ? "BC-1" : (result.H_Corg < 0.7 ? "BC-2" : "FAIL")}</Badge></td>
                </tr>
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">CO₂e per tonne</td>
                  <td className="px-4 py-3 font-mono">{result.credits.net.toFixed(2)} t</td>
                  <td className="px-4 py-3 text-muted-foreground">N/A (Depends on LCA)</td>
                  <td className="px-4 py-3"><Badge variant="default">INFO</Badge></td>
                </tr>

              </tbody>
            </table>
          </Card>

        </div>
      </main>

      {/* SAVE AS PROJECT MODAL */}
      {showSaveProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <h2 className="font-bold">Save as Project</h2>
              </div>
              <button onClick={() => setShowSaveProject(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Corrientes Plant #1"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Location (address or city)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={projectLocation}
                    onChange={e => setProjectLocation(e.target.value)}
                    placeholder="Buenos Aires, Argentina"
                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">We'll geocode this to show on the map.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Plant Capacity (tonnes/hour)
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
                  Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder="Short notes about the project"
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
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!projectName.trim()) return;
                  createProjectMutation.mutate({
                    name: projectName.trim(),
                    description: projectDescription.trim() || null,
                    location: projectLocation.trim() || null,
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
                Save Project
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
                <h2 className="font-bold text-foreground">Report Preview</h2>
                <p className="text-xs text-muted-foreground">Biochar Optimizer Pro — {currentFs.name}</p>
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
                    <Lock className="w-3.5 h-3.5 text-primary" /> Upgrade to unlock
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
                    <tr><td className="px-3 py-2">Temperature</td><td className="px-3 py-2">650°C</td><td className="px-3 py-2">400-750°C</td><td className="px-3 py-2">Pass</td></tr>
                    <tr><td className="px-3 py-2">Total Carbon</td><td className="px-3 py-2">87.4%</td><td className="px-3 py-2">&gt;50%</td><td className="px-3 py-2">Pass</td></tr>
                    <tr><td className="px-3 py-2">H:Corg</td><td className="px-3 py-2">0.200</td><td className="px-3 py-2">&lt;0.7</td><td className="px-3 py-2">BC-1</td></tr>
                    <tr><td className="px-3 py-2">CO₂e net</td><td className="px-3 py-2">3.04 t</td><td className="px-3 py-2">LCA</td><td className="px-3 py-2">Info</td></tr>
                  </tbody>
                </table>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card/90 border border-border rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-lg">
                    <Lock className="w-3.5 h-3.5 text-primary" /> Puro.earth compliance table
                  </span>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-border bg-primary/5 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Unlock the full report with CO₂e credits, BET surface, pH, and Puro.earth compliance data.
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setShowPreview(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  Close
                </button>
                <button
                  onClick={() => { setShowPreview(false); openUpgrade("Export full PDF report", "analyst"); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" /> Upgrade to Analyst — $299/mo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
