import YouTubeDownloader from "@/components/YouTubeDownloader";
import SEOHead from "@/components/SEOHead";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "YouTube Video Downloader",
  "url": "https://tiktok4kvideodownloader.lovable.app/youtube",
  "description": "Download YouTube videos in HD and 4K quality. Free online tool — paste a link, pick a resolution, save MP4 or M4A audio.",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "browserRequirements": "Requires a modern web browser",
};

const YouTubePage = () => (
  <>
    <SEOHead
      title="YouTube Video Downloader — Save HD & 4K MP4 Free"
      description="Download YouTube videos in HD or 4K as MP4, or grab audio-only M4A. Free online downloader — paste a link, pick quality, save instantly. No signup."
      path="/youtube"
      jsonLd={webAppJsonLd}
    />
    <YouTubeDownloader />
  </>
);

export default YouTubePage;