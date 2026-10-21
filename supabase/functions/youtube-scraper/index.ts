/**
 * Compatibility endpoint for older Lovable deployments.
 *
 * YouTube's undocumented youtubei player clients no longer reliably return
 * downloadable media URLs to serverless functions. Do not impersonate old
 * app clients or manufacture quality options on an HTTP 422 response.
 * The maintained /youtube page resolves download links separately at click
 * time through src/lib/youtubeRuntime.ts and the optional /api/cobalt relay.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function parseVideoId(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2048) return null;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = parsed.pathname.split("/")[1] || null;
    else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      id = parsed.pathname === "/watch" ? parsed.searchParams.get("v") : null;
      if (!id) id = parsed.pathname.match(/^\/(?:shorts|live|embed|v)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1] || null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const payload = await req.json().catch(() => null);
  const id = parseVideoId(payload?.url);
  if (!id) return json({ error: "Enter a valid HTTPS YouTube watch, Shorts, or youtu.be link.", code: "INVALID_URL" }, 400);

  // Fetch *public metadata only*. No user OAuth token/cookies sent to YouTube,
  // no invented media URLs, and no unsupported signature deciphering.
  let title = "YouTube video";
  let author = "YouTube";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6500);
    try {
      const response = await fetch(
        "https://www.youtube.com/oembed?format=json&url=" +
        encodeURIComponent("https://www.youtube.com/watch?v=" + id),
        { signal: ctrl.signal, headers: { Accept: "application/json" } },
      );
      if (response.ok) {
        const meta = await response.json();
        if (typeof meta?.title === "string") title = meta.title.slice(0, 300);
        if (typeof meta?.author_name === "string") author = meta.author_name.slice(0, 200);
      }
    } finally { clearTimeout(timer); }
  } catch { /* Metadata is optional and does not prove downloadability. */ }

  return json({
    id,
    description: title,
    author: { username: author, nickname: author, avatar: "" },
    video: {
      url: "",
      cover: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
      duration: 0, width: 0, height: 0, ratio: "16:9",
    },
    qualities: [],
    audio: null,
    stats: {},
    code: "LEGACY_STREAM_EXTRACTOR_RETIRED",
    error: "The previous YouTube scraper is no longer supported. Update to the latest YouTube page, which resolves downloads through the Cobalt relay when a working processor is available.",
  });
});
