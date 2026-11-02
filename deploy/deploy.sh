#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Avtomatik Deploy boshlandi: $(date)"
echo "=========================================="

PROJECT_DIR="/root/yo-lovchi"
cd "$PROJECT_DIR"

# 1. Eng so'nggi kodlarni olish
echo "📥 Git yangilanishlarini tortib olish..."
git fetch origin main
git reset --hard origin/main

# 2. Python Backend muhitini yangilash (agar kerak bo'lsa)
if [ -d "$PROJECT_DIR/backend/venv" ]; then
    echo "🐍 Backend paketlarini tekshirish..."
    "$PROJECT_DIR/backend/venv/bin/pip" install -r "$PROJECT_DIR/backend/requirements.txt" --quiet || true
fi

# 3. Admin Panelni build qilish
echo "📦 Admin Panel build qilinmoqda..."
cd "$PROJECT_DIR/admin"
npm install --prefer-offline --no-audit || true
npm run build

# 4. Haydovchilar Mini Appni build qilish
echo "📦 Haydovchilar Mini App build qilinmoqda..."
cd "$PROJECT_DIR/haydovchilar/app"
npm install --prefer-offline --no-audit || true
npm run build

# 5. Yo'lovchilar Mini Appni build qilish
echo "📦 Yo'lovchilar Mini App build qilinmoqda..."
cd "$PROJECT_DIR/mijozlar"
npm install --prefer-offline --no-audit || true
npm run build

# 6. Telegram Botlar paketlarini tekshirish
echo "📦 Botlar paketlarini tekshirish..."
cd "$PROJECT_DIR/haydovchilar/bot"
npm install --prefer-offline --no-audit || true

cd "$PROJECT_DIR/mijozlar/bot"
npm install --prefer-offline --no-audit || true

# 7. PM2 servislarini qayta ishga tushirish (faqat yolovchi loyihasiga tegishli servislar)
echo "🔄 PM2 servislari qayta ishga tushirilmoqda..."
BACKEND_URL="http://127.0.0.1:8008" NODE_ENV="production" pm2 restart yolovchi-driver-bot --update-env || true
pm2 reload yolovchi-backend yolovchi-passenger-bot --update-env || pm2 restart yolovchi-backend yolovchi-passenger-bot || true

# 8. Nginx sozlamasini tekshirish va yangilash
echo "🌐 Nginx tekshirilmoqda..."
nginx -t && systemctl reload nginx

echo "=========================================="
echo "✅ Deploy muvaffaqiyatli yakunlandi! 🎉"
echo "=========================================="
