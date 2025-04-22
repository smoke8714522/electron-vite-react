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
│   ├── types/            # Shared TypeScript types (e.g., api.ts)  
│   └── preload.ts        # Electron preload script (contextBridge)  
├── lib/                  # Electron main process code (IPC handlers, ThumbnailService)  
├── electron/             # Electron-Vite specific config/build files  
│   ├── main/             # Main process source (might contain index.ts)  
│   └── preload/          # Preload script source (might contain index.ts)  
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

| Channel              | Payload                              | Response                                          | Description                                         |
|----------------------|--------------------------------------|---------------------------------------------------|-----------------------------------------------------|
| `get-assets`         | `{ filters, sortBy, sortOrder }`?    | `{ success, data?: Asset[], error? }`             | Fetch assets based on criteria                      |
| `create-asset`       | `CreateAssetPayload`                 | `{ success, data?: Asset, error? }`             | Create an asset DB record (file already in vault)   |
| `update-asset`       | `UpdateAssetPayload`                 | `{ success, data?: Asset, error? }`             | Update asset metadata                               |
| `delete-asset`       | `DeleteAssetPayload`                 | `{ success, error? }`                             | Delete asset DB record (file deletion separate)     |
| `bulk-import-assets` | _none_ (opens file dialog)           | `{ success, data?: BulkImportResult, error? }`    | Import multiple files, create records, gen thumbs |
| _…other channels…_   |                                      |                                                   |                                                     |

*Payload/Response types are defined in `src/types/api.ts`.*

## 3. Common Tasks & Scripts

```jsonc
// package.json (scripts section)
"scripts": {
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "start": "electron .",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "type-check": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "import:vault": "node scripts/importVault.js ./vault ./userData/db.sqlite",
  "backup": "node scripts/backup.js"
}
```

- **npm run import:vault** — one-off import of existing assets from a folder into the DB.
- **npm run backup** — create a timestamped copy of `userData/db.sqlite`.

## 4. Coding Conventions

- **Linting**: ESLint (check `.eslintrc.cjs` for specific ruleset, likely includes React, TS, security).
- **Formatting**: Prettier, auto-format on save is recommended.
- **TypeScript**: Strict mode enabled (`tsconfig.json`, `tsconfig.node.json`).
- **Commits**: Conventional Commits (e.g. `feat: add bulk import button`, `fix: thumbnail generation error`).
- **Branching**:
  - `main` – stable releases
  - `develop` – integration & nightly builds
  - feature branches: `feat/`, `fix/`, `chore/` (e.g., `feat/bulk-import`)

## 5. How to Add New Features (Example Flow)

1.  **Domain Logic & Unit Test (Optional but Recommended)**
    - Add pure TS functions for core logic if complex (e.g., in `/lib/domain` or service files like `/lib/thumbnailService.ts`).
    - Write unit tests (`*.test.ts`) using Vitest/Jest.

2.  **IPC Handler in Main Process**
    - Locate your main process entry point (e.g., `electron/main/index.ts`).
    - Add `ipcMain.handle('my-new-feature', async (evt, payload) => { ... });` within the `registerIpcHandlers` function or similar setup.
    - **Validate inputs** rigorously (check types, ranges, ensure paths are safe).
    - Call necessary services (e.g., `dbService`, `thumbnailService`).
    - Return a `{ success: boolean, data?: ..., error?: string }` object matching the `ApiResponse` structure.

3.  **Expose via Preload Script**
    - Edit the preload script (e.g., `electron/preload/index.ts`).
    - Add the new method to the `api` object exposed via `contextBridge.exposeInMainWorld`: 
      ```ts
      const api: Partial<IElectronAPI> = {
        // ... other methods
        myNewFeature: (payload) => ipcRenderer.invoke('my-new-feature', payload),
        bulkImportAssets: () => ipcRenderer.invoke('bulk-import-assets'),
      };
      ```
    - Ensure the method signature matches the expected usage in the renderer.

4.  **Define Types**
    - Update `src/types/api.ts`:
        - Add specific `Payload` and `ResponseData` interfaces if needed.
        - Define the `ApiResponse` structure (e.g., `MyNewFeatureResponse = ApiResponse<MyNewFeatureData>`).
        - Add the new method signature to the `IElectronAPI` interface.

5.  **Renderer Hook (`useApi.ts`)**
    - Edit `src/hooks/useApi.ts`.
    - **Important**: To ensure function reference stability and prevent infinite loops with `useEffect`, define the actual `window.api` calls outside the specific hook definitions. Use a helper or define them as constants.
      ```ts
      // src/hooks/useApi.ts
      import type { ..., IElectronAPI, ApiResponse, MyNewFeaturePayload, MyNewFeatureResponse } from '../types/api';

      // Define stable API call wrappers
      const safeApiCall = <P, R>(method: (payload: P) => Promise<ApiResponse<R>>) => /* ... see implementation ... */ ;

      const myNewFeatureApi = safeApiCall<MyNewFeaturePayload, MyNewFeatureResponse['data']>(window.api.myNewFeature);
      const getAssetsApi = safeApiCall<any | undefined, GetAssetsResponse['data']>(window.api.getAssets);
      const bulkImportAssetsApi = safeApiCall<void, BulkImportAssetsResponse['data']>(window.api.bulkImportAssets);

      // Generic hook (remains the same)
      function useAsyncCall<TResponseData = unknown, TPayload = any>(
        apiCall: (payload: TPayload) => Promise<ApiResponse<TResponseData>>
      ) { /* ... implementation ... */ }

      // Specific hooks now pass the stable references
      export function useMyNewFeature() {
        return useAsyncCall(myNewFeatureApi);
      }
      export function useGetAssets() {
        return useAsyncCall(getAssetsApi);
      }
      export function useBulkImportAssets() {
        return useAsyncCall(bulkImportAssetsApi);
      }
      ```

