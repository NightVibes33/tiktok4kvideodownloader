import SEOHead from "@/components/SEOHead";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is TikTok 4K Video Downloader free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, our service is 100% free with no download limits, no hidden fees, and no account required. You can download as many TikTok videos as you like in HD quality without paying anything."
      }
    },
    {
      "@type": "Question",
      "name": "Can I download TikTok videos without a watermark?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our tool fetches the original source video file from TikTok's servers, which does not include the TikTok watermark overlay. The downloaded MP4 file will be clean and watermark-free."
      }
    },
    {
      "@type": "Question",
      "name": "What video quality options are available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The available quality depends on the original upload. If a creator uploaded in 1080p or 4K, you'll see those options. Most TikTok videos are available in at least 720p HD. We show the exact resolution and estimated file size for each option so you can choose the best one."
      }
    },
    {
      "@type": "Question",
      "name": "Does this work on iPhone and Android?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, TikTok 4K Video Downloader works in any modern web browser on iPhone, iPad, Android phones and tablets, as well as Windows, Mac, and Linux desktops. On iOS, videos are prepared for saving to your camera roll or sharing via AirDrop."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need to install an app?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, the tool runs entirely in your web browser. There's nothing to install. However, iPhone users can optionally add our site to their Home Screen for quick app-like access using our Install page."
      }
    },
    {
      "@type": "Question",
      "name": "Why can't I download a specific video?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "There are a few common reasons: the video may be set to private or friends-only, the link may have expired, or TikTok may have removed the content. Only public videos can be downloaded. Try copying a fresh link directly from TikTok and pasting it again."
      }
    },
    {
      "@type": "Question",
      "name": "Is it legal to download TikTok videos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Downloading publicly available videos for personal, non-commercial use is generally acceptable in most jurisdictions. However, you should always respect the original creator's intellectual property rights. Do not re-upload or redistribute content without the creator's permission."
      }
    },
    {
      "@type": "Question",
      "name": "Can I download TikTok slideshows and photo carousels?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! We have a dedicated Slideshow Downloader that extracts all photos from TikTok photo carousels in full HD resolution. Just paste the slideshow link and save each image individually."
      }
    },
    {
      "@type": "Question",
      "name": "What is the TikTok Profile Analyzer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our Profile Analyzer lets you look up any public TikTok creator's profile and view their follower count, total likes, video count, and other engagement metrics — all without needing a TikTok account."
      }
    },
    {
      "@type": "Question",
      "name": "Do you store my downloaded videos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. We do not store any video content on our servers. Videos are proxied in real time directly from TikTok's CDN to your device. Your recent download history is stored only in your browser's local storage and never leaves your device."
      }
    }
  ]
};

export default function FAQ() {
  const faqs = faqJsonLd.mainEntity;

  return (
    <>
      <SEOHead
        title="FAQ — TikTok 4K Video Downloader Questions Answered"
        description="Frequently asked questions about TikTok 4K Video Downloader. Learn about video quality, device compatibility, watermark removal, legality, and more."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-body leading-relaxed">
          Everything you need to know about downloading TikTok videos, slideshows, and using our free tools. Can't find your answer?{" "}
          <a href="mailto:tiktok4kvideodownloader@proton.me" className="text-primary hover:underline">Contact us</a>.
        </p>

        <div className="mt-8 space-y-8">
          {faqs.map((faq, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-heading mt-0 mb-2">{faq.name}</h2>
              <p className="text-body leading-relaxed mt-0">{faq.acceptedAnswer.text}</p>
            </section>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-heading mt-12">Still Have Questions?</h2>
        <p className="text-body leading-relaxed">
          If your question isn't answered above, feel free to reach out to us at{" "}
          <a href="mailto:tiktok4kvideodownloader@proton.me" className="text-primary hover:underline">
            tiktok4kvideodownloader@proton.me
          </a>. You can also check our <a href="/how-to-download" className="text-primary hover:underline">step-by-step guide</a>{" "}
          or read more on the <a href="/about" className="text-primary hover:underline">About page</a>.
        </p>
      </article>
    </>
  );
}
