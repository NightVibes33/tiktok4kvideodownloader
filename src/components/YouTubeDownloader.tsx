import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Link2, Loader2, Play, Eye, ChevronDown, Copy, Check, Sparkles, X, ClipboardPaste, Music, Shield, Youtube } from "lucide-react";
import BuyMeCoffee from "./BuyMeCoffee";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */

interface QualityOption {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  hasAudio: boolean;
  container: string;
}

interface YTData {
  id: string;
  description: string;
  author: { username: string; nickname: string; avatar: string };
  video: {
    url: string;
    cover: string;
    duration: number;
    ratio: string;
    width: number;
    height: number;
  };
  qualities: QualityOption[];
  audio: QualityOption | null;
  stats: { playCount?: number };
}

/* ── Helpers ── */

function isYouTubeUrl(text: string) {
  return /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com\/(watch|shorts|embed|live|v)|youtu\.be\/)/i.test(text.trim());
}

function getQualityTier(q: QualityOption | null): { label: string } | null {
  if (!q) return null;
  const maxDim = Math.max(q.width, q.height);
  if (maxDim >= 2160) return { label: "4K" };
  if (maxDim >= 1440) return { label: "1440p" };
  if (maxDim >= 1080) return { label: "Full HD" };
  if (maxDim >= 720) return { label: "HD" };
  if (maxDim >= 480) return { label: "SD" };
  if (maxDim > 0) return { label: `${maxDim}p` };
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(1) + " GB";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + " KB";
  return bytes + " B";
}

function estimateFileSize(bitrate: number, duration: number): string | null {
  if (duration <= 0 || bitrate <= 0) return null;
  return formatBytes((bitrate / 8) * duration);
}

