#!/bin/bash

# X11サーバーを開始
Xorg -nocursor :0 &
X_PID=$!

# ウィンドウマネージャーを開始
sleep 2
openbox &
WM_PID=$!

# Chromiumでアプリを表示（キオスクモード）
sleep 3
chromium \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --kiosk \
    --no-first-run \
    --disable-infobars \
    --disable-features=TranslateUI \
    --disable-translate \
    --disk-cache-size=1 \
    --media-cache-size=1 \
    --aggressive-cache-discard \
    "http://api:3000" &

CHROME_PID=$!

# プロセス監視
while true; do
    if ! kill -0 $X_PID 2>/dev/null; then
        echo "X11 server died, restarting..."
        Xorg -nocursor :0 &
        X_PID=$!
        sleep 2
    fi
    
    if ! kill -0 $CHROME_PID 2>/dev/null; then
        echo "Chromium died, restarting..."
        chromium \
            --no-sandbox \
            --disable-dev-shm-usage \
            --disable-gpu \
            --kiosk \
            --no-first-run \
            --disable-infobars \
            --disable-features=TranslateUI \
            --disable-translate \
            --disk-cache-size=1 \
            --media-cache-size=1 \
            --aggressive-cache-discard \
            "http://api:3000" &
        CHROME_PID=$!
    fi
    
    sleep 5
done