# syntax=docker/dockerfile:1

# ----- Build Stage -----
FROM ubuntu:22.04 AS build
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    build-essential \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Node.js via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install bun for frontend build
RUN npm install -g bun

# Install Tauri CLI
RUN cargo install tauri-cli --locked

# Install dependencies and build frontend
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy sources
COPY . .

# Build frontend assets
RUN bun run build

# Build tauri binary
RUN cargo build --release --manifest-path src-tauri/Cargo.toml

# ----- Runtime Stage -----
FROM ubuntu:22.04 AS runtime

# Install libraries required to run tauri and X11 utilities
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxrandr2 libxi6 \
    libgtk-3-0 libayatana-appindicator3-1 librsvg2-2 \
    xauth x11-xserver-utils xinput \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built binary
COPY --from=build /app/src-tauri/target/release/tauri-app ./tauri-app

# Add entry script
COPY x11-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
