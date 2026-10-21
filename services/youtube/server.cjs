"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.COBALT_API_KEY || "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET || API_KEY;
const YTDLP = process.env.YTDLP_PATH || "/opt/ytdlp/bin/yt-dlp";
const POT_SERVER = process.env.POT_SERVER || "http://bgutil-provider:4416";
const MAX_CONCURRENT = Math.max(1, Number(process.env.MAX_CONCURRENT || 2));
const MAX_BYTES = Math.max(1024 * 1024, Number(process.env.MAX_BYTES || 4294967296));
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const QUALITIES = new Set(["max", "2160", "1440", "1080", "720", "480", "360"]);
let active = 0;

function videoId(raw) {
  try {
    const u = new URL(String(raw || ""));
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.split("/")[1];
    else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      id = u.pathname === "/watch" ? u.searchParams.get("v") : null;
      if (!id) id = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/]+)/)?.[1];
    }
    return /^[\w-]{11}$/.test(id || "") ? id : null;
  } catch { return null; }
}
function writeJson(res, status, value) {
  const json = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json),
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(json);
}
function isAuthorized(req) {
  if (!API_KEY) return false;
  const supplied = req.headers.authorization || "";
  const required = "Api-Key " + API_KEY;
  const a = Buffer.from(supplied);
  const b = Buffer.from(required);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function token(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function decodeToken(raw) {
  if (typeof raw !== "string" || raw.length > 1024) return null;
  const [body, sig, extra] = raw.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!/^[\w-]{11}$/.test(value.id || "") || !QUALITIES.has(value.q) ||
        typeof value.a !== "boolean" || !Number.isFinite(value.exp) ||
        value.exp < Date.now() || value.exp > Date.now() + 5 * 60 * 1000) return null;
    return value;
  } catch { return null; }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      count += chunk.length;
      if (count > 8192) {
        reject(new Error("request_too_large"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("invalid_json")); }
    });
    req.on("error", reject);
  });
}
function ytArgs({ id, q, a }, directory) {
  const url = "https://www.youtube.com/watch?v=" + id;
  const args = [
    "--no-playlist", "--no-progress", "--no-warnings", "--no-mtime",
    "--js-runtimes", "node", "--extractor-args",
    "youtubepot-bgutilhttp:base_url=" + POT_SERVER,
    "--socket-timeout", "25", "--retries", "3", "--fragment-retries", "3",
    "--max-filesize", String(MAX_BYTES),
    "--paths", directory, "-o", "video.%(ext)s",
  ];
  if (a) {
    args.push("-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    const height = q === "max" ? null : Number(q);
    const format = height
      ? "bv*[height<=" + height + "]+ba/b[height<=" + height + "]"
      : "bv*+ba/b";
    args.push("-f", format, "--merge-output-format", "mp4", "--remux-video", "mp4");
  }
  return [...args, url];
}
function runYt(payload, directory, onDisconnect) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, ytArgs(payload, directory), { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let finished = false;
    const timeout = setTimeout(() => child.kill("SIGTERM"), DOWNLOAD_TIMEOUT_MS);
    let disconnected = false;
    onDisconnect(() => { disconnected = true; child.kill("SIGTERM"); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-2500); });
    child.on("error", (err) => { if (!finished) { finished = true; clearTimeout(timeout); reject(err); } });
    child.on("close", (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (code === 0 && !disconnected) resolve();
      else reject(new Error(disconnected ? "client_disconnected" :
        signal === "SIGTERM" ? "download_timed_out" : stderr.trim().slice(-500) || "yt_dlp_failed"));
    });
  });
}
async function serveDownload(req, res, rawToken) {
  const payload = decodeToken(rawToken);
  if (!payload) return writeJson(res, 403, { error: "invalid_or_expired_link" });
  if (active >= MAX_CONCURRENT) return writeJson(res, 429, { error: "server_busy" });
  active++;
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "yt-download-"));
  let cancel = () => {};
  const disconnect = () => cancel();
  req.on("aborted", disconnect);
  res.on("close", () => { if (!res.writableFinished) cancel(); });
  try {
    await runYt(payload, directory, (fn) => { cancel = fn; });
    const names = await fs.promises.readdir(directory);
    const ext = payload.a ? ".mp3" : ".mp4";
    const name = names.find((candidate) => candidate.endsWith(ext));
    if (!name) throw new Error("media_file_missing");
    const file = path.join(directory, name);
    const stats = await fs.promises.stat(file);
    if (stats.size < 32 || stats.size > MAX_BYTES) throw new Error("invalid_output_size");
    res.writeHead(200, {
      "content-type": payload.a ? "audio/mpeg" : "video/mp4",
      "content-length": stats.size,
      "content-disposition": 'attachment; filename="youtube-' + payload.id + ext + '"',
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(file);
      stream.on("error", reject);
      stream.on("end", resolve);
      res.on("close", resolve);
      stream.pipe(res);
    });
  } catch (err) {
    if (!res.headersSent) writeJson(res, 502, { error: "yt_dlp_failed", detail: String(err.message || err).slice(0,500) });
    else res.destroy();
  } finally {
    req.off("aborted", disconnect);
    active--;
    await fs.promises.rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    }); return res.end();
  }
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health")
    return writeJson(res, 200, { ok: true, engine: "yt-dlp", active, maxConcurrent: MAX_CONCURRENT });
  if (req.method === "GET" && url.pathname === "/download")
    return void serveDownload(req, res, url.searchParams.get("token")).catch(() => {
      if (!res.headersSent) writeJson(res, 500, { error: "server_error" });
      else res.destroy();
    });
  if (req.method !== "POST" || url.pathname !== "/") return writeJson(res, 404, { error: "not_found" });
  if (!isAuthorized(req)) return writeJson(res, 401, { error: "unauthorized" });
  if (!PUBLIC_BASE_URL.startsWith("https://") || !TOKEN_SECRET)
    return writeJson(res, 503, { error: "server_not_configured" });
  try {
    const input = await readJson(req);
    const id = videoId(input.url);
    if (!id) return writeJson(res, 400, { error: "invalid_youtube_url" });
    const q = QUALITIES.has(String(input.videoQuality)) ? String(input.videoQuality) : "1080";
    const a = input.downloadMode === "audio";
    const link = new URL(PUBLIC_BASE_URL + "/download");
    link.searchParams.set("token", token({ id, q, a, exp: Date.now() + 2 * 60 * 1000 }));
    return writeJson(res, 200, {
      status: "tunnel",
      url: link.toString(),
      filename: "youtube-" + id + (a ? ".mp3" : ".mp4"),
      processor: "self-hosted-yt-dlp",
    });
  } catch (err) {
    return writeJson(res, 400, { error: String(err.message || err).slice(0,120) });
  }
});
if (require.main === module) server.listen(PORT, "0.0.0.0", () => console.log("yt-dlp server listening on " + PORT));
module.exports = { videoId, ytArgs, token, decodeToken, server };
