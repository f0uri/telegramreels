FROM node:20-slim

# تثبيت بايثون و ffmpeg و yt-dlp اللازمة للتنزيل
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages -U yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# تثبيت حزم npm لكل من backend و bot
COPY backend/package*.json ./backend/
COPY bot/package*.json ./bot/
RUN cd backend && npm install --omit=dev
RUN cd bot && npm install --omit=dev

# نسخ باقي الملفات
COPY backend ./backend
COPY bot ./bot
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV PORT=3000
ENV BACKEND_URL=http://localhost:3000

EXPOSE 3000

CMD ["./start.sh"]
