#!/usr/bin/env bash

set -e

echo "=== Starting Tauri App Entry Point ==="
echo "Current time: $(date)"
echo "Container environment:"
echo "  PWD: $PWD"
echo "  USER: $(whoami)"
echo "  UID: $(id -u)"
echo "  GID: $(id -g)"

# 環境変数をログ出力
echo "=== Environment Variables ==="
echo "  DISPLAY: $DISPLAY"
echo "  WINDOW_SIZE: $WINDOW_SIZE"
echo "  ROTATE_DISPLAY: $ROTATE_DISPLAY"
echo "  DBUS_SYSTEM_BUS_ADDRESS: $DBUS_SYSTEM_BUS_ADDRESS"

# X11サーバーの起動を待機
echo "=== Waiting for X11 Server ==="
echo "Waiting for X11 server to be ready..."
for i in {1..60}; do
    if [ -e "/tmp/x11-ready" ] || [ -e "/tmp/.X11-unix/X0" ]; then
        echo "X11 server marker found after ${i} seconds"
        break
    fi
    echo "  Waiting... (${i}/60)"
    sleep 1
done

# X11の状態を確認
echo "=== X11 Status Check ==="
echo "Checking X11 socket directories:"
ls -la /tmp/.X11-unix/ 2>/dev/null || echo "  /tmp/.X11-unix/ not found"

# DISPLAYが設定されていない場合は設定
if [ -z "$DISPLAY" ]; then
    echo "DISPLAY not set, setting to :0"
    export DISPLAY=:0
fi

echo "Using DISPLAY: $DISPLAY"

# X11設定のセットアップ
echo "=== X11 Configuration ==="

# DBUSの設定
export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket
echo "DBUS address: $DBUS_SYSTEM_BUS_ADDRESS"

# DBUS接続テスト
echo "Testing DBUS connection:"
if [ -e "/host/run/dbus/system_bus_socket" ]; then
    echo "  DBUS socket exists"
else
    echo "  DBUS socket not found"
fi

# X11の権限設定
echo "Configuring X11 permissions:"
if [ -f /etc/X11/Xwrapper.config ]; then
    echo "  Updating Xwrapper.config"
    sed -i -e 's/console/anybody/g' /etc/X11/Xwrapper.config
    echo "needs_root_rights=yes" >> /etc/X11/Xwrapper.config
    cat /etc/X11/Xwrapper.config
else
    echo "  Xwrapper.config not found"
fi

# X11接続テスト
echo "=== X11 Connection Test ==="
echo "Testing connection to $DISPLAY..."

# xdpyinfoがあるかチェック
if command -v xdpyinfo >/dev/null 2>&1; then
    echo "Running xdpyinfo:"
    xdpyinfo -display "$DISPLAY" 2>&1 || echo "  xdpyinfo failed"
else
    echo "  xdpyinfo not available"
fi

# 基本的なX11コマンドテスト
if command -v xset >/dev/null 2>&1; then
    echo "Testing xset:"
    xset -display "$DISPLAY" q 2>&1 || echo "  xset test failed"
fi

# ウィンドウサイズ設定
echo "=== Window Size Configuration ==="
if [[ -z "$WINDOW_SIZE" ]]; then
    if [ -f /sys/class/graphics/fb0/virtual_size ]; then
        echo "Detecting window size from framebuffer"
        export WINDOW_SIZE=$(cat /sys/class/graphics/fb0/virtual_size)
        echo "  Window size detected as $WINDOW_SIZE"
    else
        echo "  Framebuffer info not available, setting default"
        export WINDOW_SIZE="1920,1080"
    fi
else
    echo "  Window size set by environment variable to $WINDOW_SIZE"
fi

