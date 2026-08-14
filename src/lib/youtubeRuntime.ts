type CobaltResponse = {
  status?: string;
  url?: string;
  filename?: string;
  error?: { code?: string } | string;
};

type QualityOption = {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  hasAudio: boolean;
  container: string;
};

type OriginalYTData = {
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
};

const PROCESSORS = [
  "https://cobaltapi.kittycat.boo/",
  "https://rue-cobalt.xenon.zone/",
  "https://dog.kittycat.boo/",
];

const QUALITY_SPECS = [
  { value: "2160", label: "2160p", width: 3840, height: 2160, bitrate: 18_000_000 },
  { value: "1440", label: "1440p", width: 2560, height: 1440, bitrate: 10_000_000 },
  { value: "1080", label: "1080p", width: 1920, height: 1080, bitrate: 6_000_000 },
  { value: "720", label: "720p", width: 1280, height: 720, bitrate: 3_000_000 },
  { value: "480", label: "480p", width: 854, height: 480, bitrate: 1_500_000 },
  { value: "360", label: "360p", width: 640, height: 360, bitrate: 800_000 },
] as const;

function extractVideoId(input: string): string {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "video";
    if (url.searchParams.get("v")) return url.searchParams.get("v") || "video";
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((p) => ["shorts", "embed", "live", "v"].includes(p));
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
  } catch {
    // fall through
  }
  return "video";
}

function cobaltError(data: CobaltResponse, status: number): string {
  if (typeof data?.error === "string") return data.error;
  if (data?.error?.code) return data.error.code;
  return `HTTP ${status}`;
}

async function requestFromProcessor(processor: string, sourceUrl: string, quality: string | null, audio = false) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 18_000);
  try {
    const body = audio
      ? {
          url: sourceUrl,
          downloadMode: "audio",
          audioFormat: "best",
          filenameStyle: "pretty",
          disableMetadata: false,
          alwaysProxy: true,
          localProcessing: "disabled",
        }
      : {
          url: sourceUrl,
          videoQuality: quality || "1080",
          youtubeVideoCodec: "h264",
          youtubeVideoContainer: "mp4",
          downloadMode: "auto",
          filenameStyle: "pretty",
          disableMetadata: false,
          alwaysProxy: true,
          localProcessing: "disabled",
        };

    const response = await fetch(processor, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let data: CobaltResponse = {};
    try {
      data = JSON.parse(text) as CobaltResponse;
    } catch {
      throw new Error(`${new URL(processor).hostname}: invalid API response (${response.status})`);
    }

    if (!response.ok || !data.url || !["tunnel", "redirect"].includes(data.status || "")) {
      throw new Error(`${new URL(processor).hostname}: ${cobaltError(data, response.status)}`);
    }

    return { url: data.url, filename: data.filename || "", processor };
  } finally {
    window.clearTimeout(timer);
  }
}

async function resolveTrack(sourceUrl: string, quality: string | null, audio = false) {
  const failures: string[] = [];
  for (const processor of PROCESSORS) {
    try {
      return await requestFromProcessor(processor, sourceUrl, quality, audio);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(failures.join(" | ") || "No browser-accessible processor is available right now.");
}

async function readOEmbed(sourceUrl: string) {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`,
        { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) return null;
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function resolveYouTubeForOriginalUI(sourceUrl: string): Promise<OriginalYTData> {
  const id = extractVideoId(sourceUrl);
  const metadataPromise = readOEmbed(sourceUrl);
  const qualities: QualityOption[] = [];
  const failures: string[] = [];

  // Keep requests sequential so a mobile connection does not burst a community API.
  for (const spec of QUALITY_SPECS) {
    try {
      const media = await resolveTrack(sourceUrl, spec.value, false);
      if (qualities.some((q) => q.url === media.url)) continue;
      qualities.push({
        label: spec.label,
        url: media.url,
        width: spec.width,
        height: spec.height,
        bitrate: spec.bitrate,
        hasAudio: true,
        container: "mp4",
      });
    } catch (error) {
      failures.push(`${spec.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!qualities.length) {
    throw new Error(failures.join("\n") || "No downloadable YouTube streams are available right now.");
  }

  let audio: QualityOption | null = null;
  try {
    const track = await resolveTrack(sourceUrl, null, true);
    const ext = track.filename.toLowerCase().endsWith(".webm") ? "webm" : "m4a";
    audio = {
      label: "Audio",
      url: track.url,
      width: 0,
      height: 0,
      bitrate: 128_000,
      hasAudio: true,
      container: ext,
    };
  } catch {
    // Video download remains usable when a separate audio-only route is unavailable.
  }

  const metadata = await metadataPromise;
  const best = qualities[0];
  const title = typeof metadata?.title === "string" ? metadata.title : "YouTube video";
  const channel = typeof metadata?.author_name === "string" ? metadata.author_name : "YouTube";
  const thumbnail =
    (typeof metadata?.thumbnail_url === "string" && metadata.thumbnail_url) ||
    `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

  return {
    id,
    description: title,
    author: {
      username: channel,
      nickname: channel,
      avatar: "",
    },
    video: {
      url: best.url,
      cover: thumbnail,
      duration: 0,
      ratio: "16:9",
      width: best.width,
      height: best.height,
    },
    qualities,
    audio,
    stats: { playCount: 0 },
  };
}
