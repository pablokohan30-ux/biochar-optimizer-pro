import { useEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trackPageView, identifyUser, resetAnalytics } from "./lib/analytics";
import { setSentryUser, clearSentryUser } from "./lib/sentry";
import { trpc } from "./lib/trpc";
import { useTier } from "./hooks/useTier";

// Critical-path: Landing + Login + NotFound stay in the main chunk so first
// paint never blocks on a code-split fetch. Everything else is lazy() —
// Vite emits a separate chunk per page and the browser only fetches the
// one matching the current route.
import Landing from "./pages/Landing";
import Login from "./pages/Login";

const Home = lazy(() => import("./pages/Home"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ExecutiveSummary = lazy(() => import("./pages/ExecutiveSummary"));
const SubmissionPrint = lazy(() => import("./pages/SubmissionPrint"));
const LCAPage = lazy(() => import("./pages/LCA"));
const BatchComparison = lazy(() => import("./pages/BatchComparison"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const PddBuilder = lazy(() => import("./pages/PddBuilder"));
const AiBuilder = lazy(() => import("./pages/AiBuilder"));
const AiBuilderProject = lazy(() => import("./pages/AiBuilderProject"));
const AiBuilderPrint = lazy(() => import("./pages/AiBuilderPrint"));
const AdminAiStats = lazy(() => import("./pages/AdminAiStats"));
const AdminLaunchInbox = lazy(() => import("./pages/AdminLaunchInbox"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const SettingsBranding = lazy(() => import("./pages/SettingsBranding"));
const CustomMethodologies = lazy(() => import("./pages/CustomMethodologies"));
const ProjectEvidence = lazy(() => import("./pages/ProjectEvidence"));
const ProjectOfftake = lazy(() => import("./pages/ProjectOfftake"));
const ProjectCommunity = lazy(() => import("./pages/ProjectCommunity"));
const ProjectBuyerReadiness = lazy(() => import("./pages/ProjectBuyerReadiness"));
const ProjectAuditPackage = lazy(() => import("./pages/ProjectAuditPackage"));
const ProjectBuyerMatch = lazy(() => import("./pages/ProjectBuyerMatch"));
const ConfirmShipment = lazy(() => import("./pages/ConfirmShipment"));
const PublicAuditPackage = lazy(() => import("./pages/PublicAuditPackage"));
const Solution = lazy(() => import("./pages/Solution"));
const About = lazy(() => import("./pages/About"));
const Partners = lazy(() => import("./pages/Partners"));
const Modules = lazy(() => import("./pages/product/Modules"));
const Methodologies = lazy(() => import("./pages/product/Methodologies"));
const ProjectPackage = lazy(() => import("./pages/product/ProjectPackage"));
const Verify = lazy(() => import("./pages/Verify"));
const Demo = lazy(() => import("./pages/Demo"));
const EarlyAccess = lazy(() => import("./pages/EarlyAccess"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Security = lazy(() => import("./pages/legal/Security"));
const Guide = lazy(() => import("./pages/Guide"));

// Minimal fallback shown while a lazy chunk is loading. Intentionally
// blank-ish: it's only visible for a few hundred ms on cold navigation
// and a heavy skeleton would itself add JS to the critical path.
function RouteLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-label="Loading…" />
    </div>
  );
}

/**
 * Scroll-to-top on route changes + hash-based anchor scrolling.
 *
 * - Normal navigation (no hash): instant scroll to top.
 * - Hash navigation (e.g. /pricing#contact): scroll directly to that
 *   element after the new page has rendered.
 * - Same-page hash change: caught by the hashchange listener.
 * - Direct page load with hash: handled on mount.
 */
function ScrollRestoration() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  // Track when navigation is via browser back/forward (popstate).
  // For those navigations we let the browser restore the previous scroll
  // position natively — same UX as static sites. For forward navigations
  // (link clicks → pushState) we explicitly scroll to top.
  const isBackForward = useRef(false);

  /** Scroll to a hash target, retrying until the element appears. */
  const scrollToHash = (hash: string) => {
    let attempts = 0;
    const tick = () => {
      const el = document.querySelector(hash);
      if (el) {
        // Use instant scroll so it can't be interrupted
        el.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tick, 80);
      }
    };
    // Small initial delay to let React render the new page
    setTimeout(tick, 60);
  };

  // Take full control of scroll restoration so React/Wouter can't fight the
  // browser's "remember previous scroll" behavior. Without this, navigating
  // from a deep-scrolled landing to a shorter page lands the user at the
  // BOTTOM of the new page instead of the top.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onPopState = () => { isBackForward.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Route-change handler
  useEffect(() => {
    if (location === prevLocation.current) return;
    prevLocation.current = location;

    // Analytics: emit a PostHog pageview on every SPA navigation.
    // (PostHog's autocapture only catches hard loads, not wouter routing.)
    trackPageView(location);

    const hash = window.location.hash;
    if (hash) {
      scrollToHash(hash);
      isBackForward.current = false;
      return;
    }
    if (isBackForward.current) {
      // Back/forward — let the browser restore the previous scroll position.
      isBackForward.current = false;
      return;
    }
    // Forward navigation (clicked a link) — force scroll to top.
    //
    // Why so much retry: 3 things fight us at the same time during a SPA
    // route change.
    //   (1) The clicked <a> keeps focus. Some browsers will then scroll the
    //       focused element into view AFTER our scrollTo runs.
    //   (2) Wouter swaps the React tree on next paint, NOT immediately —
    //       so an immediate scrollTo runs against the OLD page geometry.
    //   (3) Late-loading content (Leaflet maps, recharts, lazy images,
    //       fonts) re-flows the page well after first paint, sometimes
    //       pushing scroll position beyond the new document end.
    //
    // Defenses: blur the active element (kills #1), pin scroll across
    // multiple frames + timeouts up to 1 second (kills #2 and #3).
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Also reset documentElement/body scrollTop directly — covers iframe-
    // like edge cases where window.scrollTo is intercepted.
    const pinTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    pinTop();
    requestAnimationFrame(pinTop);
    requestAnimationFrame(() => requestAnimationFrame(pinTop));
    const t1 = setTimeout(pinTop, 50);
    const t2 = setTimeout(pinTop, 150);
    const t3 = setTimeout(pinTop, 350);
    const t4 = setTimeout(pinTop, 700);
    const t5 = setTimeout(pinTop, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [location]);

  // Initial page load with a hash (e.g. direct link to /pricing#contact)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) scrollToHash(hash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Analytics: emit the very first pageview on cold app load. The route-
  // change effect above early-returns when location === prev, so we'd miss
  // the initial one without this.
  useEffect(() => {
    trackPageView(location);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Same-page hash changes (e.g. clicking #contact when already on /pricing)
  useEffect(() => {
    const handler = (e: HashChangeEvent) => {
      const hash = new URL(e.newURL).hash;
      if (hash) {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return null;
}

/**
 * AnalyticsIdentity — keeps PostHog's user identity in sync with our auth state.
 *
 * If the user is logged in, we call `identifyUser` so their events on this
 * device are associated with a stable userId. On logout (or when the `me`
 * query goes from authed → anon), we call `resetAnalytics` so the next
 * session starts clean.
 */
function AnalyticsIdentity() {
  const meQuery = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const { tier, status } = useTier();
  const identifiedId = useRef<number | null>(null);

  useEffect(() => {
    const user = meQuery.data;
    if (user && user.id) {
      // Only call identify on transitions (first identify, or user change) —
      // identify is relatively expensive so we don't want to fire on every
      // tier refresh.
      if (identifiedId.current !== user.id) {
        identifyUser(user.id, {
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          tier,
          subscription_status: status,
        });
        setSentryUser({
          id: user.id,
          email: user.email,
          tier,
        });
        identifiedId.current = user.id;
      }
    } else if (identifiedId.current !== null) {
      // User logged out — clear identity so next visitor isn't mis-attributed.
      resetAnalytics();
      clearSentryUser();
      identifiedId.current = null;
    }
  }, [meQuery.data, tier, status]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollRestoration />
      <AnalyticsIdentity />
      <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path={"/"} component={Landing} />
        <Route path={"/app"} component={Home} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/login"} component={Login} />
        <Route path={"/projects"} component={Projects} />
        <Route path={"/projects/:id"} component={ProjectDetail} />
        <Route path={"/projects/:id/evidence"} component={ProjectEvidence} />
        <Route path={"/projects/:id/offtake"} component={ProjectOfftake} />
        <Route path={"/projects/:id/community"} component={ProjectCommunity} />
        <Route path={"/projects/:id/buyer-readiness"} component={ProjectBuyerReadiness} />
        <Route path={"/projects/:id/audit-package"} component={ProjectAuditPackage} />
        <Route path={"/projects/:id/buyer-match"} component={ProjectBuyerMatch} />
        <Route path={"/confirm/:token"} component={ConfirmShipment} />
        <Route path={"/audit/:token"} component={PublicAuditPackage} />
        <Route path={"/projects/:id/summary"} component={ExecutiveSummary} />
        <Route path={"/projects/:id/submission/:methodologyId"} component={SubmissionPrint} />
        <Route path={"/lca"} component={LCAPage} />
        <Route path={"/batch"} component={BatchComparison} />
        <Route path={"/api"} component={ApiDocs} />
        <Route path={"/pdd/:projectId"} component={PddBuilder} />
        <Route path={"/ai-builder"} component={AiBuilder} />
        <Route path={"/ai-builder/:id"} component={AiBuilderProject} />
        <Route path={"/ai-builder/:id/print"} component={AiBuilderPrint} />
        <Route path={"/admin/ai-stats"} component={AdminAiStats} />
        <Route path={"/admin/launch-inbox"} component={AdminLaunchInbox} />
        <Route path={"/portfolio"} component={Portfolio} />
        <Route path={"/settings/branding"} component={SettingsBranding} />
        <Route path={"/methodologies"} component={CustomMethodologies} />
        <Route path={"/solutions/:vertical"} component={Solution} />
        <Route path={"/company/about"} component={About} />
        <Route path={"/company/partners"} component={Partners} />
        <Route path={"/product/modules"} component={Modules} />
        <Route path={"/product/methodologies"} component={Methodologies} />
        <Route path={"/product/project-package"} component={ProjectPackage} />
        <Route path={"/verify/:bopId"} component={Verify} />
        <Route path={"/early-access"} component={EarlyAccess} />
        <Route path={"/demo"} component={Demo} />
        <Route path={"/demo/:slug"} component={Demo} />
        <Route path={"/legal/terms"} component={Terms} />
        <Route path={"/legal/privacy"} component={Privacy} />
        <Route path={"/legal/security"} component={Security} />
        <Route path={"/guide"} component={Guide} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
