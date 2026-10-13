#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOGS_DIR"

echo "=== Lokal loyihalarni ishga tushirish ==="

# 1. Backend (FastAPI - Port 8000)
if ! lsof -i :8000 > /dev/null 2>&1; then
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

echo "========================================="
echo "Barcha loyihalar fonda (background) faol!"
echo "Log fayllar: $LOGS_DIR/"
