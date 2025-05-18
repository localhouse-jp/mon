# ビルドステージ
FROM oven/bun:1 as build

WORKDIR /app

# 依存関係のファイルをコピー
COPY package.json bun.lockb ./

# 依存関係のインストール
RUN bun install

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーションのビルド (Tauriではなく、Webアプリケーションとしてビルド)
RUN bun run build

# 実行ステージ
FROM nginx:alpine

# Nginxの設定をカスタマイズ (必要に応じて)
COPY --from=build /app/dist /usr/share/nginx/html

# 起動時に環境変数を反映するスクリプトを追加
RUN echo 'window.API_BASE_URL = "${API_BASE_URL:-http://localhost:3000}";' > /usr/share/nginx/html/config.js

# index.htmlにconfig.jsを読み込むように追加
RUN sed -i '/<\/head>/i \    <script src="/config.js"></script>' /usr/share/nginx/html/index.html

# 起動スクリプト作成
RUN echo '#!/bin/sh\n\
  # 環境変数をconfig.jsに反映\n\
  envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js\n\
  # Nginx起動\n\
  exec nginx -g "daemon off;"\n\
  ' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# テンプレートファイル準備
RUN mv /usr/share/nginx/html/config.js /usr/share/nginx/html/config.js.template

# 80番ポートを公開
EXPOSE 80

# 起動スクリプトを実行
CMD ["/docker-entrypoint.sh"]