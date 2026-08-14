import fs from "node:fs";
import { spawnSync } from "node:child_process";

const componentPath = "src/components/YouTubeDownloader.tsx";
const original = fs.readFileSync(componentPath, "utf8");

function mustReplace(source, needle, replacement, label) {
  if (!source.includes(needle)) {
    throw new Error(`Could not patch ${label}; original Lovable component no longer matches expected source.`);
  }
  return source.replace(needle, replacement);
}

let patched = original;

patched = mustReplace(
  patched,
  'import { supabase } from "@/integrations/supabase/client";',
  'import { resolveYouTubeForOriginalUI } from "@/lib/youtubeRuntime";',
  "YouTube runtime import",
);

const originalProxy = `function buildProxyUrl(data: YTData, quality: QualityOption, download = false, audio = false): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const ext = audio ? (quality.container === "webm" ? "webm" : "m4a") : quality.container === "webm" ? "webm" : "mp4";
  const params = new URLSearchParams({
    videoUrl: quality.url,
    filename: \`youtube-\${data.id}.\${ext}\`,
    apikey: anonKey,
  });
  if (download) params.set("download", "1");
  return \`\${supabaseUrl}/functions/v1/youtube-download?\${params.toString()}\`;
}`;

patched = mustReplace(
  patched,
  originalProxy,
  `function buildProxyUrl(_data: YTData, quality: QualityOption, _download = false, _audio = false): string {
  // The original Lovable UI still calls this helper for preview/download links.
  // Runtime resolution now returns browser-readable media URLs directly.
  return quality.url;
}`,
  "buildProxyUrl",
);

const originalInvoke = `      const { data: res, error: fnError } = await supabase.functions.invoke("youtube-scraper", {
        body: { url: trimmed },
      });
      if (fnError) throw new Error(fnError.message);
      if (res?.error) throw new Error(res.error);
      if (!res?.qualities?.length) {
        throw new Error("No downloadable streams found. The video may be private, age-restricted or region-locked.");
      }
      setData(res as YTData);`;

patched = mustReplace(
  patched,
  originalInvoke,
  `      const res = await resolveYouTubeForOriginalUI(trimmed);
      if (!res?.qualities?.length) {
        throw new Error("No downloadable streams found. The video may be private, age-restricted or region-locked.");
      }
      setData(res as YTData);`,
  "youtube-scraper invocation",
);

patched = mustReplace(
  patched,
  `    const blob = await resp.blob();
    const file = new File([blob], fallbackName, { type: blob.type });`,
  `    const blob = await resp.blob();
    if (blob.size <= 0) throw new Error("Download returned 0 bytes");
    const file = new File([blob], fallbackName, { type: blob.type });`,
  "zero-byte guard",
);

fs.copyFileSync("index.source.html", "index.html");
fs.writeFileSync(componentPath, patched);

let status = 1;
try {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["vite", "build"], {
    stdio: "inherit",
    env: process.env,
  });
  status = result.status ?? 1;
} finally {
  // Keep the repository source byte-for-byte identical to the original Lovable UI.
  fs.writeFileSync(componentPath, original);
}

process.exit(status);
