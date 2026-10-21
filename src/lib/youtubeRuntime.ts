/**
 * YouTube download runtime.
 * Metadata is independent of processors; a fresh Cobalt tunnel is requested only
 * when the user clicks Download. Never cache short-lived signed media URLs.
 */
export interface QualityOption {
  label: string;
  url: string; // requested quality identifier, NOT an expiring media URL
  width: number;
  height: number;
  bitrate: number;
  hasAudio: boolean;
  container: string;
}
export interface YTData {
  id: string;
  description: string;
  author: { username: string; nickname: string; avatar: string };
  video: { url: string; cover: string; duration: number; ratio: string; width: number; height: number };
  qualities: QualityOption[];
  audio: QualityOption | null;
  stats: { playCount?: number };
}
interface CobaltReply {
  status?: string;
  url?: string;
  filename?: string;
  error?: string | { code?: string };
}
const QUALITY_SPECS = [
  { url: "max", label: "Maximum available", width: 0, height: 0, bitrate: 0 },
  { url: "2160", label: "Up to 2160p (4K)", width: 3840, height: 2160, bitrate: 0 },
  { url: "1440", label: "Up to 1440p", width: 2560, height: 1440, bitrate: 0 },
  { url: "1080", label: "Up to 1080p", width: 1920, height: 1080, bitrate: 0 },
  { url: "720", label: "Up to 720p", width: 1280, height: 720, bitrate: 0 },
  { url: "480", label: "Up to 480p", width: 854, height: 480, bitrate: 0 },
  { url: "360", label: "Up to 360p", width: 640, height: 360, bitrate: 0 },
];
const FALLBACK_PROCESSORS = [
  "https://cobaltapi.kittycat.boo/",
  "https://rue-cobalt.xenon.zone/",
  "https://dog.kittycat.boo/",
];
const DEFAULT_RELAY = "https://tiktok4kvideodownloader-nc54.vercel.app/api/cobalt";

export function parseYouTubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1] || null;
    else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : null;
      if (!id) id = url.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/]+)/)?.[1] || null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function buildCobaltBody(sourceUrl: string, quality = "1080", audio = false) {
  const id = parseYouTubeVideoId(sourceUrl);
  if (!id) throw new Error("Enter a valid YouTube video or Shorts URL.");
  const url = "https://www.youtube.com/watch?v=" + id;
  return audio
    ? { url, downloadMode: "audio", audioFormat: "mp3", audioBitrate: "128", filenameStyle: "pretty", alwaysProxy: true, localProcessing: "disabled" }
    : { url, downloadMode: "auto", videoQuality: QUALITY_SPECS.some((s) => s.url === quality) ? quality : "1080", youtubeVideoCodec: "h264", youtubeVideoContainer: "mp4", filenameStyle: "pretty", alwaysProxy: true, localProcessing: "disabled" };
}

function relayUrl(): string {
  const configured = String(import.meta.env.VITE_YOUTUBE_RELAY_URL || "").trim();
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) return "/api/cobalt";
  return DEFAULT_RELAY;
}

function errorMessage(data: CobaltReply, status: number): string {
  const code = typeof data.error === "string" ? data.error : data.error?.code;
  if (!code) return "HTTP " + status;
  if (/auth|jwt|api.key|turnstile/i.test(code)) return "Processor requires authentication (configure COBALT_API_URL / COBALT_API_KEY on Vercel).";
  if (/youtube.login|youtube.unavailable|bot/i.test(code)) return "YouTube blocked the processor; try your own configured Cobalt server.";
  return code;
}
async function requestTunnel(endpoint: string, body: ReturnType<typeof buildCobaltBody>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    let reply: CobaltReply;
    try { reply = await response.json() as CobaltReply; }
    catch { throw new Error("Invalid processor response (HTTP " + response.status + ")"); }
    if (!response.ok || !["tunnel", "redirect"].includes(reply.status || "") || !reply.url) {
      throw new Error(errorMessage(reply, response.status));
    }
    const target = new URL(reply.url);
    if (target.protocol !== "https:") throw new Error("Processor returned an insecure media URL.");
    return target.href;
  } finally { clearTimeout(timer); }
}

