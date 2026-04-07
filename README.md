# The Final Check

The Final Check is a React, TypeScript, and Supabase consultancy operating system for food-business delivery work.

It now supports:

- installable desktop packaging for macOS and Windows
- Electron-based local runtime with preload-safe desktop APIs
- in-app desktop update checks
- GitHub Actions release automation for ongoing desktop updates
- the existing web app workflow for faster day-to-day iteration

## Core stack

- React + TypeScript + Vite
- Supabase authentication and data storage
- Electron desktop wrapper
- electron-builder packaging
- electron-updater release/update support

## Project structure

```txt
kitchen-performance-tsx/
├─ electron/
│  ├─ main.mjs
│  └─ preload.mjs
├─ .github/
│  └─ workflows/
│     └─ desktop-release.yml
├─ public/
├─ src/
│  ├─ components/
│  ├─ context/
│  ├─ features/
│  ├─ lib/
│  ├─ pages/
│  ├─ services/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ types.ts
├─ supabase/
│  └─ schema.sql
├─ electron-builder.config.mjs
├─ package.json
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## Local development

Web app:

```bash
npm install
npm run dev
```

Desktop app during development:

```bash
npm install
npm run dev:desktop
```

Add your Supabase values in `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Build desktop installers

Build a local packaged desktop app for the current platform:

```bash
npm run pack:desktop
```

Build a distributable macOS installer:

```bash
npm run dist:mac
```

Build a distributable Windows installer:

```bash
npm run dist:win
```

Note:

- local macOS packaging is configured to skip code signing by default
- production macOS signing should be enabled by providing `CSC_NAME`
- Windows packaging is best handled in CI on `windows-latest`

## Supabase setup

1. Create a Supabase project
2. Open the SQL editor
3. Run `supabase/schema.sql`
4. In **Authentication**, create the users who should be allowed to log in
5. Keep public self-signup disabled if you only want approved users to access the app

## Notes on access control

This starter is built so that:

- users must sign in first
- each user only sees their own saved audits and menu projects
- storage is protected by Row Level Security policies

## Desktop auto-updates

The desktop app now includes an update bridge and an in-app update panel in Settings.

To publish builds with update support:

1. Push the project to GitHub
2. Create a tag like `v0.1.0`
3. Let `.github/workflows/desktop-release.yml` build and publish macOS and Windows releases

The release workflow uses these environment values:

- `UPDATE_PROVIDER=github`
- `UPDATE_OWNER`
- `UPDATE_REPO`

If you prefer a non-GitHub update server, set these instead when building:

- `UPDATE_PROVIDER=generic`
- `UPDATE_URL`

Without publish configuration, local desktop builds still work, but auto-update checks stay disabled.

## Easy next upgrades

- proper `.icns` and `.ico` installer icons
- code splitting to reduce the main app bundle size
- photo uploads for audit evidence
- white-label branding controls
- role-based access for admin vs consultant
- action tracker with deadlines and owners
- client sharing links
