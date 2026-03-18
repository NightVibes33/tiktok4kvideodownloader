import SiteLayout from "@/components/SiteLayout";

export default function About() {
  return (
    <SiteLayout>
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">About Us</h1>

        <h2 className="text-lg font-semibold text-heading mt-8">Our Mission</h2>
        <p className="text-body leading-relaxed">
          TikTok 4K Video Downloader was built to solve a simple problem: saving your favourite TikTok videos in full HD quality, without watermarks, for free. Whether you want to keep a tutorial, a recipe, or a memorable moment, our tool makes it effortless.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">How It Works</h2>
        <ol className="text-body leading-relaxed space-y-2">
          <li><strong>Paste a link</strong> — Copy any public TikTok video URL and paste it into the input field.</li>
          <li><strong>Pick your quality</strong> — We extract every available quality option so you can choose the resolution that suits you.</li>
          <li><strong>Download instantly</strong> — Hit the download button and the MP4 file is saved directly to your device.</li>
        </ol>
        <p className="text-body leading-relaxed">
          Behind the scenes, we communicate with TikTok's publicly accessible video endpoints to retrieve the direct MP4 stream. No video content is stored on our servers — everything is proxied in real time.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Why Choose Us?</h2>
        <ul className="text-body leading-relaxed space-y-2">
          <li><strong>No account required</strong> — Start downloading immediately, no sign-up needed.</li>
          <li><strong>Multiple quality options</strong> — From standard definition to full 4K, when available.</li>
          <li><strong>No watermark</strong> — We fetch the clean, original source file.</li>
          <li><strong>Mobile-friendly</strong> — Works perfectly on iPhone, Android, and desktop browsers.</li>
          <li><strong>100% free</strong> — No hidden fees, no download limits.</li>
        </ul>

        <h2 className="text-lg font-semibold text-heading mt-8">Disclaimer</h2>
        <p className="text-body leading-relaxed">
          We are not affiliated with, endorsed by, or connected to TikTok or ByteDance Ltd. in any way. All video content remains the intellectual property of its original creators. Please respect copyright and only download videos for personal use.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Contact</h2>
        <p className="text-body leading-relaxed">
          Have feedback, questions, or suggestions? We'd love to hear from you. Reach out at{" "}
          <a href="mailto:contact@tiktok4kvideodownloader.lovable.app" className="text-primary hover:underline">
            contact@tiktok4kvideodownloader.lovable.app
          </a>.
        </p>
      </article>
    </SiteLayout>
  );
}
