import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

const Index = lazy(() => import("./pages/Index"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const Inventory = lazy(() => import("./pages/Inventory"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Reports = lazy(() => import("./pages/Reports"));
const MLOps = lazy(() => import("./pages/MLOps"));
const Alerts = lazy(() => import("./pages/Alerts"));

const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));

import { ProtectedRoute } from './components/ProtectedRoute';
import { AIChatbot } from '@/components/chatbot/AIChatbot';

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
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected routes — any authenticated @supplymind.tech user */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

      {/* Analyst+ required */}
      <Route path="/forecasting" element={<ProtectedRoute requiredRole="analyst"><Forecasting /></ProtectedRoute>} />

      {/* Manager+ required */}
      <Route path="/reports" element={<ProtectedRoute requiredRole="manager"><Reports /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/mlops" element={<ProtectedRoute requiredRole="admin"><MLOps /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
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
      <AuthContextProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <CurrencyProvider>
              <DateRangeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppRoutes />
                    <AIChatbot />
                  </BrowserRouter>
                </TooltipProvider>
              </DateRangeProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthContextProvider>
    </ErrorBoundary>
  );
};

export default App;
