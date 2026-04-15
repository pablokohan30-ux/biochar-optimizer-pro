import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, MapPin, Save, Trash2, Thermometer, Clock, Leaf, AlertCircle, Target, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { compute_all, find_optimum, FEEDSTOCK_DB, Feedstock } from "@/lib/biocharModel";
import ProjectMap from "@/components/ProjectMap";
import SiteFooter from "@/components/SiteFooter";

type QualityGoal = "MAX_CARBON" | "AGRONOMY" | "BALANCED";

export default function ProjectDetail() {
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
      setSaveMessage("Project updated");
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

  const [T, setT] = useState(650);
  const [resTime, setResTime] = useState(30);
  const [goal, setGoal] = useState<QualityGoal>("BALANCED");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Project not found.</p>
          <Link href="/projects">
            <button className="text-xs text-primary hover:underline">← Back to projects</button>
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
    const roundedT = Math.round(optimum.T / 5) * 5;
    const roundedRes = Math.round(optimum.t / 5) * 5;
    setT(Math.min(Math.max(roundedT, 400), 750));
    setResTime(Math.min(Math.max(roundedRes, 15), 60));
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id: project.id });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/projects">
              <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                <ArrowLeft className="w-4 h-4" /> Projects
              </button>
            </Link>
            <div className="w-px h-6 bg-border" />
            <div>
              <h1 className="font-bold text-lg text-foreground">{project.name}</h1>
              {project.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {project.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span className="text-xs text-green-500">{saveMessage}</span>
            )}
            {hasUnsavedChanges && !saveMessage && (
              <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Unsaved</span>
            )}
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || !hasUnsavedChanges}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleDelete}
              className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Project Info</h3>
            <div className="space-y-3 text-sm">
              {project.description && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Description</div>
                  <p className="text-foreground">{project.description}</p>
                </div>
              )}
              {project.plantCapacityTph !== null && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plant Capacity</div>
                  <p className="text-foreground font-mono flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-primary" /> {project.plantCapacityTph} t/h
                  </p>
                </div>
              )}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Feedstock</div>
                <p className="text-foreground">{feedstock.name}</p>
              </div>
              {project.country && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Country</div>
                  <p className="text-foreground">{project.country}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Pyrolysis Parameters</h3>
            <button
              onClick={handleFindOptimum}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1 rounded text-xs font-medium flex items-center gap-1 border border-border"
              title="Run grid search across T°/time to maximize the selected goal"
            >
              <Sparkles className="w-3 h-3 text-primary" /> Find optimum
            </button>
          </div>

          {/* Quality goal selector */}
          <div className="mb-5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Target className="w-3 h-3" /> Optimization Goal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "MAX_CARBON", label: "Max Carbon", hint: "Maximize CO₂e credits × yield" },
                { id: "BALANCED", label: "Balanced", hint: "Carbon + surface area" },
                { id: "AGRONOMY", label: "Agronomy", hint: "BET + pH + H:Corg" },
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Temperature
                </label>
                <span className="text-primary font-mono font-bold">{T} °C</span>
              </div>
              <input
                type="range" min="400" max="750" step="5" value={T}
                onChange={(e) => setT(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>400</span><span>750</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Residence Time
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
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Carbon</div>
            <div className="text-2xl font-mono font-bold text-primary my-1">{result.C.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">% dry mass</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">H:Corg Ratio</div>
            <div className="text-2xl font-mono font-bold my-1">{result.H_Corg.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">
              {result.H_Corg < 0.4 ? "BC-1" : result.H_Corg < 0.7 ? "BC-2" : "FAIL"}
            </div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Net CO₂e</div>
            <div className="text-2xl font-mono font-bold my-1">{result.credits.net.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">t/t biochar</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-cyan-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Yield</div>
            <div className="text-2xl font-mono font-bold text-cyan-500 my-1">{result.yield_.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">% dry mass</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-purple-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">BET Surface</div>
            <div className="text-2xl font-mono font-bold text-purple-500 my-1">{Math.round(result.BET)}</div>
            <div className="text-[10px] text-muted-foreground">m²/g (est.)</div>
          </div>
          <div className="bg-card border border-border border-l-2 border-l-yellow-500 rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">pH</div>
            <div className="text-2xl font-mono font-bold text-yellow-500 my-1">{result.pH.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">{result.pH > 7.5 ? "alkaline" : "neutral"}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
