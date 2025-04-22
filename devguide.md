# Development Guide

This document outlines the setup and common tasks for developing the AdVault2 application.

## 1. Folder Layout

```
/  
├── src/  
│   ├── components/       # Reusable UI components (atoms, molecules, organisms)
│   │   ├── molecules/    # e.g., AssetCard.tsx
│   │   └── organisms/    # e.g., FilterSidebar.tsx, LibraryToolbar.tsx, AssetGrid.tsx
│   ├── containers/       # Stateful views & data fetching (Legacy - may contain _Old files)
│   ├── hooks/            # Custom React hooks (e.g., useApi.ts)
│   ├── store/            # Zustand stores (e.g., filterStore.ts -> useAppStore)
│   ├── theme/            # MUI theme overrides & tokens  
│   ├── pages/            # Top‑level views (e.g., LibraryView.tsx, SettingsView.tsx)
│   ├── types/            # Shared TypeScript types (e.g., api.ts)
│   └── preload.ts        # Electron preload script (contextBridge)  
├── lib/                  # Electron main process code (IPC handlers, ThumbnailService)
├── electron/             # Electron-Vite specific config/build files  
│   ├── main/             # Main process source (might contain index.ts)  
│   └── preload/          # Preload script source (might contain index.ts)  
├── vault/                  ← User's raw asset folder (user-chosen or default under Documents)
├── data/                 ← Electron's app.getPath('userData')  
│   └── db.sqlite           ← SQLite database   
├── cache/                  ← Base cache directory (inside project root or userData)
│   └── thumbnails/         ← Generated `<id>.jpg` files
├── logs/                   ← Log directory (inside project root or userData)
│   └── app.log             ← Rotated application logs  
├── scripts/                ← One-off utilities (importVault.js, backup.js)  
├── docs/                   ← appflow.md, frontend.md, backend.md, devguide.md  
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
| `get-versions`       | `{ masterId: number }`               | `{ success, data?: Asset[], error? }`             | Fetch all versions for a master asset             |
| `add-to-group`       | `{ sourceId: number, targetId: number }` | `{ success, error? }`                             | Set source asset's master_id to target asset's id | 
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
    - Ensure the API call function (e.g., `myNewFeatureApi`) is defined stably outside the hook using `safeApiCall`.
    - Create a specific hook (e.g., `useMyNewFeature`) using the generic `useAsyncCall` hook, passing the stable API function reference.
      ```ts
      // src/hooks/useApi.ts
      // ... imports ...

      // Define stable API call wrappers
      const myNewFeatureApi = safeApiCall<MyPayload, MyResponseData>(window.api.myNewFeature);

      // Generic hook (remains the same)
      function useAsyncCall<TResponseData, TPayload>(...) { /* ... */ }

      // Specific hook
      export function useMyNewFeature() {
        return useAsyncCall(myNewFeatureApi);
      }
      ```

6.  **UI Component / Page**
    - Typically in a component within `/src/components/*` or a view within `/src/pages/*`.
    - **Navigation between major views** (like Library, Settings) is handled via the **native Electron menu** (defined in `electron/main/index.ts`). The menu sends IPC messages (`change-view`) which are received in `src/App.tsx` to control which page component is rendered.
    - **Import necessary state/actions** from the Zustand store (`src/store/filterStore.ts`) using selector hooks (e.g., `useAssetQuery`, `useSelection`, `useAppActions`) for features *within* a view.
    - **Import necessary API hooks** from `src/hooks/useApi.ts` (e.g., `useGetAssets`, `useMyNewFeature`).
    - Use `useEffect` to trigger data fetching based on state changes (e.g., filters from `useAssetQuery`).
    - Connect UI elements (`Button`, `TextField`, etc.) to state values and action handlers (using `useCallback` for handlers passed as props).

      ```tsx
      // Example: src/pages/SomeFeaturePage.tsx
      import React, { useEffect, useCallback } from 'react';
      import { Box, Button, CircularProgress, Alert } from '@mui/material';
      import { useMyNewFeature, useGetAssets } from '../hooks/useApi';
      import { useAssetQuery, useAppActions } from '../store/filterStore';

      function SomeFeaturePage() {
        // Zustand state/actions
        const assetQuery = useAssetQuery();
        const { clearSelection } = useAppActions();
        
        // API hooks
        const { call: callMyFeature, loading: featureLoading, error: featureError } = useMyNewFeature();
        const { call: fetchAssets, loading: assetsLoading, error: assetsError, data: assets } = useGetAssets();

        // Fetch assets based on query from Zustand store
        useEffect(() => {
          fetchAssets(assetQuery);
        }, [fetchAssets, assetQuery]);

        const handleFeatureClick = useCallback(async () => {
          const result = await callMyFeature({ /* payload */ });
          if (result.success) { 
            // Handle success, maybe clear selection or refresh data
            clearSelection();
            fetchAssets(assetQuery); 
          }
        }, [callMyFeature, clearSelection, fetchAssets, assetQuery]);

        return (
          <Box>
            <Button onClick={handleFeatureClick} disabled={featureLoading || assetsLoading}>
              {featureLoading ? <CircularProgress size={20}/> : 'Run My Feature'}
            </Button>
            {featureError && <Alert severity="error">{featureError}</Alert>}
            {/* ... display assets or loading/error states ... */}
          </Box>
        );
      }
      ```

7.  **State Management (Zustand)**
    - The main application state (filters, sorting, selection) resides in `/src/store/filterStore.ts` (`useAppStore`).
    - Access state and actions using the provided selector hooks (e.g., `useAssetQuery`, `useSelection`, `useAppActions`, `useYearFilter`).
    - Use `shallow` comparison with `useStoreWithEqualityFn` for action selectors to prevent unnecessary re-renders.
    - Add new state slices or actions to this central store as needed for global state.

8.  **Update Documentation (`devguide.md`, etc.)**
    - Add new IPC channels (like `change-view` listener), hooks, or major state changes to this guide.
    - Update `appflow.md`, `frontend.md`, `backend.md` if the overall flow or architecture changes significantly (e.g., reflect removal of AppBar navigation).

## 6. Thumbnail Generation

- **Images**: Uses `sharp` library (fast, Node-based).
- **Videos**: Uses `ffmpeg` (via `fluent-ffmpeg` and static binaries).
- **PDFs**: Attempts to use **ImageMagick** (`convert` command) with **Ghostscript** delegate.
  - **Requires**: ImageMagick and Ghostscript must be installed separately by the user and available in the system's `PATH`.
  - If `convert` is not found or fails, a placeholder is shown.
- **Caching**: Thumbnails are stored in `<vault_root>/cache/thumbnails/<asset_id>.jpg`.
- **Errors**: If generation fails, logs are written and a default placeholder icon is used in the UI.

## 7. Troubleshooting Common Issues

- **Blank Screen:**
    - Check the **Renderer Process Console** (Ctrl+Shift+I or Cmd+Opt+I) for errors.
    - Temporarily simplify the main React component (`src/App.tsx` or the active view like `src/pages/LibraryView.tsx`) to render just static text.
    - Ensure `src/main.tsx` correctly mounts the `App` component to the `#root` element in `index.html`.
    - Verify that the Vite dev server is running correctly and accessible.
    - Check for errors in the **Main Process Console** (the terminal where you ran `npm run dev`) related to window creation or loading.
- **IPC Errors (`window.api` undefined or method missing):**
    - Ensure the corresponding `ipcMain.handle(...)` is registered in the main process (e.g., `electron/main/index.ts`).
    - Verify the method is correctly exposed via `contextBridge.exposeInMainWorld('api', ...)` in the preload script (e.g., `electron/preload/index.ts`).
    - Make sure the method name and payload structure match between the main process handler, preload script, `src/types/api.ts`, and the renderer hook/call.
    - Check for errors during preload script execution in the Renderer console.
- **View Not Changing:**
    - Verify the `change-view` IPC message is being sent correctly from the menu click handlers in `electron/main/index.ts`.
    - Check that the `onViewChange` listener is correctly set up in `electron/preload/index.ts` and exposed via `contextBridge`.
    - Ensure the `useEffect` hook in `src/App.tsx` is calling `window.api.onViewChange` and updating the `activeView` state correctly.
    - Check the Renderer Process Console for errors related to the listener or state update.
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
    - **Check Dependencies:** Ensure `sharp`, `ffmpeg`, `@ffmpeg-installer/ffmpeg`, `ffprobe-static`