async function readMedia(url: string, audio: boolean, onProgress?: (bytes: number, total: number | null) => void): Promise<Blob> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const resetWatchdog = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), 25_000);
  };
  resetWatchdog();
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("Media endpoint returned HTTP " + response.status + ".");
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (/text\/html|application\/json|text\/plain/.test(type)) throw new Error("Processor returned an error page instead of media.");
    const totalText = response.headers.get("content-length");
    const total = totalText && Number.isFinite(Number(totalText)) && Number(totalText) > 0 ? Number(totalText) : null;
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value?.byteLength) continue;
        parts.push(value);
        bytes += value.byteLength;
        resetWatchdog();
        onProgress?.(bytes, total);
      }
    } finally { reader.releaseLock(); }
    if (bytes < 32 || (total && bytes < total)) throw new Error("Incomplete or zero-byte download.");
    const blob = new Blob(parts as BlobPart[], { type: audio ? "audio/mpeg" : "video/mp4" });
    const signature = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    if (audio) {
      const id3 = signature[0] === 0x49 && signature[1] === 0x44 && signature[2] === 0x33;
      const frame = signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0;
      if (!id3 && !frame) throw new Error("Processor did not return a valid MP3.");
    } else {
      const ftyp = String.fromCharCode(...signature.slice(4, 8)) === "ftyp";
      if (!ftyp) throw new Error("Processor did not return a valid MP4.");
    }
    return blob;
  } finally { clearTimeout(timer); }
}

export async function downloadYouTubeFile(
  sourceUrl: string,
  requestedQuality: string,
  audio: boolean,
  onProgress?: (bytes: number, total: number | null) => void,
): Promise<File> {
  const body = buildCobaltBody(sourceUrl, requestedQuality, audio);
  const failures: string[] = [];
  for (const endpoint of [...new Set([relayUrl(), ...FALLBACK_PROCESSORS])]) {
    try {
      // The API response must be followed immediately: tunnels expire quickly.
      const mediaUrl = await requestTunnel(endpoint, body);
      const blob = await readMedia(mediaUrl, audio, onProgress);
      const id = parseYouTubeVideoId(sourceUrl) || "video";
      return new File([blob], "youtube-" + id + (audio ? ".mp3" : ".mp4"), { type: blob.type });
    } catch (error) {
      failures.push(new URL(endpoint, window.location.href).hostname + ": " + (error instanceof Error ? error.message : String(error)));
      onProgress?.(0, null);
    }
  }
  throw new Error("No working YouTube processor: " + failures.join(" | "));
}

export async function resolveYouTubeForOriginalUI(sourceUrl: string): Promise<YTData> {
  const id = parseYouTubeVideoId(sourceUrl);
  if (!id) throw new Error("Enter a valid YouTube video or Shorts URL.");
  // The oEmbed endpoint is best effort: most browsers cannot read its cross-origin response.
  let title = "YouTube video";
  let channel = "YouTube";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch("https://www.youtube.com/oembed?url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + id) + "&format=json", { signal: controller.signal });
      if (response.ok) {
        const metadata = await response.json();
        if (typeof metadata.title === "string") title = metadata.title;
        if (typeof metadata.author_name === "string") channel = metadata.author_name;
      }
    } finally { clearTimeout(timer); }
  } catch { /* YouTube blocks browser metadata CORS on some hosts. */ }
  const qualities = QUALITY_SPECS.map((s) => ({ ...s, hasAudio: true, container: "mp4" }));
  return {
    id, description: title, author: { username: channel, nickname: channel, avatar: "" },
    video: { url: "", cover: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg", duration: 0, ratio: "16:9", width: 0, height: 0 },
    qualities, audio: { label: "MP3", url: "audio", width: 0, height: 0, bitrate: 128000, hasAudio: true, container: "mp3" },
    stats: {},
  };
}
