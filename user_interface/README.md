# User Interface (Ionic + Angular)

This folder contains the Ionic Angular frontend. The structure is organized to scale as features grow.

## Folder Guide

- src/ - Application source code.
- src/app/ - Angular app shell, routing, and modules.
- src/app/core/ - Singleton services and app-wide infrastructure.
- src/app/core/services/ - API clients, data services, and singletons.
- src/app/core/guards/ - Route guards.
- src/app/core/interceptors/ - HTTP interceptors.
- src/app/shared/ - Reusable UI and utilities shared across features.
- src/app/shared/components/ - Reusable UI components.
- src/app/shared/pipes/ - Shared pipes.
- src/app/shared/directives/ - Shared directives.
- src/app/features/ - Feature modules (one folder per bounded feature).
- src/app/layout/ - Layout components (shells, navigation, toolbars).
- src/app/pages/ - Page-level views wired to routes.
- src/app/home/ - Default Ionic starter page (can be moved into pages/).
- src/assets/ - Static assets (images, icons, fonts).
- src/environments/ - Environment configuration files.
- src/theme/ - Global theme variables and Ionic styling overrides.
- .vscode/ - Workspace settings (optional for contributors).
- node_modules/ - Installed dependencies (generated).

## Notes

- Prefer feature-first modules inside src/app/features/.
- Keep shared UI small and generic; avoid feature-specific logic there.
- Add routes in src/app/app-routing.module.ts and lazy-load feature modules.

## Build and Run

Install dependencies:

```bash
cd user_interface
npm install
```

Clean install (recommended for CI or when node_modules is broken):

```bash
cd user_interface
npm ci
```

Run in the browser (web dev server):

```bash
npm start
```

Build for production:

```bash
npm run build
```

## Mobile (Capacitor)

Add native platforms (run once per platform):

```bash
npx cap add android
npx cap add ios
```

Sync web assets to native projects after each build:

```bash
npx cap sync
```

Open the native projects:

```bash
npx cap open android
npx cap open ios
```

Notes:

- Android builds run on Linux with Android Studio installed.
- iOS builds require macOS and Xcode.
