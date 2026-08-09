# بوت تيليجرام لتنزيل الريلز

مشروع مكوّن من جزأين:

- **backend/** — خادم Express (Node.js) يستقبل رابط فيديو ويحمّله عبر `yt-dlp` (يدعم انستغرام، تيك توك، فيسبوك، يوتيوب شورتس، تويتر/X، وعشرات المنصات الأخرى تلقائياً).
- **bot/** — بوت تيليجرام (Telegraf) يستقبل الروابط من المستخدم، يرسلها إلى الـ backend، ثم يرسل الفيديو الناتج للمستخدم.

## المتطلبات

1. **Node.js** (نسخة 18 أو أحدث).
2. **yt-dlp** مثبت على نفس الجهاز الذي يعمل عليه الـ backend:
   ```bash
   pip install -U yt-dlp
   ```
   أو عبر pipx:
   ```bash
   pipx install yt-dlp
   ```
3. **ffmpeg** مثبت (مطلوب من yt-dlp لدمج بعض الصيغ):
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   # macOS
   brew install ffmpeg
   ```
4. **توكن بوت تيليجرام** من [@BotFather](https://t.me/BotFather).

## 🚀 أسهل طريقة: النشر السحابي (بدون سيرفر يدوي)

المشروع يحتوي على `Dockerfile` يجهّز كل شيء تلقائياً (Node + Python + yt-dlp + ffmpeg). كل ما تحتاجه هو رفع المشروع على GitHub ثم ربطه بمنصة استضافة تدعم Docker.

### الخطوات

1. **ارفع المشروع على GitHub:**
   ```bash
   cd telegram-reels-bot
   git init
   git add .
   git commit -m "أول نسخة من البوت"
   ```
   أنشئ مستودع جديد فارغ على [github.com/new](https://github.com/new)، ثم:
   ```bash
   git remote add origin https://github.com/USERNAME/REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **انشر على [Railway](https://railway.app):**
   - سجّل دخول بحساب GitHub.
   - اضغط **New Project** → **Deploy from GitHub repo** → اختر المستودع.
   - سيكتشف Railway ملف `Dockerfile` تلقائياً ويبني المشروع.
   - اذهب إلى تبويب **Variables** وأضف متغيّر واحد فقط:
     - `BOT_TOKEN` = التوكن الذي حصلت عليه من [@BotFather](https://t.me/BotFather)
   - اضغط **Deploy**. بعد دقيقة أو دقيقتين سيعمل البوت 24/7 تلقائياً.

   *(بديل: [Render.com](https://render.com) — أنشئ "Web Service" جديد من نفس المستودع، Render سيكتشف الـ Dockerfile أيضاً. لاحظ أن الخطة المجانية في Render قد "تنام" البوت بعد فترة خمول، بينما Railway أنسب لبوت يعمل باستمرار).

بهذا لا تحتاج تثبيت أي شيء يدوياً — كل التجهيزات (yt-dlp, ffmpeg, Node) داخل الحاوية.

---

## أو: التشغيل اليدوي على جهازك/سيرفرك الخاص

### 1) تشغيل الـ backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

سيعمل على `http://localhost:3000` افتراضياً.

### 2) تشغيل البوت

```bash
cd bot
cp .env.example .env
# افتح .env وضع BOT_TOKEN الخاص بك
npm install
npm start
```

### 3) الاستخدام

افتح محادثة مع البوت في تيليجرام وأرسل أي رابط ريلز/فيديو، وسيرد عليك بالفيديو مباشرة.

## نقاط مهمة

- **حد الحجم**: بوتات تيليجرام العادية لا يمكنها رفع ملفات أكبر من 50 ميجابايت عبر الـ API. الكود يفرض هذا الحد تلقائياً عبر خيار `--max-filesize` في yt-dlp. لدعم ملفات أكبر تحتاج تشغيل [Telegram Bot API محلياً](https://github.com/tdlib/telegram-bot-api) (يدعم حتى 2GB).
- **الحقوق والمنصات**: بعض المنصات (خصوصاً انستغرام) قد تتطلب تسجيل دخول (cookies) لتنزيل محتوى معين أو خاص. يمكن تمرير ملف كوكيز لـ yt-dlp عبر `--cookies cookies.txt` عند الحاجة.
- **الاستضافة**: يمكن رفع الـ backend والبوت على أي VPS يدعم Node.js (مثل Hetzner, DigitalOcean) طالما يمكنك تثبيت yt-dlp عليه. الاستضافات المجانية بدون وصول shell (مثل بعض PaaS) قد لا تسمح بتثبيت yt-dlp.
- **استخدام المحتوى**: تأكد أن استخدامك للمحتوى المُنزَّل يتوافق مع شروط استخدام كل منصة وحقوق الملكية الفكرية لصاحب المحتوى.

## هيكلة المشروع

```
telegram-reels-bot/
├── Dockerfile           # لبناء ونشر المشروع كحاوية واحدة
├── start.sh             # يشغّل backend و bot معاً داخل الحاوية
├── .env.example          # متغيّر البيئة المطلوب عند النشر السحابي (BOT_TOKEN فقط)
├── backend/
│   ├── server.js         # نقطة النهاية POST /api/download
│   ├── package.json
│   └── .env.example
├── bot/
│   ├── bot.js             # منطق البوت
│   ├── package.json
│   └── .env.example
└── README.md
```
