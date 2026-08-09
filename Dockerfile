FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages -U yt-dlp gallery-dl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./backend/
COPY bot/package*.json ./bot/
RUN cd backend && npm install --omit=dev
RUN cd bot && npm install --omit=dev

COPY backend ./backend
COPY bot ./bot
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV BACKEND_PORT=3000

EXPOSE 3000

CMD ["./start.sh"]
