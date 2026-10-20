const { Telegraf, Markup } = require('telegraf');

// Tokenni bu yerga joylashtiramiz
const BOT_TOKEN = process.env.BOT_TOKEN || '8910943568:AAHpGGEGLYm7KsB6df3AfOElAnN5TKBv5mo';
const bot = new Telegraf(BOT_TOKEN);

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://app.yolovchiapp.uz';

async function clearOldKeyboard(ctx) {
  try {
    const clearingMsg = await ctx.reply("...", {
      reply_markup: { remove_keyboard: true }
    });
    await ctx.deleteMessage(clearingMsg.message_id).catch(() => {});
  } catch (e) {}
}

bot.start(async (ctx) => {
  await ctx.setChatMenuButton({ type: 'default' }).catch(() => {});
  await clearOldKeyboard(ctx);

  const welcomeText = "Assalomu alaykum! Yo'nalishli taksilar (marshrutkalar) harakatini jonli kuzatish uchun quyidagi tugmani bosing:";

  return ctx.reply(
    welcomeText,
    Markup.inlineKeyboard([
      [Markup.button.webApp("🚖 Marshrutlarni ko'rish", WEB_APP_URL)]
    ])
  );
});

bot.on('text', async (ctx) => {
  await ctx.setChatMenuButton({ type: 'default' }).catch(() => {});
  await clearOldKeyboard(ctx);

  return ctx.reply(
    "Marshrutlarni ko'rish uchun quyidagi tugmani bosing:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🚖 Marshrutlarni ko'rish", WEB_APP_URL)]
    ])
  );
});

bot.launch().then(async () => {
  console.log('Mijozlar boti ishga tushdi!');
  try {
    await bot.telegram.deleteMyCommands().catch(() => {});
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: 'default'
      }
    });
  } catch(e) {}
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
