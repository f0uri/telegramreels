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

bot.start((ctx) => {
  ctx.reply(
    'أهلاً 👋\nأرسل لي رابط ريلز/فيديو من انستغرام، تيك توك، فيسبوك، يوتيوب شورتس أو تويتر (X) وسأقوم بتنزيله لك مباشرة.'
  );
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const match = text.match(URL_REGEX);

  if (!match) {
    return ctx.reply('من فضلك أرسل رابط صالح لفيديو أو ريلز.');
  }

  const url = match[1];
  const statusMsg = await ctx.reply('جارٍ تنزيل الفيديو... ⏳');

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
      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, msg);
      return;
    }

    await ctx.replyWithVideo({ source: Buffer.from(response.data) });
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
  } catch (err) {
    console.error(err.message);
    await ctx.telegram
      .editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        'تعذر الاتصال بالخادم أو انتهت المهلة. حاول لاحقاً، أو تأكد أن حجم الفيديو أقل من 50 ميجا.'
      )
      .catch(() => {});
  }
});

bot.launch();
console.log('البوت يعمل...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
