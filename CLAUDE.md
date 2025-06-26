# CLAUDE.md

回答は日本語で。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LocalHouse is a cross-platform desktop application for displaying real-time public transportation information (trains and buses) in Japan. Built with Tauri (Rust) and React/TypeScript, it's designed for kiosk/digital signage use with fullscreen display capabilities.

## Development Commands

```bash
# Install dependencies (using Bun or npm)
bun install  # or npm install

# Development
bun dev           # Frontend only (Vite dev server on port 1420)
bun tauri dev     # Full desktop app with hot reload

# Building
bun run build     # TypeScript check + frontend build
bun tauri build   # Create native binaries (.deb, .rpm, .app, .exe)

# Preview production build
bun preview
```

## Architecture Overview

### Frontend Stack
- **React 18** with TypeScript for UI
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom dark theme
- **API Integration**: Fetches data from backend API (configured via VITE_API_BASE_URL)

### Key Components
- `App.tsx`: Main component handling data fetching and state management
- `TrainBoard.tsx`: Primary display component for transit information
- `components/`: Reusable UI components (BusItem, StationCard, StatusScreens)
- `utils/apiUtils.ts`: API communication layer
- `utils/timeUtils.ts`: Time calculations and countdown logic
- `utils/configUtils.ts`: Environment configuration management

### Backend (Tauri)
- Rust-based native application wrapper
- Configured for fullscreen, frameless window (kiosk mode)
- Handles system integration and window management

### Data Flow
1. App fetches timetable data from API endpoint
2. Processes and filters data based on current time
3. Displays real-time countdown for each transit option
4. Updates every second for accurate remaining time
5. Integrates Japanese holiday data from `public/syukujitsu.csv`

## Environment Configuration

Create `.env` and `.env.development` files:

```bash
# API endpoint
VITE_API_BASE_URL=http://localhost:3000

# UI options
VITE_SHOW_FOOTER=true

# Debug options
VITE_DEBUG_DATETIME=2024-01-01T09:00:00  # Test specific times
```

## Important Notes

- **No test suite**: Currently no testing framework is configured
- **Kiosk Mode**: Designed for always-on display (no window decorations)
- **Holidays**: Uses `public/syukujitsu.csv` for Japanese holiday schedule adjustments
- **Git-ignored files**: `.env` and `.env.development` are already in .gitignore
- **Linux deployment**: `start.sh` provides X11 kiosk mode setup

## Tauri-Specific Commands

When working with Tauri features:
- Check `src-tauri/tauri.conf.json` for window and security settings
- Use `src-tauri/capabilities/` for permission management
- Rust code lives in `src-tauri/src/`