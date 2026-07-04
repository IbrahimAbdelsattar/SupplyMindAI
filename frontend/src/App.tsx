import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
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
const Login = lazy(() => import("./pages/Login"));

import { ClerkProvider } from '@clerk/clerk-react';
import { ProtectedRoute } from './components/ProtectedRoute';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key for Clerk");
}


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
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/forecasting" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/mlops" element={<ProtectedRoute><MLOps /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
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
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <CurrencyProvider>
              <DateRangeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </TooltipProvider>
              </DateRangeProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

export default App;
