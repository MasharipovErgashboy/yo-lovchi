#!/bin/bash
echo "=== Lokal loyihalarni to'xtatish ==="

for port in 8000 5173 5174 5175; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null
        echo "🛑 Port $port (PID: $PID) to'xtatildi."
    else
        echo "ℹ️ Port $port bo'sh."
    fi
done

echo "Barcha servislar to'xtatildi."
