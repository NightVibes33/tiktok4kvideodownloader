import SEOHead from "@/components/SEOHead";

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy — TikTok 4K Video Downloader"
        description="Read the privacy policy for TikTok 4K Video Downloader. We don't collect personal data or store your downloads."
        path="/privacy-policy"
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">Privacy Policy</h1>
        <p className="text-dim text-xs font-mono uppercase tracking-wider">Last updated: March 18, 2026</p>

        <h2 className="text-lg font-semibold text-heading mt-8">1. Information We Collect</h2>
        <p className="text-body leading-relaxed">
          We do <strong>not</strong> require you to create an account or provide personal information to use our service.
          When you paste a TikTok URL and download a video, we do not store the URL, video content, or any personally identifiable information on our servers beyond what is needed to process the request in real time.
        </p>
        <p className="text-body leading-relaxed">
          We may automatically collect non-personal technical data such as browser type, device type, referring URL, and pages visited through standard web server logs and analytics tools.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">2. Local Storage</h2>
        <p className="text-body leading-relaxed">
          Our "Recent Downloads" feature stores a short history of your downloaded video metadata (author name, thumbnail URL, and TikTok link) in your browser's <code className="text-accent">localStorage</code>. This data never leaves your device and can be cleared at any time using the "Clear" button in the app or by clearing your browser data.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">3. Cookies & Advertising</h2>
        <p className="text-body leading-relaxed">
          We use Google AdSense to display advertisements. Google may use cookies and web beacons to serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising by visiting{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Google Ads Settings
          </a>.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">4. Third-Party Services</h2>
        <p className="text-body leading-relaxed">
          Our service interacts with TikTok's publicly available video data solely to extract download links on your behalf. We are not affiliated with, endorsed by, or sponsored by TikTok or ByteDance Ltd. We also use Google AdSense for ad serving.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">5. Data Retention</h2>
        <p className="text-body leading-relaxed">
          We maintain an aggregate, anonymous download counter that tracks the total number of downloads across all users. No individual download records are stored on our servers.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">6. Children's Privacy</h2>
        <p className="text-body leading-relaxed">
          Our service is not directed at children under the age of 13. We do not knowingly collect information from children.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">7. Changes to This Policy</h2>
        <p className="text-body leading-relaxed">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">8. Contact</h2>
        <p className="text-body leading-relaxed">
          If you have questions about this Privacy Policy, please reach out via the contact details on our <a href="/about" className="text-primary hover:underline">About page</a>.
        </p>
      </article>
    </>
  );
}
