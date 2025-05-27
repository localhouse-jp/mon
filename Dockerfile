# syntax=docker/dockerfile:1

# ----- Build Stage -----
# Use Docker Hub mirror of the Tauri builder image to avoid authentication
# issues when pulling from GitHub Container Registry on remote builders.
FROM websmurf/tauri-builder:1.1.0 AS build
WORKDIR /app

# install bun for frontend build
RUN npm install -g bun

# install Rust toolchain (provided by builder image) and Tauri CLI
RUN cargo install tauri-cli --locked

# install dependencies and build frontend
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# copy sources
COPY . .

# build frontend assets
RUN bun run build

# build tauri binary
RUN cargo build --release --manifest-path src-tauri/Cargo.toml

# ----- Runtime Stage -----
FROM ubuntu:22.04 AS runtime

# install libraries required to run tauri and X11 utilities
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxrandr2 libxi6 \
    libgtk-3-0 libayatana-appindicator3-1 librsvg2-2 \
    xauth x11-xserver-utils xinput xrandr && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy the built binary
COPY --from=build /app/src-tauri/target/release/tauri-app ./tauri-app

# add entry script
COPY x11-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
