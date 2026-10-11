const { Telegraf, Scenes, session, Markup } = require('telegraf');

const BOT_TOKEN = '8611884504:AAE6Aca8wJPRiyJK1Pf-soWNf8Ry2fnAxNI';
const bot = new Telegraf(BOT_TOKEN);

// In-memory mock database for drivers
const driversDb = new Map(); // userId -> { name, surname, phone, status, pendingMessageId }

const WEB_APP_URL = "https://metallica-graduate-kid-bind.trycloudflare.com";
const BACKEND_URL = "http://localhost:8000";

// Helper to safely delete messages
async function safeDelete(ctx, messageId) {
  if (!messageId) return;
  try {
    await ctx.deleteMessage(messageId);
  } catch (e) {
    // Ignore errors (e.g. message too old, already deleted)
  }
}

// --- WIZARD SCENE FOR REGISTRATION ---
const registrationWizard = new Scenes.WizardScene(
  'driver_registration',
  
  // Step 1: Ask Name
  async (ctx) => {
    const promptMsg = await ctx.reply("Ismingizni kiriting:", Markup.removeKeyboard());
    ctx.wizard.state.lastPromptId = promptMsg.message_id;
    return ctx.wizard.next();
  },
  
  // Step 2: Ask Surname
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;
    ctx.wizard.state.name = ctx.message.text;
    
    // Delete user's reply and previous prompt
    await safeDelete(ctx, ctx.message.message_id);
    await safeDelete(ctx, ctx.wizard.state.lastPromptId);
    
    const promptMsg = await ctx.reply("Familiyangizni kiriting:");
    ctx.wizard.state.lastPromptId = promptMsg.message_id;
    return ctx.wizard.next();
  },
  
  // Step 3: Ask Phone
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;
    ctx.wizard.state.surname = ctx.message.text;
    
    // Delete user's reply and previous prompt
    await safeDelete(ctx, ctx.message.message_id);
    await safeDelete(ctx, ctx.wizard.state.lastPromptId);
    
    const promptMsg = await ctx.reply(
      "Telefon raqamingizni yuboring:",
      Markup.keyboard([
        Markup.button.contactRequest("📱 Telefon raqamimni yuborish")
      ]).oneTime().resize()
    );
    ctx.wizard.state.lastPromptId = promptMsg.message_id;
    return ctx.wizard.next();
  },
  
  // Step 4: Confirmation
  async (ctx) => {
    if (!ctx.message) return;
    
    if (ctx.message.contact) {
      ctx.wizard.state.phone = ctx.message.contact.phone_number;
    } else if (ctx.message.text) {
      ctx.wizard.state.phone = ctx.message.text;
    } else {
      return;
    }

    // Delete user's reply and previous prompt
    await safeDelete(ctx, ctx.message.message_id);
    await safeDelete(ctx, ctx.wizard.state.lastPromptId);

    const { name, surname, phone } = ctx.wizard.state;
    
    // Telefon raqamni chiroyli formatlash (+998 90 123 45 67)
    let formattedPhone = phone.toString().replace(/[^0-9]/g, '');
    if (!formattedPhone.startsWith('998') && formattedPhone.length === 9) {
      formattedPhone = '998' + formattedPhone;
    }
    const match = formattedPhone.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
      formattedPhone = `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
    } else {
      formattedPhone = '+' + formattedPhone;
    }
    ctx.wizard.state.phone = formattedPhone;

    const msg = `Ma'lumotlaringiz:\n\nIsm: ${name}\nFamiliya: ${surname}\nTelefon: ${formattedPhone}`;

    // Remove the contact keyboard, send inline keyboard
    const promptMsg = await ctx.reply(msg, {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash", callback_data: "confirm" }],
          [{ text: "✏️ Tahrirlash", callback_data: "edit" }]
        ]
      }
    });
    ctx.wizard.state.lastPromptId = promptMsg.message_id;
    return ctx.wizard.next();
  },
  
  // Step 5: Handle Confirmation Callback
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    if (ctx.callbackQuery.data === 'confirm') {
      const { name, surname, phone } = ctx.wizard.state;
      
      // Update message to pending
      const pendingMsg = await ctx.editMessageText("Arizangiz yuborildi.\n\nAdmin tasdiqlashini kuting.");
      const pendingId = pendingMsg ? pendingMsg.message_id : ctx.callbackQuery.message.message_id;
      
      // Save to Python backend
      try {
        await fetch(`${BACKEND_URL}/api/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: ctx.from.id,
            name: name,
            surname: surname,
            phone: phone,
            pending_message_id: pendingId
          })
        });
      } catch (err) {
        console.error("Error submitting candidate to backend:", err);
      }
      
      return ctx.scene.leave();
      
    } else if (ctx.callbackQuery.data === 'edit') {
      await safeDelete(ctx, ctx.callbackQuery.message.message_id);
      return ctx.scene.enter('driver_registration');
    }
  }
);

// Setup stage
const stage = new Scenes.Stage([registrationWizard]);
bot.use(session());
bot.use(stage.middleware());

// --- BOT COMMANDS ---
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  let driver = null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/candidates/${userId}`);
    if (res.ok) {
      driver = await res.json();
    }
  } catch (e) {
    console.error("Backend fetch error:", e);
  }

  // If user sends /start, clean up old bot message if possible
  if (driver && driver.pending_message_id) {
    try {
      await ctx.deleteMessage(driver.pending_message_id);
    } catch(e) {}
  }

  // Also delete the /start command message from the user
  await safeDelete(ctx, ctx.message.message_id);

  if (driver && driver.status === 'approved') {
    const url = new URL(WEB_APP_URL);
    url.searchParams.set('phone', driver.phone);
    url.searchParams.set('name', driver.name);
    url.searchParams.set('surname', driver.surname);

    return ctx.reply("Siz allaqachon ro'yxatdan o'tgansiz va tasdiqlangansiz!", {
      reply_markup: {
        inline_keyboard: [[{ text: "🚗 Ilovani ochish", web_app: { url: url.toString() } }]]
      }
    });
  }

  if (driver && driver.status === 'pending') {
    const pendingMsg = await ctx.reply("Arizangiz yuborilgan. Admin tasdiqlashini kuting.");
    return;
  }

  // Not registered
  const startMsg = await ctx.reply("Haydovchi tizimiga xush kelibsiz.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Haydovchi bo'lish", callback_data: "start_registration" }]
      ]
    }
  });
  
  // Store start message ID so we can delete it when they click the button
  ctx.session ??= {};
  ctx.session.startMsgId = startMsg.message_id;
});

