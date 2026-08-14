# TikTok 4K Video Downloader

A mobile-first TikTok and YouTube downloader built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

## Live site

**GitHub Pages:** https://nightvibes33.github.io/tiktok4kvideodownloader/

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

Available at `/youtube`.

The YouTube page no longer calls the old `youtube-scraper` Supabase Edge Function. That server-side extractor could be rejected by YouTube and surfaced only as `Edge Function returned a non-2xx status code`.

The current flow is browser-driven:

1. The page sends the public YouTube URL to a configured Cobalt-compatible community processor.
2. The processor returns a proxied media tunnel.
3. The browser reads the media stream itself instead of handing Safari an unverified tunnel URL.
4. A 25-second no-data watchdog aborts stalled streams.
5. The final file must contain more than zero bytes before the save/share flow starts.
6. If a processor fails, the page automatically tries the next configured processor.

Supported controls include:

- MP4 video download
- H.264 video preference
- 360p, 480p, 720p, 1080p, 1440p, 2160p/4K, and maximum-quality requests
- MP3 audio-only download
- Live byte/progress display
- Explicit per-processor errors instead of the generic Supabase Edge Function failure
- Zero-byte rejection so an empty file is never treated as a successful download

Only download media you own or have permission to save.

## GitHub Pages deployment

`.github/workflows/pages.yml` builds and deploys the Vite app to GitHub Pages on pushes to `main`.

Before publishing, the workflow smoke-tests this owned test video:

```text
https://youtu.be/zzLrHzJrSi4?is=s8lEzsuXpNKlu3sL
```

For each candidate processor it verifies:

- API HTTP 200
- browser-compatible CORS for `https://nightvibes33.github.io`
- a Cobalt `tunnel` response
- at least 64 KiB of real media data beginning to stream

The first processor that passes is injected into the Vite build as `VITE_COBALT_PRIMARY`. If none pass, the Pages build fails instead of publishing an unverified downloader.

The Vite build uses `/tiktok4kvideodownloader/` as its production base path and copies `index.html` to `404.html` so React Router direct links such as `/youtube` work on GitHub Pages.

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

The YouTube page does not depend on the Supabase YouTube Edge Functions anymore.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

GitHub Pages-style local build:

```bash
VITE_BASE_PATH=/tiktok4kvideodownloader/ \
VITE_PUBLIC_SITE_URL=https://nightvibes33.github.io/tiktok4kvideodownloader \
npm run build
```

## Disclaimer

This project is not affiliated with TikTok, ByteDance, YouTube, Google, Cobalt, or any community processor operator. Processor availability can change. Users are responsible for complying with copyright law and platform terms.
