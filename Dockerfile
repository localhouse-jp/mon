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
RUN set -eux; \
  cat <<'EOF' > /usr/share/nginx/html/config.js.template; \
window.RUNTIME_CONFIG = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:3000}",
  SHOW_FOOTER: "${SHOW_FOOTER:-true}",
  DEBUG_DATETIME: "${DEBUG_DATETIME:-}"
};
EOF
  sed -i '/<\/head>/i \    <script src="/config.js"></script>' /usr/share/nginx/html/index.html; \
  cat <<'EOF' > /docker-entrypoint.sh; \
#!/bin/sh
envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js
exec nginx -g "daemon off;"
EOF
  chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
