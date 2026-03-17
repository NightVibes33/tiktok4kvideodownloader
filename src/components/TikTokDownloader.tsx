import { useState } from "react";
import { Download, Link2, Loader2, Play, Heart, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  stats: {
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
    playCount?: number;
  };
}

function formatCount(num?: number): string {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

export default function TikTokDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!videoData) return;
    setDownloading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("tiktok-download", {
        body: {
          videoUrl: videoData.video.url,
          filename: `tiktok-${videoData.id}.mp4`,
        },
      });

      if (fnError) throw new Error(fnError.message);

      // data is already a Blob from the function response
      const blob = data instanceof Blob ? data : new Blob([data], { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `tiktok-${videoData.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError("Download failed: " + (err.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setVideoData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("tiktok-scraper", {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setVideoData(data);
    } catch (err: any) {
      setError(err.message || "Failed to extract video data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-svh bg-background text-foreground selection:bg-accent/30 selection:text-accent-foreground p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium text-heading tracking-tight">
            Media Extractor
          </h1>
          <p className="text-sm text-dim">
            Enter a TikTok URL to fetch the direct MP4 stream.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleFetch} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Link2 className="w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors ease-expo duration-200" />
          </div>
          <input
            type="text"
            placeholder="https://www.tiktok.com/@user/video/..."
            className="w-full bg-secondary border-0 ring-1 ring-border focus:ring-2 focus:ring-accent/50 rounded-xl py-4 pl-11 pr-32 text-heading placeholder:text-muted-foreground transition-all ease-expo duration-200 outline-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-2 top-2 bottom-2 px-4 bg-primary hover:bg-primary/90 disabled:bg-secondary text-primary-foreground disabled:text-muted-foreground font-medium rounded-lg text-sm transition-all ease-expo duration-200 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-accent/10 ring-1 ring-accent/20 rounded-xl text-accent text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {videoData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="surface-elevated rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Preview */}
                <div className="relative w-full md:w-48 aspect-[9/16] bg-secondary">
                  {videoData.video.cover && (
                    <img
                      src={videoData.video.cover}
                      alt="Video cover"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                    <Play className="w-8 h-8 text-accent-foreground fill-accent-foreground/20" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {videoData.author.avatar && (
                        <img
                          src={videoData.author.avatar}
                          className="w-8 h-8 rounded-full ring-1 ring-border"
                          alt=""
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-heading">
                          @{videoData.author.username}
                        </p>
                        <p className="text-xs text-dim">{videoData.author.nickname}</p>
                      </div>
                    </div>

                    {videoData.description && (
                      <p className="text-sm text-body line-clamp-3 leading-relaxed">
                        {videoData.description}
                      </p>
                    )}

                    <div className="flex gap-4 text-[11px] font-mono uppercase tracking-wider text-dim tabular">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {formatCount(videoData.stats.diggCount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {formatCount(videoData.stats.commentCount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> {formatCount(videoData.stats.shareCount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary text-xs tabular">
                      <span className="text-dim uppercase tracking-wider">Quality</span>
                      <span className="text-heading font-medium">
                        {videoData.video.ratio || `${videoData.video.width}×${videoData.video.height}`}
                        {videoData.video.width > 0 && videoData.video.height > 0 && videoData.video.ratio && (
                          <span className="text-dim ml-2">({videoData.video.width}×{videoData.video.height})</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground rounded-xl font-medium transition-colors ease-expo duration-200 shadow-lg shadow-accent/20"
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {downloading ? "Downloading…" : "Save to Device"}
                    </button>
                    <p className="text-[10px] text-center text-dim uppercase tracking-widest">
                      Proxied download · works on iOS Safari
                    </p>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
