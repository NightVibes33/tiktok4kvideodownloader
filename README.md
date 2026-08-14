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

Available at `/youtube`.

The YouTube page no longer uses the old `youtube-scraper` Supabase Edge Function, which could fail with the generic `Edge Function returned a non-2xx status code` message when YouTube rejected cloud egress.

The current YouTube flow is browser-first:

1. The browser tries the public Cobalt community metadata endpoints at runtime.
2. It only considers processors that explicitly report `auth: false`, `cors: true`, are online, and report YouTube support.
3. If the separate current-working directory is browser-accessible, its YouTube list is intersected with that eligible set.
4. The browser requests the selected public video directly from an eligible processor.
5. The returned media tunnel is read by the browser before the file is exposed to the user.
6. A 25-second no-data watchdog aborts stalled media streams.
7. The received media must contain more than zero bytes; the final `Blob` and `File` are both checked again for `size > 0`.
8. If direct browser discovery is unavailable, the page can fall back to the locked-down `/api/cobalt` JSON relay deployed by the repo-linked Vercel project.

The code does not use Cobalt `/session` to bypass JWT or Turnstile protection and does not inject private community API keys. Protected instances are intentionally excluded from the direct discovery path.

Supported controls include:

- MP4 video download
- H.264 / MP4 video preference
- 360p, 480p, 720p, 1080p, 1440p, 2160p/4K, and maximum-quality requests
- MP3 audio-only download
- Live byte/progress display
- Per-processor errors instead of the old generic Supabase Edge Function failure
- Zero-byte rejection so an empty or endless `0 KB` file is never treated as success
- iPhone Web Share save flow when supported

Only download media you own or have permission to save.

## Exact-video verification

The project has repeatedly tested this owned video during development:

```text
https://youtu.be/zzLrHzJrSi4?is=s8lEzsuXpNKlu3sL
```

One verified run resolved the real 1080p MP4 and read **65,536 bytes** from the returned media tunnel with browser-compatible `Access-Control-Allow-Origin: *`. Community processor availability later changed, which is why the frontend now performs runtime discovery instead of permanently pinning that processor.

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
