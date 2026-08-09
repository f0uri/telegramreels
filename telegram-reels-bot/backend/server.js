require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// حد 50 ميجا لأن هذا أقصى حجم يمكن لبوت تيليجرام رفعه مباشرة عبر الـ API العادي
const MAX_FILE_SIZE_MB = 50;

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// نقطة النهاية الأساسية: تستقبل رابط وتعيد ملف الفيديو مباشرة كـ stream
app.post('/api/download', (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  const id = crypto.randomBytes(8).toString('hex');
  const outputTemplate = path.join(DOWNLOAD_DIR, `${id}.%(ext)s`);

  // yt-dlp يدعم انستغرام، تيك توك، فيسبوك، يوتيوب شورتس، تويتر/X ومنصات أخرى كثيرة تلقائياً
  const ytdlp = spawn('yt-dlp', [
    '-f', 'best[ext=mp4]/best',
    '--max-filesize', `${MAX_FILE_SIZE_MB}M`,
    '-o', outputTemplate,
    '--no-playlist',
    url,
  ]);

  let stderr = '';
  ytdlp.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  ytdlp.on('error', (err) => {
    console.error('yt-dlp غير مثبت أو تعذر تشغيله:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'yt-dlp غير مثبت على الخادم' });
    }
  });

  ytdlp.on('close', (code) => {
    if (code !== 0) {
      console.error(stderr);
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'فشل تنزيل الفيديو. تأكد من أن الرابط صحيح ومدعوم، أو أن حجمه لا يتجاوز الحد المسموح',
        });
      }
      return;
    }

    const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(id));
    if (files.length === 0) {
      return res.status(500).json({ error: 'لم يتم العثور على الملف بعد التنزيل' });
    }

    const filePath = path.join(DOWNLOAD_DIR, files[0]);
    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // حذف الملف من الخادم بعد إرساله لتوفير المساحة
    stream.on('close', () => {
      fs.unlink(filePath, () => {});
    });
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend يعمل على المنفذ ${PORT}`);
});
