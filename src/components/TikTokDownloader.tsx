import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Link2, Loader2, Play, Heart, MessageCircle, Share2, ChevronDown, Copy, Check, Sparkles, X, ClipboardPaste, TrendingUp } from "lucide-react";
import AdBanner from "./AdBanner";
import BuyMeCoffee from "./BuyMeCoffee";
import DownloadHistory from "./DownloadHistory";
import { supabase } from "@/integrations/supabase/client";
import { useDownloadHistory } from "@/hooks/use-download-history";
import tiktokLogo from "@/assets/tiktok-logo.jpeg";

/* ── Types ── */

interface QualityOption {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  watermark: boolean;
}

interface VideoData {
  id: string;
  description: string;
  author: {
    username: string;
    nickname: string;
    avatar: string;
  };
  video: {
    url: string;
    cover: string;
    dynamicCover: string;
    duration: number;
    ratio: string;
    width: number;
    height: number;
  };
  qualities: QualityOption[];
  stats: {
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
    playCount?: number;
  };
  cookies: string;
}

/* ── Helpers ── */

function formatCount(num?: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function buildVideoProxyUrl(videoData: VideoData, quality: QualityOption, download = false): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const params = new URLSearchParams({
    videoUrl: quality.url,
    filename: `tiktok-${videoData.id}.mp4`,
    apikey: anonKey,
  });
  if (download) params.set("download", "1");
  if (videoData.cookies) params.set("cookies", videoData.cookies);
  return `${supabaseUrl}/functions/v1/tiktok-download?${params.toString()}`;
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/* ── Sub-components ── */

function VideoPreview({ cover, streamUrl }: { cover: string; streamUrl?: string }) {
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (playing && streamUrl && !videoError) {
    return (
      <div className="relative w-full md:w-52 aspect-[9/16] bg-secondary shrink-0 rounded-xl overflow-hidden">
        <video
          src={streamUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-background"
          onError={() => setVideoError(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full md:w-52 aspect-[9/16] bg-secondary shrink-0 rounded-xl overflow-hidden group/preview">
      {cover && (
        <img src={cover} alt="Video cover" className="w-full h-full object-cover" />
      )}
      <button
        onClick={() => streamUrl && setPlaying(true)}
        className="absolute inset-0 flex items-center justify-center bg-background/30 group-hover/preview:bg-background/50 transition-all duration-300 cursor-pointer"
        disabled={!streamUrl}
      >
        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center glow-primary transition-transform duration-300 group-hover/preview:scale-110">
          <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground/50 ml-0.5" />
        </div>
      </button>
      {videoError && (
        <div className="absolute bottom-0 inset-x-0 bg-destructive/90 text-destructive-foreground text-[10px] text-center py-1.5 font-medium">
          Unplayable — try another quality
        </div>
      )}
    </div>
  );
}

function AuthorInfo({ author }: { author: VideoData["author"] }) {
  return (
    <div className="flex items-center gap-3">
      {author.avatar && (
        <img
          src={author.avatar}
          className="w-9 h-9 rounded-full ring-2 ring-primary/30"
          alt={`@${author.username}`}
        />
      )}
      <div>
        <p className="text-sm font-semibold text-heading">@{author.username}</p>
        <p className="text-xs text-dim">{author.nickname}</p>
      </div>
    </div>
  );
}

function StatsRow({ stats }: { stats: VideoData["stats"] }) {
  return (
    <div className="flex gap-4 text-[11px] font-mono uppercase tracking-wider text-dim tabular">
      <div className="flex items-center gap-1.5">
        <Heart className="w-3 h-3 text-primary" /> {formatCount(stats.diggCount)}
      </div>
      <div className="flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3 text-accent" /> {formatCount(stats.commentCount)}
      </div>
      <div className="flex items-center gap-1.5">
        <Share2 className="w-3 h-3 text-primary" /> {formatCount(stats.shareCount)}
      </div>
    </div>
  );
}

function QualitySelector({
  qualities,
  selectedQuality,
  onSelect,
  fallbackLabel,
}: {
  qualities: QualityOption[];
  selectedQuality: number;
  onSelect: (i: number) => void;
  fallbackLabel: string;
}) {
  if (qualities.length > 1) {
    return (
      <div className="relative">
        <label className="text-[10px] text-dim uppercase tracking-widest mb-1.5 block font-mono">
          Quality
        </label>
        <div className="relative">
          <select
            value={selectedQuality}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="w-full appearance-none bg-secondary ring-1 ring-border rounded-xl px-3 py-3 pr-8 text-sm text-heading tabular outline-none focus:ring-2 focus:ring-primary/50 transition-all ease-expo duration-200 cursor-pointer font-mono"
          >
            {qualities.map((q, i) => (
              <option key={i} value={i}>
                {q.label}
                {q.width > 0 && q.height > 0 ? ` — ${q.width}×${q.height}` : ""}
                {q.bitrate > 0 ? ` · ${Math.round(q.bitrate / 1000)}kbps` : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary text-xs tabular font-mono">
      <span className="text-dim uppercase tracking-wider">Quality</span>
      <span className="text-heading font-medium">
        {qualities[0]?.label || fallbackLabel}
      </span>
    </div>
  );
}

function DownloadActions({
  downloadUrl,
  qualityCount,
  onDownload,
}: {
  downloadUrl: string;
  qualityCount: number;
  onDownload?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = downloadUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [downloadUrl]);

  const handleDownload = useCallback(async () => {
    if (!downloadUrl || downloading) return;

    if (!isIOSDevice()) {
      onDownload?.();
      window.open(downloadUrl, "_top", "noopener,noreferrer");
      return;
    }

    setDownloading(true);
    onDownload?.();
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Failed to download video");

      const blob = await response.blob();
      const file = new File([blob], "tiktok-video.mp4", { type: blob.type || "video/mp4" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "TikTok Video" });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch {
      window.open(downloadUrl, "_top", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }, [downloadUrl, downloading]);

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={!downloadUrl || downloading}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-primary hover:bg-primary/85 disabled:bg-secondary text-primary-foreground disabled:text-muted-foreground rounded-xl font-semibold transition-all ease-expo duration-200 glow-primary hover:shadow-[0_0_30px_hsl(var(--glow-primary)/0.4)]"
      >
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {downloading ? "Preparing Download" : "Download Video"}
      </button>

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary hover:bg-secondary/80 text-heading rounded-xl text-sm font-medium transition-all ease-expo duration-200 ring-1 ring-border hover:ring-primary/30"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied!" : "Copy Download Link"}
      </button>

      <p className="text-[10px] text-center text-dim uppercase tracking-widest font-mono">
        {qualityCount} quality option{qualityCount !== 1 ? "s" : ""} · no watermark
      </p>
      <p className="text-xs text-center text-dim">
        On iPhone, download prepares the file first so it can be saved or shared.
      </p>
    </div>
  );
}

/* ── Main Component ── */

export default function TikTokDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } = useDownloadHistory();

  useEffect(() => {
    supabase
      .from("download_counter")
      .select("total_downloads")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setTotalDownloads(data.total_downloads);
      });
  }, []);

  const incrementDownloads = useCallback(async () => {
    const { data } = await supabase.rpc("increment_downloads");
    if (typeof data === "number") setTotalDownloads(data);
    if (videoData) {
      addToHistory({
        id: videoData.id,
        url: url.trim(),
        description: videoData.description,
        author: videoData.author.username,
        avatar: videoData.author.avatar,
        cover: videoData.video.cover,
      });
    }
  }, [videoData, url, addToHistory]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(trimmed)) {
      setError("Please paste a TikTok video URL (e.g. https://www.tiktok.com/@user/video/...)");
      return;
    }

    setLoading(true);
    setError(null);
    setVideoData(null);
    setSelectedQuality(0);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("tiktok-scraper", {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.qualities?.length && !data?.video?.url) {
        throw new Error("No downloadable video found. The video may be private or region-locked.");
      }

      setVideoData(data);
    } catch (err: any) {
      setError(err.message || "Failed to extract video data");
    } finally {
      setLoading(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const isTikTokUrl = (text: string) => /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(text.trim());

  const handleReuse = useCallback((reUrl: string) => {
    setUrl(reUrl);
    setError(null);
    setVideoData(null);
    inputRef.current?.focus();
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    if (url) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && isTikTokUrl(text)) {
        setUrl(text.trim());
      }
    } catch { /* clipboard permission denied — ignore */ }
  }, [url]);

  const handlePasteButton = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch { /* clipboard permission denied — ignore */ }
  }, []);

  const qualities = (videoData?.qualities || []).filter((q) => !q.watermark);
  const activeQuality = qualities[selectedQuality] || qualities[0] || videoData?.qualities?.[0] || null;
  const previewUrl = videoData && activeQuality ? buildVideoProxyUrl(videoData, activeQuality, false) : "";
  const downloadUrl = videoData && activeQuality ? buildVideoProxyUrl(videoData, activeQuality, true) : "";

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src={tiktokLogo}
              alt="TikTok Downloader"
              className="w-16 h-16 rounded-2xl ring-2 ring-primary/20 shadow-lg shadow-primary/10"
            />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
              TikTok <span className="text-gradient">Downloader</span>
            </h1>
            <p className="text-sm text-dim mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Paste a link · Pick quality · Save HD MP4
            </p>
          </div>
          </div>
          {totalDownloads !== null && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-dim font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-heading font-semibold">{formatCount(totalDownloads)}</span> videos downloaded worldwide
            </div>
          )}
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
              placeholder="https://www.tiktok.com/@user/video/..."
              className="w-full bg-secondary/80 backdrop-blur-sm border-0 ring-1 ring-border focus:ring-2 focus:ring-primary/50 rounded-2xl py-4 pl-11 pr-36 text-heading placeholder:text-muted-foreground transition-all ease-expo duration-200 outline-none text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={handlePasteFromClipboard}
            />
            {url && !loading && (
              <button
                type="button"
                onClick={() => { setUrl(""); setError(null); setVideoData(null); inputRef.current?.focus(); }}
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
          {!url && !loading && !videoData && (
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
          <div className="p-4 bg-destructive/10 ring-1 ring-destructive/20 rounded-2xl text-destructive text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {/* Result */}
        {videoData && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="surface-elevated rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <VideoPreview cover={videoData.video.cover} streamUrl={previewUrl} />

                <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <AuthorInfo author={videoData.author} />

                    {videoData.description && (
                      <p className="text-sm text-body line-clamp-3 leading-relaxed">
                        {videoData.description}
                      </p>
                    )}

                    <StatsRow stats={videoData.stats} />
                  </div>

                  <div className="space-y-3">
                    <QualitySelector
                      qualities={qualities}
                      selectedQuality={selectedQuality}
                      onSelect={setSelectedQuality}
                      fallbackLabel={videoData.video.ratio || `${videoData.video.width}×${videoData.video.height}`}
                    />

                    <DownloadActions
                      downloadUrl={downloadUrl}
                      qualityCount={qualities.length}
                      onDownload={incrementDownloads}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!videoData && (
          <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-700 delay-200">
            {[
              { icon: "🎬", title: "HD Quality", desc: "Up to 4K" },
              { icon: "💨", title: "No Watermark", desc: "Clean videos" },
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

        <DownloadHistory
          history={history}
          onReuse={handleReuse}
          onRemove={removeFromHistory}
          onClear={clearHistory}
        />

        <BuyMeCoffee />
        <AdBanner />

        {/* FAQ */}
        {(() => {
          const faqs = [
            { q: "How does this work?", a: "Paste a TikTok video link and we extract the direct MP4 stream from TikTok's servers. No account or login required." },
            { q: "What formats are supported?", a: "Videos are downloaded as MP4 files, which play on virtually every device and platform." },
            { q: "Is the watermark removed?", a: "Yes — we fetch the original HD source without the TikTok watermark whenever available." },
            { q: "Is it free?", a: "100% free with no limits. If you find it useful, consider buying us a coffee!" },
            { q: "Does it work on iPhone?", a: "Yes! On iOS the download button prepares the file so you can save it to your camera roll or share it directly." },
            { q: "Why did my download fail?", a: "Some videos are private, region-locked, or have expired links. Try refreshing the extraction or check if the video is still public on TikTok." },
          ];
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          };
          return (
            <section className="space-y-3">
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
              <h2 className="text-lg font-bold text-heading text-center">Frequently Asked Questions</h2>
              {faqs.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl bg-secondary/50 ring-1 ring-border/50 overflow-hidden">
                  <summary className="px-4 py-3.5 text-sm font-medium text-heading cursor-pointer flex items-center justify-between list-none">
                    {q}
                    <ChevronDown className="w-4 h-4 text-dim transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-body leading-relaxed">{a}</div>
                </details>
              ))}
            </section>
          );
        })()}

    </div>
  );
}
