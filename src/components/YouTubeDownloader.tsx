import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  Link2,
  Loader2,
  Music,
  Shield,
  Sparkles,
  X,
  Youtube,
} from "lucide-react";
import BuyMeCoffee from "./BuyMeCoffee";

type DownloadKind = "video" | "audio";

type RelayResponse = {
  status?: string;
  url?: string;
  filename?: string;
  processor?: string;
  error?: string;
  failures?: Array<{ processor?: string; error?: string }>;
};

type DownloadResult = {
  filename: string;
  size: number;
  processor: string;
  kind: DownloadKind;
};

const BUILD_RELAY = (import.meta.env.VITE_COBALT_RELAY || "").trim();
const STATIC_RELAYS = [
  "https://tiktok4kvideodownloader.vercel.app/api/cobalt",
  "https://tiktok4kvideodownloader-nc54.vercel.app/api/cobalt",
];

function relayList() {
  return [...new Set([BUILD_RELAY, ...STATIC_RELAYS].filter(Boolean))];
}

function isYouTubeUrl(text: string) {
  try {
    const u = new URL(text.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
  } catch {
    return false;
  }
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

function normalizeFilename(name: string | undefined, kind: DownloadKind) {
  const fallback = kind === "video" ? "youtube-video.mp4" : "youtube-audio.mp3";
  const cleaned = (name || fallback).replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || fallback;
}

async function saveFile(file: File) {
  if (isIOSDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("1080");
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [stage, setStage] = useState("Ready");
  const [detail, setDetail] = useState("Paste a YouTube URL and choose a format.");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const relays = useMemo(() => relayList(), []);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      inputRef.current?.focus();
    }
  }, []);

  const fetchMediaFile = useCallback(async (
    mediaUrl: string,
    filename: string,
    processor: string,
    kind: DownloadKind,
  ) => {
    const controller = new AbortController();
    let stallTimer: number | undefined;
    const armStallTimer = () => {
      if (stallTimer) window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => controller.abort("The media stream stopped sending data."), 25_000);
    };

    armStallTimer();
    const response = await fetch(mediaUrl, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      if (stallTimer) window.clearTimeout(stallTimer);
      throw new Error(`media HTTP ${response.status}`);
    }
    if (!response.body) {
      if (stallTimer) window.clearTimeout(stallTimer);
      throw new Error("processor returned no media body");
    }

    const exactLength = Number(response.headers.get("content-length") || 0);
    const estimatedLength = Number(response.headers.get("estimated-content-length") || 0);
    const targetLength = exactLength > 0 ? exactLength : estimatedLength;
    const mime = response.headers.get("content-type") || (kind === "video" ? "video/mp4" : "audio/mpeg");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.byteLength) continue;
        armStallTimer();
        chunks.push(value);
        received += value.byteLength;
        const pct = targetLength > 0
          ? Math.min(94, Math.max(8, (received / targetLength) * 90))
          : Math.min(94, 8 + Math.log10(Math.max(received, 1)) * 11);
        setProgress(pct);
        setStage(kind === "video" ? "Downloading video…" : "Downloading audio…");
        setDetail(targetLength > 0 ? `${formatBytes(received)} / ~${formatBytes(targetLength)}` : `${formatBytes(received)} received`);
      }
    } finally {
      if (stallTimer) window.clearTimeout(stallTimer);
      reader.releaseLock();
    }

    if (received <= 0) throw new Error("processor completed with 0 bytes");

    const blob = new Blob(chunks, { type: mime });
    if (blob.size <= 0) throw new Error("safety check rejected a 0-byte file");

    const file = new File([blob], filename, { type: mime, lastModified: Date.now() });
    if (file.size <= 0) throw new Error("final file is 0 bytes");

    setProgress(100);
    setStage("File verified");
    setDetail(`${formatBytes(file.size)} • ${processor}`);
    setResult({ filename: file.name, size: file.size, processor, kind });
    await saveFile(file);
    return file;
  }, []);

  const startDownload = useCallback(async (kind: DownloadKind) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a YouTube URL first.");
      return;
    }
    if (!isYouTubeUrl(trimmed)) {
      setError("That is not a supported YouTube URL.");
      return;
    }

    setBusy(kind);
    setError(null);
    setResult(null);
    setProgress(2);
    setStage("Finding a working processor…");
    setDetail("The site is requesting media metadata through its JSON relay.");

    const failures: string[] = [];

    for (const relay of relays) {
      try {
        setStage("Requesting media…");
        setDetail(new URL(relay).hostname);
        setProgress(5);

        const body = kind === "video"
          ? {
              url: trimmed,
              videoQuality: quality,
              downloadMode: "auto",
            }
          : {
              url: trimmed,
              downloadMode: "audio",
            };

        const response = await fetch(relay, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });

        const text = await response.text();
        let data: RelayResponse;
        try {
          data = JSON.parse(text) as RelayResponse;
        } catch {
          throw new Error(`relay HTTP ${response.status} returned invalid JSON`);
        }

        if (!response.ok || data.status !== "tunnel" || !data.url) {
          const reason = data.error || data.failures?.map((f) => `${f.processor || "processor"}: ${f.error || "failed"}`).join(", ") || `relay HTTP ${response.status}`;
          throw new Error(reason);
        }

        const filename = normalizeFilename(data.filename, kind);
        await fetchMediaFile(data.url, filename, data.processor || "Cobalt", kind);
        setBusy(null);
        return;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        failures.push(`${new URL(relay).hostname}: ${message}`);
      }
    }

    setBusy(null);
    setProgress(0);
    setStage("Download failed");
    setDetail("Every relay or processor failed the request.");
    setError(failures.join("\n"));
  }, [fetchMediaFile, quality, relays, url]);

  const disabled = !!busy;

  return (
    <div className="theme-youtube w-full max-w-xl mx-auto space-y-8 selection:bg-primary/30 selection:text-primary-foreground">
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
            GitHub Pages UI • verified browser download
          </p>
        </div>
      </div>

      <section className="surface-elevated rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] text-dim uppercase tracking-widest font-mono">YouTube URL</label>
          <div className="relative">
            <Link2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="url"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => { if (!url) void paste(); }}
              placeholder="https://youtu.be/..."
              className="w-full bg-secondary/80 ring-1 ring-border focus:ring-2 focus:ring-primary/50 rounded-2xl py-4 pl-11 pr-11 text-heading placeholder:text-muted-foreground outline-none text-sm"
            />
            {url && (
              <button
                type="button"
                onClick={() => { setUrl(""); setError(null); setResult(null); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-heading hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => void paste()}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-dim hover:text-heading rounded-xl bg-secondary/40 hover:bg-secondary/70 ring-1 ring-border/30"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste from clipboard
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-dim uppercase tracking-widest font-mono">Video quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            disabled={disabled}
            className="w-full appearance-none bg-secondary ring-1 ring-border rounded-xl px-3 py-3 text-sm text-heading outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          >
            <option value="max">Maximum available</option>
            <option value="2160">2160p / 4K</option>
            <option value="1440">1440p</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || !url.trim()}
            onClick={() => void startDownload("video")}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-primary hover:bg-primary/85 disabled:bg-secondary text-primary-foreground disabled:text-muted-foreground rounded-xl font-semibold transition-all glow-primary"
          >
            {busy === "video" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy === "video" ? "Preparing MP4" : "Download Video"}
          </button>
          <button
            type="button"
            disabled={disabled || !url.trim()}
            onClick={() => void startDownload("audio")}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-accent/15 hover:bg-accent/25 disabled:opacity-50 text-accent ring-1 ring-accent/30 rounded-xl font-semibold transition-all"
          >
            {busy === "audio" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
            {busy === "audio" ? "Preparing MP3" : "Download Audio"}
          </button>
        </div>

        <div className="rounded-2xl bg-secondary/45 ring-1 ring-border/50 p-4 space-y-3">
          <div className="flex gap-3 items-start">
            {busy ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin mt-0.5 shrink-0" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            ) : result ? (
              <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            ) : (
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-heading">{stage}</p>
              <p className="text-xs text-body mt-1 break-words whitespace-pre-wrap">{detail}</p>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-background/70 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>

          {result && (
            <div className="text-[11px] font-mono text-dim flex flex-wrap justify-between gap-2">
              <span>{result.filename}</span>
              <span>{formatBytes(result.size)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 ring-1 ring-destructive/20 rounded-2xl text-destructive text-xs whitespace-pre-wrap break-words">
            {error}
          </div>
        )}
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🎬", title: "MP4", desc: "H.264 video" },
          { icon: "🎧", title: "MP3", desc: "Audio only" },
          { icon: "🛡️", title: "Verified", desc: "Rejects 0-byte files" },
        ].map((item) => (
          <div key={item.title} className="text-center p-4 rounded-2xl bg-secondary/50 ring-1 ring-border/50">
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="text-xs font-semibold text-heading">{item.title}</p>
            <p className="text-[10px] text-dim mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      <BuyMeCoffee />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-heading text-center">How it works</h2>
        {[
          ["1", "Paste the URL", "Paste a public YouTube video you own or have permission to save."],
          ["2", "Choose quality", "Pick 1080p, 4K, or another available quality. A small JSON relay handles the processor's missing browser CORS header."],
          ["3", "Verified save", "The actual media tunnel goes to your browser. Empty or stalled streams are rejected, and the file must be larger than 0 bytes before save/share starts."],
        ].map(([stepNo, titleText, body]) => (
          <div key={stepNo} className="flex gap-4 p-4 rounded-2xl bg-secondary/40 ring-1 ring-border/40">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/15 text-primary font-mono font-bold text-sm flex items-center justify-center">{stepNo}</div>
            <div>
              <p className="text-sm font-semibold text-heading">{titleText}</p>
              <p className="text-xs text-body leading-relaxed mt-1">{body}</p>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-center text-dim leading-relaxed">
          Only download media you own or have permission to save. Processor availability can change over time.
        </p>
      </section>
    </div>
  );
}
