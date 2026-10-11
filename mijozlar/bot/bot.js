const { Telegraf } = require('telegraf');

// Tokenni bu yerga joylashtiramiz
const bot = new Telegraf('8910943568:AAHpGGEGLYm7KsB6df3AfOElAnN5TKBv5mo');

// Diqqat: Telegram Mini App ishlashi uchun ilova HTTPS manzilga ega bo'lishi shart!
// Hozircha loyiha local (localhost:5173) da ishlayotgani uchun, uni Vercel, Netlify 
// yoki ngrok orqali internetga chiqarib, o'sha HTTPS ssilkani pastga yozishingiz kerak.
const WEB_APP_URL = 'https://wopbd-82-215-96-37.free.pinggy.net'; // <--- O'zingizning HTTPS silkangizni qo'ying

bot.start((ctx) => {
  ctx.reply(
    "Assalomu alaykum! Yo'nalishli taksilar (marshrutkalar) harakatini jonli kuzatish uchun quyidagi tugmani bosing:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚕 Marshrutlarni ko'rish",
              web_app: { url: WEB_APP_URL }
            }
          ]
        ]
      }
    }
  );
});

bot.launch().then(() => {
  console.log('Bot ishga tushdi!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
