## 5. Backend Architecture

### Database Schema & Tables

```sql
-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL,
  year INTEGER,
  advertiser TEXT,
  niche TEXT,
  shares INTEGER DEFAULT 0,
  master_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  version_no INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_assets_master ON assets(master_id);
CREATE INDEX IF NOT EXISTS idx_assets_master_version ON assets(master_id, version_no);

-- Custom Fields
CREATE TABLE IF NOT EXISTS custom_fields (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_custom_values (
  assetId INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  fieldId INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  PRIMARY KEY (assetId, fieldId)
);

-- FTS5 virtual table for full‑text search on advertiser/niche
CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts
USING fts5(advertiser, niche, content='assets', content_rowid='id');
```

### API Endpoint Design

Use Electron IPC channels (exposed via `contextBridge`) to handle all backend actions:

| Channel               | Payload                                    | Response                                | Description                                        |
|-----------------------|--------------------------------------------|-----------------------------------------|----------------------------------------------------|
| `get-assets`          | `{ filters, sortBy, sortOrder }`           | `AssetWithThumbnail[]`                  | Fetch master assets + aggregates                   |
| `bulk-import-assets`  | _none_ (opens file dialog)                 | `{ success, importedCount, errors }`    | Multi-file import                                  |
| `create-asset`        | `{ filePath: string }`                     | `{ success, asset }`                    | Import single file                                 |
| `update-asset`        | `{ id: number, fields: Partial<Asset> }`   | `{ success }`                           | Update metadata                                    |
| `delete-asset`        | `{ id: number }`                           | `{ success }`                           | Delete file & record                               |
| `create-version`      | `{ id: number, filePath?: string }`        | `{ success, newId }`                    | Clone metadata + file for a new version            |
| `get-versions`        | `{ masterId: number }`                     | `{ success, assets }`                   | Fetch all versions for a master                    |
| `add-to-group`        | `{ assetId: number, masterId: number }`    | `{ success }`                           | Attach asset as a version                          |
| `remove-from-group`   | `{ assetId: number }`                      | `{ success }`                           | Detach from its master                             |
| `promote-version`     | `{ assetId: number }`                      | `{ success }`                           | Make a version the new master                      |
| `get-master-assets`   | `{ searchTerm?: string }`                  | `{ assets: { id, fileName }[] }`        | For grouping dropdown                              |

### Auth Flows & Security

- **Local‑Only Access**  
  - Runs offline; no external network calls by default.  
  - Files and database live under the user’s OS data directory with standard file permissions.

- **IPC Hardening**  
  - `contextIsolation: true`, `enableRemoteModule: false`.  
  - Validate & sanitize all IPC payloads (ensure IDs are integers, paths under vault root).  
  - Use parameterized SQL queries to prevent injection.

- **DB Encryption & Integrity**  
  - Optional AES‑256 encryption via SQLCipher.  
  - Backup DB before each metadata write; run `PRAGMA integrity_check`.  
  - Expose a “Repair DB” flow to rebuild from folder mirror on failure.

- **Code Signing & Auto‑Updates**  
  - Sign Windows installer with a trusted certificate.  
  - Serve updates over HTTPS and verify signatures in `autoUpdater`.

- **Error Reporting**  
  - Integrate Sentry/Crashpad in main process for uncaught exceptions.  
  - Rotate local logs; avoid logging sensitive metadata in clear text.  

### Thumbnail & Preview Service
- **Responsibilities**  
  - Generate image thumbnails (`sharp`)  
  - Extract video frames (`ffmpeg`)  
  - Render PDF previews (ImageMagick/Ghostscript)  
- **Workflow**  
  1. On asset import/update, enqueue a thumbnail job.  
  2. Worker pulls job, writes `/vault/cache/thumbnails/<id>.jpg`.  
  3. On read, serve from cache or regenerate if missing.  
- **Error Handling**  
  - Retry up to 2× on failure, then log and show placeholder.

### File Storage & Folder‑Mirror Sync
- **Vault Structure**  
  - All raw files live under the app root in `/vault/...`.  
  - Database stores only relative paths (e.g. `images/foo.jpg`).  
- **Mirror Logic**  
  - After each metadata write, sync the `Year/Advertiser/Niche` hierarchy under `/vault/mirror/...`.  
  - Perform mirror in a transaction immediately after DB commit.  
  - “Export to…” button triggers a fresh mirror rebuild.

### Logging & Monitoring
- **Log Levels**  
  - **INFO**: imports, exports, major actions  
  - **WARN**: recoverable errors (thumbnail fail)  
  - **ERROR**: unrecoverable failures (DB corruption)  
- **Log Storage**  
  - Write logs to `/vault/logs/app.log`  
  - Rotate daily, keep last 7 files, max 5 MB each.

### Configuration & Environment
- **Config File**: `/vault/config.json` at app root  
- **Options**  
  - Thumbnail size, worker concurrency  
  - DB encryption toggle  
- **Loading**  
  - Main process reads and validates on startup  
  - Expose settings UI under ⚙️ to update and persist