bot.action('start_registration', async (ctx) => {
  ctx.answerCbQuery();
  await safeDelete(ctx, ctx.callbackQuery.message.message_id);
  ctx.scene.enter('driver_registration');
});

// --- MOCK ADMIN COMMAND ---
bot.command('approve', async (ctx) => {
  // Usage: /approve <userId>
  const parts = ctx.message.text.split(' ');
  const targetId = parts.length > 1 ? parseInt(parts[1]) : ctx.from.id;

  const driver = driversDb.get(targetId);
  
  await safeDelete(ctx, ctx.message.message_id); // Delete the /approve command

  if (!driver) {
    return ctx.reply(`Foydalanuvchi topilmadi (ID: ${targetId})`);
  }

  // Delete the pending message in real-time for the user
  if (driver.pendingMessageId) {
    try {
      await bot.telegram.deleteMessage(targetId, driver.pendingMessageId);
      driver.pendingMessageId = null;
    } catch(e) {}
  }

  driver.status = 'approved';
  
  const url = new URL(WEB_APP_URL);
  url.searchParams.set('phone', driver.phone);
  url.searchParams.set('name', driver.name);
  url.searchParams.set('surname', driver.surname);

  // Send notification to the driver
  await bot.telegram.sendMessage(
    targetId,
    "🎉 Tabriklaymiz!\n\nSiz haydovchilikka qabul qilindingiz.\n\nIshni boshlash uchun ilovaga kiring va joylashuvingizni yoqing.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚗 Ilovani ochish", web_app: { url: url.toString() } }]
        ]
      }
    }
  ).catch(err => console.error("Could not notify driver:", err));
});

bot.launch().then(() => {
  console.log("Haydovchi boti ishga tushdi (Auto-delete qismi bilan)!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
