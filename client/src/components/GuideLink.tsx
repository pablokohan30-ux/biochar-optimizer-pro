/**
 * GuideLink — small contextual link that points to a specific anchor in /guide.
 *
 * Used throughout the product to help users find the explanation of whatever
 * they're looking at right now. Example: next to the BiocharPro Score,
 * `<GuideLink anchor="resultados-score" label="¿Qué significa este score?" />`
 * opens `/guide#resultados-score` in a new tab.
 *
 * Two visual variants:
 * - "button"  (default): small pill-style button with book icon + label text
 * - "icon":   just the book icon (for tight layouts), with tooltip via title attr
 */

import { GraduationCap, ExternalLink } from "lucide-react";

// The union of all valid anchor IDs inside /guide. Keeping it narrow means
// TypeScript catches typos and reminds us to add a new guide section when we
// introduce a new link somewhere in the app.
export type GuideAnchor =
  | "como-intro" | "como-simular" | "como-lab" | "como-proyectos"
  | "como-ai-builder" | "como-lca" | "como-submission" | "como-pdd" | "como-operativo"
  | "porque-intro" | "porque-biochar" | "porque-metodologias"
  | "porque-modelo" | "porque-hc" | "porque-addic-base-perm"
  | "resultados-intro" | "resultados-simulador" | "resultados-lca"
  | "resultados-score" | "resultados-metodologia" | "resultados-journey";

interface GuideLinkProps {
  /** Anchor id inside /guide. */
  anchor: GuideAnchor;
  /** Label shown on the button (ignored when variant="icon"). */
  label?: string;
  /** Tight icon-only mode for tables, headers, anywhere horizontal space is scarce. */
  variant?: "button" | "icon";
  /** Tailwind utility overrides when the defaults don't fit a context. */
  className?: string;
}

export default function GuideLink({
  anchor,
  label = "Leer la guía",
  variant = "button",
  className = "",
}: GuideLinkProps) {
  const href = `/guide#${anchor}`;

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
        aria-label={label}
      >
        <GraduationCap className="w-3.5 h-3.5" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline whitespace-nowrap ${className}`}
    >
      <GraduationCap className="w-3 h-3" />
      {label}
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}
