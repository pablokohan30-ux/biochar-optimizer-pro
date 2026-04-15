import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import LCAPage from "./pages/LCA";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import Security from "./pages/legal/Security";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/app"} component={Home} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/login"} component={Login} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id"} component={ProjectDetail} />
      <Route path={"/lca"} component={LCAPage} />
      <Route path={"/legal/terms"} component={Terms} />
      <Route path={"/legal/privacy"} component={Privacy} />
      <Route path={"/legal/security"} component={Security} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
