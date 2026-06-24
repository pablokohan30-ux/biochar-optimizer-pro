/**
 * /guide — User guide for biocharpro.io.
 *
 * A single long page with a sticky table-of-contents on the left.
 * Three sections: THE HOW (operate the product) · THE WHY (fundamentals) ·
 * THE RESULTS (how to read outputs).
 *
 * Bilingual content lives in a dedicated module: `@/content/guideContent`.
 * That module exports `GUIDE_CONTENT: { es, en }` and a `pickLang()` helper.
 * The page picks the locale tree from i18n and renders it — no per-string
 * i18next keys, because ~5000 words of editorial copy is unmaintainable in a
 * flat namespace. To add/edit copy, update the content module only.
 *
 * Public (no login gate) — acts as both product docs and SEO content.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, Wrench, Brain, BarChart3, FlaskConical,
  GraduationCap, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import {
  GUIDE_CONTENT, pickLang,
  type SectionId, type GuideContent, type GuideTocGroup,
} from "@/content/guideContent";

// ─── Custom hook: track active TOC item via IntersectionObserver ────────────

function useActiveSection(ids: SectionId[]): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(ids[0] ?? null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.5, 1] }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

// ─── Section wrapper (presentational — copy comes from content module) ──────

function Section({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      {eyebrow && (
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">{eyebrow}</div>
      )}
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-5 leading-tight">{title}</h2>
      <div className="prose-like space-y-4 text-sm md:text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

// ─── Page component ─────────────────────────────────────────────────────────

// Order the sections render in, by group. Must match the union `SectionId`.
const RENDER_ORDER: { groupIdx: number; ids: SectionId[] }[] = [
  {
    groupIdx: 0,
    ids: ["como-intro", "como-simular", "como-lab", "como-proyectos", "como-ai-builder", "como-lca", "como-submission", "como-pdd", "como-operativo"],
  },
  {
    groupIdx: 1,
    ids: ["porque-intro", "porque-biochar", "porque-metodologias", "porque-modelo", "porque-hc", "porque-addic-base-perm"],
  },
  {
    groupIdx: 2,
    ids: ["resultados-intro", "resultados-simulador", "resultados-lca", "resultados-score", "resultados-metodologia", "resultados-journey"],
  },
];

const GROUP_ICONS = [Wrench, Brain, BarChart3] as const;
const GROUP_ACCENTS = [
  { bg: "bg-primary/10",     border: "border-primary/30",     text: "text-primary" },
  { bg: "bg-green-500/10",   border: "border-green-500/30",   text: "text-green-500" },
  { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-500" },
] as const;

export default function Guide() {
  const { i18n } = useTranslation();
  const lang = pickLang(i18n.language);
  const content: GuideContent = GUIDE_CONTENT[lang];
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const allIds = content.toc.flatMap((g) => g.items.map((i) => i.id));
  const active = useActiveSection(allIds);
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/pricing" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">{content.nav.pricing}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="whitespace-nowrap">{content.nav.tryFree}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* BACK */}
      <div className="max-w-7xl mx-auto px-4 pt-4 w-full">
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {content.nav.back}
          </button>
        </Link>
      </div>

      {/* HERO */}
      <header className="max-w-4xl mx-auto px-4 pt-8 pb-6 w-full">
        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
          <GraduationCap className="w-3 h-3" /> {content.hero.badge}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          {content.hero.title}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          {content.hero.subtitle}
        </p>
      </header>

      {/* MAIN: sticky TOC + content */}
      <main className="max-w-7xl mx-auto px-4 w-full flex-1 flex gap-8 lg:gap-12 pb-16">
        {/* Sticky TOC (desktop only) */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-3">
            {content.nav.contentLabel}
          </div>
          <div className="space-y-5">
            {content.toc.map((group: GuideTocGroup, gIdx: number) => {
              const GroupIcon = GROUP_ICONS[gIdx] ?? Wrench;
              return (
                <div key={group.group}>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                    <GroupIcon className="w-3.5 h-3.5 text-primary" />
                    {group.group}
                  </div>
                  <ul className="space-y-0.5 ml-5">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block text-[11px] py-1 px-2 rounded transition-colors ${
                            active === item.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div ref={contentRef} className="flex-1 min-w-0 max-w-3xl">
          <div className="lg:hidden mb-8">
            <button
              type="button"
              onClick={() => setMobileTocOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {content.nav.contentLabel}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {active
                    ? content.toc.flatMap((group) => group.items).find((item) => item.id === active)?.label ?? content.nav.contentLabel
                    : content.nav.contentLabel}
                </div>
              </div>
              {mobileTocOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {mobileTocOpen && (
              <div className="mt-3 rounded-xl border border-border bg-card p-3 space-y-4">
                {content.toc.map((group, gIdx) => {
                  const GroupIcon = GROUP_ICONS[gIdx] ?? Wrench;
                  return (
                    <div key={group.group}>
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-2">
                        <GroupIcon className="w-3.5 h-3.5 text-primary" />
                        {group.group}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={() => setMobileTocOpen(false)}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                              active === item.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {RENDER_ORDER.map(({ groupIdx, ids }) => {
            const part = [content.parts.como, content.parts.porque, content.parts.resultados][groupIdx];
            const GroupIcon = GROUP_ICONS[groupIdx];
            const accent = GROUP_ACCENTS[groupIdx];
            return (
              <div key={groupIdx}>
                <div className={`mb-6 ${groupIdx === 0 ? "mt-4" : "mt-12"} pb-3 border-b border-border flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl ${accent.bg} border ${accent.border} ${accent.text} flex items-center justify-center`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${accent.text}`}>{part.eyebrow}</div>
                    <h2 className="text-2xl font-bold">{part.title}</h2>
                  </div>
                </div>
                {ids.map((id) => {
                  const s = content.sections[id];
                  return (
                    <Section key={id} id={id} eyebrow={s.eyebrow} title={s.title}>
                      {s.body}
                    </Section>
                  );
                })}
              </div>
            );
          })}

          {/* CTA final */}
          <div className="mt-16 pt-12 border-t border-border">
            <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-2xl p-6 md:p-8 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">{content.cta.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-5 leading-relaxed">
                {content.cta.subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/app">
                  <Button size="lg" className="gap-2">
                    <FlaskConical className="w-4 h-4" /> {content.cta.primary}
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="gap-2">
                    {content.cta.secondary} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
