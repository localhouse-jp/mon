cat > ~/.xinitrc << 'EOF'
export GDK_SCALE=$WINDOW_SCALE
xset s noblank
xset s off
xset -dpms
openbox &
"$(pwd)/tauri-app" &
sleep 2
WIN_ID=$(wmctrl -lp | awk '/tauri-app/ {print $1; exit}')
wmctrl -i -r $WIN_ID -b add,fullscreen
unclutter -idle 0 -root &
wait
EOF

ROT=${ROTATE_DISPLAY:-right}
case "$ROT" in
  right) R="CW"  ;;
  left)  R="CCW" ;;
  *)     R="CCW" ;;
esac

sudo sed -i -E \
  's|(Option[[:space:]]*"rotate"[[:space:]]*")[^"]+(")|\1'"$R"'\2|' \
  /etc/X11/xorg.conf

startx -- -nocursor
