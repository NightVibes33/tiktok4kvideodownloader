import SiteLayout from "@/components/SiteLayout";
import { Smartphone, Download, ChevronRight } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Tap the Install button",
    description: "Tap the download button below to get the configuration profile.",
  },
  {
    number: "2",
    title: "Allow the profile download",
    description: 'When prompted, tap "Allow" to download the profile to your device.',
  },
  {
    number: "3",
    title: "Open Settings",
    description: 'Go to Settings → General → VPN & Device Management and tap the downloaded profile.',
  },
  {
    number: "4",
    title: "Install the profile",
    description: 'Tap "Install" and enter your passcode if asked. The app icon will appear on your Home Screen.',
  },
];

export default function Install() {
  return (
    <SiteLayout>
      <div className="w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
            Install on <span className="text-gradient">iPhone</span>
          </h1>
          <p className="text-sm text-dim max-w-sm mx-auto">
            Add TikTok 4K Downloader to your Home Screen for quick, app-like access — no App Store needed.
          </p>
        </div>

        {/* Download button */}
        <a
          href="/TikTok_4k_Downloader_Web_Clip_Profile.mobileconfig"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-primary hover:bg-primary/85 text-primary-foreground rounded-xl font-semibold transition-all ease-expo duration-200 glow-primary hover:shadow-[0_0_30px_hsl(var(--glow-primary)/0.4)]"
        >
          <Download className="w-4 h-4" />
          Download & Install Profile
        </a>

        {/* Steps */}
        <div className="space-y-3">
          <h2 className="text-xs text-dim uppercase tracking-widest font-mono text-center">How it works</h2>
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className="surface-elevated rounded-xl p-4 flex items-start gap-3.5"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {step.number}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-heading">{step.title}</p>
                  <p className="text-xs text-dim leading-relaxed">{step.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-dim shrink-0 mt-1 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-dim text-center font-mono uppercase tracking-widest">
          Works on iPhone · iPad · iOS 14+
        </p>
      </div>
    </SiteLayout>
  );
}
