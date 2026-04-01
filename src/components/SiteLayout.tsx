import { Link, useLocation, Outlet } from "react-router-dom";
import { Warp } from "@paper-design/shaders-react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/slideshow-downloader", label: "Slideshows" },
  { to: "/profile-analyzer", label: "Analyzer" },
  { to: "/how-to-download", label: "How To" },
  { to: "/about", label: "About" },
];

const footerLinks = [
  { to: "/", label: "TikTok Downloader" },
  { to: "/how-to-download", label: "How to Download" },
  { to: "/profile-analyzer", label: "Profile Analyzer" },
  { to: "/about", label: "About" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
];

export default function SiteLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-svh text-foreground flex flex-col relative">
      {/* Warp shader — fixed behind everything, using theme tokens */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-85 h-[100svh] w-screen overflow-hidden">
        <Warp
          style={{ width: "100%", height: "100%" }}
          proportion={0.5}
          softness={2.0}
          distortion={0.15}
          swirl={0.4}
          swirlIterations={12}
          shape="checks"
          shapeScale={0.06}
          scale={1.5}
          rotation={0}
          speed={0.35}
          colors={[
            "hsl(185, 85%, 65%)",
            "hsl(280, 70%, 65%)",
            "hsl(330, 80%, 60%)",
            "hsl(160, 75%, 55%)",
            "hsl(220, 80%, 60%)",
            "hsl(50, 80%, 60%)",
          ]}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div />

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : "text-dim hover:text-heading hover:bg-secondary/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        {children ?? <Outlet />}
      </main>

      <footer className="relative z-10 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-dim hover:text-heading transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-[10px] text-dim font-mono uppercase tracking-widest text-center">
            © {new Date().getFullYear()} TikTok 4K Video Downloader · Not affiliated with TikTok
          </p>
        </div>
      </footer>
    </div>
  );
}
