/**
 * Admin dashboard — AI Project Builder stats.
 *
 * Route: /admin/ai-stats (admin-only).
 *
 * Shows total projects generated, LLM token consumption, estimated cost,
 * per-user breakdown, and recent activity. Used to monitor adoption and
 * keep an eye on LLM bill before it surprises us.
 *
 * Requires `role = 'admin'` on the user — enforced server-side via
 * adminProcedure.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, Users, Coins, Activity, ThumbsUp, ThumbsDown, Zap, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function normalizeEpoch(value: number | string | null | undefined) {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed < 1e12 ? parsed * 1000 : parsed;
}

function formatTimestamp(value: number | string | null | undefined) {
  const normalized = normalizeEpoch(value);
  if (!normalized) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(normalized));
}

function formatProjectStatus(status: string) {
  if (status === "complete") return "Completo";
  if (status === "generating") return "Generando";
  if (status === "error") return "Error";
  return status;
}

export default function AdminAiStats() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const statsQuery = trpc.aiBuilder.adminStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000, // refresh every 30s
  });

  const otherAiQuery = trpc.aiBuilder.adminOtherAiStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000,
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
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
            <div className="text-sm font-medium text-red-900">Solo admin</div>
            <div className="text-xs text-red-700 mt-1">Esta vista requiere rol administrador.</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const s = statsQuery.data;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-semibold text-foreground">AI Builder: métricas de administración</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Consumo, actividad y costo estimado en tiempo real. Se actualiza cada 30 segundos.
          </p>
        </div>

        {!s ? (
          <PageLoader />
        ) : (
          <>
            {/* Top-line KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={<Activity className="w-4 h-4" />} label="Proyectos" value={s.totalProjects.toLocaleString()} hint={`${(s.byStatus as Record<string, number>).complete ?? 0} completos · ${(s.byStatus as Record<string, number>).generating ?? 0} generando · ${(s.byStatus as Record<string, number>).error ?? 0} con error`} />
              <Kpi icon={<Sparkles className="w-4 h-4" />} label="Tokens totales" value={s.tokens.total.toLocaleString()} hint={`${s.tokens.prompt.toLocaleString()} entrada · ${s.tokens.completion.toLocaleString()} salida`} />
              <Kpi icon={<Coins className="w-4 h-4" />} label="Costo LLM estimado" value={`USD ${s.costUsd.toFixed(2)}`} hint={s.totalProjects > 0 ? `USD ${(s.costUsd / s.totalProjects).toFixed(3)} por proyecto` : "—"} />
              <Kpi icon={<Users className="w-4 h-4" />} label="Usuarios activos" value={s.byUser.length.toString()} hint={`principal: ${s.byUser[0]?.email ?? "—"}`} />
            </div>

            {/* Per-user breakdown */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Por usuario (top 20)</h2>
              <div className="border border-border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Email</th>
                      <th className="text-right px-3 py-2 font-medium">Proyectos</th>
                      <th className="text-right px-3 py-2 font-medium">Tokens entrada</th>
                      <th className="text-right px-3 py-2 font-medium">Tokens salida</th>
                      <th className="text-right px-3 py-2 font-medium">Costo USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {s.byUser.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Todavía no hay actividad.</td></tr>
                    ) : (
                      s.byUser.map((u) => (
                        <tr key={u.userId} className="hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium text-foreground">{u.email}</td>
                          <td className="px-3 py-2 text-right">{u.projectCount}</td>
                          <td className="px-3 py-2 text-right">{u.promptTokens.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{u.completionTokens.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{u.costUsd.toFixed(4)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent projects */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Proyectos recientes</h2>
              <div className="border border-border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Creado</th>
                      <th className="text-left px-3 py-2 font-medium">Nombre</th>
                      <th className="text-left px-3 py-2 font-medium">País</th>
                      <th className="text-right px-3 py-2 font-medium">Capacidad (tn/año)</th>
                      <th className="text-left px-3 py-2 font-medium">Estado</th>
                      <th className="text-right px-3 py-2 font-medium">Tokens</th>
                      <th className="text-right px-3 py-2 font-medium">Costo</th>
                      <th className="text-center px-3 py-2 font-medium">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {s.recentProjects.length === 0 ? (
                      <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No hay proyectos recientes.</td></tr>
                    ) : (
                      s.recentProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/40">
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatTimestamp(p.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                          <td className="px-3 py-2">{p.country}</td>
                          <td className="px-3 py-2 text-right">{p.capacityTnYear.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${p.status === "complete" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : p.status === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>{formatProjectStatus(p.status)}</span>
                          </td>
                          <td className="px-3 py-2 text-right">{p.tokens.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">USD {p.costUsd.toFixed(4)}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">#{p.userId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Per-doc feedback */}
            {s.perDocFeedback && s.perDocFeedback.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">Feedback por documento</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Ordenado por porcentaje de votos negativos. Un down-rate alto indica que ese prompt necesita otra iteración.
                </p>
                <div className="border border-border rounded-lg overflow-x-auto bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Documento</th>
                        <th className="text-right px-3 py-2 font-medium">Votos</th>
                        <th className="text-right px-3 py-2 font-medium">👍</th>
                        <th className="text-right px-3 py-2 font-medium">👎</th>
                        <th className="text-right px-3 py-2 font-medium">% negativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {s.perDocFeedback.map((d) => (
                        <tr key={d.docId} className="hover:bg-muted/40">
                          <td className="px-3 py-2 font-mono text-foreground/90">{d.docId}</td>
                          <td className="px-3 py-2 text-right">{d.total}</td>
                          <td className="px-3 py-2 text-right text-emerald-700"><ThumbsUp className="w-3 h-3 inline mr-1" />{d.up}</td>
                          <td className="px-3 py-2 text-right text-red-700"><ThumbsDown className="w-3 h-3 inline mr-1" />{d.down}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`px-1.5 py-0.5 rounded ${d.downRate > 0.3 ? "bg-red-100 text-red-800" : d.downRate > 0.1 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {(d.downRate * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Other AI calls (buyer readiness, community report, audit package, buyer match) */}
            {otherAiQuery.data && (
              <section className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-foreground">Otras llamadas AI (módulos etapa 3 y 4)</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Sigue el uso de LLM fuera del AI Builder: Reporte de Impacto Comunitario, Buyer Readiness, Buyer Match y resumen ejecutivo del Audit Package.
                </p>

                {/* Top-line KPIs for other AI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <Kpi icon={<Activity className="w-4 h-4" />} label="Llamadas" value={otherAiQuery.data.totalCalls.toLocaleString()} hint="Invocaciones AI en etapa 3 y 4" />
                  <Kpi icon={<Sparkles className="w-4 h-4" />} label="Tokens" value={otherAiQuery.data.tokens.total.toLocaleString()} hint={`${otherAiQuery.data.tokens.prompt.toLocaleString()} entrada · ${otherAiQuery.data.tokens.completion.toLocaleString()} salida`} />
                  <Kpi icon={<Coins className="w-4 h-4" />} label="Costo LLM" value={`USD ${otherAiQuery.data.costUsd.toFixed(4)}`} hint={otherAiQuery.data.totalCalls > 0 ? `USD ${(otherAiQuery.data.costUsd / otherAiQuery.data.totalCalls).toFixed(5)} por llamada` : "—"} />
                  <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Errores" value={otherAiQuery.data.byFeature.reduce((s, f) => s + f.errors, 0).toString()} hint="Llamadas AI fallidas" />
                </div>

                {/* By feature */}
                <h3 className="text-sm font-semibold text-foreground mb-2">Por feature</h3>
                <div className="border border-border rounded-lg overflow-x-auto bg-card mb-5">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Feature</th>
                        <th className="text-right px-3 py-2 font-medium">Llamadas</th>
                        <th className="text-right px-3 py-2 font-medium">Errores</th>
                        <th className="text-right px-3 py-2 font-medium">Tokens entrada</th>
                        <th className="text-right px-3 py-2 font-medium">Tokens salida</th>
                        <th className="text-right px-3 py-2 font-medium">Cost USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {otherAiQuery.data.byFeature.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Todavía no hay actividad AI en etapa 3 y 4.</td></tr>
                      ) : (
                        otherAiQuery.data.byFeature.map((f) => (
                          <tr key={f.feature} className="hover:bg-muted/40">
                            <td className="px-3 py-2 font-mono text-foreground/90">{f.feature}</td>
                            <td className="px-3 py-2 text-right">{f.calls}</td>
                            <td className="px-3 py-2 text-right">{f.errors > 0 ? <span className="text-red-700 font-semibold">{f.errors}</span> : f.errors}</td>
                            <td className="px-3 py-2 text-right">{f.promptTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{f.completionTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{f.costUsd.toFixed(5)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* By user */}
                <h3 className="text-sm font-semibold text-foreground mb-2">Por usuario (top 20)</h3>
                <div className="border border-border rounded-lg overflow-x-auto bg-card mb-5">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-right px-3 py-2 font-medium">Llamadas</th>
                        <th className="text-right px-3 py-2 font-medium">Tokens entrada</th>
                        <th className="text-right px-3 py-2 font-medium">Tokens salida</th>
                        <th className="text-right px-3 py-2 font-medium">Cost USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {otherAiQuery.data.byUser.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Todavía no hay actividad.</td></tr>
                      ) : (
                        otherAiQuery.data.byUser.map((u) => (
                          <tr key={u.userId ?? "anon"} className="hover:bg-muted/40">
                            <td className="px-3 py-2 font-medium text-foreground">{u.email}</td>
                            <td className="px-3 py-2 text-right">{u.calls}</td>
                            <td className="px-3 py-2 text-right">{u.promptTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{u.completionTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{u.costUsd.toFixed(5)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recent calls */}
                <h3 className="text-sm font-semibold text-foreground mb-2">Llamadas recientes (últimas 30)</h3>
                <div className="border border-border rounded-lg overflow-x-auto bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2 font-medium">Feature</th>
                        <th className="text-left px-3 py-2 font-medium">Usuario</th>
                        <th className="text-right px-3 py-2 font-medium">Tokens</th>
                        <th className="text-right px-3 py-2 font-medium">Cost USD</th>
                        <th className="text-left px-3 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {otherAiQuery.data.recent.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No hay llamadas recientes.</td></tr>
                      ) : (
                        otherAiQuery.data.recent.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatTimestamp(r.createdAt)}</td>
                            <td className="px-3 py-2 font-mono text-foreground/90">{r.feature}</td>
                            <td className="px-3 py-2 text-foreground/90">{r.email}</td>
                            <td className="px-3 py-2 text-right">{r.tokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{r.costUsd.toFixed(5)}</td>
                            <td className="px-3 py-2">
                              {r.status === "ok" ? (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">ok</span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-red-50 text-red-700 border border-red-200" title={r.errorMsg ?? ""}>error</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Note */}
            <div className="text-xs text-muted-foreground italic">
              Estimación basada en precios de Gemini 2.5 Flash: USD 0.075 por millón de tokens de entrada y USD 0.30 por millón de tokens de salida.
              No incluye overhead de infraestructura.
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
