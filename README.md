# Yo'lovchi - Yo'nalishli Taksilar Boshqaruv Tizimi

Ushbu platforma yo'nalishli taksilar (marshrutkalar) tizimini to'liq boshqarish, haydovchilar va yo'lovchilar uchun Telegram Mini App ilovalari hamda dispetcherlar uchun zamonaviy Admin panelni o'z ichiga oladi.

## Loyiha Tuzilishi

* **`admin/`** - Boshqaruv paneli (React + Vite + Tailwind/Modern CSS). Marshrutlar, haydovchilar, arizalar, tizim xabarlari va qo'llab-quvvatlash bo'limi.
* **`haydovchilar/`**
  * `app/` - Haydovchilar uchun Telegram Mini App (React + Vite).
  * `bot/` - Haydovchilar ro'yxatdan o'tishi va ilovani ochishi uchun Telegram Bot (Telegraf).
* **`mijozlar/`**
  * Frontend - Yo'lovchilar uchun jonli xarita va marshrutlarni kuzatish mini ilovasi.
  * `bot/` - Yo'lovchilar uchun Telegram Bot (Telegraf).

## Ishga Tushirish

### 1. Admin Panel
```bash
cd admin
npm install
npm run dev -- --host --port 5175
```
Login / Parol: `yolovchi` / `yolovchi`

### 2. Haydovchilar mini ilovasi va bot
```bash
cd haydovchilar/app
npm install
npm run dev -- --host --port 5174

# Botni ishga tushirish
cd ../bot
npm install
node bot.js
```

### 3. Yo'lovchilar mini ilovasi va bot
```bash
cd mijozlar
npm install
npm run dev -- --host --port 5176

# Botni ishga tushirish
cd bot
npm install
node bot.js
```
