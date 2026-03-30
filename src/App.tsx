import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SiteLayout from "./components/SiteLayout";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Terms from "./pages/Terms.tsx";
import About from "./pages/About.tsx";
import HowToDownload from "./pages/HowToDownload.tsx";
import ProfileAnalyzer from "./pages/ProfileAnalyzer.tsx";
import SlideshowDownloader from "./pages/SlideshowDownloader.tsx";
import IOSShortcut from "./pages/IOSShortcut.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-to-download" element={<HowToDownload />} />
            <Route path="/profile-analyzer" element={<ProfileAnalyzer />} />
            <Route path="/slideshow-downloader" element={<SlideshowDownloader />} />
            <Route path="/ios-shortcut" element={<IOSShortcut />} />
            
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
