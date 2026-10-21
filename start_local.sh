#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOGS_DIR"

# 1. Load local env if present
if [ -f "$PROJECT_DIR/.env.local" ]; then
    set -a
    source "$PROJECT_DIR/.env.local"
    set +a
fi

echo "=========================================================="
echo "🚀 Lokal loyihalarni ishga tushirish (DEVELOPMENT REJIMI)"
echo "=========================================================="

# 0. Docker Postgres
if command -v docker > /dev/null 2>&1; then
    if ! docker ps --format '{{.Names}}' | grep -q 'yolovchi-postgres'; then
        echo "🐘 Docker PostgreSQL ishga tushirilmoqda..."
        docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d > /dev/null 2>&1
    else
        echo "✅ Docker PostgreSQL allaqachon faol (Port 5432)"
    fi
fi

# 1. Backend (FastAPI - Port 8000)
if ! lsof -i :8000 > /dev/null 2>&1; then
    cd "$PROJECT_DIR/backend"
    setsid nohup "$PROJECT_DIR/backend/venv/bin/uvicorn" main:app --app-dir "$PROJECT_DIR/backend" --host 0.0.0.0 --port 8000 --reload </dev/null > "$LOGS_DIR/backend.log" 2>&1 &
    echo "✅ Backend ishga tushirildi: http://localhost:8000"
else
    echo "ℹ️ Backend allaqachon ishlayapti: http://localhost:8000"
fi

# 2. Admin Panel (React Vite - Port 5173)
if ! lsof -i :5173 > /dev/null 2>&1; then
    cd "$PROJECT_DIR/admin"
    setsid nohup "$PROJECT_DIR/admin/node_modules/.bin/vite" --port 5173 --host 0.0.0.0 </dev/null > "$LOGS_DIR/admin.log" 2>&1 &
    echo "✅ Admin Panel ishga tushirildi: http://localhost:5173"
else
    echo "ℹ️ Admin Panel allaqachon ishlayapti: http://localhost:5173"
fi

# 3. Haydovchi Mini App (React Vite - Port 5174)
if ! lsof -i :5174 > /dev/null 2>&1; then
    cd "$PROJECT_DIR/haydovchilar/app"
    setsid nohup "$PROJECT_DIR/haydovchilar/app/node_modules/.bin/vite" --port 5174 --host 0.0.0.0 </dev/null > "$LOGS_DIR/driver.log" 2>&1 &
    echo "✅ Haydovchi App ishga tushirildi: http://localhost:5174"
else
    echo "ℹ️ Haydovchi App allaqachon ishlayapti: http://localhost:5174"
fi

# 4. Yo'lovchi Mini App (React Vite - Port 5175)
if ! lsof -i :5175 > /dev/null 2>&1; then
    cd "$PROJECT_DIR/mijozlar"
    setsid nohup "$PROJECT_DIR/mijozlar/node_modules/.bin/vite" --port 5175 --host 0.0.0.0 </dev/null > "$LOGS_DIR/passenger.log" 2>&1 &
    echo "✅ Yo'lovchi App ishga tushirildi: http://localhost:5175"
else
    echo "ℹ️ Yo'lovchi App allaqachon ishlayapti: http://localhost:5175"
fi

# 5. Haydovchilar Test Boti (Lokal)
if ! pgrep -f "haydovchilar/bot/bot.js" > /dev/null 2>&1; then
    cd "$PROJECT_DIR/haydovchilar/bot"
    NODE_OPTIONS="--no-network-family-autoselection" \
    BOT_TOKEN="${DRIVER_BOT_TOKEN:-8751804848:AAFz_hWz9XXL3-a55eDiXky9gwAmcetgmQc}" \
    WEB_APP_URL="${DRIVER_WEB_APP_URL:-https://driver.yolovchiapp.uz}" \
    BACKEND_URL="${BACKEND_URL:-http://localhost:8000}" \
    setsid nohup node "$PROJECT_DIR/haydovchilar/bot/bot.js" </dev/null > "$LOGS_DIR/driver_bot.log" 2>&1 &
    echo $! > "$LOGS_DIR/driver_bot.pid"
    echo "🤖 Haydovchilar Test Boti ishga tushdi (@haydovchi_app_bot)"
else
    echo "ℹ️ Haydovchilar Test Boti allaqachon ishlayapti."
fi

# 6. Yo'lovchilar Test Boti (Lokal)
if ! pgrep -f "mijozlar/bot/bot.js" > /dev/null 2>&1; then
    cd "$PROJECT_DIR/mijozlar/bot"
    NODE_OPTIONS="--no-network-family-autoselection" \
    BOT_TOKEN="${PASSENGER_BOT_TOKEN:-8712564876:AAH8Afb0AlO1CmfJNukZbWckqM4aX9znPTg}" \
    WEB_APP_URL="${PASSENGER_WEB_APP_URL:-https://app.yolovchiapp.uz}" \
    BACKEND_URL="${BACKEND_URL:-http://localhost:8000}" \
    setsid nohup node "$PROJECT_DIR/mijozlar/bot/bot.js" </dev/null > "$LOGS_DIR/passenger_bot.log" 2>&1 &
    echo $! > "$LOGS_DIR/passenger_bot.pid"
    echo "🤖 Yo'lovchilar Test Boti ishga tushdi (@yolovchi_app_bot)"
else
    echo "ℹ️ Yo'lovchilar Test Boti allaqachon ishlayapti."
fi

echo "=========================================================="
echo "🎉 Barcha lokal servislar va test botlar faol!"
echo "Log fayllar: $LOGS_DIR/"
echo "To'xtatish uchun: ./stop_local.sh"
echo "=========================================================="
