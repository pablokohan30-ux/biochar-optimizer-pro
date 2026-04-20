import { useLocation, Link } from "wouter";
import { FolderOpen, MapPin, Plus, Thermometer, Leaf, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import SiteFooter from "@/components/SiteFooter";
import PageLoader from "@/components/PageLoader";
import AppLayout from "@/components/AppLayout";

export default function Projects() {
  const { t } = useTranslation("projects");
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const utils = trpc.useUtils();

  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    enabled: !!user && hasAccess("analyst"),
    retry: false,
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
    },
  });

  const handleDelete = (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault(); // prevent the parent Link from navigating
    e.stopPropagation();
    if (confirm(t("deleteConfirm", { name, defaultValue: `¿Borrar el proyecto "${name}"? Esto no se puede deshacer.` }))) {
      deleteMutation.mutate({ id });
    }
  };

  // Auth guard
  if (authLoading || tierLoading) {
    return <PageLoader />;
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
            <h1 className="text-2xl font-bold">{t("gate.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("gate.description")}
            </p>
            <Link href="/pricing">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium">
                {t("gate.viewPlans")}
              </button>
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const projects = projectsQuery.data ?? [];

  const pageActions = (
    <Link href="/app">
      <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("header.newProject")}</span>
      </button>
    </Link>
  );

  return (
    <AppLayout
      pageTitle={<span className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary" /> {t("list.title")}</span>}
      pageActions={pageActions}
    >
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          {t("list.description")}
        </p>
      </div>

        {projectsQuery.isLoading ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">{t("list.loading")}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("list.empty.title")}</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              {t("list.empty.description")}
            </p>
            <Link href="/app">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> {t("list.empty.cta")}
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer h-full relative group">
                  {/* Delete button — only shows on hover, positioned top-right */}
                  <button
                    onClick={(e) => handleDelete(p.id, p.name, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all opacity-0 group-hover:opacity-100"
                    title={t("delete", { defaultValue: "Borrar proyecto" })}
                    aria-label={t("delete", { defaultValue: "Delete project" })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start justify-between mb-3 pr-8">
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
                        <span>{t("list.card.capacity", { value: p.plantCapacityTph })}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                    {t("list.card.updated", { date: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—" })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      <div className="mt-8">
        <SiteFooter />
      </div>
    </AppLayout>
  );
}
