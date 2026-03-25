import { useState, useCallback, useRef } from "react";
import { Link2, Loader2, Download, X, ClipboardPaste, Sparkles, Images } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function SlideshowDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(trimmed)) {
      setError("Please paste a TikTok slideshow URL");
      return;
    }

    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("tiktok-scraper", {
        body: { url: trimmed },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const slideImages: string[] = data?.images || [];

      if (slideImages.length === 0) {
        throw new Error("No slideshow images found. This may be a regular video — try the video downloader instead.");
      }

      setImages(slideImages);
    } catch (err: any) {
      setError(err.message || "Failed to extract slideshow data");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteButton = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch { /* clipboard permission denied */ }
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    if (url) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(text.trim())) {
        setUrl(text.trim());
      }
    } catch { /* ignore */ }
  }, [url]);

  return (
    <>
      <SEOHead
        title="TikTok Slideshow Downloader — Save Photos in HD"
        description="Download TikTok slideshow photos in HD quality. Save all images from TikTok photo carousels instantly. Free, no signup required."
        path="/slideshow-downloader"
      />
      <div className="w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
        {/* Header */}
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
            <p className="text-sm text-dim mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Paste a slideshow link · Save all photos in HD
            </p>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleFetch} className="relative group space-y-2">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              {loading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors ease-expo duration-200" />
              )}
            </div>
            <input
              ref={inputRef}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.tiktok.com/@user/photo/..."
              className="w-full bg-secondary/80 backdrop-blur-sm border-0 ring-1 ring-border focus:ring-2 focus:ring-primary/50 rounded-2xl py-4 pl-11 pr-36 text-heading placeholder:text-muted-foreground transition-all ease-expo duration-200 outline-none text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={handlePasteFromClipboard}
            />
            {url && !loading && (
              <button
                type="button"
                onClick={() => { setUrl(""); setError(null); setImages([]); inputRef.current?.focus(); }}
                className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-heading hover:bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="absolute right-2 top-2 bottom-2 px-5 bg-primary hover:bg-primary/85 disabled:bg-secondary text-primary-foreground disabled:text-muted-foreground font-semibold rounded-xl text-sm transition-all ease-expo duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Extracting</span>
                </>
              ) : (
                "Extract"
              )}
            </button>
          </div>
          {!url && !loading && images.length === 0 && (
            <button
              type="button"
              onClick={handlePasteButton}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-dim hover:text-heading rounded-xl bg-secondary/40 hover:bg-secondary/70 ring-1 ring-border/30 hover:ring-border transition-all duration-200"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste from clipboard
            </button>
          )}
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 ring-1 ring-destructive/20 rounded-2xl text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {images.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-dim text-center font-mono uppercase tracking-wider">
              {images.length} photo{images.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-2 gap-3">
              {images.map((imgUrl, i) => (
                <div key={i} className="relative group/img rounded-xl overflow-hidden ring-1 ring-border/50 bg-secondary">
                  <img
                    src={imgUrl}
                    alt={`Slide ${i + 1}`}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <a
                    href={imgUrl}
                    download={`tiktok-slide-${i + 1}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                      <Download className="w-4 h-4" />
                      Save
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {images.length === 0 && !error && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🖼️", title: "HD Photos", desc: "Full resolution" },
              { icon: "📸", title: "All Slides", desc: "Every image" },
              { icon: "⚡", title: "Fast & Free", desc: "Instant save" },
            ].map((f) => (
              <div key={f.title} className="text-center p-4 rounded-2xl bg-secondary/50 ring-1 ring-border/50">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-xs font-semibold text-heading">{f.title}</p>
                <p className="text-[10px] text-dim mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
