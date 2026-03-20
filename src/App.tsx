import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import Index from "./pages/Index.tsx";

// Lazy-load non-critical routes
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const HowToDownload = lazy(() => import("./pages/HowToDownload.tsx"));
const ProfileAnalyzer = lazy(() => import("./pages/ProfileAnalyzer.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));

const queryClient = new QueryClient();

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-svh bg-background" />}>
    {children}
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
          <Route path="/terms" element={<LazyRoute><Terms /></LazyRoute>} />
          <Route path="/about" element={<LazyRoute><About /></LazyRoute>} />
          <Route path="/how-to-download" element={<LazyRoute><HowToDownload /></LazyRoute>} />
          <Route path="/profile-analyzer" element={<LazyRoute><ProfileAnalyzer /></LazyRoute>} />
          <Route path="/install" element={<LazyRoute><Install /></LazyRoute>} />
          <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
