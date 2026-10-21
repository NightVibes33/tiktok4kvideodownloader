FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/ytdlp \
  && /opt/ytdlp/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/ytdlp/bin/pip install --no-cache-dir "yt-dlp[default]" bgutil-ytdlp-pot-provider
WORKDIR /srv/youtube
COPY server.cjs ./
ENV NODE_ENV=production \
    YTDLP_PATH=/opt/ytdlp/bin/yt-dlp \
    PORT=8787 \
    POT_SERVER=http://bgutil-provider:4416
USER node
EXPOSE 8787
CMD ["node", "server.cjs"]
