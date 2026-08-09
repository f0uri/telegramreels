require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  console.error('يجب تعيين BOT_TOKEN في ملف .env (احصل عليه من @BotFather)');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const URL_REGEX = /(https?:\/\/[^\s]+)/i;

// أسماء عرض جميلة حسب المنصة، تُستخرج من الدومين
const PLATFORM_NAMES = {
  'instagram.com': '📸 انستغرام',
  'tiktok.com': '🎵 تيك توك',
  'facebook.com': '📘 فيسبوك',
  'fb.watch': '📘 فيسبوك',
  'youtube.com': '▶️ يوتيوب',
  'youtu.be': '▶️ يوتيوب',
  'twitter.com': '🐦 تويتر (X)',
  'x.com': '🐦 تويتر (X)',
  'pinterest.com': '📌 بينتيريست',
  'pin.it': '📌 بينتيريست',
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const key = Object.keys(PLATFORM_NAMES).find((d) => host.includes(d));
    return key ? PLATFORM_NAMES[key] : '🌐 مصدر آخر';
  } catch {
    return '🌐 مصدر آخر';
  }
}

const HELP_TEXT =
  '✨ <b>كيف يعمل البوت</b>\n\n' +
  'فقط أرسل رابط أي فيديو أو ريلز وسأحمّله لك مباشرة، بدون علامات مائية أو إعلانات.\n\n' +
  '📥 <b>المنصات المدعومة</b>\n' +
  '📸 انستغرام  •  🎵 تيك توك  •  📘 فيسبوك\n' +
  '▶️ يوتيوب شورتس  •  🐦 تويتر / X  •  📌 بينتيريست\n\n' +
  '⚠️ الحد الأقصى لحجم الفيديو: <b>50MB</b>\n\n' +
  'الأوامر:\n' +
  '/start — رسالة الترحيب\n' +
  '/help — هذه القائمة';

bot.start((ctx) => {
  ctx.replyWithHTML(
    `👋 أهلاً <b>${ctx.from.first_name || ''}</b>!\n\n` +
      '🎬 أنا بوت تنزيل الريلز والفيديوهات.\n' +
      'أرسل لي أي رابط وسأحمّله لك خلال ثوانٍ.\n\n' +
      '📸 انستغرام  •  🎵 تيك توك  •  📘 فيسبوك  •  ▶️ يوتيوب  •  🐦 X\n\n' +
      'اكتب /help لمزيد من التفاصيل.'
  );
});

bot.help((ctx) => ctx.replyWithHTML(HELP_TEXT));

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const match = text.match(URL_REGEX);

  if (!match) {
    return ctx.replyWithHTML(
      '🤔 لم أجد رابطاً في رسالتك.\nأرسل رابط فيديو أو ريلز مباشرة، أو اكتب /help.'
    );
  }

  const url = match[1];
  const platform = detectPlatform(url);

  const statusMsg = await ctx.replyWithHTML(
    `${platform}\n⏳ جارٍ التحميل، لحظات من فضلك...`
  );

  // مؤشر "جاري إرسال فيديو..." الأصلي في تيليجرام
  ctx.sendChatAction('upload_video').catch(() => {});

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/download`,
      { url },
      {
        responseType: 'arraybuffer',
        timeout: 120000, // مهلة دقيقتين للفيديوهات الأطول
        validateStatus: () => true,
      }
    );

    if (response.status !== 200) {
      let msg = 'حدث خطأ أثناء التنزيل.';
      try {
        const errorText = Buffer.from(response.data).toString('utf8');
        msg = JSON.parse(errorText).error || msg;
      } catch {
        // تجاهل أخطاء التحليل واستخدم الرسالة الافتراضية
      }
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `❌ <b>تعذّر التحميل</b>\n${msg}`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const sizeMB = (response.data.byteLength / (1024 * 1024)).toFixed(1);
    const mediaType = response.headers['x-media-type'] || 'video';
    const caption = `${platform}\n✅ تم التحميل بنجاح  •  ${sizeMB}MB`;
    const buffer = Buffer.from(response.data);

    if (mediaType === 'photo') {
      await ctx.replyWithPhoto({ source: buffer }, { caption, parse_mode: 'HTML' });
    } else {
      await ctx.replyWithVideo({ source: buffer }, { caption, parse_mode: 'HTML' });
    }
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
  } catch (err) {
    console.error(err.message);
    await ctx.telegram
      .editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        '⚠️ <b>تعذّر الاتصال بالخادم</b>\nحاول لاحقاً، أو تأكد أن حجم الفيديو أقل من 50 ميجا.',
        { parse_mode: 'HTML' }
      )
      .catch(() => {});
  }
});

bot.launch();
console.log('البوت يعمل...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

