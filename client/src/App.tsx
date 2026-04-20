import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import SubmissionPrint from "./pages/SubmissionPrint";
import LCAPage from "./pages/LCA";
import BatchComparison from "./pages/BatchComparison";
import ApiDocs from "./pages/ApiDocs";
import PddBuilder from "./pages/PddBuilder";
import Solution from "./pages/Solution";
import About from "./pages/About";
import Partners from "./pages/Partners";
import Verify from "./pages/Verify";
import Demo from "./pages/Demo";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import Security from "./pages/legal/Security";

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

  // Mark popstate (back/forward) navigations so the route-change effect
  // can skip the scroll-to-top.
  useEffect(() => {
    // Browsers default to "auto" scroll restoration which saves scroll
    // position per history entry. Keep it on so back/forward works natively.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
    const onPopState = () => { isBackForward.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Route-change handler
  useEffect(() => {
    if (location === prevLocation.current) return;
    prevLocation.current = location;

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
    // Forward navigation (clicked a link) — scroll to top.
    window.scrollTo({ top: 0 });
  }, [location]);

  // Initial page load with a hash (e.g. direct link to /pricing#contact)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) scrollToHash(hash);
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

function Router() {
  return (
    <>
      <ScrollRestoration />
      <Switch>
        <Route path={"/"} component={Landing} />
        <Route path={"/app"} component={Home} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/login"} component={Login} />
        <Route path={"/projects"} component={Projects} />
        <Route path={"/projects/:id"} component={ProjectDetail} />
        <Route path={"/projects/:id/summary"} component={ExecutiveSummary} />
        <Route path={"/projects/:id/submission/:methodologyId"} component={SubmissionPrint} />
        <Route path={"/lca"} component={LCAPage} />
        <Route path={"/batch"} component={BatchComparison} />
        <Route path={"/api"} component={ApiDocs} />
        <Route path={"/pdd/:projectId"} component={PddBuilder} />
        <Route path={"/solutions/:vertical"} component={Solution} />
        <Route path={"/company/about"} component={About} />
        <Route path={"/company/partners"} component={Partners} />
        <Route path={"/verify/:bopId"} component={Verify} />
        <Route path={"/demo"} component={Demo} />
        <Route path={"/demo/:slug"} component={Demo} />
        <Route path={"/legal/terms"} component={Terms} />
        <Route path={"/legal/privacy"} component={Privacy} />
        <Route path={"/legal/security"} component={Security} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
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
