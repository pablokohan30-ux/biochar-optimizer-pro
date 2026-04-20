/**
 * AppLayout — standard shell for authenticated app pages.
 *
 * Provides:
 * - Persistent left sidebar (collapsed state in localStorage)
 * - Top bar with page-title slot + page-actions slot + language switcher
 * - Main content area (scrollable)
 *
 * Usage:
 *   <AppLayout
 *     pageTitle="Simulator"
 *     pageActions={<Button>...</Button>}
 *   >
 *     ...page content...
 *   </AppLayout>
 *
 * Pages that use this layout SHOULD NOT render their own header/navigation.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";
import LanguageSwitcher from "./LanguageSwitcher";

const COLLAPSED_KEY = "sidebar_collapsed";

interface AppLayoutProps {
  children: ReactNode;
  /** Left-aligned title in the top bar (string or node). */
  pageTitle?: ReactNode;
  /** Right-aligned action buttons in the top bar (before language switcher). */
  pageActions?: ReactNode;
  /** Optional content rendered above the top bar (e.g. activation banners). */
  banner?: ReactNode;
  /**
   * If true, removes the default horizontal padding + max-width container
   * around children. Use for pages that need edge-to-edge content (e.g. map).
   */
  fullBleed?: boolean;
}

export default function AppLayout({
  children,
  pageTitle,
  pageActions,
  banner,
  fullBleed = false,
}: AppLayoutProps) {
  // Desktop: persist collapsed state
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  // Mobile: drawer open/closed (does not persist)
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Close mobile drawer on window resize to md+
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {banner}

        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30 flex items-center px-3 md:px-4 gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            {pageTitle && (
              <div className="font-semibold text-sm md:text-base truncate">{pageTitle}</div>
            )}
          </div>

          {/* Page actions + language switcher */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {pageActions}
            <LanguageSwitcher />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {fullBleed ? children : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-7xl">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
