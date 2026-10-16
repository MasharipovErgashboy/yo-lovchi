const { Telegraf } = require('telegraf');

// Tokenni bu yerga joylashtiramiz
const bot = new Telegraf('8910943568:AAHpGGEGLYm7KsB6df3AfOElAnN5TKBv5mo');

// Diqqat: Telegram Mini App ishlashi uchun ilova HTTPS manzilga ega bo'lishi shart!
// Hozircha loyiha local (localhost:5173) da ishlayotgani uchun, uni Vercel, Netlify 
// yoki ngrok orqali internetga chiqarib, o'sha HTTPS ssilkani pastga yozishingiz kerak.
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://app.yolovchiapp.uz';

bot.start(async (ctx) => {
  await ctx.setChatMenuButton({ type: 'commands' }).catch(() => {});

  ctx.reply(
    "Assalomu alaykum! Yo'nalishli taksilar (marshrutkalar) harakatini jonli kuzatish uchun quyidagi tugmani bosing:",
    {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Marshrutlarni ko'rish",
              web_app: { url: WEB_APP_URL }
            }
          ]
        ],
        resize_keyboard: true,
        is_persistent: true
      }
    }
  );
});

bot.on('text', async (ctx) => {
  await ctx.setChatMenuButton({ type: 'commands' }).catch(() => {});

  ctx.reply(
    "Marshrutlarni ko'rish uchun quyidagi tugmani bosing:",
    {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Marshrutlarni ko'rish",
              web_app: { url: WEB_APP_URL }
            }
          ]
        ],
        resize_keyboard: true,
        is_persistent: true
      }
    }
  );
});

bot.launch().then(async () => {
  console.log('Mijozlar boti ishga tushdi!');
  try {
    await bot.telegram.deleteMyCommands().catch(() => {});
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: 'commands'
      }
    });
  } catch(e) {}
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
