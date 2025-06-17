#!/bin/bash

# エラーで終了しないように設定
set +e

# ディスプレイ番号を環境変数から取得（デフォルトは0）
DISPLAY_NUM=${DISPLAY_NUM:-0}
export DISPLAY=:${DISPLAY_NUM}

echo "Starting X11 server on display ${DISPLAY}"

# X11ソケットディレクトリの確認
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

echo "古いXサーバープロセスをクリーンアップ中..."
pkill -f "Xorg :${DISPLAY_NUM}" || true
pkill -f "X :${DISPLAY_NUM}" || true
rm -f /tmp/.X${DISPLAY_NUM}-lock
rm -f /tmp/.X11-unix/X${DISPLAY_NUM}

echo "フレームバッファデバイスを確認中..."
ls -la /dev/fb* || echo "フレームバッファが見つかりません"

# DRI（Direct Rendering Infrastructure）デバイスの確認
echo "DRIデバイスを確認中..."
ls -la /dev/dri/* 2>/dev/null || echo "DRIデバイスが見つかりません"

echo "Xサーバーの権限を設定中..."
if [ -f /usr/bin/Xorg ]; then
    chown root:root /usr/bin/Xorg
    chmod u+s /usr/bin/Xorg
fi

# Xorgのラッパー設定
if [ -f /etc/X11/Xwrapper.config ]; then
    echo "allowed_users=anybody" > /etc/X11/Xwrapper.config
    echo "needs_root_rights=yes" >> /etc/X11/Xwrapper.config
fi

echo "X Window Systemを起動しています..."
# Xorgをバックグラウンドで起動（より互換性の高いオプションを使用）
Xorg :${DISPLAY_NUM} -ac -noreset -nolisten tcp -config /etc/X11/xorg.conf -logfile /var/log/Xorg.${DISPLAY_NUM}.log &
XORG_PID=$!

echo "Xサーバーの起動を待機中..."
# X11サーバーが利用可能になるまで待機
for i in {1..30}; do
    if [ -e "/tmp/.X11-unix/X${DISPLAY_NUM}" ]; then
        echo "X11サーバーが起動しました"
        break
    fi
    sleep 1
done

# X11が本当に利用可能か確認
if command -v xdpyinfo >/dev/null 2>&1; then
    echo "X11接続をテスト中..."
    for i in {1..10}; do
        if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
            echo "X11接続成功"
            break
        fi
        sleep 1
    done
fi

# ウィンドウマネージャーの起動（openboxがない場合はスキップ）
if command -v openbox >/dev/null 2>&1; then
    echo "ウィンドウマネージャーを起動しています..."
    DISPLAY=${DISPLAY} openbox &
else
    echo "Openboxが見つかりません。スキップします"
fi

# バックグラウンドを設定
if command -v xsetroot >/dev/null 2>&1; then
    echo "バックグラウンドを設定しています..."
    sleep 2
    DISPLAY=${DISPLAY} xsetroot -solid darkblue || echo "xsetrootに失敗しましたが続行します"
fi

# X11サーバーの準備完了を示すためのマーカーファイル作成
touch /tmp/x11-ready

echo "初期起動完了 - プロセス確認..."
ps aux | grep -E "(Xorg)" | grep -v grep || echo "Xorgプロセスが見つかりません"

echo "X11サーバーが実行中です..."

# Tauriアプリケーションを起動
echo "アプリケーションを起動しています..."
echo "Tauri executable check:"
ls -la ./tauri-app
if [ -f "./tauri-app" ]; then
    echo "Starting Tauri application..."
    DISPLAY=${DISPLAY} ./tauri-app &
    APP_PID=$!
    echo "Tauri app started with PID: $APP_PID"
else
    echo "ERROR: Tauri executable not found!"
    echo "Available files:"
    ls -la
    exit 1
fi

# メインループ - コンテナを維持
while true; do
    sleep 30
    
    # Xorgプロセスの確認
    if ! kill -0 $XORG_PID 2>/dev/null; then
        echo "$(date): Xorgプロセスが終了しました。再起動を試みます..."
        rm -f /tmp/.X${DISPLAY_NUM}-lock
        rm -f /tmp/.X11-unix/X${DISPLAY_NUM}
        Xorg :${DISPLAY_NUM} -ac -noreset -nolisten tcp -config /etc/X11/xorg.conf -logfile /var/log/Xorg.${DISPLAY_NUM}.log &
        XORG_PID=$!
        sleep 5
    fi
    
    # Tauriアプリケーションプロセスの確認
    if ! kill -0 $APP_PID 2>/dev/null; then
        echo "$(date): Tauriアプリケーションが終了しました。再起動を試みます..."
        DISPLAY=${DISPLAY} ./tauri-app &
        APP_PID=$!
    fi
    
    # ソケットファイルの存在確認
    if [ ! -e "/tmp/.X11-unix/X${DISPLAY_NUM}" ]; then
        echo "$(date): X11ソケットが見つかりません"
    fi
done