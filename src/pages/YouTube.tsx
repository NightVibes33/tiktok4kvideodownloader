import YouTubeAccountGate from "@/components/YouTubeAccountGate";
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
      title="YouTube Downloader — Sign in with Google"
      description="Sign in with Google, connect your YouTube channel read-only and enter a video URL to request an MP4 or MP3 download where available."
      path="/youtube"
      jsonLd={webAppJsonLd}
    />
    <YouTubeAccountGate />
  </>
);

export default YouTubePage;
