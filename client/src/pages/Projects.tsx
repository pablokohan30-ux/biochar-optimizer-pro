import { useLocation, Link } from "wouter";
import { FolderOpen, MapPin, Plus, Thermometer, Leaf } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";

export default function Projects() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { tier, hasAccess, isLoading: tierLoading } = useTier();

  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    enabled: !!user && hasAccess("analyst"),
    retry: false,
  });

  // Auth guard
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
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Project Management</h1>
            <p className="text-muted-foreground text-sm">
              Save your simulations as projects, attach geographic data, and build toward a Puro.earth application.
              Available on the Analyst plan and above.
            </p>
            <Link href="/pricing">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium">
                View plans
              </button>
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const projects = projectsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto flex justify-between items-center">
          <LogoLink iconType="activity" subtitle="Projects" />
          <div className="flex items-center gap-3">
            <Link href="/app">
              <button className="text-xs text-muted-foreground hover:text-foreground">Simulator</button>
            </Link>
            <Link href="/app">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> New Project
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Your Projects</h2>
          <p className="text-sm text-muted-foreground">
            Manage biochar projects with location data, feedstock parameters, and production targets.
          </p>
        </div>

        {projectsQuery.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Run a simulation and save it as a project to track multiple plants, compare scenarios, and build
              assessment reports.
            </p>
            <Link href="/app">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create first project
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {p.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{p.location}</span>
                      </div>
                    )}
                    {p.temperature !== null && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-3 h-3" />
                        <span>{p.temperature}°C / {p.residenceTime} min</span>
                      </div>
                    )}
                    {p.plantCapacityTph !== null && (
                      <div className="flex items-center gap-1.5">
                        <Leaf className="w-3 h-3" />
                        <span>{p.plantCapacityTph} t/h capacity</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                    Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
