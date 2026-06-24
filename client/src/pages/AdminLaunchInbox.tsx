import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Building2, Clock3, Inbox, Mail, MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function formatTimestamp(value: Date | number | string | null | undefined) {
  if (value == null) return "—";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return "—";
  const normalized = parsed < 1e12 ? parsed * 1000 : parsed;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(normalized));
}

export default function AdminLaunchInbox() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const inboxQuery = trpc.launch.adminListInquiries.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000,
  });
  const updateStatusMutation = trpc.launch.updateInquiryStatus.useMutation({
    onSuccess: () => {
      utils.launch.adminListInquiries.invalidate();
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return null;
  }
  if (user?.role !== "admin") {
    return (
      <AppLayout pageTitle="Inbox de leads">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
            <div className="text-sm font-medium text-red-900">Solo admin</div>
            <div className="text-xs text-red-700 mt-1">Esta vista requiere rol administrador.</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!inboxQuery.data) {
    return <PageLoader />;
  }

  const { items, total, newCount } = inboxQuery.data;
  const lastInquiryAt = items[0]?.createdAt ? formatTimestamp(items[0].createdAt) : "—";
  const lastSyncedAt = inboxQuery.dataUpdatedAt
    ? formatTimestamp(inboxQuery.dataUpdatedAt)
    : "—";

  return (
    <AppLayout pageTitle="Inbox de leads">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Inbox className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-semibold text-foreground">Consultas de pricing y lanzamiento</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Leads enviados desde la página pública de pricing. Se actualiza cada 30 segundos.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Última sincronización: {lastSyncedAt}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi
            icon={<Inbox className="w-4 h-4" />}
            label="Consultas guardadas"
            value={total.toLocaleString()}
            hint={`${items.length.toLocaleString()} visibles en esta vista`}
          />
          <Kpi
            icon={<Clock3 className="w-4 h-4" />}
            label="Nuevas"
            value={newCount.toLocaleString()}
            hint="Pendientes de primer contacto"
          />
          <Kpi
            icon={<Mail className="w-4 h-4" />}
            label="Última consulta recibida"
            value={lastInquiryAt}
            hint={items[0] ? `Lead más reciente: ${items[0].company}` : "Sin registros todavía"}
          />
        </div>

        <section>
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Recibido</th>
                  <th className="text-left px-3 py-2 font-medium">Contacto</th>
                  <th className="text-left px-3 py-2 font-medium">Empresa</th>
                  <th className="text-left px-3 py-2 font-medium">Origen</th>
                  <th className="text-left px-3 py-2 font-medium">Mensaje</th>
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                  <th className="text-left px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Todavía no hay consultas guardadas.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/40 align-top">
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {formatTimestamp(item.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <a href={`mailto:${item.email}`} className="text-primary hover:underline break-all">
                          {item.email}
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2 text-foreground">
                          <Building2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{item.company}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full border text-[11px] font-medium ${
                          item.source === "early_access"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {item.source === "early_access" ? "Early access" : "Pricing"}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-xl">
                        <div className="flex items-start gap-2 text-foreground">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <p className="whitespace-pre-wrap break-words">{item.message}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full border text-[11px] font-medium ${
                          item.status === "new"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : item.status === "reviewed"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {item.status === "new" ? "Nuevo" : item.status === "reviewed" ? "Revisado" : "Cerrado"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.status !== "new" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "new" })}
                            >
                              Marcar nuevo
                            </Button>
                          )}
                          {item.status !== "reviewed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "reviewed" })}
                            >
                              Marcar revisado
                            </Button>
                          )}
                          {item.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "closed" })}
                            >
                              Cerrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
