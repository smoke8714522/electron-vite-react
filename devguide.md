# Development Guide

This document outlines the setup and common tasks for developing the AdVault2 application.

## 1. Folder Layout

```
/  
├── src/  
│   ├── components/       # Reusable UI components (atoms, molecules, organisms)  
│   ├── containers/       # Stateful views & data fetching  
│   ├── hooks/            # Custom React hooks (e.g. useAssets, useApi)  
│   ├── store/            # Zustand stores  
│   ├── theme/            # MUI theme overrides & tokens  
│   ├── pages/            # Top‑level views (LibraryView, Settings)  
│   └── preload.ts        # Electron preload script (contextBridge)  
├── lib/                  # Electron main process code (IPC handlers, ThumbnailService)  
├── vault/                  ← user's raw asset folder (user-chosen or default under Documents)  
├── userData/               ← Electron's app.getPath('userData')  
│   ├── db.sqlite           ← SQLite database  
│   └── config.json         ← App settings  
├── cache/                  ← Electron's app.getPath('cache')  
│   └── thumbnails/         ← Generated `<id>.jpg` files  
├── logs/                   ← Electron's app.getPath('logs')  
│   └── app.log             ← Rotated application logs  
├── scripts/                ← One-off utilities (importVault.js, backup.js)  
├── docs/                   ← appflow.md, frontend.md, backend.md, developer_guide.md  
├── package.json
└── README.md  
```

## 2. IPC API Reference

| Channel              | Payload                              | Response                         | Description                          |
|----------------------|--------------------------------------|----------------------------------|--------------------------------------|
| `get-assets`         | `{ filters, sortBy, sortOrder }`     | `AssetWithThumbnail[]`           | Fetch master assets + aggregates     |
| `create-asset`       | `{ filePath: string }`               | `{ success, asset }`             | Import a single file                |
| `bulk-import-assets` | _none_ (opens file dialog)           | `{ success, importedCount }`     | Import multiple files               |
| `update-asset`       | `{ id: number, fields: Partial<Asset> }` | `{ success }`                | Update metadata                     |
| `delete-asset`       | `{ id: number }`                     | `{ success }`                    | Delete asset & thumbnail            |
| _…other channels…_   |                                      |                                  |                                      |

## 3. Common Tasks & Scripts

```jsonc
// package.json (scripts section)
"scripts": {
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "start": "electron .",
  "lint": "eslint --ext .ts,.tsx src/",
  "type-check": "tsc --noEmit",
  "test": "jest",
  "import:vault": "node scripts/importVault.js ./vault ./vault/db.sqlite",
  "backup": "node scripts/backup.js"
}
```

- **npm run import:vault** — one-off import of existing assets  
- **npm run backup** — create a timestamped copy of `vault/db.sqlite`

## 4. Coding Conventions

- **Linting**: ESLint with Airbnb/React rules + `eslint-plugin-security`  
- **Formatting**: Prettier, auto-format on save  
- **TypeScript**: Strict mode enabled (`tsconfig.json`)  
- **Commits**: Conventional Commits (e.g. `feat: add asset import script`)  
- **Branching**:  
  - `main` – stable releases  
  - `develop` – integration & nightly  
  - feature branches: `feat/`, `fix/`, `chore/`

## 5. How to Add New Features

1. **Domain Logic & Unit Test**  
   - Add pure TS functions for your feature (e.g. in `/lib/domain` or `/src/services`).  
   - Write a quick Jest unit test to drive the desired behavior.

2. **IPC Handler in Main**  
   - In `lib/main/main.ts`, add `ipcMain.handle('my-feature', async (evt, payload) => { … })`.  
   - Validate inputs (e.g. integer IDs, safe paths) and call your domain logic.

3. **Expose via Preload**  
   - In `preload.ts`, add to `contextBridge.exposeInMainWorld('api', { myFeature: (p) => ipcRenderer.invoke('my-feature', p), … })`.  
   - Keep the payload/response types in a shared `types/api.ts` file for TS safety.

4. **Renderer Hook**  
   - In `src/hooks/useApi.ts`, wrap the IPC call:  
     ```ts
     export function useMyFeature() {
       const [loading, setLoading] = useState(false);
       const call = async (payload) => {
         setLoading(true);
         try {
           return await window.api.myFeature(payload);
         } finally {
           setLoading(false);
         }
       };
       return { call, loading };
     }
     ```

5. **UI Component & Container**  
   - **Presentational**: Stateless component in `/src/components` that accepts props and callbacks.  
   - **Container/Page**: In `/src/containers` or a page file, call your hook, pass data into the presentational component, handle loading/errors.

6. **(Optional) State Slice**  
   - If it needs shared state (e.g. filters), add a small slice in your Zustand store under `/src/store`.

7. **Update Documentation**  
   - Add the new IPC channel, hook and usage example to `devguide.md`.
