# ビルドステージ
FROM oven/bun:1 as build

WORKDIR /app

# 依存関係のファイルをコピー
COPY package.json bun.lockb ./

# 依存関係のインストール
RUN bun install

# アプリケーションのソースコードをコピー
COPY . .

# 環境変数を設定
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# アプリケーションのビルド (Tauriではなく、Webアプリケーションとしてビルド)
RUN bun run build

# 実行ステージ
FROM nginx:alpine

# Nginxの設定をカスタマイズ (必要に応じて)
COPY --from=build /app/dist /usr/share/nginx/html

# Nginxのデフォルト設定をカスタマイズ（必要な場合）
# COPY nginx.conf /etc/nginx/nginx.conf

# 80番ポートを公開
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]