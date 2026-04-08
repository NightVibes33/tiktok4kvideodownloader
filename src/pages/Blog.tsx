import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const articles = [
  {
    slug: "how-to-save-tiktok-videos-iphone",
    title: "How to Save TikTok Videos on iPhone Without Watermark",
    excerpt: "A complete guide to downloading TikTok videos on your iPhone. Learn multiple methods including our web-based downloader, iOS shortcuts, and screen recording tips.",
    date: "2026-03-20",
  },
  {
    slug: "tiktok-video-quality-explained",
    title: "TikTok Video Quality Explained: 540p vs 720p vs 1080p vs 4K",
    excerpt: "Understand why some TikTok videos download in low quality and how to find the highest resolution available. We break down codecs, bitrates, and TikTok's encoding pipeline.",
    date: "2026-03-15",
  },
  {
    slug: "best-tiktok-downloader-2026",
    title: "Best TikTok Video Downloaders in 2026 — Free Tools Compared",
    excerpt: "We compared the top TikTok downloading tools of 2026 on speed, quality, safety, and ad intrusiveness. See how TikTok 4K Video Downloader stacks up.",
    date: "2026-03-10",
  },
  {
    slug: "download-tiktok-slideshow",
    title: "How to Download TikTok Slideshows & Photo Carousels",
    excerpt: "TikTok photo carousels can't be saved natively. Learn how to extract and download every slide image in full HD quality using our free slideshow downloader.",
    date: "2026-03-05",
  },
];

export default function Blog() {
  return (
    <>
      <SEOHead
        title="Blog — TikTok Download Tips, Guides & News"
        description="Tips, tutorials, and guides for downloading TikTok videos in HD quality. Learn about video formats, device compatibility, and getting the best download quality."
        path="/blog"
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">
          Blog & Guides
        </h1>
        <p className="text-body leading-relaxed">
          Tips, tutorials, and in-depth guides to help you get the most out of TikTok 4K Video Downloader. Whether you're on iPhone, Android, or desktop, we've got you covered.
        </p>

        <div className="mt-8 space-y-6 not-prose">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="block p-5 rounded-2xl bg-secondary/50 ring-1 ring-border/50 hover:ring-primary/30 hover:bg-secondary/70 transition-all duration-200 group"
            >
              <p className="text-[10px] text-dim font-mono uppercase tracking-wider mb-1.5">{article.date}</p>
              <h2 className="text-base font-semibold text-heading group-hover:text-primary transition-colors duration-200 mb-1.5">
                {article.title}
              </h2>
              <p className="text-sm text-body leading-relaxed">{article.excerpt}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-heading">Explore More</h2>
          <p className="text-body leading-relaxed">
            Looking for something specific? Check out our <a href="/faq" className="text-primary hover:underline">FAQ</a>,{" "}
            <a href="/how-to-download" className="text-primary hover:underline">step-by-step download guide</a>, or{" "}
            <a href="/supported-formats" className="text-primary hover:underline">supported formats reference</a>.
          </p>
        </div>
      </article>
    </>
  );
}
