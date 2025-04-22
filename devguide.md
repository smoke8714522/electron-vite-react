# AdVault2 Development Essentials

## 1. Folder Structure Overview

```
/  
├── src/  
│   ├── components/       # Reusable UI components (atoms, molecules, organisms)
│   │   ├── atoms/        # e.g. ActionButton.tsx, FilterField.tsx
│   │   ├── molecules/    # e.g., AssetCard.tsx
│   │   └── organisms/    # e.g., FilterSidebar.tsx, LibraryToolbar.tsx, AssetGrid.tsx
│   ├── hooks/            # Custom React hooks (e.g., useApi.ts)
│   ├── store/            # Zustand stores (e.g., filterStore.ts -> useAppStore)
│   ├── theme/            # MUI theme overrides & tokens  
│   ├── pages/            # Top‑level views (e.g., LibraryView.tsx, SettingsView.tsx)
│   ├── types/            # Shared TypeScript types (e.g., api.ts)
│   └── main.tsx          # Renderer process entry point
├── lib/                  # Electron main process code (IPC handlers, ThumbnailService, DB service)
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
*(Note: `vault`, `data`, `cache`, `logs` locations might be configured elsewhere, often within Electron's `app.getPath('userData')`)*

## 2. Core Architecture & IPC

*   **Main Process (`/lib`, `electron/main`):** Handles Node.js APIs, file system access, database operations (SQLite via `better-sqlite3`), thumbnail generation.
*   **Renderer Process (`/src`):** React UI (MUI components), state management (Zustand).
*   **Communication:** Uses Electron IPC via a preload script (`electron/preload/index.ts`) and `contextBridge`. The preload script acts as a secure bridge, selectively exposing main process functionality.

**IPC API Contract:**

*   All backend interactions from the renderer are exposed via `window.api.<methodName>`. This is the *only* way renderer code should interact with the main process.
*   Refer to **`src/types/api.ts`** for the **`IElectronAPI` interface**, which defines all exposed methods, and for detailed `Payload` and `Response` type definitions.
*   Standard Response Format: `{ success: boolean, data?: <DataType>, error?: string }` (See `ApiResponse<T>` in `src/types/api.ts`).
*   **Key Channels (Examples - Full list in `src/types/api.ts`):**
    *   `get-assets`: Fetch assets based on filters/sorting.
    *   `update-asset`: Modify asset metadata.
    *   `bulk-import-assets`: Trigger main process to show file dialog and handle import.
    *   `add-to-group`: Link assets (versioning).
    *   `onViewChange`: Listener for menu-driven view changes (main -> renderer).

## 3. Adding Features (Core Workflow)

Follow these steps for features involving backend interaction:

1.  **Define Types:** Add/update payload/response interfaces in `src/types/api.ts`. Critically, update the **`IElectronAPI` interface** with the new method signature.
2.  **Add IPC Handler:** Implement the core logic in the main process (e.g., in a service within `/lib/services` or directly in `electron/main/index.ts` if simple). Register the handler using `ipcMain.handle('<channel-name>', async (event, payload) => { ... })`. **Validate all incoming `payload` data rigorously.**
3.  **Expose via Preload:** Add the corresponding method to the `api` object in `electron/preload/index.ts`. This method should simply invoke the IPC channel: `methodName: (payload) => ipcRenderer.invoke('<channel-name>', payload)`. Ensure the method name matches the `IElectronAPI` interface.
4.  **Create/Use API Hook:** Add a stable API wrapper function (using `safeApiCall`) and a specific React hook (using `useAsyncCall`) in `src/hooks/useApi.ts`. This provides a consistent way to handle loading/error states in the UI.
5.  **Use in UI:** Call the new hook from your React component (`/src/pages` or `/src/components`). Use the returned `call`, `loading`, `error`, and `data` properties to manage the UI state during the asynchronous operation.
6.  **Update Global State (if needed):** If the operation affects shared application state (like the list of assets, filters, selection), dispatch an action using hooks provided by the Zustand store (`src/store/filterStore.ts` via `useAppActions`) within the success handler of your API call.

## 4. Key Libraries & Patterns

*   **UI Framework:** React 18+ with TypeScript.
*   **Component Library:** Material UI (MUI) v5. Use `sx` prop or `styled()` for styling.
*   **State Management:** Zustand (`src/store/filterStore.ts` for main app state). Access via provided selector hooks (e.g., `useYearFilter`, `useSelectionCount`, `useAppActions`).
*   **Virtualization:** `react-window` and `react-virtualized-auto-sizer` for performant rendering of large lists/grids (`AssetGrid.tsx`, `AssetList.tsx`). Installed via `npm install react-window react-virtualized-auto-sizer`.
*   **API Calls (Renderer):** Use custom React Hooks from `src/hooks/useApi.ts` built upon the `useAsyncCall` pattern.
*   **Database:** SQLite, accessed via `better-sqlite3` in the main process (likely within `/lib/services/dbService.ts`).
*   **Testing:** Vitest. Place tests in `/test` mirroring `/src`. Run with `npm run test:unit`.
*   **Testing Library:** React Testing Library (`@testing-library/react`) for component tests.
*   **TypeScript:** Strict mode enabled (`tsconfig.json`, `tsconfig.node.json`).
*   **Build Tool:** Vite via `electron-vite` plugin.

## 5. Running the Project

*   Install dependencies: `npm install`
*   Run development server: `npm run dev`
*   Run linters: `npm run lint`
*   Run type checking: `npm run type-check`
*   Run unit tests: `npm run test:unit` or `npm run test:watch`
*   Build for production: `npm run build`

*(Refer to `package.json` for all scripts)*.

## 6. UI Implementation Notes

### Virtualized Views (AssetGrid / AssetList)

To handle potentially thousands of assets efficiently, the `AssetGrid` and `AssetList` components use `react-window` for virtualization.

*   **Wrapping:** Both components are wrapped in `AutoSizer` from `react-virtualized-auto-sizer` to dynamically determine the available width and height.
*   **Core Component:**
    *   `AssetGrid` uses `FixedSizeGrid`. It calculates the number of columns based on available width and a fixed card width.
    *   `AssetList` uses `FixedSizeList`. It renders items with a fixed row height.
*   **Item Rendering:** A `Cell` (for Grid) or `Row` (for List) function is passed to the `react-window` component. This function receives `index`, `style` (for absolute positioning), and `data` (containing the items array). It's responsible for rendering the actual `AssetCard` (or a list-specific item) for the given index.
*   **Data Passing:** Asset data (`items`) and potentially other context (like selection handlers or state) are passed down via the `itemData` prop of the `FixedSizeGrid`/`FixedSizeList`.

```tsx
// Example Structure (AssetGrid.tsx)
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid } from 'react-window';
// ... other imports

const AssetGrid = ({ assets, ... }) => {
  const Cell = ({ columnIndex, rowIndex, style, data }) => { /* Render AssetCard */ };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeGrid /* column/row counts, sizes */ itemData={{ items: assets }}>{Cell}</FixedSizeGrid>
      )}
    </AutoSizer>
  );
}
```

### View Toggling (LibraryView / LibraryToolbar)

The ability to switch between Grid and List view is managed as follows:

1.  **State:** The `LibraryView` component holds the current view mode (`'grid'` or `'list'`) in its local state using `useState`.
2.  **Props:** `LibraryView` passes the current `view` state and the state setter function (`onViewChange`) down to the `LibraryToolbar`.
3.  **Toggle:** `LibraryToolbar` uses an MUI `ToggleButtonGroup` controlled by the `view` prop. When a toggle button is clicked, it calls the `onViewChange` prop function (passed down from `LibraryView`) with the new view mode ('grid' or 'list').
4.  **Conditional Rendering:** `LibraryView` uses the `view` state to conditionally render either the `<AssetGrid />` or `<AssetList />` component.