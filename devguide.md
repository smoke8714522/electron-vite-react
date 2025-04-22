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
| `change-view`        | `{ view: 'library' \| 'settings' }`     | _none_ (event listener)                           | Sent by main menu to renderer                     |
| `on-view-change`     | _(callback function)_                | _none_ (event listener registration)             | Renderer registers callback for view changes      |
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

This section outlines common patterns for adding features involving backend communication, UI components, and state management.

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
        addToGroup: (payload) => ipcRenderer.invoke('add-to-group', payload), // Example
        // Listener example (see App.tsx for usage)
        onViewChange: (callback) => {
          const channel = 'change-view';
          // Remove previous listener before adding a new one
          ipcRenderer.removeAllListeners(channel);
          ipcRenderer.on(channel, (_event, ...args) => callback(...args));
          // Return cleanup function to be called in useEffect cleanup
          return () => ipcRenderer.removeAllListeners(channel);
        }
      };
      ```
    - Ensure the method signature matches the expected usage in the renderer.

4.  **Define Types**
    - Update `src/types/api.ts`:
        - Add specific `Payload` and `ResponseData` interfaces if needed (e.g., `AddToGroupPayload`).
        - Define the `ApiResponse` structure (e.g., `AddToGroupResponse = ApiResponse<null>`).
        - Add the new method signature to the `IElectronAPI` interface.

5.  **Renderer Hook (`useApi.ts`)**
    - Edit `src/hooks/useApi.ts`.
    - Define a stable API call function (e.g., `addToGroupApi`) outside the hook using `safeApiCall`.
    - Create a specific hook (e.g., `useAddToGroup`) using the generic `useAsyncCall` hook, passing the stable API function reference.
      ```ts
      // src/hooks/useApi.ts
      import { safeApiCall, useAsyncCall } from './useApiCore'; // Assuming core logic is separated
      import { 
        Asset, 
        AssetQuery, 
        BulkImportResult, 
        CreateAssetPayload, 
        UpdateAssetPayload, 
        DeleteAssetPayload,
        AddToGroupPayload,
        // Response types (often just ApiResponse<DataType>)
        GetAssetsResponse,
        CreateAssetResponse,
        UpdateAssetResponse,
        DeleteAssetResponse,
        BulkImportResponse,
        GetVersionsResponse,
        AddToGroupResponse,
      } from '../types/api';

      // Define stable API call wrappers
      const getAssetsApi = safeApiCall<AssetQuery | undefined, Asset[]>(window.api.getAssets);
      const addToGroupApi = safeApiCall<AddToGroupPayload, null>(window.api.addToGroup);
      // ... other API wrappers ...

      // Specific hooks
      export function useGetAssets() {
        return useAsyncCall(getAssetsApi);
      }

      export function useAddToGroup() {
        return useAsyncCall(addToGroupApi);
      }
      // ... other hooks ...
      ```

6.  **UI Component / Page**
    - **General Structure:** Components in `/src/components/*`, views/pages in `/src/pages/*`.
    - **Navigation:** Handled via native Electron menu (defined in `electron/main/index.ts`), which sends `change-view` IPC messages caught by `src/App.tsx` to switch the rendered page.
    - **State Management:** Use Zustand store (`src/store/filterStore.ts`) via selector hooks (e.g., `useAssetQuery`, `useSelection`, `useAppActions`) for view-internal state like filters, sorting, and selection.
    - **Data Fetching & Actions:** Use API hooks from `src/hooks/useApi.ts` (e.g., `useGetAssets`, `useAddToGroup`).
    - **Triggering Fetches:** Use `useEffect` based on state changes (e.g., filters from `useAssetQuery`).
    - **Event Handlers:** Connect UI elements (`Button`, `TextField`, etc.) to state values and action handlers (use `useCallback` for handlers passed as props).

    **Example: Filtering & Displaying Assets with Virtualization**
    ```tsx
    // src/pages/LibraryView.tsx
    import React, { useEffect } from 'react';
    import { Box, CircularProgress, Alert } from '@mui/material';
    import { FixedSizeGrid as Grid } from 'react-window'; // Import react-window
    import AutoSizer from "react-virtualized-auto-sizer"; // Helper for dimensions
    import { useGetAssets } from '../hooks/useApi';
    import { useAssetQuery } from '../store/filterStore';
    import AssetCard from '../components/molecules/AssetCard';
    import FilterSidebar from '../components/organisms/FilterSidebar';
    import LibraryToolbar from '../components/organisms/LibraryToolbar';

    const COLUMN_WIDTH = 220; // Example width including padding
    const ROW_HEIGHT = 280;   // Example height including padding

    function LibraryView() {
      const assetQuery = useAssetQuery(); // Get current filters/sort from Zustand
      const { call: fetchAssets, loading, error, data: assets = [] } = useGetAssets();

      // Fetch assets when query changes
      useEffect(() => {
        fetchAssets(assetQuery);
      }, [fetchAssets, assetQuery]);

      if (loading) return <CircularProgress />;
      if (error) return <Alert severity="error">{error}</Alert>;

      return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}> {/* Adjust for toolbar height */}
          <FilterSidebar />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <LibraryToolbar />
            <Box sx={{ flexGrow: 1, p: 2, overflow: 'hidden' }}> {/* Container for AutoSizer */}
              <AutoSizer>{
                ({ height, width }) => {
                    const columnCount = Math.max(1, Math.floor(width / COLUMN_WIDTH));
                    const rowCount = Math.ceil(assets.length / columnCount);

                    return (
                      <Grid
                        columnCount={columnCount}
                        columnWidth={COLUMN_WIDTH}
                        height={height}
                        rowCount={rowCount}
                        rowHeight={ROW_HEIGHT}
                        width={width}
                        itemData={{ assets, columnCount }} // Pass data to Cell
                        itemKey={({ columnIndex, rowIndex, data }) => { // Unique key
                          const index = rowIndex * data.columnCount + columnIndex;
                          return data.assets[index]?.id ?? `empty-${rowIndex}-${columnIndex}`;
                        }}
                      >
                        {AssetGridCell} // Cell rendering component
                      </Grid>
                    );
                }}
              </AutoSizer>
            </Box>
          </Box>
        </Box>
      );
    }

    // Cell rendering component for react-window Grid
    const AssetGridCell = ({ columnIndex, rowIndex, style, data }) => {
      const { assets, columnCount } = data;
      const index = rowIndex * columnCount + columnIndex;
      if (index >= assets.length) return null; // Handle empty cells

      const asset = assets[index];
      // Add padding/styling via the style prop from react-window
      return (
        <div style={style}>
          <Box sx={{ p: 1, height: '100%' }}> {/* Inner padding */}
            <AssetCard asset={asset} /* ... other props ... */ />
          </Box>
        </div>
      );
    };
    ```

    **Example: Implementing Drag-and-Drop in `AssetCard.tsx`**
    ```tsx
    // src/components/molecules/AssetCard.tsx
    import React, { useCallback } from 'react';
    import { Card, /* ... */ } from '@mui/material';
    import { useAddToGroup } from '../../hooks/useApi';
    import { Asset } from '../../types/api';

    interface AssetCardProps { asset: Asset; /* ... */ }

    const AssetCard: React.FC<AssetCardProps> = ({ asset /* ... */ }) => {
      const { call: addToGroup, loading: isGrouping } = useAddToGroup();

      const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData('application/advault-asset-id', String(asset.id));
        event.dataTransfer.effectAllowed = 'move';
      }, [asset.id]);

      const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Allow drop
        event.dataTransfer.dropEffect = 'move';
      }, []);

      const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const sourceIdStr = event.dataTransfer.getData('application/advault-asset-id');
        const targetId = asset.id;

        if (sourceIdStr && targetId) {
          const sourceId = parseInt(sourceIdStr, 10);
          if (sourceId !== targetId && !isNaN(sourceId)) {
            console.log(`Grouping ${sourceId} -> ${targetId}`);
            const result = await addToGroup({ sourceId, targetId }); // IPC Call
            // Handle result/error...
            if (result.success) {
              // Maybe trigger asset refresh via Zustand action?
            }
          }
        }
      }, [asset.id, addToGroup]);

      return (
        <Card
          draggable={true}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{ /* ... styles, opacity: isGrouping ? 0.5 : 1 ... */ }}
        >
          {/* ... Card Content ... */}
        </Card>
      );
    };
    ```

7.  **State Management (Zustand)**
    - The main application state (filters, sorting, selection, maybe view state) resides in `/src/store/filterStore.ts` (`useAppStore`).
    - Access state and actions using the provided selector hooks (e.g., `useAssetQuery`, `useSelection`, `useAppActions`, `useYearFilter`).
    - Use `shallow` comparison with `useStoreWithEqualityFn` for action selectors to prevent unnecessary re-renders.
    - Add new state slices or actions to this central store as needed. For example, adding a Year filter:
        - **Store Slice:** Add `year: number | null`, `setYear: (year: number | null) => void` to the store state and actions.
        - **Selector Hook:** Create `useYearFilter` selector hook.
        - **Sidebar UI:** Add a slider or input in `FilterSidebar.tsx`, connecting its value to `year` and `onChange` to `setYear`.

8.  **Update Documentation (`devguide.md`, etc.)**
    - Add new IPC channels, hooks, or major state changes to this guide.
    - Update `appflow.md`, `frontend.md`, `backend.md` if the overall flow or architecture changes significantly.

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