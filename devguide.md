# AdVault2 Development Essentials

## 1. Folder Structure Overview

```
/  
├── src/  
│   ├── components/       # Reusable UI components (atoms, molecules, organisms)
│   │   ├── atoms/        # e.g. ActionButton.tsx, FilterField.tsx
│   │   ├── molecules/    # e.g., AssetCard.tsx
│   │   └── organisms/    # e.g., FilterSidebar.tsx, LibraryToolbar.tsx, AssetGrid.tsx, VersionPanel.tsx, TagEditorModal.tsx
│   ├── hooks/            # Custom React hooks (e.g., useApi.ts)
│   ├── store/            # Zustand stores (e.g., filterStore.ts -> useAppStore)
│   ├── theme/            # MUI theme overrides & tokens  
│   ├── pages/            # Top‑level views (e.g., LibraryView.tsx, SettingsView.tsx)
│   ├── types/            # Shared TypeScript types (e.g., api.ts, dnd.ts)
│   └── main.tsx          # Renderer process entry point
├── lib/                  # Electron main process code (IPC handlers, ThumbnailService, DB service)
│   └── db.ts             # Database initialization, schema, and access functions
├── electron/             # Electron-Vite specific config/build files  
│   ├── main/             # Main process entry point (index.ts)
│   └── preload/          # Preload script entry point (index.ts)  
├── test/                 # Unit/Integration tests (mirrors /src structure)
│   └── atoms/
├── public/               # Static assets
├── vault/                # Default user asset storage location (can be configured)
├── data/                 # Default location for app data (e.g., DB)
├── cache/                # Default location for generated thumbnails
├── logs/                 # Default location for logs
├── scripts/              # Utility scripts
├── docs/                 # Detailed design documents (appflow.md, frontend.md, backend.md)
├── .github/workflows/    # CI configuration (ci.yml)
├── package.json
├── tsconfig.json         # TS config for renderer
├── tsconfig.node.json    # TS config for main/preload
└── README.md  
```

## 2. Core Architecture & Communication (IPC)

*   **Main Process (`/lib`, `electron/main`):** Node.js backend. Handles DB (SQLite via `better-sqlite3`), file system, thumbnailing, etc.
*   **Renderer Process (`/src`):** React UI (MUI), state (Zustand).
*   **Communication:** Secure Electron IPC via `contextBridge`.
    *   The preload script (`electron/preload/index.ts`) selectively exposes main process functions to the renderer.
    *   **Access:** Renderer calls backend functions via `window.api.<methodName>(payload)`. **This is the only way.**
    *   **API Contract:** The definitive source for all available methods, their payloads, and responses is the **`IElectronAPI` interface** in **`src/types/api.ts`**.
    *   **Response Format:** Standardized as `ApiResponse<T>` defined in `src/types/api.ts` (usually `{ success: boolean, data?: T, error?: string }`).

## 3. Adding Features (Core Workflow)

Follow these steps for features needing backend interaction:

1.  **Types (`src/types/api.ts`):** Define/update Payload/Response interfaces. **Crucially, update `IElectronAPI`** with the new method signature.
2.  **DB Logic (`lib/db.ts`):** Add/update database functions using `better-sqlite3`.
3.  **IPC Handler (`electron/main/index.ts` or Service):** Implement the main process logic. Register the handler with `ipcMain.handle(...)`. **Validate incoming payloads rigorously.**
4.  **Expose via Preload (`electron/preload/index.ts`):** Add the corresponding method to the `api` object, invoking the correct IPC channel.
5.  **API Hook (`src/hooks/useApi.ts`):** Add a wrapper function (using `safeApiCall`) and a React hook (using the `useAsyncCall` pattern) for convenient frontend usage (handles loading/error states).
6.  **UI (`/src/pages`, `/src/components`):** Call the new hook from your React component. Use the hook's state (`loading`, `error`, `data`) and `call` function.
7.  **State/Refresh:** If the action affects shared state or requires a data refresh in other components, use callbacks (e.g., `onDataChange`) passed down from parent views (like `LibraryView`) to trigger state updates or refetches (e.g., re-calling `fetchAssets` from `useGetAssets`).

## 4. Key Libraries & Patterns

*   **UI Framework:** React 18+ / TypeScript.
*   **Component Library:** Material UI (MUI) v5. Use `sx` prop or `styled()` for styling, referencing `theme/` tokens. Organisms like `AssetGrid` and `VersionPanel` contain significant view logic.
*   **State Management:** Zustand (`src/store/`). Global filters/selection managed via `useAppStore()` hooks. Component state is preferred for local UI concerns.
*   **API Calls (Renderer):** Use hooks from `src/hooks/useApi.ts` built on the `useAsyncCall` pattern. These centralize IPC calls and manage async state (loading, error).
*   **Data Refresh:** Primarily handled via callbacks (`onDataChange`, `onSaveSuccess`) triggering refetches in parent components (see `LibraryView`).
*   **Virtualization:** `react-window` (`FixedSizeGrid` in `AssetGrid.tsx`) for performance. *Note: Expansion within `AssetCard` (like `VersionPanel`) might clip; consider `VariableSizeGrid` if problematic.*
*   **Drag & Drop:** `react-dnd` for grouping (`AssetCard` -> `AssetGrid` handler).
*   **Database:** SQLite via `better-sqlite3`. Logic encapsulated in `lib/db.ts`. Schema includes `assets` (with `master_id`, `version_no`), `custom_fields`, etc.
*   **Testing:** Vitest + React Testing Library (`@testing-library/react`). Tests in `/test`. Run via `npm run test:unit`. *Remember: Define `vi.fn()` spies inside `vi.mock()` factory.*
*   **Build:** Vite via `electron-vite`.

