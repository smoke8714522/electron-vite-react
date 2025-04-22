## 2. App Flow & UX Outline

### 2.1 User Journey (Screen‑by‑Screen)

1. **Launch & Home Screen**  
   - **What**: Electron splash → main window with top nav (“Library” selected by default).  
   - **Why**: Quick entry to your library.

2. **Library View**  
   - **Components**:  
     - **Sidebar**: Collapsible filters (Year, Advertiser, Niche, Shares slider, Search)  
     - **Toolbar**:  
       - Bulk Import  
       - View toggle (Grid/List)  
       - Sort dropdown  
       - Selection count & batch actions (“Edit Tags,” “Delete”)  
     - **Content Pane**:  
       - **Grid**: Responsive thumbnail cards  
       - **List**: Table rows with thumbnails & metadata  
   - **Inline Grouping & Versions**:  
     - **Drag & Drop Grouping**: Drag one thumbnail onto another → assets grouped under master, toast “3 assets grouped under ‘Foo.jpg’”  
     - **Inline Version Panel**: Click version‑count badge on any card/row → expands a nested panel beneath that item showing:  
       - Thumbnails of each version  
       - Metadata (Year, Advertiser, Niche, Shares)  
       - Action icons: Promote, Remove, Delete  
   - **Interactions**:  
     - Click thumbnail → Preview & Tag Editor modal  
     - Shift‑click/Ctrl‑click → multi‑select for batch edit  
     - Hover version badge → preview count & expand panel  

3. **Preview & Tag Editor Modal**  
   - **Components**:  
     - Medium‑res preview (image/video/PDF)  
     - Metadata form (Year, Advertiser, Niche, Shares)  
     - “Save” & “Cancel” buttons  
   - **Interactions**:  
     - Edit → Save writes to SQLite, updates folder‑mirror, regenerates thumbnail  

4. **Bulk Edit Modal**  
   - **Components**:  
     - Checklist: Year, Advertiser, Niche, Shares (each with apply‑checkbox)  
     - Fields for each checked item  
     - “Apply to X assets” & “Cancel”  
   - **When**: Click “Edit Tags” with ≥2 assets selected  

5. **Settings & Repair Screen**  
   - **Components**:  
     - Metadata schema manager (add/remove custom fields)  
     - “Repair DB” button (runs integrity check + folder‑mirror rebuild)  
   - **When**: Access via top‑right ⚙️ icon  

---

### 2.2 Key Actions & Transitions

| Action                        | From                    | To / Outcome                                                                 |
|-------------------------------|-------------------------|------------------------------------------------------------------------------|
| Bulk import                   | Toolbar “Bulk Import”   | File dialog → import → thumbnail gen → library refresh                      |
| Filter / sort                 | Sidebar / toolbar       | Update query → library refresh                                               |
| View switch (Grid ↔ List)     | Toolbar toggle          | Swap layout mode                                                             |
| Single asset edit             | Thumbnail click         | Open Preview modal → Save → UI refresh                                        |
| Multi‑select batch edit       | Toolbar “Edit Tags”     | Open Bulk Edit modal → Apply → library refresh                                |
| Drag & Drop grouping          | AssetCard → AssetCard   | `addToGroup` IPC → immediate grouping → toast → refresh                       |
| Toggle version panel          | Version badge click     | Expand/collapse inline version panel                                          |
| Repair database               | Settings screen         | Run integrity check → on fail rebuild via folder‑mirror → notification         |

---

### 2.3 Edge Cases & Error States

1. **Empty Library**  
   - **UI**: Illustration + “Click Bulk Import to get started.”

2. **Corrupted Thumbnail**  
   - **UI**: Placeholder thumbnail + “Regenerate” action in context menu.

3. **DB Integrity Check Fails**  
   - **UI**: Modal “Database corrupted. Rebuilding…” with progress bar.

4. **Bulk Operation Partial Failure**  
   - **UI**: Toast “5 of 12 updated. View errors.” → open log panel.

5. **Large Import (>10 K files)**  
   - **UI**: Progress dialog with ETA + “Cancel” option.

6. **Version Conflicts**  
   - **UI**: Conflicting rows highlighted, disable Promote until resolved.
