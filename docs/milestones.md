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
     - `assets` and `custom_fields` tables created in project root `data/db.sqlite`.  
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
     - Cached thumbnails stored under project root `cache/thumbnails`.  
   - **Verification/Test**:  
     - Importing a sample folder populates the database and UI reflects changes (may need refresh).  
     - Thumbnail files appear on disk in `cache/thumbnails`.  

4. **Milestone 4: Library View UI**  
   - **Goal**: Build the core library grid/list with filtering, sorting, and virtualization.  
   - **Deliverables**:  
     - Sidebar filters (year, advertiser, niche, shares slider) bound to Zustand store.  
     - Grid and list components using `react-window`.  
     - Drag‑and‑drop grouping between AssetCards.  
   - **Verification/Test**:  
     - Rendering 10 000 mock assets remains smooth (<100 ms frame).  
     - Dragging one card onto another executes `add-to-group` IPC.  

5. **Milestone 5: Metadata Editing & Version Panel**  
   - **Goal**: Provide inline metadata editing and robust version management.  
   - **Implementation Plan**:  
     1. **Database & IPC Handlers**  
        - **get-versions**: Query `assets` table for rows where `master_id = ?`.  
        - **create-version**: Open file picker, insert new version record with `master_id` and `version_no`, generate thumbnail via `thumbnailService`.  
        - **promote-version**: Swap master record with selected version in the DB, updating relevant fields and version numbers.  
        - **remove-from-group**: Ungroup or delete version record by clearing `master_id` or removing row.  
        - Update `src/types/api.ts` with new request/response types.  
     2. **Preload & Hooks**  
        - Expose `window.api.getVersions`, `.createVersion`, `.promoteVersion`, `.removeFromGroup` via preload script.  
        - Extend `useApi` hook to wrap these IPC calls with loading and error states.  
     3. **UI Components**  
        - **TagEditorModal**: MUI `Dialog` displaying asset preview and editable metadata fields (tags, custom fields), with Save/Cancel actions.  
        - **VersionPanel**: Expandable MUI `Collapse` panel under `AssetCard` showing version thumbnails, Promote/Delete buttons, and an `Add Version` action.  
        - Add 
     4. **State Management**  
        - Integrate `TagEditorModal` and `VersionPanel` with the global Zustand store for metadata and version state.  
        - Implement optimistic updates for version creation/promotion/removal.  
     5. **Testing & Verification**  
        - Write unit tests for IPC handlers and UI components.  
        - Verify metadata editing and version management workflows in the UI.  
        - Test error handling and edge cases for version creation/promotion/removal.  

6. **Milestone 6: Settings, Repair & Packaging**  
   - **Goal**: Finalize settings UI, DB repair flow, and build pipeline.  
   - **Deliverables**:  
     - Settings screen for custom fields and “Repair DB” action.  
     - Auto‑backup before metadata writes and integrity check on startup.  
     - `electron-builder` config and GitHub Actions for Windows installer.  
   - **Verification/Test**:  
     - Triggering DB corruption leads to folder‑mirror rebuild.  
     - CI produces a signed `.exe` installer and autoUpdater works in test.  
