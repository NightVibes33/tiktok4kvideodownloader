import SiteLayout from "@/components/SiteLayout";
import SEOHead from "@/components/SEOHead";

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Download TikTok Videos Without Watermark in 4K",
  "description": "Step-by-step guide to download TikTok videos in HD/4K quality without watermark for free.",
  "step": [
    { "@type": "HowToStep", "name": "Copy the TikTok Video Link", "text": "Open TikTok, find the video, tap Share, and select Copy Link." },
    { "@type": "HowToStep", "name": "Paste the Link", "text": "Go to TikTok 4K Video Downloader and paste the URL into the input field." },
    { "@type": "HowToStep", "name": "Click Extract", "text": "Hit Extract to retrieve all available quality options." },
    { "@type": "HowToStep", "name": "Choose Your Quality", "text": "Select from available resolutions up to 4K." },
    { "@type": "HowToStep", "name": "Download", "text": "Click Download Video to save the MP4 file to your device." }
  ]
};

export default function HowToDownload() {
  return (
    <SiteLayout>
      <SEOHead
        title="How to Download TikTok Videos Without Watermark — Step-by-Step"
        description="Learn how to download TikTok videos without watermark in 4K HD quality. Free step-by-step guide — works on iPhone, Android, and desktop."
        path="/how-to-download"
        jsonLd={howToJsonLd}
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">
          How to Download TikTok Videos Without Watermark
        </h1>
        <p className="text-body leading-relaxed">
          Follow this step-by-step guide to save any public TikTok video to your device in full HD quality, completely free and without a watermark. Ready to start? <a href="/" className="text-primary hover:underline">Go to the downloader</a>.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Step 1: Copy the TikTok Video Link</h2>
        <p className="text-body leading-relaxed">
          Open the TikTok app or website. Find the video you want to download. Tap the <strong>Share</strong> button (the arrow icon) and select <strong>"Copy Link"</strong>. The URL will look something like:
        </p>
        <code className="block bg-secondary/50 p-3 rounded-xl text-accent text-sm font-mono break-all">
          https://www.tiktok.com/@username/video/7123456789012345678
        </code>

        <h2 className="text-lg font-semibold text-heading mt-8">Step 2: Paste the Link</h2>
        <p className="text-body leading-relaxed">
          Come back to our <a href="/" className="text-primary hover:underline">TikTok 4K Video Downloader</a> and paste the copied URL into the input field at the top of the page. You can also tap the <strong>"Paste from clipboard"</strong> button for convenience.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Step 3: Click "Extract"</h2>
        <p className="text-body leading-relaxed">
          Hit the <strong>Extract</strong> button. Our system will analyse the link and retrieve all available quality options for the video. This usually takes just a few seconds.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Step 4: Choose Your Quality</h2>
        <p className="text-body leading-relaxed">
          Once the video is extracted, you'll see a preview along with a quality selector. Pick from the available options — resolutions can range from standard to full 4K depending on the original upload.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Step 5: Download</h2>
        <p className="text-body leading-relaxed">
          Click <strong>"Download Video"</strong> to save the MP4 file directly to your device. On iPhone, the file will be prepared first so you can save it to your camera roll or share it via AirDrop. Want app-like access? <a href="/install" className="text-primary hover:underline">Install on iPhone</a>.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Tips & Tricks</h2>
        <ul className="text-body leading-relaxed space-y-2">
          <li>Make sure the TikTok video is <strong>public</strong> — private or friends-only videos cannot be downloaded.</li>
          <li>Short URLs like <code className="text-accent">vm.tiktok.com/...</code> are supported too.</li>
          <li>Your recent downloads are saved locally so you can easily re-download them later.</li>
          <li>If a download fails, try extracting the video again — TikTok links can sometimes expire.</li>
          <li>Want to check a creator's stats? Try our <a href="/profile-analyzer" className="text-primary hover:underline">TikTok Profile Analyzer</a>.</li>
        </ul>

        <h2 className="text-lg font-semibold text-heading mt-8">Frequently Asked Questions</h2>
        <h3 className="text-base font-medium text-heading mt-4">Is this service free?</h3>
        <p className="text-body leading-relaxed">
          Yes, 100% free with no download limits or hidden fees.
        </p>

        <h3 className="text-base font-medium text-heading mt-4">Do I need to install anything?</h3>
        <p className="text-body leading-relaxed">
          No. The downloader works entirely in your web browser — no app or extension needed.
        </p>

        <h3 className="text-base font-medium text-heading mt-4">Can I download TikTok Stories or Live videos?</h3>
        <p className="text-body leading-relaxed">
          Currently, only standard TikTok video posts are supported. Stories and Live content are not available for download.
        </p>

        <h3 className="text-base font-medium text-heading mt-4">Is it legal?</h3>
        <p className="text-body leading-relaxed">
          Downloading videos for personal use is generally acceptable, but you should always respect the original creator's intellectual property rights and comply with local laws.
        </p>
      </article>
    </SiteLayout>
  );
}
