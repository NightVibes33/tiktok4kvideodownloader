import SEOHead from "@/components/SEOHead";

export default function SupportedFormats() {
  return (
    <>
      <SEOHead
        title="Supported Formats & Quality — TikTok Video Download Guide"
        description="Learn about all supported TikTok video formats, resolutions from 360p to 4K, file types, and device compatibility. Understand bitrates, codecs, and download sizes."
        path="/supported-formats"
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">
          Supported Formats & Video Quality Guide
        </h1>
        <p className="text-body leading-relaxed">
          Understanding video quality, file formats, and resolution options helps you get the best possible download every time. This guide covers everything our TikTok downloader supports and explains what affects the quality of your saved videos.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Video Resolutions We Support</h2>
        <p className="text-body leading-relaxed">
          Our tool extracts every quality option available from TikTok's servers. The resolutions you see depend entirely on how the original creator uploaded their video. Here are the common options:
        </p>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-heading font-semibold">Resolution</th>
                <th className="text-left py-2 text-heading font-semibold">Label</th>
                <th className="text-left py-2 text-heading font-semibold">Typical Use</th>
                <th className="text-left py-2 text-heading font-semibold">Est. Size (60s)</th>
              </tr>
            </thead>
            <tbody className="text-body">
              <tr className="border-b border-border/50">
                <td className="py-2">3840×2160</td>
                <td className="py-2 text-accent font-semibold">4K Ultra HD</td>
                <td className="py-2">Professional content, large screens</td>
                <td className="py-2">~90 MB</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">2560×1440</td>
                <td className="py-2 text-accent font-semibold">1440p QHD</td>
                <td className="py-2">High-end displays</td>
                <td className="py-2">~55 MB</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">1920×1080</td>
                <td className="py-2 text-primary font-semibold">Full HD</td>
                <td className="py-2">Most common high-quality option</td>
                <td className="py-2">~37 MB</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">1280×720</td>
                <td className="py-2 text-primary font-semibold">HD</td>
                <td className="py-2">Good balance of quality and size</td>
                <td className="py-2">~18 MB</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">960×540</td>
                <td className="py-2">SD</td>
                <td className="py-2">Quick viewing, low bandwidth</td>
                <td className="py-2">~9 MB</td>
              </tr>
              <tr>
                <td className="py-2">640×360</td>
                <td className="py-2">Low</td>
                <td className="py-2">Minimum quality, smallest file</td>
                <td className="py-2">~5 MB</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-heading mt-8">File Format: MP4</h2>
        <p className="text-body leading-relaxed">
          All TikTok videos are downloaded in <strong>MP4 (MPEG-4 Part 14)</strong> format, which is the universal standard for video files. MP4 is compatible with virtually every device and media player including:
        </p>
        <ul className="text-body leading-relaxed space-y-1">
          <li><strong>Mobile:</strong> iPhone, iPad, Android phones and tablets</li>
          <li><strong>Desktop:</strong> Windows Media Player, VLC, QuickTime, MPV</li>
          <li><strong>Web:</strong> Chrome, Firefox, Safari, Edge — all support native MP4 playback</li>
          <li><strong>Smart TVs:</strong> Samsung, LG, Sony, and most modern smart TVs play MP4 natively</li>
          <li><strong>Editing software:</strong> Adobe Premiere, Final Cut Pro, DaVinci Resolve, iMovie</li>
        </ul>

        <h2 className="text-lg font-semibold text-heading mt-8">Video Codecs</h2>
        <p className="text-body leading-relaxed">
          TikTok encodes videos using modern codecs that balance quality with file size:
        </p>
        <ul className="text-body leading-relaxed space-y-2">
          <li>
            <strong>H.264 (AVC)</strong> — The most widely supported codec. Works on all devices and browsers. This is the default codec for most TikTok videos and ensures maximum compatibility.
          </li>
          <li>
            <strong>H.265 (HEVC)</strong> — A newer, more efficient codec that delivers the same quality at roughly half the file size. Higher-resolution TikTok videos (1080p and above) may use HEVC. Most modern devices support it, but some older browsers may not.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-heading mt-8">Audio Format</h2>
        <p className="text-body leading-relaxed">
          Downloaded videos include the original audio track encoded in <strong>AAC (Advanced Audio Coding)</strong> format. AAC is the industry standard for digital audio and provides excellent sound quality at efficient bitrates. The audio is embedded in the MP4 container — you don't need separate audio files.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Slideshow / Photo Carousel Format</h2>
        <p className="text-body leading-relaxed">
          TikTok slideshows (photo carousels) are downloaded as individual <strong>JPEG images</strong> in the highest available resolution. Each slide is saved separately, allowing you to keep only the photos you want. Use our dedicated <a href="/slideshow-downloader" className="text-primary hover:underline">Slideshow Downloader</a> for photo posts.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Why Is My Download Only 540p?</h2>
        <p className="text-body leading-relaxed">
          The download resolution matches what the creator originally uploaded. If someone recorded and posted a video at 540p, our tool cannot upscale it to HD or 4K — that would only add file size without real quality improvement. When a video is uploaded in 1080p or higher, you'll see those options in our quality selector.
        </p>
        <p className="text-body leading-relaxed">
          Our quality badge system shows you the <strong>verified resolution</strong> of each download option, so you always know exactly what you're getting before downloading.
        </p>

        <h2 className="text-lg font-semibold text-heading mt-8">Tips for Getting the Best Quality</h2>
        <ol className="text-body leading-relaxed space-y-2">
          <li><strong>Choose the highest available resolution</strong> — Our selector shows all options sorted by quality. Pick the top one for best results.</li>
          <li><strong>Check the quality badge</strong> — Look for the "Full HD" or "4K" badge to confirm high-resolution availability.</li>
          <li><strong>Download soon after posting</strong> — TikTok occasionally re-encodes older videos at lower quality. Downloading sooner may give you access to higher resolution streams.</li>
          <li><strong>Use a stable internet connection</strong> — Large 4K files can be 50-100 MB. A reliable Wi-Fi connection ensures smooth downloads.</li>
        </ol>

        <h2 className="text-lg font-semibold text-heading mt-8">Device Compatibility</h2>
        <p className="text-body leading-relaxed">
          Our downloader works on any device with a modern web browser:
        </p>
        <ul className="text-body leading-relaxed space-y-1">
          <li>✅ iPhone & iPad (Safari, Chrome)</li>
          <li>✅ Android (Chrome, Firefox, Samsung Internet)</li>
          <li>✅ Windows (Chrome, Firefox, Edge)</li>
          <li>✅ macOS (Safari, Chrome, Firefox)</li>
          <li>✅ Linux (Firefox, Chrome)</li>
        </ul>

        <p className="text-body leading-relaxed mt-6">
          Ready to download? Head to our <a href="/" className="text-primary hover:underline">TikTok 4K Video Downloader</a> and paste a link to get started.
        </p>
      </article>
    </>
  );
}
