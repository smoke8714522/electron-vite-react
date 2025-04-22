## 6. Implementation Milestones

1. **Milestone 1: Scaffold & Core Config**  
   - **Goal**: Kick off the project with a working Electron‑Vite‑React + MUI + Zustand setup.  
   - **Deliverables**:  
     - New repo using `electron-vite-react` template.  
     - `@mui/material`, `@emotion/react`, `zustand` installed.  
     - Basic MUI theme file and a global Zustand store stub.  
     - ESLint/Prettier configured in CI.  
   - **Verification/Test**:  
     - `npm run dev` launches a blank window.  
     - Lint and type‑check pass with zero errors.  

2. **Milestone 2: Database & IPC Layer**  
   - **Goal**: Establish SQLite schema and IPC bridge for CRUD operations.  
   - **Deliverables**:  
     - `assets` and `custom_fields` tables created in app root `/vault/db.sqlite`.  
     - IPC handlers for `get-assets`, `create-asset`, `update-asset`, `delete-asset`.  
     - `useApi` hook wrapping these calls with loading/error state.  
   - **Verification/Test**:  
     - In dev tools console, `window.api.getAssets()` returns an empty array.  
     - Adding/updating/deleting a dummy record reflects in DB file.  

3. **Milestone 3: Import & Thumbnail Service**  
   - **Goal**: Enable bulk import and thumbnail generation.  
   - **Deliverables**:  
     - “Bulk Import” button wired to `bulk-import-assets` IPC.  
     - ThumbnailService in main process using `sharp` and `ffmpeg`.  
     - Cached thumbnails stored under `/vault/cache/thumbnails`.  
   - **Verification/Test**:  
     - Importing a sample folder pops thumbnails in UI.  
     - Thumbnail files appear on disk and render correctly.  

4. **Milestone 4: Library View UI**  
   - **Goal**: Build the core library grid/list with filtering, sorting, and virtualization.  
   - **Deliverables**:  
     - Sidebar filters (year, advertiser, niche, shares slider) bound to Zustand store.  
     - Grid and list components using `react-window`.  
     - Drag‑and‑drop grouping between AssetCards.  
   - **Verification/Test**:  
     - Rendering 10 000 mock assets remains smooth (<100 ms frame).  
     - Dragging one card onto another executes `add-to-group` IPC.  

5. **Milestone 5: Metadata Editing & Version Panel**  
   - **Goal**: Provide inline editing and version management.  
   - **Deliverables**:  
     - Preview & Tag Editor modal for single asset edits.  
     - Inline version panel that expands under each card/row.  
     - IPC handlers for `get-versions`, `create-version`, `promote-version`, `remove-from-group`.  
   - **Verification/Test**:  
     - Editing a field updates the database and UI reflects changes.  
     - Adding/removing/promoting versions updates version counts and panel.  

6. **Milestone 6: Settings, Repair & Packaging**  
   - **Goal**: Finalize settings UI, DB repair flow, and build pipeline.  
   - **Deliverables**:  
     - Settings screen for custom fields and “Repair DB” action.  
     - Auto‑backup before metadata writes and integrity check on startup.  
     - `electron-builder` config and GitHub Actions for Windows installer.  
   - **Verification/Test**:  
     - Triggering DB corruption leads to folder‑mirror rebuild.  
     - CI produces a signed `.exe` installer and autoUpdater works in test.  
