FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv ffmpeg ca-certificates git \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/ytdlp \
  && /opt/ytdlp/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/ytdlp/bin/pip install --no-cache-dir "yt-dlp[default]" bgutil-ytdlp-pot-provider
# Serve PO tokens on loopback only, so a single free web service is sufficient
# (Render does not run docker-compose sidecars).
RUN git clone --depth 1 --branch 2.0.2 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/pot \
  && cd /opt/pot/server && npm ci && npx tsc
WORKDIR /srv/youtube
COPY server.cjs ./
ENV NODE_ENV=production \
    YTDLP_PATH=/opt/ytdlp/bin/yt-dlp \
    PORT=8787 \
    POT_SERVER=http://127.0.0.1:4416
USER node
EXPOSE 8787
CMD ["sh", "-c", "node /opt/pot/server/build/main.js --host 127.0.0.1 --port 4416 & exec node server.cjs"]
