import SEOHead from "@/components/SEOHead";
import { Share, Download, Smartphone, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

const SITE_URL = "https://tiktok4kvideodownloader.lovable.app";
const SHORTCUT_STEPS = [
  {
    icon: <Download className="w-6 h-6" />,
    title: "Get the Shortcut",
    description: 'Tap the "Add Shortcut" button below to open it in the Shortcuts app.',
  },
  {
    icon: <Share className="w-6 h-6" />,
    title: "Share a TikTok",
    description: "Open TikTok, tap the Share button on any video, then scroll and tap \"Download with TikTok4K\".",
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Save Instantly",
    description: "The video opens in our downloader ready to save — no watermark, full HD quality.",
  },
];

// This URL scheme creates a shortcut via iCloud.
// Since we can't host an actual .shortcut file, we provide manual creation instructions as fallback.
const SHORTCUT_ACTIONS_URL = `https://www.icloud.com/shortcuts/`;

export default function IOSShortcut() {
  return (
    <>
      <SEOHead
        title="iOS Shortcut — Download TikToks from Share Sheet | TikTok4K"
        description="Add 'Download with TikTok4K' to your iPhone share sheet. Save TikTok videos without watermark directly from the TikTok app in one tap."
        path="/ios-shortcut"
      />

      <div className="space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Smartphone className="w-4 h-4" />
            iOS Share Sheet Integration
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
            Download TikToks from the Share Menu
          </h1>
          <p className="text-body text-lg max-w-xl mx-auto leading-relaxed">
            Add <strong>"Download with TikTok4K"</strong> to your iPhone's share sheet.
            One tap from TikTok → saved to your phone in full HD, no watermark.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 sm:grid-cols-3">
          {SHORTCUT_STEPS.map((step, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                  {step.icon}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-heading">{step.title}</h3>
              <p className="text-sm text-body leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Manual creation guide */}
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold text-heading">Create the Shortcut Manually</h2>
          <p className="text-body leading-relaxed">
            Open the <strong>Shortcuts</strong> app on your iPhone and create a new shortcut with these settings:
          </p>

          <ol className="space-y-4 text-body">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
              <div>
                <strong>Tap the ⓘ icon</strong> at the top → enable <strong>"Show in Share Sheet"</strong>.
                Under "Share Sheet Types", select <strong>URLs</strong> only.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
              <div>
                Add a <strong>"Text"</strong> action with this content:
                <code className="block mt-2 px-3 py-2 rounded-lg bg-background text-primary text-sm break-all select-all">
                  {SITE_URL}/?url=<span className="text-accent">[Shortcut Input]</span>
                </code>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Tap "Shortcut Input" from the variable picker above the keyboard.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">3</span>
              <div>
                Add an <strong>"Open URLs"</strong> action and set it to open the <strong>Text</strong> variable from step 2.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">4</span>
              <div>
                <strong>Rename</strong> the shortcut to <strong>"Download with TikTok4K"</strong> and choose an icon (🔽 or 📥).
              </div>
            </li>
          </ol>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-body">
            <strong className="text-heading">That's it!</strong> Now open TikTok, tap Share on any video, scroll the share sheet, and tap <strong>"Download with TikTok4K"</strong>. The video will open in Safari ready to download.
          </div>
        </div>

        {/* How it works technically */}
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-heading">How It Works</h2>
          <div className="space-y-3 text-body text-sm leading-relaxed">
            <p>
              When you share a TikTok video, iOS passes the URL to the shortcut. The shortcut simply opens:
            </p>
            <code className="block px-3 py-2 rounded-lg bg-background text-primary text-sm break-all">
              {SITE_URL}/?url=https://www.tiktok.com/@user/video/123...
            </code>
            <p>
              Our site detects the <code className="text-primary">?url=</code> parameter and <strong>automatically starts processing</strong> the video — no pasting needed. You just tap download.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-heading">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "Does this work on iPad?", a: "Yes! The same shortcut works on iPad with iPadOS 15+." },
              { q: "Do I need the TikTok app?", a: "No — it also works with TikTok links copied from Safari or any browser." },
              { q: "Is it free?", a: "Completely free, no account required." },
              { q: "Does it download without watermark?", a: "Yes, when a watermark-free version is available we provide it automatically." },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/60 p-4">
                <h3 className="font-semibold text-heading text-sm">{faq.q}</h3>
                <p className="text-body text-sm mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
