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

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// بينتيريست غالباً صور، وyt-dlp لا يدعمها جيداً، لذا نستخدم gallery-dl لهذه الحالة
function isPinterestUrl(url) {
  return /pinterest\.[a-z.]+\/|pin\.it\//i.test(url);
}

function runDownloader(url, id) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(DOWNLOAD_DIR, `${id}.%(ext)s`);
    let cmd, args;

    if (isPinterestUrl(url)) {
      cmd = 'gallery-dl';
      args = ['-d', DOWNLOAD_DIR, '-o', `filename=${id}.{extension}`, url];
    } else {
      cmd = 'yt-dlp';
      args = [
        '-f', 'best[ext=mp4]/best',
        '--max-filesize', `${MAX_FILE_SIZE_MB}M`,
        '-o', outputTemplate,
        '--no-playlist',
        url,
      ];
    }

    const proc = spawn(cmd, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => reject(new Error(`${cmd} غير مثبت: ${err.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `فشل ${cmd}`));
      resolve();
    });
  });
}

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  const id = crypto.randomBytes(8).toString('hex');

  try {
    await runDownloader(url, id);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      error: 'فشل تنزيل المحتوى. تأكد أن الرابط صحيح ومدعوم، أو أن حجمه لا يتجاوز الحد المسموح',
    });
  }

  const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(id));
  if (files.length === 0) {
    return res.status(500).json({ error: 'لم يتم العثور على الملف بعد التنزيل' });
  }

  const filePath = path.join(DOWNLOAD_DIR, files[0]);
  const ext = path.extname(files[0]).toLowerCase();
  const stat = fs.statSync(filePath);
  const mediaType = IMAGE_EXTENSIONS.includes(ext) ? 'photo' : 'video';

  res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);
  res.setHeader('X-Media-Type', mediaType); // ليعرف البوت كيف يرسلها (صورة أم فيديو)

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  stream.on('close', () => {
    fs.unlink(filePath, () => {});
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend يعمل على المنفذ ${PORT}`);
});