## 5. Running the Project

*   Install: `npm install`
*   Develop: `npm run dev`
*   Lint: `npm run lint`
*   Type Check: `npm run type-check`
*   Test: `npm run test:unit` / `npm run test:watch`
*   Build: `npm run build`

*(See `package.json` for all scripts)*.

## 6. Key Concepts Illustrated (Examples from Versioning/Editing Features)

*   **Modal Control:** Parent views (`LibraryView`) manage state (`isOpen`, `selectedAsset`) for modals (`TagEditorModal`). This pattern was also used for the initial `BulkEditModal` stub, where `LibraryToolbar` managed its open state.
*   **Component Data Fetching:** Complex components (`VersionPanel`) can fetch their own data using dedicated API hooks (`useGetVersions`).
*   **Callback Propagation:** Actions in nested components (`VersionPanel` -> `AssetCard` -> `AssetGrid` -> `LibraryView`) trigger data refreshes in the top-level view via callbacks (`onVersionsChange` -> `onDataChange` -> `fetchAssets`).
*   **Backend Logic:** Complex operations like `promote-version` involve DB transactions handled in `lib/db.ts` and exposed via a single IPC call.
*   **UI Scaffolding & Iteration:**
    *   A stub `BulkEditModal.tsx` was created first with basic form elements.
    *   The `AssetCard.tsx` initially displayed version info via a `<Chip>` that toggled the `VersionPanel` using a `Popover` to avoid grid layout issues.

## 7. Known Issues / TODOs

*   Backend `get-assets` needs to return `versionCount`.
*   `AssetGrid` using `FixedSizeGrid` can cause layout issues when `VersionPanel` expands.
*   `AssetList` view lacks full tag editing/versioning support.
*   Enhance user-facing error handling (e.g., snackbars).
*   Add confirmation dialogs for destructive actions (e.g., Remove from Group).


### Example: Versioning & Bulk Edit API Implementation

The versioning and bulk edit features follow the core workflow described above. Here's a summary of the key additions:

*   **DB Functions (`lib/db.ts`):**
    *   `getAssetById(id)`: Helper to fetch a single asset.
    *   `getAssetVersions(masterId)`: Retrieves all assets belonging to a version group (including the master).
    *   `createVersion(masterId)`: Creates a new asset record linked to the `masterId`, copying metadata and assigning the next `version_no`. (Note: File duplication logic is separate).
    *   `promoteVersion(versionId)`: Updates `master_id` and `version_no` fields within a version group to make the specified `versionId` the new master (version 1).
    *   `removeFromGroup(versionId)`: Sets `master_id` to `NULL` and `version_no` to `1` for the given asset, making it standalone.
    *   `bulkUpdateAssets(ids, fields)`: Updates specified fields (`year`, `advertiser`, `niche`, `shares`) for multiple asset IDs in a single transaction.
*   **IPC Handlers (`electron/main/index.ts`):**
    *   `ipcMain.handle('get-versions', ...)`: Calls `getAssetVersions`.
    *   `ipcMain.handle('create-version', ...)`: Calls `createVersion`.
    *   `ipcMain.handle('promote-version', ...)`: Calls `promoteVersion`.
    *   `ipcMain.handle('remove-from-group', ...)`: Calls `removeFromGroup`.
    *   `ipcMain.handle('bulk-update-assets', ...)`: Calls `bulkUpdateAssets`.
    *   Each handler includes basic payload validation and returns a standard `ApiResponse`.
*   **Preload (`electron/preload/index.ts`):**
    *   The `api` object exposed via `contextBridge` includes mappings for `getVersions`, `createVersion`, `promoteVersion`, `removeFromGroup`, and `bulkUpdateAssets`, invoking the correct IPC channels.
*   **Types (`src/types/api.ts`):**
    *   Payload and Response interfaces (e.g., `GetVersionsPayload`, `GetVersionsResponse`, `BulkUpdatePayload`, `BulkUpdateResponse`) are defined.
    *   The `IElectronAPI` interface includes the method signatures for the new functions.
*   **API Hooks (`src/hooks/useApi.ts`):**
    *   `useGetVersions`, `useCreateVersion`, `usePromoteVersion`, `useRemoveFromGroup`, and `useBulkUpdateAssets` hooks are implemented using the `useAsyncCall` pattern, wrapping the corresponding `window.api` calls.
*   **UI Integration:**
    *   `VersionPanel.tsx`: Uses `useGetVersions` to load data and `usePromoteVersion`, `useRemoveFromGroup`, `useCreateVersion` to trigger actions. Calls `onVersionsChange` callback on success.
    *   `BulkEditModal.tsx`: Uses `useBulkUpdateAssets` in its save handler. Calls `onSaveSuccess` callback on success.

