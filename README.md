# skill-sync-gui-rust

**[中文文档](./README_CN.md)**

`skill-sync-gui-rust` is the desktop GUI edition of [skill-sync](https://github.com/kingjly/skill-sync).

It packages the upstream skill management and multi-tool sync capabilities into a local desktop app built with Tauri: React + Vite on the frontend, Rust + Axum on the backend, running as an embedded local service.

## Project Positioning

- Upstream project: `skill-sync` (Web app)
- This project: `skill-sync-gui-rust` (cross-platform desktop GUI app)
- Goal: manage AI coding assistant skills in a unified local UI and sync them to multiple tools with one click

## Key Features

- Unified skill repository management (create, view, delete, edit skill files)
- Automatic detection of installed AI tools on the local machine
- Sync capabilities
  - Single skill to a single tool
  - Single skill to all tools
  - All skills to a single tool
  - All skills to all tools
- Import skills from tools into the central repository
  - Copy-based import
  - Symlink import and restore
- Merge capabilities
  - Pre-merge preview
  - Conflict detection
  - Selective overwrite execution
- Skill preview
  - Markdown rendering
  - YAML frontmatter parsing
- App settings
  - Skill repository path
  - Auto-sync toggle and interval
  - Theme (light/dark/system)

## Core Differences from Upstream skill-sync

- Backend migrated from TypeScript services to Rust (Axum)
- Packaged as a Tauri desktop app with an embedded local API service (default `127.0.0.1:31337`)
- Frontend and backend start together with the desktop app, making distribution closer to native desktop software

## Supported Tools

| Tool | Type |
| --- | --- |
| Claude Code | CLI |
| Cursor | IDE |
| Windsurf | IDE |
| Trae | IDE |
| Kiro | IDE |
| Gemini CLI | CLI |
| GitHub Copilot | VS Code Extension |
| OpenAI Codex | CLI |
| Aider | CLI |
| Continue | VS Code Extension |
| Cline | VS Code Extension |
| Roo Code | VS Code Extension |
| Amazon Q | VS Code Extension |
| JetBrains AI | JetBrains |

## Tech Stack

- Desktop framework: Tauri 2
- Backend: Rust, Axum, Tokio
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- State and data fetching: Zustand, TanStack Query
- Markdown: react-markdown, remark-gfm

## Quick Start

### Prerequisites

- Node.js >= 20
- npm
- Rust stable (for Tauri builds)
- Platform-specific Tauri build dependencies

### Install

```bash
git clone https://github.com/kingjly/skill-sync-gui-rust.git
cd skill-sync-gui-rust
npm install
```

### Run in Development (Desktop App)

```bash
npm run tauri:dev
```

### Build Release Packages

```bash
npm run tauri:build
```

### Build Windows Portable EXE

After building, the executable can be found at:

```text
src-tauri/target/release/skill-sync-gui-rust.exe
```

Create a portable ZIP package in PowerShell:

```powershell
npm run tauri:build
New-Item -ItemType Directory -Force .\dist\portable | Out-Null
Copy-Item .\src-tauri\target\release\skill-sync-gui-rust.exe .\dist\portable\
Compress-Archive -Path .\dist\portable\* -DestinationPath .\dist\skill-sync-gui-rust-windows-portable.zip -Force
```

Notes:

- This portable EXE mode is suitable for quick distribution and testing.
- Runtime dependencies (WebView2 / VC++ runtime) are still required on the target machine.
- For best compatibility with end users, installer packages are still recommended.

### Publish Artifacts to GitHub Release

Yes, these artifacts can be uploaded to GitHub Releases:

- NSIS installer: `src-tauri/target/release/bundle/nsis/*-setup.exe`
- MSI installer: `src-tauri/target/release/bundle/msi/*.msi`
- Portable package: `dist/skill-sync-gui-rust-windows-portable.zip`


Root scripts:

```bash
npm run dev:web
npm run build:web
npm run tauri:prepare
npm run tauri:dev
npm run tauri:build
```

Web workspace scripts:

```bash
npm run typecheck --workspace=web
npm run build --workspace=web
npm run test:e2e --workspace=web
```

## Project Structure

```text
skill-sync-gui-rust/
├─ src-tauri/                 # Tauri + Rust backend
│  ├─ src/
│  │  ├─ backend/             # API, detection, sync, config, repository logic
│  │  └─ main.rs              # App entry and embedded API startup
│  └─ tauri.conf.json         # Tauri config
├─ web/                       # React frontend
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  └─ lib/
│  └─ package.json
└─ package.json
```

## API Overview

Local API route prefix: `/api`

- Health: `GET /api/health`
- Tools: `GET /api/tools`, `GET /api/tools/:id`
- Skills: `GET/POST /api/skills`, `GET/DELETE /api/skills/:id`
- Sync: `POST /api/sync/all` and skill/tool scoped sync endpoints
- Merge: `GET /api/merge/preview/:toolId`, `POST /api/merge/execute`
- Import: `GET /api/import/tools-skills`, `POST /api/import/tool/:toolId/all`, etc.

## Acknowledgements

- This project extends the design and capabilities of [kingjly/skill-sync](https://github.com/kingjly/skill-sync) into a GUI desktop edition.