# ディスプレイ回転設定
if [[ ! -z "$ROTATE_DISPLAY" ]]; then
    echo "=== Display Rotation Configuration ==="
    echo "  Display rotation configured: $ROTATE_DISPLAY"
    # ROTATE_DELAY変数を設定（デフォルト値5秒）
    if [[ -z "$ROTATE_DELAY" ]]; then
        ROTATE_DELAY=5
    fi
    
    echo "  Waiting ${ROTATE_DELAY} seconds for X11 to be ready..."
    sleep "$ROTATE_DELAY"
    
    # X11の準備確認
    echo "  Testing X11 readiness before rotation:"
    if xset -display "$DISPLAY" q >/dev/null 2>&1; then
        echo "  X11 is ready, applying rotation"
        xrandr -display "$DISPLAY" -o "$ROTATE_DISPLAY" 2>&1 || echo "  xrandr rotation failed"
    else
        echo "  X11 not ready, skipping rotation"
    fi
    
    # 縦向き回転の場合は座標を反転
    if [[ "$ROTATE_DISPLAY" == "left" ]] || [[ "$ROTATE_DISPLAY" == "right" ]]; then
        echo "  Display rotated to portrait. Reversing screen coordinates"
        IFS=', ' read -a coords <<< "$WINDOW_SIZE"
        if [ ${#coords[@]} -eq 2 ]; then
            WINDOW_SIZE="${coords[1]},${coords[0]}"
            echo "  Reversed window size: $WINDOW_SIZE"
        else
            echo "  Screen coordinates not set correctly, cannot reverse them"
        fi
    fi

    echo "  Configuring touch inputs..."
    # タッチ入力の回転設定
    devices=$(xinput --list 2>/dev/null | grep -i touch | sed -E 's/^.*id=([0-9]+).*$/\1/' || true)
    if [ -n "$devices" ]; then
        for device in $devices; do
            echo "  Rotating touch device: $device"
            case "$ROTATE_DISPLAY" in
                normal)   xinput set-prop "$device" "Coordinate Transformation Matrix" 1 0 0 0 1 0 0 0 1 2>/dev/null || true;;
                inverted) xinput set-prop "$device" "Coordinate Transformation Matrix" -1 0 1 0 -1 1 0 0 1 2>/dev/null || true;;
                left)     xinput set-prop "$device" "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null || true;;
                right)    xinput set-prop "$device" "Coordinate Transformation Matrix" 0 1 0 -1 0 1 0 0 1 2>/dev/null || true;;
            esac
        done
    else
        echo "  No touch devices found"
    fi
fi

# 入力デバイスの一覧表示
echo "=== Input Devices ==="
if xinput list 2>/dev/null; then
    echo "  Input devices listed successfully"
else
    echo "  Unable to connect to X server for input device listing"
fi

# スクリーンセーバー設定
echo "=== Screen Saver Configuration ==="
if xset -display "$DISPLAY" s off -dpms 2>/dev/null; then
    echo "  Screen saver and power management disabled"
else
    echo "  Failed to configure screen saver (X11 connection issue)"
fi

# Tauri実行可能ファイルの確認
echo "=== Tauri Application Check ==="
if [ -f "./tauri-app" ]; then
    echo "  Tauri executable found: ./tauri-app"
    ls -la ./tauri-app
    echo "  File permissions: $(stat -c '%A' ./tauri-app)"
else
    echo "  ERROR: Tauri executable not found!"
    echo "  Current directory contents:"
    ls -la
    exit 1
fi

# 環境変数を最終確認
echo "=== Final Environment ==="
echo "  DISPLAY: $DISPLAY"
echo "  WINDOW_SIZE: $WINDOW_SIZE"
echo "  DBUS_SYSTEM_BUS_ADDRESS: $DBUS_SYSTEM_BUS_ADDRESS"

# Tauriアプリケーションを起動
echo "=== Starting Tauri Application ==="
echo "  Command: ./tauri-app"
echo "  Starting at: $(date)"

# より詳細なエラーログのためにstrace使用を試行
if command -v strace >/dev/null 2>&1; then
    echo "  Running with strace for debugging..."
    exec strace -e trace=connect,openat -o /tmp/tauri-strace.log ./tauri-app 2>&1
else
    echo "  Running without strace..."
    exec ./tauri-app 2>&1
fi
