import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/profile-analyzer", label: "Analyzer" },
  { to: "/how-to-download", label: "How To" },
  { to: "/about", label: "About" },
  { to: "/install", label: "Install" },
];


const footerLinks = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/about", label: "About" },
  { to: "/how-to-download", label: "How to Download" },
];

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function IOSInstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
    const wasDismissed = sessionStorage.getItem("ios-install-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  if (!isIOS || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("ios-install-dismissed", "1");
  };

  return (
    <div className="relative z-30 bg-primary/10 border-b border-primary/20">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <a
          href="/TikTok_4k_Downloader_Web_Clip_Profile.mobileconfig"
          className="flex items-center gap-2.5 text-xs font-medium text-heading hover:text-primary transition-colors duration-200"
        >
          <Smartphone className="w-4 h-4 text-primary shrink-0" />
          <span>
            <span className="font-semibold">Add to Home Screen</span>
            <span className="text-dim ml-1.5 hidden sm:inline">— Install as an app on your iPhone</span>
          </span>
        </a>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-dim hover:text-heading hover:bg-secondary/60 transition-colors duration-200"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      {/* iOS Install Banner */}
      <IOSInstallBanner />

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
