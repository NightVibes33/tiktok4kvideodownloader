# Free, self-hosted YouTube engine

This optional service replaces fragile public Cobalt mirrors with **yt-dlp + FFmpeg**.
Video resolutions are requested as upper bounds and separate video/audio streams
are merged to MP4. Audio downloads are converted to MP3. Actual availability
depends on YouTube, the source upload, codecs, and IP/region.

The engine is free/open source; **running it for everyone still needs a computer
or server and network bandwidth**. Free hosting is not guaranteed. This Docker
setup can run on your own Linux box or on Windows with Docker Desktop.

## Run

1. Set these environment variables locally or in an untracked .env file:
   - PUBLIC_BASE_URL — HTTPS base URL through a reverse proxy/tunnel you control.
     E.g. https://my-youtube-service.example (no path).
   - COBALT_API_KEY — random secret to authenticate POST requests from Vercel.
   - DOWNLOAD_TOKEN_SECRET — a DIFFERENT random signing secret (at least 32 bytes).
2. Start Docker Compose in this folder: docker compose up -d --build
3. Verify: curl http://127.0.0.1:8787/health
4. Publish local port 8787 with an HTTPS reverse proxy or a **Cloudflare Tunnel**.
   Point PUBLIC_BASE_URL at that public HTTPS hostname.
5. Set these **server-side** environment variables on the existing Vercel project
   tiktok4kvideodownloader-nc54:
   - COBALT_API_URL=https://my-youtube-service.example/
   - COBALT_API_KEY=(same as Docker's COBALT_API_KEY)
   Do not put the key in VITE_* browser variables.
6. Redeploy the Vercel project, then use the website's /youtube page.

Public visitors can use the downloader free. Only Vercel needs the API key.
A short-lived, HMAC-signed link permits downloading the media; no account
cookies are sent from visitors' browsers. Each job validates the YouTube video ID,
uses isolated temporary files, merges audio/video through FFmpeg, limits
simultaneous downloads, and removes media files after serving them.

The bgutil PO-token provider is only reachable over the private Docker network.
yt-dlp's JavaScript EJS solver comes from yt-dlp[default], and Node.js 22
is available for the challenge runtime. A token provider **does not guarantee**
downloads against YouTube's IP-level anti-bot and regional restrictions.
Use a legitimate network and observe YouTube's terms and copyright restrictions.

## Local API test

Request a short-lived link through the protected API:

    curl -sS http://127.0.0.1:8787/ \
      -H "Authorization: Api-Key $COBALT_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"url":"https://youtu.be/R35KGQT3fT8","videoQuality":"1080","downloadMode":"auto"}'

Then curl the returned https://.../download?token=... URL using -L -o sample.mp4
and run:

    ffprobe -v error -show_entries format=duration,size -of json sample.mp4

For a real 4K source, request "2160"; for the highest available, request "max".
The server does NOT upsample low resolution originals.

## Operational limits

- Public relays and client-only JavaScript cannot reliably merge all resolutions.
- GitHub Pages and a Vercel serverless JSON function are not 4K video processors.
- Direct downloads from the engine are native browser downloads, avoiding the
  large browser memory allocations that can crash mobile Safari.
- Protect your public hostname with limits and rate control appropriate to your
  available bandwidth. MAX_CONCURRENT=2 limits simultaneous downloads; traffic
  costs and YouTube availability are not guaranteed.
- If there is a bot challenge even with the PO provider, no media file is
  returned. Do not treat this as a successful download.