6.  **UI Component / Container**
    - In `/src/containers` or `/src/pages`, import and use your hook:
      ```tsx
      import React, { useEffect } from 'react';
      import { useGetAssets, useBulkImportAssets } from '../hooks/useApi';
      import { Button, CircularProgress, Alert } from '@mui/material';

      function FeatureComponent() {
        const { call: fetchAssets, loading: loadingAssets, error: errorAssets, data: assets } = useGetAssets();
        const { call: callBulkImport, loading: importing, error: importError } = useBulkImportAssets();

        // Fetch data on mount - fetchAssets reference is now stable
        useEffect(() => {
          fetchAssets(undefined);
        }, [fetchAssets]);

        const handleImport = async () => {
          // callBulkImport reference is stable, no args needed for void payload
          const result = await callBulkImport(); 
          if (result.success) { /* ... */ }
        };

        return (
          <div>
            {/* Example usage */} 
            <Button onClick={handleImport} disabled={importing || loadingAssets}>
              {importing ? <CircularProgress size={20}/> : 'Bulk Import'}
            </Button>
            {/* ... display assets or loading/error states ... */}
          </div>
        );
      }
      ```

7.  **State Management (Zustand - Optional)**
    - If the feature involves shared global state (e.g., filters, settings), add or update a slice in `/src/store`.

8.  **Update Documentation (`devguide.md`)**
    - Add the new IPC channel to the **IPC API Reference** table.
    - Briefly mention the new hook/feature in relevant sections.

## 6. Thumbnail Generation

- Thumbnails are generated by `lib/thumbnailService.ts` during the `bulk-import-assets` process.
- It uses `sharp` for images and `fluent-ffmpeg` (with `@ffmpeg-installer/ffmpeg` and `ffprobe-static`) for videos.
- Thumbnails are stored as `<assetId>.jpg` in a `cache/thumbnails` subdirectory within the application's user data path (`app.getPath('userData')`).
- If generation fails, an error is logged, and the import process for that specific file may report an error.
- The renderer accesses thumbnails via a constructed path/URL, potentially served via a custom protocol or direct file access depending on the implementation.

## 7. Troubleshooting Common Issues

- **Blank Screen:**
    - Check the **Renderer Process Console** (Ctrl+Shift+I or Cmd+Opt+I) for errors. Look for uncaught exceptions.
    - Temporarily simplify the main React component (`src/App.tsx` or the view it renders like `LibraryView.tsx`) to render just static text. If that works, gradually add back complexity to find the failing part.
    - Ensure `src/main.tsx` correctly mounts the `App` component to the `#root` element in `index.html`.
    - Verify that the Vite dev server is running correctly and accessible.
    - Check for errors in the **Main Process Console** (the terminal where you ran `npm run dev`) related to window creation or loading.
- **IPC Errors (`window.api` undefined or method missing):**
    - Ensure the corresponding `ipcMain.handle(...)` is registered in the main process (e.g., `electron/main/index.ts`).
    - Verify the method is correctly exposed via `contextBridge.exposeInMainWorld('api', ...)` in the preload script (e.g., `electron/preload/index.ts`).
    - Make sure the method name and payload structure match between the main process handler, preload script, `src/types/api.ts`, and the renderer hook/call.
    - Check for errors during preload script execution in the Renderer console.
- **Infinite Loops / Repeated API Calls:**
    - Check `useEffect` dependency arrays in your components.
    - If a dependency is a function coming from a custom hook (like `useApi.ts`), ensure that function's reference is stable. Define the underlying API call function outside the hook or wrap the hook's returned function in `useCallback` *if appropriate* (often defining the base function stably is better, as shown in `useApi.ts` example).
    - Look for state updates that might inadvertently trigger effects that cause further state updates.
- **Build Errors (Top-Level Await, etc.):**
    - Avoid using `await` directly at the top level in preload scripts if they are compiled to CJS. Wrap async initialization code in an `async` IIFE: `(async () => { await setup(); })();`.
- **Dependency/Type Errors:**
    - Run `npm install` after modifying `package.json`.
    - Ensure necessary `@types/*` packages are listed in `devDependencies`.
    - Clean node_modules (`rm -rf node_modules`) and reinstall (`npm install`) as a last resort.
- **Thumbnail Generation Failures (e.g., `unable to open for write`, `ENOENT`):**
    - Especially on Windows, native modules like `sharp` or `ffmpeg` might face issues writing directly to certain paths (like `AppData`).
    - **Check Permissions:** Ensure the application has write permissions to the cache directory (`userData/cache/thumbnails`).
    - **Antivirus Interference:** Temporarily disable antivirus/real-time protection to see if it's interfering with file writes.
    - **Temp File Workaround:** The current implementation for image thumbnails writes to a temporary system directory first (`os.tmpdir()`) and then moves the file to the final cache location. This often resolves permission or locking issues.
    - **Check Dependencies:** Ensure `sharp`, `ffmpeg`, `@ffmpeg-installer/ffmpeg`, `ffprobe-static` are installed correctly. You might need to run `npm rebuild` or clear `node_modules` and reinstall if native dependencies seem broken.
    - **Check Disk Space:** Ensure the drive containing the temp directory and the user data directory has sufficient space.
