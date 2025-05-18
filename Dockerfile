# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# copy source and build
COPY . .
RUN bun run build

# ---- Runtime stage ----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# generate runtime config template and entry script
RUN echo 'window.RUNTIME_CONFIG = {' > /usr/share/nginx/html/config.js.template && \
    echo '  API_BASE_URL: "${API_BASE_URL:-http://localhost:3000}",' >> /usr/share/nginx/html/config.js.template && \
    echo '  SHOW_FOOTER: "${SHOW_FOOTER:-true}",' >> /usr/share/nginx/html/config.js.template && \
    echo '  DEBUG_DATETIME: "${DEBUG_DATETIME:-}"' >> /usr/share/nginx/html/config.js.template && \
    echo '};' >> /usr/share/nginx/html/config.js.template

RUN sed -i '/<\/head>/i \    <script src="/config.js"></script>' /usr/share/nginx/html/index.html

RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
