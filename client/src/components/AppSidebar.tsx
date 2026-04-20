/**
 * AppSidebar — persistent left navigation for the authenticated app area.
 *
 * Design:
 * - Desktop: fixed left rail, toggleable between collapsed (icon-only) and
 *   expanded modes. Width is 60px collapsed, 224px expanded.
 * - Mobile: slides in as a drawer from the left, overlay behind it.
 * - Tier-gated items show a subtle lock icon when the user doesn't have access,
 *   and clicking them jumps to /pricing instead of the destination.
 *
 * State:
 * - `collapsed` is persisted in localStorage under `sidebar_collapsed` so the
 *   user's preference survives reloads.
 * - `open` (mobile drawer) is controlled by the parent via props.
 */

import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Activity, FolderOpen, Layers, Code2, LogOut, ChevronLeft, ChevronRight,
  X, Lock, Leaf, Globe
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";

interface AppSidebarProps {
  /** Desktop: persisted collapsed (icon-only) state. */
  collapsed: boolean;
  /** Desktop: toggle collapsed/expanded. */
  onToggleCollapsed: () => void;
  /** Mobile: whether the drawer is open. */
  mobileOpen: boolean;
  /** Mobile: close the drawer (clicking backdrop, link, or X). */
  onMobileClose: () => void;
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Required tier to access — undefined means any authenticated user. */
  requiredTier?: "analyst" | "developer" | "engineer" | "expert";
  /** If true, this link is highlighted even on sub-paths (e.g. /projects/123 lights up /projects). */
  matchPrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app",      labelKey: "nav.simulator", icon: Activity },
  { href: "/projects", labelKey: "nav.projects",  icon: FolderOpen, requiredTier: "analyst", matchPrefix: true },
  { href: "/batch",    labelKey: "nav.batch",     icon: Layers,     requiredTier: "developer" },
  { href: "/api",      labelKey: "nav.api",       icon: Code2,      requiredTier: "developer" },
];

export default function AppSidebar({ collapsed, onToggleCollapsed, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();
  const { tier, hasAccess } = useTier();
  const [location] = useLocation();

  const isActive = (item: NavItem) => {
    if (location === item.href) return true;
    if (item.matchPrefix && location.startsWith(item.href + "/")) return true;
    return false;
  };

  // ── Shared nav list (renders for both desktop + mobile) ─────────────────
  const navList = (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        const locked = item.requiredTier ? !hasAccess(item.requiredTier) : false;
        const Icon = item.icon;
        const label = t(item.labelKey);
        // If locked, direct the user to /pricing instead of the feature page.
        const href = locked ? "/pricing" : item.href;

        return (
          <Link key={item.href} href={href} onClick={onMobileClose}>
            <div
              className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              } ${collapsed ? "md:justify-center md:px-2" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium flex-1 truncate ${collapsed ? "md:hidden" : ""}`}>
                {label}
              </span>
              {locked && !collapsed && <Lock className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  // ── Bottom: tier badge + user + logout ──────────────────────────────────
  const footer = (
    <div className="border-t border-border px-2 py-3 space-y-2">
      <Link href="/pricing" onClick={onMobileClose}>
        <div
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors bg-primary/10 text-primary hover:bg-primary/20 ${
            collapsed ? "md:justify-center md:px-2" : ""
          }`}
          title={collapsed ? (tier === "free" ? t("plan.free") : tier.toUpperCase()) : undefined}
        >
          <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
          <span className={`text-xs font-bold uppercase tracking-wider truncate ${collapsed ? "md:hidden" : ""}`}>
            {tier === "free" ? t("plan.free") : tier}
          </span>
        </div>
      </Link>
      {user && (
        <div className={`px-2.5 ${collapsed ? "md:hidden" : ""}`}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("user.signedInAs")}</div>
          <div className="text-xs text-foreground truncate">{user.name || user.email}</div>
        </div>
      )}
      {user && (
        <button
          onClick={() => { onMobileClose(); logout(); }}
          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${
            collapsed ? "md:justify-center md:px-2" : ""
          }`}
          title={collapsed ? t("user.logout") : undefined}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          <span className={`text-xs flex-1 text-left ${collapsed ? "md:hidden" : ""}`}>{t("user.logout")}</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 md:z-auto
          h-screen flex flex-col
          bg-card border-r border-border
          transition-[width,transform] duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          ${collapsed ? "md:w-[60px]" : "md:w-56"} w-60
        `}
      >
        {/* Header with logo + collapse toggle */}
        <div className="h-14 flex items-center border-b border-border px-2 flex-shrink-0">
          <Link href="/app" onClick={onMobileClose}>
            <div className={`flex items-center gap-2 px-1.5 py-1 cursor-pointer ${collapsed ? "md:justify-center" : ""}`}>
              <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className={`font-bold text-sm truncate ${collapsed ? "md:hidden" : ""}`}>Biochar Pro</span>
            </div>
          </Link>
          <div className="ml-auto flex items-center">
            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapsed}
              className="hidden md:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            {/* Mobile close button */}
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {navList}
        {footer}
      </aside>
    </>
  );
}
