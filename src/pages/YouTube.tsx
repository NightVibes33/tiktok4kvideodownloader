import YouTubeDownloader from "@/components/YouTubeDownloader";
import SEOHead from "@/components/SEOHead";

const PUBLIC_SITE = "https://nightvibes33.github.io/tiktok4kvideodownloader";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "YouTube Video Downloader",
  "url": `${PUBLIC_SITE}/youtube`,
  "description": "Download public YouTube videos you own or have permission to save. Pick a quality and save a verified non-zero MP4 or audio file.",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "browserRequirements": "Requires a modern web browser",
};

const YouTubePage = () => (
  <>
    <SEOHead
      title="YouTube Video Downloader — Save MP4 or Audio"
      description="Download public YouTube videos you own or have permission to save. Choose quality, verify the media stream, and save a non-zero MP4 or audio file."
      path="/youtube"
      jsonLd={webAppJsonLd}
    />
    <YouTubeDownloader />
  </>
);

export default YouTubePage;
