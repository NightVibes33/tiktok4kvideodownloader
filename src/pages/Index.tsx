import TikTokDownloader from "@/components/TikTokDownloader";
import SEOHead from "@/components/SEOHead";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "TikTok 4K Video Downloader",
  "url": "https://tiktok4kvideodownloader.lovable.app/",
  "description": "Download TikTok videos in 4K HD quality without watermark. Free, fast, and no signup required.",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "browserRequirements": "Requires a modern web browser"
};

const Index = () => (
  <>
    <SEOHead
      title="TikTok 4K Video Downloader — Save HD Videos Without Watermark"
      description="Download TikTok videos in 4K HD quality without watermark. Free online tool — paste a link, pick quality, save MP4 instantly. No signup required."
      path="/"
      jsonLd={webAppJsonLd}
    />
    <TikTokDownloader />
  </>
);

export default Index;
