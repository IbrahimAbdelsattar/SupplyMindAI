import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

const Index = lazy(() => import("./pages/Index"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const Inventory = lazy(() => import("./pages/Inventory"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Reports = lazy(() => import("./pages/Reports"));
const MLOps = lazy(() => import("./pages/MLOps"));

const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

const AppRoutes = () => (
  <SuspenseWrapper>
    <Routes>
      <Route path="/" element={<Index />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/forecasting" element={<Forecasting />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/insights" element={<AIInsights />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/mlops" element={<MLOps />} />

      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </SuspenseWrapper>
);

const App = () => {
  console.log("[App] Initializing — frontend URL:", window.location.origin);
  console.log("[App] Backend API URL:", import.meta.env.VITE_API_URL || "/api/v1");
  console.log("[App] Router base:", import.meta.env.BASE_URL);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
