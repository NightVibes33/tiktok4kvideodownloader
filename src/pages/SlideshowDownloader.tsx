import SEOHead from "@/components/SEOHead";
import { Images, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SlideshowDownloader = () => (
  <>
    <SEOHead
      title="TikTok Slideshow Downloader — Save Photo Slideshows as Images"
      description="Download TikTok slideshow photos in HD quality. Save all images from TikTok photo carousels instantly. Free, no signup required."
      path="/slideshow-downloader"
    />
    <div className="w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-heading transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Video Downloader
      </Link>

      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-2 ring-primary/20 shadow-lg shadow-primary/10 flex items-center justify-center">
            <Images className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
            TikTok <span className="text-gradient">Slideshow</span> Downloader
          </h1>
          <p className="text-sm text-dim mt-2">
            Save all photos from TikTok slideshows in HD quality
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-secondary/50 ring-1 ring-border/50 text-center space-y-3">
        <div className="text-4xl">🚧</div>
        <h2 className="text-lg font-semibold text-heading">Coming Soon</h2>
        <p className="text-sm text-body leading-relaxed">
          We're building a dedicated TikTok slideshow downloader that will let you save all photos
          from TikTok photo carousels and slideshows in full HD quality. Stay tuned!
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-primary hover:bg-primary/85 text-primary-foreground rounded-xl text-sm font-semibold transition-all"
        >
          Download Videos Instead
        </Link>
      </div>
    </div>
  </>
);

export default SlideshowDownloader;
