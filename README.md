# 🚕 Yo'lovchi — Yo'nalishli Taksilar (Marshrutkalar) Ekotizimi

Ushbu platforma yo'lovchilar, haydovchilar va dispetcherlar/administratorlar uchun yagona aqlli tizimdir.

---

## 🌐 Jonli ishlab turgan manzillar (Production)

* **Admin Panel:** [https://admin.masharipov-ergashboy.uz](https://admin.masharipov-ergashboy.uz) *(yoki [https://masharipov-ergashboy.uz](https://masharipov-ergashboy.uz))*
* **Haydovchi Telegram Mini App:** [https://driver.masharipov-ergashboy.uz](https://driver.masharipov-ergashboy.uz)
* **Yo'lovchi Telegram Mini App:** [https://app.masharipov-ergashboy.uz](https://app.masharipov-ergashboy.uz)
* **Backend API (Swagger Docs):** [https://api.masharipov-ergashboy.uz/docs](https://api.masharipov-ergashboy.uz/docs)

---

## 🏗 Loyiha Strukturasi

```text
yo-lovchi/
├── admin/               # React (Vite) dispetcher va admin boshqaruv paneli
├── backend/             # FastAPI (Python), PostgreSQL / SQLite, Telegram Service
├── haydovchilar/
│   ├── app/             # Haydovchilar uchun React Telegram Mini App (GPS va holat)
│   └── bot/             # Haydovchilar Telegram boti (Telegraf.js)
├── mijozlar/
│   ├── src/             # Yo'lovchilar uchun React Telegram Mini App (Xarita)
│   └── bot/             # Yo'lovchilar Telegram boti (Telegraf.js)
├── deploy/
│   ├── deploy.sh        # Avtomatlashtirilgan CI/CD deploy skripti
│   └── masharipov-ergashboy.conf # Nginx konfiguratsiyasi
└── .github/workflows/
    └── deploy.yml       # GitHub Actions orqali avtomatik VPS deploy
```

---

## ⚡️ Avtomatlashtirilgan CI/CD (GitHub Actions)

Har safar `main` tarmog'iga yangi kod yuklanganda (`git push origin main`):
1. GitHub Actions avtomatik ishga tushadi.
2. VPS serverga SSH orqali ulanadi.
3. Yangi kodlarni tortib oladi, frontend ilovalarni `build` qiladi.
4. PM2 orqali backend va botlarni qayta yurgizadi hamda Nginx-ni yangilaydi.
