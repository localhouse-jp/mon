# ビルドステージ
FROM oven/bun:1 as build

WORKDIR /app

# 依存関係をインストール
COPY package.json bun.lockb ./
RUN bun install

# ソースをコピーしてビルド
COPY . .
RUN bun run build

# 実行ステージ
FROM nginx:alpine

# ビルド成果物をコピー
COPY --from=build /app/dist /usr/share/nginx/html

# 設定ファイルテンプレートを作成
RUN echo 'window.RUNTIME_CONFIG = { \
  API_BASE_URL: "${API_BASE_URL:-http://localhost:3000}", \
  SHOW_FOOTER: "${SHOW_FOOTER:-true}", \
  DEBUG_DATETIME: "${DEBUG_DATETIME:-}" \
  };' > /usr/share/nginx/html/config.js.template

# index.htmlにconfig.jsの参照を追加
RUN sed -i '/<\/head>/i \    <script src="/config.js"></script>' /usr/share/nginx/html/index.html

# 起動スクリプトを作成
RUN echo '#!/bin/sh \
  envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js \
  exec nginx -g "daemon off;"' > /docker-entrypoint.sh && \
  chmod +x /docker-entrypoint.sh

# 80番ポートを公開
EXPOSE 80

# 起動
CMD ["/docker-entrypoint.sh"]