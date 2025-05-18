# syntax=docker/dockerfile:1

# ビルド時の引数
ARG API_BASE_URL=http://localhost:3000
ARG SHOW_FOOTER=true
ARG DEBUG_DATETIME=

# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# ビルド引数を受け取る
ARG API_BASE_URL
ARG SHOW_FOOTER
ARG DEBUG_DATETIME

# ビルド環境変数を設定
ENV VITE_API_BASE_URL=${API_BASE_URL}
ENV VITE_SHOW_FOOTER=${SHOW_FOOTER}
ENV VITE_DEBUG_DATETIME=${DEBUG_DATETIME}

# install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# copy source and build
COPY . .
RUN bun run build

# ---- Runtime stage ----
FROM nginx:alpine

# ビルド引数を受け取る
ARG API_BASE_URL
ARG SHOW_FOOTER
ARG DEBUG_DATETIME

# 実行時のデフォルト環境変数を設定
ENV API_BASE_URL=${API_BASE_URL}
ENV SHOW_FOOTER=${SHOW_FOOTER}
ENV DEBUG_DATETIME=${DEBUG_DATETIME}

# install envsubst
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

# generate runtime config template and entry script
RUN echo 'window.RUNTIME_CONFIG = {' > /usr/share/nginx/html/config.js.template && \
  echo '  API_BASE_URL: "${API_BASE_URL}",' >> /usr/share/nginx/html/config.js.template && \
  echo '  SHOW_FOOTER: "${SHOW_FOOTER}",' >> /usr/share/nginx/html/config.js.template && \
  echo '  DEBUG_DATETIME: "${DEBUG_DATETIME}"' >> /usr/share/nginx/html/config.js.template && \
  echo '};' >> /usr/share/nginx/html/config.js.template

RUN sed -i '/<\/head>/i \    <script src="/config.js"></script>' /usr/share/nginx/html/index.html

# Create a more robust entrypoint script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
  echo 'set -e' >> /docker-entrypoint.sh && \
  echo 'echo "Generating config.js with API_BASE_URL=${API_BASE_URL}"' >> /docker-entrypoint.sh && \
  echo 'envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
  echo 'cat /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
  echo 'echo "Starting nginx..."' >> /docker-entrypoint.sh && \
  echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
