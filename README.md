# TikTok 4K Video Downloader

A mobile-first web downloader for TikTok and YouTube, built with React, Vite, Tailwind CSS, shadcn/ui, and Supabase Edge Functions.

## Live site

**https://tiktok4kvideodownloader.lovable.app/**

Lovable project: https://lovable.dev/projects/2a1a28e2-f3ea-4537-b783-bc051b23c45a

## What the site does

### TikTok downloader

- Paste full TikTok URLs or `vm.tiktok.com` / `vt.tiktok.com` short links.
- Extract available video qualities and resolutions.
- Download clean MP4 streams without the TikTok watermark when available.
- Download audio separately.
- Supports slideshow/photo posts.
- Supports TikTok Live Photo posts, including still images, motion clips, and ZIP bundles.
- Shows author information, engagement stats, estimated file sizes, previews, and quality badges.
- Includes local download history and a global download counter.
- iPhone-specific save/share handling through the Web Share API when supported.

### YouTube downloader

Available at **`/youtube`**.

- Supports standard YouTube watch URLs, `youtu.be` links, Shorts, embeds, live URLs, and music.youtube.com links.
- Extracts available YouTube streams through Supabase Edge Functions.
- Lists available quality/resolution options, including HD, Full HD, 1440p, and 4K when YouTube exposes those streams.
- Supports video downloads and separate M4A/WebM audio downloads.
- Shows thumbnail, channel/title information, duration, view count, estimated size, and video preview.
- Uses a dedicated baby-blue visual theme while the TikTok side keeps the pink theme.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | TikTok video downloader |
| `/youtube` | YouTube downloader |
| `/slideshow-downloader` | TikTok slideshow downloader |
| `/profile-analyzer` | TikTok profile analyzer |
| `/how-to-download` | Download guide |
| `/supported-formats` | Supported format information |
| `/ios-shortcut` | iOS Shortcut workflow |
| `/faq` | FAQ |
| `/blog` | Blog and guides |
| `/blog/:slug` | Individual blog posts |
| `/about` | About page |
| `/privacy-policy` | Privacy policy |
| `/terms` | Terms of service |

## Backend

Supabase Edge Functions provide the server-side extraction/proxy layer.

Current function configuration includes:

- `tiktok-scraper`
- `tiktok-download`
- `tiktok-profile`
- `youtube-scraper`
- `youtube-download`

The YouTube extractor tries multiple YouTube client profiles and exposes direct streams that do not require player-JS signature deciphering. The download function only proxies HTTPS media URLs from approved YouTube/Google media hosts and forwards range/content headers when available.

## Frontend stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui / Radix UI
- React Router
- TanStack Query
- Supabase JS
- Paper Design shader background
- Lucide icons
- JSZip for TikTok Live Photo/slideshow bundles

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The frontend expects these Vite environment variables:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

## SEO and site features

- Dynamic SEO metadata and JSON-LD for major downloader pages.
- Sitemap and robots metadata.
- Google AdSense integration.
- Responsive mobile-first layout.
- Separate visual palettes for TikTok and YouTube pages.
- Buy Me a Coffee support section.

## Notes

Only download media you own or have permission to save. Availability and quality depend on what TikTok or YouTube exposes for a specific public post/video.

This project is not affiliated with TikTok, ByteDance, YouTube, or Google.
