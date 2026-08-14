const ALLOWED_ORIGINS = new Set([
  "https://nightvibes33.github.io",
  "https://tiktok4kvideodownloader.vercel.app",
  "https://tiktok4kvideodownloader-nc54.vercel.app",
]);

const UPSTREAMS = [
  "https://api.cobalt.liubquanti.click/",
  "https://cobaltapi.cjs.nz/",
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : origin.endsWith(".vercel.app")
      ? origin
      : "https://nightvibes33.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
  res.setHeader("Cache-Control", "no-store");
}

function isYouTubeUrl(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

function normalizeBody(input) {
  const url = String(input?.url || "").trim();
  if (!isYouTubeUrl(url)) throw new Error("invalid_youtube_url");

  const downloadMode = input?.downloadMode === "audio" ? "audio" : "auto";
  const videoQuality = new Set(["max", "2160", "1440", "1080", "720", "480", "360"]).has(String(input?.videoQuality))
    ? String(input.videoQuality)
    : "1080";

  if (downloadMode === "audio") {
    return {
      url,
      downloadMode: "audio",
      audioFormat: "mp3",
      audioBitrate: "128",
      filenameStyle: "pretty",
      disableMetadata: false,
      alwaysProxy: true,
      localProcessing: "disabled",
    };
  }

  return {
    url,
    videoQuality,
    youtubeVideoCodec: "h264",
    youtubeVideoContainer: "mp4",
    downloadMode: "auto",
    filenameStyle: "pretty",
    disableMetadata: false,
    alwaysProxy: true,
    localProcessing: "disabled",
  };
}

async function callUpstream(upstream, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "YT-Pocket-Relay/1.0",
      },
      body: JSON.stringify(body),
      redirect: "follow",
      signal: controller.signal,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`upstream_${response.status}_invalid_json`);
    }

    if (!response.ok || data?.status === "error") {
      const code = data?.error?.code || `upstream_http_${response.status}`;
      throw new Error(code);
    }

    if (data?.status !== "tunnel" || typeof data?.url !== "string") {
      throw new Error(`unexpected_${data?.status || "response"}`);
    }

    return {
      status: "tunnel",
      url: data.url,
      filename: typeof data.filename === "string" ? data.filename : undefined,
      processor: new URL(upstream).hostname,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "yt-pocket-cobalt-json-relay",
      mediaProxy: false,
      upstreamCount: UPSTREAMS.length,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let body;
  try {
    body = normalizeBody(req.body);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "invalid_request",
    });
  }

  const failures = [];
  for (const upstream of UPSTREAMS) {
    try {
      const result = await callUpstream(upstream, body);
      return res.status(200).json(result);
    } catch (error) {
      failures.push({
        processor: new URL(upstream).hostname,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(502).json({
    error: "all_processors_failed",
    failures,
  });
}
