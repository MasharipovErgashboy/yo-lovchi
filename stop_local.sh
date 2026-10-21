#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_DIR/.logs"

echo "=== Lokal loyihalarni to'xtatish ==="

# 1. Portlar bo'yicha to'xtatish (8000, 5173, 5174, 5175)
for port in 8000 5173 5174 5175; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null
        echo "🛑 Port $port (PID: $PID) to'xtatildi."
    else
        echo "ℹ️ Port $port bo'sh."
    fi
done

# 2. Test botlarni to'xtatish
if [ -f "$LOGS_DIR/driver_bot.pid" ]; then
    kill -9 $(cat "$LOGS_DIR/driver_bot.pid") 2>/dev/null
    rm -f "$LOGS_DIR/driver_bot.pid"
fi
pkill -f "haydovchilar/bot/bot.js" 2>/dev/null && echo "🛑 Haydovchilar test boti to'xtatildi."

if [ -f "$LOGS_DIR/passenger_bot.pid" ]; then
    kill -9 $(cat "$LOGS_DIR/passenger_bot.pid") 2>/dev/null
    rm -f "$LOGS_DIR/passenger_bot.pid"
fi
pkill -f "mijozlar/bot/bot.js" 2>/dev/null && echo "🛑 Yo'lovchilar test boti to'xtatildi."

echo "=========================================="
echo "✅ Barcha lokal servislar to'xtatildi."