function formatCount(num?: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function formatDuration(sec: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function buildProxyUrl(data: YTData, quality: QualityOption, download = false, audio = false): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const ext = audio ? (quality.container === "webm" ? "webm" : "m4a") : quality.container === "webm" ? "webm" : "mp4";
  const params = new URLSearchParams({
    videoUrl: quality.url,
    filename: `youtube-${data.id}.${ext}`,
    apikey: anonKey,
  });
  if (download) params.set("download", "1");
  return `${supabaseUrl}/functions/v1/youtube-download?${params.toString()}`;
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
      <div className="relative w-full md:w-64 aspect-video bg-secondary shrink-0 rounded-xl overflow-hidden">
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
    <div className="relative w-full md:w-64 aspect-video bg-secondary shrink-0 rounded-xl overflow-hidden group/preview">
      {cover && <img src={cover} alt="Video thumbnail" className="w-full h-full object-cover" />}
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

function QualitySelector({
  qualities,
  selectedQuality,
  onSelect,
  duration,
}: {
  qualities: QualityOption[];
  selectedQuality: number;
  onSelect: (i: number) => void;
  duration: number;
}) {
  const formatOptionLabel = (q: QualityOption) => {
    const parts = [q.label];
    if (q.width > 0 && q.height > 0) parts.push(`${q.width}×${q.height}`);
    const size = estimateFileSize(q.bitrate, duration);
    if (size) parts.push(size);
    return parts.join(" · ");
  };

  if (qualities.length <= 1) return null;

  return (
    <div className="relative">
      <label className="text-[10px] text-dim uppercase tracking-widest mb-1.5 block font-mono">Quality</label>
      <div className="relative">
        <select
          value={selectedQuality}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="w-full appearance-none bg-secondary ring-1 ring-border rounded-xl px-3 py-3 pr-8 text-sm text-heading tabular outline-none focus:ring-2 focus:ring-primary/50 transition-all ease-expo duration-200 cursor-pointer font-mono"
        >
          {qualities.map((q, i) => (
            <option key={i} value={i}>
              {formatOptionLabel(q)}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function DownloadActions({
  downloadUrl,
  audioDownloadUrl,
  qualityCount,
  hasAudioTrack,
}: {
  downloadUrl: string;
  audioDownloadUrl: string;
  qualityCount: number;
  hasAudioTrack: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const saveFrom = useCallback(async (url: string, fallbackName: string) => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Download failed");
    const blob = await resp.blob();
    const file = new File([blob], fallbackName, { type: blob.type });
    if (isIOSDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fallbackName });
        return;
      } catch { /* fall through */ }
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    try {
      await saveFrom(downloadUrl, "youtube-video.mp4");
    } catch {
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [downloadUrl, downloading, saveFrom]);

  const handleAudioDownload = useCallback(async () => {
    if (!audioDownloadUrl || downloadingAudio) return;
    setDownloadingAudio(true);
    try {
      await saveFrom(audioDownloadUrl, "youtube-audio.m4a");
    } catch {
      window.open(audioDownloadUrl, "_blank");
    } finally {
      setDownloadingAudio(false);
    }
  }, [audioDownloadUrl, downloadingAudio, saveFrom]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [downloadUrl]);

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

      {audioDownloadUrl && (
        <button
          onClick={handleAudioDownload}
          disabled={downloadingAudio}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-accent/15 hover:bg-accent/25 text-accent ring-1 ring-accent/30 hover:ring-accent/50 rounded-xl font-semibold text-sm transition-all ease-expo duration-200"
        >
          {downloadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
          {downloadingAudio ? "Preparing Audio" : "Download Audio (M4A)"}
        </button>
      )}

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary hover:bg-secondary/80 text-heading rounded-xl text-sm font-medium transition-all ease-expo duration-200 ring-1 ring-border hover:ring-primary/30"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied!" : "Copy Download Link"}
      </button>

      <p className="text-[10px] text-center text-dim uppercase tracking-widest font-mono">
        {qualityCount} quality option{qualityCount !== 1 ? "s" : ""}
        {hasAudioTrack ? " · video + audio" : " · video only stream"}
      </p>
    </div>
  );
}

/* ── Main Component ── */

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<YTData | null>(null);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedQuality(0);
  }, [data]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isYouTubeUrl(trimmed)) {
      setError("Please paste a YouTube video URL (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: res, error: fnError } = await supabase.functions.invoke("youtube-scraper", {
        body: { url: trimmed },
      });
      if (fnError) throw new Error(fnError.message);
      if (res?.error) throw new Error(res.error);
      if (!res?.qualities?.length) {
        throw new Error("No downloadable streams found. The video may be private, age-restricted or region-locked.");
      }
      setData(res as YTData);
    } catch (err: any) {
      setError(err.message || "Failed to extract video data");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = useCallback(async () => {
    if (url) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && isYouTubeUrl(text)) setUrl(text.trim());
    } catch { /* ignore */ }
  }, [url]);

  const handlePasteButton = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch { /* ignore */ }
  }, []);

  const qualities = data?.qualities || [];
  const activeQuality = qualities[selectedQuality] || qualities[0] || null;
  const qualityTier = getQualityTier(activeQuality);
  const previewUrl = data && activeQuality ? buildProxyUrl(data, activeQuality, false) : "";
  const downloadUrl = data && activeQuality ? buildProxyUrl(data, activeQuality, true) : "";
  const audioDownloadUrl = data?.audio ? buildProxyUrl(data, data.audio, true, true) : "";

  return (
    <div className="theme-youtube w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-2 ring-primary/20 shadow-lg shadow-primary/10 flex items-center justify-center">
            <Youtube className="w-9 h-9 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading tracking-tight">
            YouTube <span className="text-primary">Downloader</span>
          </h1>
          <p className="text-sm text-dim mt-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Paste a link · Pick quality · Save MP4
          </p>
        </div>
      </div>

      {/* Input */}
      <form id="youtube-form" onSubmit={handleFetch} className="relative group space-y-2">
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
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-secondary/80 backdrop-blur-sm border-0 ring-1 ring-border focus:ring-2 focus:ring-primary/50 rounded-2xl py-4 pl-11 pr-36 text-heading placeholder:text-muted-foreground transition-all ease-expo duration-200 outline-none text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={handlePasteFromClipboard}
          />
          {url && !loading && (
            <button
              type="button"
              onClick={() => { setUrl(""); setError(null); setData(null); inputRef.current?.focus(); }}
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
        {!url && !loading && !data && (
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
      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="surface-elevated rounded-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <VideoPreview cover={data.video.cover} streamUrl={previewUrl} />

              <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-heading">{data.author.nickname || "Unknown channel"}</p>
                    <p className="text-xs text-dim font-mono">{formatDuration(data.video.duration)}</p>
                  </div>

                  {data.description && (
                    <div>
                      <p className={`text-sm text-body leading-relaxed ${!descriptionExpanded ? "line-clamp-3" : ""}`}>
                        {data.description}
                      </p>
                      {data.description.length > 100 && (
                        <button
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          {descriptionExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 text-[11px] font-mono uppercase tracking-wider text-dim tabular">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-primary" /> {formatCount(data.stats.playCount)} views
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {qualityTier && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider ring-1 ${
                        qualityTier.label === "4K" || qualityTier.label === "1440p"
                          ? "bg-accent/15 text-accent ring-accent/30"
                          : qualityTier.label === "Full HD" || qualityTier.label === "HD"
                          ? "bg-primary/15 text-primary ring-primary/30"
                          : "bg-secondary text-muted-foreground ring-border"
                      }`}>
                        <Shield className="w-3 h-3" />
                        {qualityTier.label}
                      </span>
                      <span className="text-[10px] text-dim">
                        {activeQuality && activeQuality.width > 0
                          ? `${activeQuality.width}×${activeQuality.height}`
                          : "best available"}
                        {activeQuality && (() => {
                          const size = estimateFileSize(activeQuality.bitrate, data.video.duration);
                          return size ? ` · ${size}` : "";
                        })()}
                      </span>
                    </div>
                  )}

                  <QualitySelector
                    qualities={qualities}
                    selectedQuality={selectedQuality}
                    onSelect={setSelectedQuality}
                    duration={data.video.duration}
                  />

                  <DownloadActions
                    downloadUrl={downloadUrl}
                    audioDownloadUrl={audioDownloadUrl}
                    qualityCount={qualities.length}
                    hasAudioTrack={!!activeQuality?.hasAudio}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      {!data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🎬", title: "Best Quality", desc: "Up to source res" },
            { icon: "🎧", title: "Audio Only", desc: "Grab the M4A" },
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

      <BuyMeCoffee />

      <section className="space-y-5">
        <h2 className="text-lg font-bold text-heading text-center">How to Download YouTube Videos</h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Copy the YouTube Link", desc: "Open YouTube, tap Share on the video and choose \"Copy link\". Full watch URLs, youtu.be short links and Shorts links all work." },
            { step: "2", title: "Paste & Extract", desc: "Paste the URL above and hit \"Extract\". We read the available streams straight from YouTube and list every resolution we can serve." },
            { step: "3", title: "Choose Quality & Download", desc: "Pick a resolution and click \"Download Video\". Higher resolutions are stored by YouTube as separate video and audio tracks — those options are labelled \"video only\", and you can grab the matching audio with the Download Audio button." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 p-4 rounded-2xl bg-secondary/40 ring-1 ring-border/40">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/15 text-primary font-mono font-bold text-sm flex items-center justify-center">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">{s.title}</p>
                <p className="text-xs text-body leading-relaxed mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-dim leading-relaxed">
          Only download videos you own or have permission to save. Respect YouTube's Terms of Service and copyright law.
        </p>
      </section>
    </div>
  );
}