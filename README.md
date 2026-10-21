# TikTok 4K Video Downloader

A mobile-first TikTok and YouTube downloader built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

## Hosting

The app is configured for this GitHub Pages URL:

**https://nightvibes33.github.io/tiktok4kvideodownloader/**

The production Pages bundle builds successfully in GitHub Actions. GitHub Pages still has to be enabled for this repository before GitHub will accept the first deployment; the current GitHub App and workflow `GITHUB_TOKEN` do not have the Administration permission GitHub requires to create a Pages site for the first time.

Lovable project: https://lovable.dev/projects/2a1a28e2-f3ea-4537-b783-bc051b23c45a

## TikTok downloader

The main page handles public TikTok media through the existing Supabase backend.

- Video quality selection up to the source resolution exposed by TikTok
- Clean/no-watermark streams when available
- Video and audio downloads
- Slideshow/photo posts
- TikTok Live Photo still + motion handling
- ZIP bundles for Live Photo/slideshow assets
- Author and engagement metadata
- Local download history
- iPhone Web Share handling
- Profile analyzer and supporting guide pages

## YouTube downloader

Route: /youtube

The original page had different development and production code, and public
Cobalt processors often reject YouTube downloads. The same runtime now ships
in both builds. A fresh stream is requested at Download time rather than
reusing an expired media URL.

### Free self-hosted engine (recommended for dependable high-res support)

A Docker-based **yt-dlp + FFmpeg + bgutil PO-token provider** is included under
[services/youtube](services/youtube/README.md).

- Select **maximum**, **2160p/4K**, **1440p**, **1080p**, **720p**, **480p** or **360p**.
- The selected number is a **maximum requested quality**, not an upscaling
  promise. Only formats available for the source can be downloaded.
- The self-hosted engine merges separate video and audio streams into MP4.
- Audio-only mode outputs real MP3 through FFmpeg.
- On a configured engine, the browser can request source-format metadata so
  that quality options reflect supported heights.
- Downloads from the engine are native browser file downloads and avoid
  buffering multi-gigabyte files in mobile Safari.
- Requests use short-lived signed links, per-job temporary directories, a
  concurrency limit and a private server-to-server API key.

To enable for all visitors, run the Docker service on a reachable host with an
HTTPS URL, and set COBALT_API_URL and COBALT_API_KEY on the repository-linked
Vercel project **tiktok4kvideodownloader-nc54** (server-side only).

**Cost:** The software is free and open source, but reliable public bandwidth
and a running computer/server are still required. A free deployment for
unlimited people/video sizes cannot be guaranteed.

**Availability:** As long as that engine is not configured/deployed, the
website still attempts the existing public Cobalt community processors and
will report failures. Some hosts require API keys or block YouTube access.
The relay intentionally does not bypass another service's authentication.

YouTube sometimes requires cookies, PO tokens or blocks cloud IP addresses.
The PO-token provider can help with some cases but **does not override**
login restrictions. The site must never claim a successful download if
a processor returned an error or empty response.

### Exact owned-video regression test

[GitHub Actions — YouTube regression](../../actions/workflows/youtube-regression.yml)
checks the frontend build, backend logic and attempts to download:

    https://youtu.be/R35KGQT3fT8?is=UMzhDSFwoT6uHT2b

At the initial run on October 20, 2026, the code tests and Vite build passed,
but the GitHub runner received YouTube's "Sign in to confirm you're not a bot"
response. No verified MP4 was generated. See [run #39534652740](../../actions/runs/39534652740).
The workflow only uploads a video artifact when yt-dlp and ffprobe succeed.

## GitHub Pages deployment

`.github/workflows/pages.yml` builds the Vite app on pushes to `main`.

The workflow currently verifies that:

- dependencies install successfully
- the Vite production build succeeds
- the app is built with `/tiktok4kvideodownloader/` as its base path
- `index.html` is copied to `404.html` for React Router direct-route fallback
- `.nojekyll` is included
- public no-auth/CORS processor discovery can be diagnosed during CI when the directory hosts permit GitHub-hosted runner traffic

GitHub Actions currently reaches `actions/configure-pages` only after the production build succeeds. The remaining deployment failure is GitHub's first-time Pages enablement permission check, not a TypeScript/Vite build failure.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | TikTok downloader |
| `/youtube` | YouTube downloader |
| `/slideshow-downloader` | TikTok slideshow downloader |
| `/profile-analyzer` | TikTok profile analyzer |
| `/how-to-download` | Download guide |
| `/supported-formats` | Supported formats |
| `/ios-shortcut` | iOS Shortcut workflow |
| `/faq` | FAQ |
| `/blog` | Blog and guides |
| `/blog/:slug` | Blog post |
| `/about` | About |
| `/privacy-policy` | Privacy policy |
| `/terms` | Terms of service |

## Frontend stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui / Radix UI
- React Router
- TanStack Query
- Paper Design shaders
- Lucide icons
- JSZip

## Backend

TikTok functionality continues to use the Supabase project configured by the existing Vite environment variables:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

The YouTube page does **not** depend on the Supabase YouTube Edge Functions anymore.

The repo also includes a narrowly scoped Vercel function at `api/cobalt.js`. It only accepts YouTube URLs and only returns Cobalt tunnel metadata; it is not an arbitrary URL proxy and it does not proxy the video bytes themselves.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

GitHub Pages-style build:

```bash
VITE_BASE_PATH=/tiktok4kvideodownloader/ \
VITE_PUBLIC_SITE_URL=https://nightvibes33.github.io/tiktok4kvideodownloader \
npm run build
```

## Disclaimer

This project is not affiliated with TikTok, ByteDance, YouTube, Google, Cobalt, or any community processor operator. Processor availability can change. Users are responsible for complying with copyright law and platform terms.
