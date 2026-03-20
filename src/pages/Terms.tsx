import SiteLayout from "@/components/SiteLayout";
import SEOHead from "@/components/SEOHead";

export default function Terms() {
  return (
    <SiteLayout>
      <SEOHead
        title="Terms of Service — TikTok 4K Video Downloader"
        description="Read the terms of service for TikTok 4K Video Downloader. Understand your rights and responsibilities when using our free download tool."
        path="/terms"
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">Terms of Service</h1>
        <p className="text-dim text-xs font-mono uppercase tracking-wider">Last updated: March 18, 2026</p>

        <h2 className="text-lg font-semibold text-heading mt-8">1. Acceptance of Terms</h2>
        <p className="text-body leading-relaxed">
          By accessing or using TikTok 4K Video Downloader ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">2. Description of Service</h2>
        <p className="text-body leading-relaxed">
          The Service allows users to extract and download publicly available TikTok video content for personal, non-commercial use. We act as a technical intermediary and do not host or store video content on our servers.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">3. User Responsibilities</h2>
        <ul className="text-body leading-relaxed space-y-2">
          <li>You are responsible for ensuring that your use of downloaded content complies with applicable copyright laws and TikTok's terms of service.</li>
          <li>You agree not to use the Service for any illegal purpose or to infringe on the intellectual property rights of content creators.</li>
          <li>You should not redistribute downloaded content commercially without permission from the original creator.</li>
        </ul>

        <h2 className="text-lg font-semibold text-heading mt-8">4. Intellectual Property</h2>
        <p className="text-body leading-relaxed">
          All video content downloaded through the Service remains the intellectual property of its original creators. We do not claim ownership of any TikTok content. The Service itself, including its design and code, is our intellectual property.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">5. Disclaimer of Warranties</h2>
        <p className="text-body leading-relaxed">
          The Service is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted access, error-free operation, or that all TikTok videos will be downloadable.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">6. Limitation of Liability</h2>
        <p className="text-body leading-relaxed">
          To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">7. Third-Party Content & Links</h2>
        <p className="text-body leading-relaxed">
          The Service may display advertisements from Google AdSense and link to third-party websites. We are not responsible for the content or practices of these third parties.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">8. Modifications</h2>
        <p className="text-body leading-relaxed">
          We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">9. Contact</h2>
        <p className="text-body leading-relaxed">
          For questions about these Terms, please reach out via the contact details on our <a href="/about" className="text-primary hover:underline">About page</a>.
        </p>
      </article>
    </SiteLayout>
  );
}
