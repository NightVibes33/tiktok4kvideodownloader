import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/profile-analyzer", label: "Analyzer" },
  { to: "/how-to-download", label: "How To" },
  { to: "/about", label: "About" },
];

const footerLinks = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/about", label: "About" },
  { to: "/how-to-download", label: "How to Download" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-border/50">
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
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-border/50">
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
