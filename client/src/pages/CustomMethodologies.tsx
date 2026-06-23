/**
 * Custom LCA Methodologies — Expert tier feature.
 *
 * Route: /methodologies
 *
 * Lets users define their own methodology (name + description + criteria).
 * Each criterion has an ID, label, requirement description, and optional
 * threshold note. When the user picks a custom methodology in the AI Builder,
 * the generator emits an extra "Custom Methodology Compliance" doc evaluating
 * the project against those criteria.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Plus, Trash2, Save, Edit3, Check, X, Lock, Scale, ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

type Criterion = {
  id: string;
  label: string;
  description: string;
  thresholdNote?: string;
};

type BasedOn = "puro-earth" | "isometric" | "ebc" | "verra-vm0044" | "gold-standard" | "rainbow-standard" | null;

const BASED_ON_OPTIONS: Array<{ value: BasedOn; label: string }> = [
  { value: null, label: "Standalone (not based on a public methodology)" },
  { value: "puro-earth", label: "Puro.earth" },
  { value: "isometric", label: "Isometric" },
  { value: "ebc", label: "EBC" },
  { value: "verra-vm0044", label: "Verra VM0044" },
  { value: "gold-standard", label: "Gold Standard" },
  { value: "rainbow-standard", label: "Rainbow Standard" },
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export default function CustomMethodologies() {
  const { t } = useTranslation("common");
  const tm = (k: string, fallback: string) => t(`customMethodology.${k}`, { defaultValue: fallback });
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");

  const listQuery = trpc.customMethodology.list.useQuery(undefined, {
    enabled: isAuthenticated && !tierLoading && hasExpert,
  });

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editor state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basedOn, setBasedOn] = useState<BasedOn>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  const createMutation = trpc.customMethodology.create.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setEditingId(null);
      resetEditor();
    },
    onError: (e) => setErrorMessage(e.message),
  });
  const updateMutation = trpc.customMethodology.update.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setEditingId(null);
      resetEditor();
    },
    onError: (e) => setErrorMessage(e.message),
  });
  const deleteMutation = trpc.customMethodology.delete.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const existing = useMemo(() => {
    if (editingId === null || editingId === "new" || !listQuery.data) return null;
    return listQuery.data.find((m) => m.id === editingId) ?? null;
  }, [editingId, listQuery.data]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setBasedOn((existing.basedOn as BasedOn) ?? null);
      setCriteria(Array.isArray(existing.criteria) ? (existing.criteria as Criterion[]) : []);
    }
  }, [existing]);

  function resetEditor() {
    setName("");
    setDescription("");
    setBasedOn(null);
    setCriteria([]);
    setErrorMessage(null);
  }

  function openNew() {
    resetEditor();
    setEditingId("new");
    setCriteria([
      { id: "c1", label: "", description: "" },
    ]);
  }

  function handleAddCriterion() {
    const nextIdx = criteria.length + 1;
    setCriteria([...criteria, { id: `c${nextIdx}`, label: "", description: "" }]);
  }
  function handleRemoveCriterion(idx: number) {
    setCriteria(criteria.filter((_, i) => i !== idx));
  }
  function handleUpdateCriterion(idx: number, patch: Partial<Criterion>) {
    setCriteria(criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function handleSave() {
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage(tm("errNameRequired", "Methodology name is required."));
      return;
    }
    if (criteria.length < 1) {
      setErrorMessage(tm("errMinCriteria", "Add at least 1 criterion."));
      return;
    }
    // Normalize criterion ids: fill blanks with slug(label) or c{n}
    const cleaned: Criterion[] = criteria.map((c, i) => ({
      id: c.id?.trim() || slug(c.label) || `c${i + 1}`,
      label: c.label.trim(),
      description: c.description.trim(),
      thresholdNote: c.thresholdNote?.trim() || undefined,
    }));
    for (const c of cleaned) {
      if (!c.label) {
        setErrorMessage(tm("errCriterionLabel", "Every criterion needs a label."));
        return;
      }
      if (!c.description) {
        setErrorMessage(tm("errCriterionDesc", "Every criterion needs a requirement description."));
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      basedOn: basedOn ?? null,
      criteria: cleaned,
    };

    if (editingId === "new") {
      createMutation.mutate(payload);
    } else if (typeof editingId === "number") {
      updateMutation.mutate({ id: editingId, ...payload });
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return null;
  }

  if (!hasExpert) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{tm("title", "Custom LCA Methodologies")}</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              {tm("marketingDesc", "Define your own methodology — name it, list its criteria, and the AI Builder will evaluate each project against it. Useful when your internal compliance framework differs from the public standards.")}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-900 mb-1">{tm("expertRequired", "Expert tier required")}</div>
              <p className="text-sm text-amber-800 mb-3">
                {tm("expertRequiredDesc", "Custom LCA methodologies are an Expert tier feature.")}
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white text-sm font-medium rounded-lg hover:bg-amber-950"
              >
                {tm("seeExpertPlan", "See Expert plan")}
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isEditing = editingId !== null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{tm("title", "Custom LCA Methodologies")}</h1>
                <p className="text-sm text-muted-foreground">{tm("subtitle", "Define your own criteria — the AI Builder evaluates every project against them.")}</p>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> {tm("new", "New methodology")}
            </button>
          )}
        </div>

        {/* List view */}
        {!isEditing && (
          <>
            {listQuery.isLoading ? (
              <PageLoader />
            ) : !listQuery.data || listQuery.data.length === 0 ? (
              <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">{tm("emptyTitle", "No custom methodologies yet.")}</p>
                <button
                  onClick={openNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> {tm("emptyCreate", "Create your first one")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {listQuery.data.map((m) => (
                  <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground">{m.name}</h3>
                        {m.basedOn && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Based on {m.basedOn}
                          </span>
                        )}
                      </div>
                      {m.description && <p className="text-sm text-muted-foreground mb-2">{m.description}</p>}
                      <div className="text-xs text-muted-foreground">
                        {Array.isArray(m.criteria) ? (m.criteria as Criterion[]).length : 0} criteria ·
                        Updated {new Date(m.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingId(m.id)}
                        className="p-2 text-muted-foreground/70 hover:text-indigo-600 rounded"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${m.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate({ id: m.id });
                          }
                        }}
                        className="p-2 text-muted-foreground/70 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
              {tm("aiBuilderHint", "To use a custom methodology in an AI-generated project: go to AI Builder → New project, and select it from the \"Primary methodology\" dropdown (your custom methodologies appear at the top).")}
            </div>
          </>
        )}

        {/* Editor */}
        {isEditing && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => { setEditingId(null); resetEditor(); }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" /> {tm("back", "Back to list")}
              </button>
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              {editingId === "new" ? tm("newTitle", "New methodology") : tm("editTitle", "Edit methodology")}
            </h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tm("fieldName", "Methodology name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tm("fieldNamePlaceholder", "e.g. My Corporate CDR Framework v1")}
                maxLength={200}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tm("fieldDescription", "Description")} <span className="text-muted-foreground/70 font-normal">{tm("optional", "(optional)")}</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tm("fieldDescriptionPlaceholder", "What's the purpose of this methodology? Who's the audience?")}
                maxLength={1000}
                rows={2}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
              />
            </div>

            {/* Based on */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tm("fieldBasedOn", "Based on")} <span className="text-muted-foreground/70 font-normal">{tm("optional", "(optional)")}</span></label>
              <select
                value={basedOn ?? ""}
                onChange={(e) => setBasedOn((e.target.value || null) as BasedOn)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                {BASED_ON_OPTIONS.map((o) => (
                  <option key={o.value ?? "none"} value={o.value ?? ""}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{tm("fieldBasedOnHint", "If your methodology extends a public one, select it — the AI will cross-reference where relevant.")}</p>
            </div>

            {/* Criteria */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground/90">{tm("fieldCriteria", "Criteria")} <span className="text-muted-foreground/70 font-normal">({criteria.length})</span></label>
                <button
                  onClick={handleAddCriterion}
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground/90 text-xs font-medium rounded hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" /> {tm("addCriterion", "Add criterion")}
                </button>
              </div>
              <div className="space-y-3">
                {criteria.map((c, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-muted/40/50 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-muted-foreground mb-0.5">Label</label>
                        <input
                          type="text"
                          value={c.label}
                          onChange={(e) => handleUpdateCriterion(i, { label: e.target.value })}
                          placeholder="e.g. H/Corg ratio < 0.5"
                          maxLength={200}
                          className="w-full border border-input rounded px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-muted-foreground mb-0.5">ID</label>
                        <input
                          type="text"
                          value={c.id}
                          onChange={(e) => handleUpdateCriterion(i, { id: e.target.value })}
                          placeholder="auto"
                          maxLength={100}
                          className="w-full border border-input rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveCriterion(i)}
                        className="p-2 text-muted-foreground/70 hover:text-red-600 rounded mt-5"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">Requirement description</label>
                      <textarea
                        value={c.description}
                        onChange={(e) => handleUpdateCriterion(i, { description: e.target.value })}
                        placeholder="What does the project need to do to meet this criterion?"
                        maxLength={500}
                        rows={2}
                        className="w-full border border-input rounded px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">Threshold note <span className="text-muted-foreground/70 font-normal">(optional)</span></label>
                      <input
                        type="text"
                        value={c.thresholdNote ?? ""}
                        onChange={(e) => handleUpdateCriterion(i, { thresholdNote: e.target.value })}
                        placeholder="e.g. Target: <0.4 for 1000-yr permanence tier"
                        maxLength={300}
                        className="w-full border border-input rounded px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending || updateMutation.isPending ? tm("saving", "Saving...") : tm("save", "Save methodology")}
              </button>
              <button
                onClick={() => { setEditingId(null); resetEditor(); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-input text-foreground/90 text-sm font-medium rounded-lg hover:bg-muted/40"
              >
                <X className="w-4 h-4" /> {tm("cancel", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
