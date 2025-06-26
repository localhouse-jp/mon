# CLAUDE.md

回答は日本語で。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LocalHouse is a cross-platform desktop application for displaying real-time public transportation information (trains and buses) in Japan. Built with Tauri (Rust) and React/TypeScript, it's designed for kiosk/digital signage use with fullscreen display capabilities.

**Key Features**:
- 🚃 Real-time train/bus departure information with countdown timers
- ⏱️ Updates every second for accurate remaining time
- 📅 Japanese holiday support for schedule adjustments
- 🖥️ Fullscreen kiosk mode for digital signage
- 🔄 Auto-refresh data every 5 minutes
- 🎯 Display sleep prevention for always-on displays

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
- **React 18** with TypeScript for UI (strict mode enabled)
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
- Provides API configuration commands (get/set API base URL)

### Data Flow
1. App fetches timetable data from API endpoint
2. Processes and filters data based on current time
3. Displays real-time countdown for each transit option
4. Updates every second for accurate remaining time
5. Integrates Japanese holiday data from `public/syukujitsu.csv`
6. Fetches delay information from API `/api/delay` endpoint

### State Management
- Local React state with hooks (no external state management library)
- Data refresh every 5 minutes via setInterval
- Window scale configuration via Tauri webview API

## Environment Configuration

Create `.env` and `.env.development` files:

```bash
# API endpoint
VITE_API_BASE_URL=http://localhost:3000

# UI options
VITE_SHOW_FOOTER=true

# Window scaling (default: 2)
VITE_WINDOW_SCALE=2

# Debug options
VITE_DEBUG_DATETIME=2024-01-01T09:00:00  # Test specific times
```

**Note**: These files are already in `.gitignore` and should not be committed.

## Important Notes

- **No test suite**: Currently no testing framework is configured
- **Kiosk Mode**: Designed for always-on display (no window decorations)
- **Holidays**: Uses `public/syukujitsu.csv` for Japanese holiday schedule adjustments
- **Git-ignored files**: `.env` and `.env.development` are already in .gitignore
- **Linux deployment**: `start.sh` provides X11 kiosk mode setup with display rotation support
- **TypeScript**: Strict mode enabled with no unused locals/parameters warnings
- **API Endpoints Required**:
  - `GET /api/timetable` - Main timetable data
  - `GET /api/delay` - Delay information
- **Display Sleep**: Prevented with browser args in Tauri config

## Tauri-Specific Commands

When working with Tauri features:
- Check `src-tauri/tauri.conf.json` for window and security settings
- Use `src-tauri/capabilities/` for permission management
- Rust code lives in `src-tauri/src/`
- Available Tauri commands:
  - `greet(name)` - Example command
  - `set_api_base_url(url)` - Update API endpoint
  - `get_api_base_url()` - Get current API endpoint

## Code Style Guidelines

- **TypeScript**: Use strict mode, avoid `any` types
- **React**: Functional components with hooks only
- **Naming**: 
  - Components: PascalCase
  - Utils/functions: camelCase
  - Types/Interfaces: PascalCase with descriptive names
- **Imports**: Absolute imports from `src/` directory
- **Error Handling**: Log errors to console with descriptive messages

## Troubleshooting

Common issues and solutions:

1. **Build Errors**:
   - Ensure Rust and cargo are up to date
   - Run `cargo install tauri-cli` to reinstall Tauri CLI

2. **API Connection Issues**:
   - Verify `.env` file exists with correct `VITE_API_BASE_URL`
   - Check if API server is running
   - Look for CORS issues in browser console

3. **Linux Display Issues**:
   - Ensure X11 is installed
   - Check `start.sh` has execute permissions: `chmod +x start.sh`
   - Verify `ROTATE_DISPLAY` environment variable if screen rotation needed

## Contributing

When contributing to this project:
1. Follow the existing code style
2. Update this CLAUDE.md if adding new features or changing architecture
3. Test on multiple platforms if possible
4. Japanese language support is required for all user-facing text