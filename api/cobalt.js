const ALLOWED_ORIGINS = new Set([
  "https://nightvibes33.github.io",
  "https://tiktok4kvideodownloader.vercel.app",
  "https://tiktok4kvideodownloader-nc54.vercel.app",
]);

const COBALT_DIRECTORY = "https://cobalt.directory/api/working?type=api";
const INSTANCE_METADATA_URLS = [
  "https://instances.cobalt.best/instances.json",
  "https://instances.cobalt.best/api/instances.json",
];
const USER_AGENT = "YT-Pocket-Relay/1.2 (+https://github.com/NightVibes33/tiktok4kvideodownloader)";

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

function normalizeHost(value) {
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
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

async function fetchJson(url, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getDirectoryYouTubeHosts() {
  const json = await fetchJson(COBALT_DIRECTORY, 4_500);
  const youtube = Array.isArray(json?.data?.youtube) ? json.data.youtube : [];
  return new Set(youtube.map(normalizeHost).filter(Boolean));
}

async function getInstanceMetadata() {
  let lastError;
  for (const url of INSTANCE_METADATA_URLS) {
    try {
      const json = await fetchJson(url, 4_500);
      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      if (list.length) return list;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("instance_metadata_unavailable");
}

async function getWorkingUpstreams() {
  const [directoryHosts, metadata] = await Promise.all([
    getDirectoryYouTubeHosts(),
    getInstanceMetadata(),
  ]);

  const eligible = [];
  for (const instance of metadata) {
    const host = normalizeHost(instance?.api || "");
    if (!host || !directoryHosts.has(host)) continue;
    if (instance?.online === false) continue;
    if (instance?.services?.youtube !== true) continue;
    if (instance?.info?.auth !== false) continue;
    if (instance?.info?.cors !== true) continue;

    const protocol = instance?.protocol === "http" ? "http" : "https";
    eligible.push(`${protocol}://${host}/`);
  }

  return [...new Set(eligible)];
}

async function callUpstream(upstream, body, groupSignal) {
  const controller = new AbortController();
  const abortFromGroup = () => controller.abort();
  groupSignal?.addEventListener("abort", abortFromGroup, { once: true });
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
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
      throw new Error(data?.error?.code || `upstream_http_${response.status}`);
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
    groupSignal?.removeEventListener("abort", abortFromGroup);
  }
}

async function raceBatch(upstreams, body) {
  const groupController = new AbortController();
  try {
    const result = await Promise.any(
      upstreams.map((upstream) =>
        callUpstream(upstream, body, groupController.signal).catch((error) => {
          const wrapped = new Error(error instanceof Error ? error.message : String(error));
          wrapped.processor = new URL(upstream).hostname;
          throw wrapped;
        }),
      ),
    );
    groupController.abort();
    return { result, failures: [] };
  } catch (error) {
    groupController.abort();
    const errors = error instanceof AggregateError ? error.errors : [error];
    return {
      result: null,
      failures: errors.map((item) => ({
        processor: item?.processor || "unknown",
        error: item instanceof Error ? item.message : String(item),
      })),
    };
  }
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();

  let upstreams = [];
  let discoveryError;
  try {
    upstreams = await getWorkingUpstreams();
  } catch (error) {
    discoveryError = error instanceof Error ? error.message : String(error);
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "yt-pocket-cobalt-json-relay",
      mediaProxy: false,
      strategy: "explicit-noauth-cors-intersection",
      upstreamCount: upstreams.length,
      sample: upstreams.slice(0, 6).map((url) => new URL(url).hostname),
      discoveryError,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  let body;
  try {
    body = normalizeBody(req.body);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }

  if (!upstreams.length) {
    return res.status(503).json({
      error: "no_explicit_noauth_processors_available",
      discoveryError,
    });
  }

  const failures = [];
  for (let offset = 0; offset < Math.min(upstreams.length, 12); offset += 4) {
    const { result, failures: batchFailures } = await raceBatch(upstreams.slice(offset, offset + 4), body);
    if (result) return res.status(200).json(result);
    failures.push(...batchFailures);
  }

  return res.status(502).json({ error: "all_eligible_processors_failed", failures });
}
