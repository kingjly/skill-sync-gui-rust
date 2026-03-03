# skill-sync-gui-rust

**[English](./README.md)**

`skill-sync-gui-rust` 是 [skill-sync](https://github.com/kingjly/skill-sync) 的 GUI 桌面版实现。

它将原项目的技能管理与多工具同步能力，封装为一个基于 Tauri 的本地桌面应用：前端使用 React + Vite，后端使用 Rust + Axum，并以内嵌服务方式运行。

## 项目定位

- 上游项目：`skill-sync`（Web 应用）
- 本项目：`skill-sync-gui-rust`（跨平台桌面 GUI 应用）
- 目标：用更直观的本地界面统一管理 AI 编程助手技能，并一键同步到多工具

## 主要功能

- 统一技能仓库管理（创建、查看、删除、编辑技能文件）
- 自动检测本机已安装的 AI 工具
- 同步能力
  - 单技能同步到单工具
  - 单技能同步到全部工具
  - 全部技能同步到单工具
  - 全部技能同步到全部工具
- 从工具侧导入技能到中心仓库
  - 支持复制导入
  - 支持符号链接导入与恢复
- 合并能力
  - 合并前预览
  - 冲突识别
  - 选择覆盖执行
- 技能预览
  - Markdown 渲染
  - YAML frontmatter 解析
- 应用设置
  - 技能仓库路径
  - 自动同步开关与间隔
  - 主题（light/dark/system）

## 与上游 skill-sync 的核心差异

- 后端从 TypeScript 服务迁移为 Rust（Axum）
- 通过 Tauri 打包为桌面应用，内嵌本地 API 服务（默认 `127.0.0.1:31337`）
- 前后端随桌面应用统一启动，部署与分发更接近桌面软件使用习惯

## 支持工具

| 工具 | 类型 |
| --- | --- |
| Claude Code | CLI |
| Cursor | IDE |
| Windsurf | IDE |
| Trae | IDE |
| Kiro | IDE |
| Gemini CLI | CLI |
| GitHub Copilot | VS Code 扩展 |
| OpenAI Codex | CLI |
| Aider | CLI |
| Continue | VS Code 扩展 |
| Cline | VS Code 扩展 |
| Roo Code | VS Code 扩展 |
| Amazon Q | VS Code 扩展 |
| JetBrains AI | JetBrains |

## 技术栈

- 桌面框架：Tauri 2
- 后端：Rust、Axum、Tokio
- 前端：React 18、TypeScript、Vite、Tailwind CSS
- 状态与请求：Zustand、TanStack Query
- Markdown：react-markdown、remark-gfm

## 快速开始

### 环境要求

- Node.js >= 20
- npm
- Rust stable（用于 Tauri 构建）
- 对应平台的 Tauri 构建依赖

### 安装

```bash
git clone https://github.com/kingjly/skill-sync-gui-rust.git
cd skill-sync-gui-rust
npm install
```

### 开发运行（桌面应用）

```bash
npm run tauri:dev
```

### 构建发布包

```bash
npm run tauri:build
```

### 构建 Windows 单文件便携版 EXE

构建完成后，可执行文件位于：

```text
src-tauri/target/release/skill-sync-gui-rust.exe
```

在 PowerShell 中可打包便携 ZIP：

```powershell
npm run tauri:build
New-Item -ItemType Directory -Force .\dist\portable | Out-Null
Copy-Item .\src-tauri\target\release\skill-sync-gui-rust.exe .\dist\portable\
Compress-Archive -Path .\dist\portable\* -DestinationPath .\dist\skill-sync-gui-rust-windows-portable.zip -Force
```

说明：

- 便携 EXE 适合快速分发与测试。
- 目标机器仍需具备运行时依赖（WebView2 / VC++ Runtime）。
- 面向终端用户分发时，仍建议优先使用安装包。

### 发布到 GitHub Release

可以上传以下产物到 GitHub Release：

- NSIS 安装包：`src-tauri/target/release/bundle/nsis/*-setup.exe`
- MSI 安装包：`src-tauri/target/release/bundle/msi/*.msi`
- 便携包：`dist/skill-sync-gui-rust-windows-portable.zip`

## 常用脚本

根目录脚本：

```bash
npm run dev:web
npm run build:web
npm run tauri:prepare
npm run tauri:dev
npm run tauri:build
```

前端工作区（web）脚本：

```bash
npm run typecheck --workspace=web
npm run build --workspace=web
npm run test:e2e --workspace=web
```

## 项目结构

```text
skill-sync-gui-rust/
├─ src-tauri/                 # Tauri + Rust 后端
│  ├─ src/
│  │  ├─ backend/             # API、检测、同步、配置、仓库逻辑
│  │  └─ main.rs              # 应用入口，启动内嵌 API 服务
│  └─ tauri.conf.json         # Tauri 配置
├─ web/                       # React 前端
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  └─ lib/
│  └─ package.json
└─ package.json
```

## API 概览

本地 API 路由前缀：`/api`

- 健康检查：`GET /api/health`
- 工具：`GET /api/tools`、`GET /api/tools/:id`
- 技能：`GET/POST /api/skills`、`GET/DELETE /api/skills/:id`
- 同步：`POST /api/sync/all` 及按技能/工具粒度同步接口
- 合并：`GET /api/merge/preview/:toolId`、`POST /api/merge/execute`
- 导入：`GET /api/import/tools-skills`、`POST /api/import/tool/:toolId/all` 等

## 致谢

- 本项目基于 [kingjly/skill-sync](https://github.com/kingjly/skill-sync) 的设计思路与能力扩展为 GUI 桌面版。
