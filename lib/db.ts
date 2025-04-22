import path from 'node:path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import type { Asset } from '../src/types/api'; // Import Asset type

let db: Database.Database | null = null;

// Bring back the createTables function definition
const createTables = (dbInstance: Database.Database) => {
  console.log('Ensuring database schema...');
  // Enable WAL mode for better concurrency
  dbInstance.pragma('journal_mode = WAL');

  // Assets table (Matches backend.md schema)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY, -- AUTOINCREMENT is implicit for INTEGER PRIMARY KEY
      path TEXT NOT NULL UNIQUE, -- Added UNIQUE constraint based on previous code
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      year INTEGER,
      advertiser TEXT,
      niche TEXT,
      shares INTEGER DEFAULT 0,
      master_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
      version_no INTEGER NOT NULL DEFAULT 1,
      thumbnailPath TEXT -- Added field to potentially store thumbnail path
    );
  `);

  // Indexes (Matches backend.md)
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_assets_master ON assets(master_id);`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_assets_master_version ON assets(master_id, version_no);`);

  // Custom Fields table (Matches backend.md)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY, -- AUTOINCREMENT is implicit
      name TEXT NOT NULL UNIQUE, -- Added UNIQUE based on previous code
      type TEXT NOT NULL CHECK(type IN ('text', 'number', 'date', 'boolean')) -- Added CHECK based on previous code
    );
  `);

  // Asset Custom Values table (Matches backend.md)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS asset_custom_values (
      assetId INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      fieldId INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
      value TEXT,
      PRIMARY KEY (assetId, fieldId)
    );
  `);

  // FTS5 table (Matches backend.md)
  dbInstance.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts
    USING fts5(advertiser, niche, content='assets', content_rowid='id');
  `);

  // Triggers to keep FTS table updated (Matches backend.md)
  dbInstance.exec(`
    CREATE TRIGGER IF NOT EXISTS assets_ai AFTER INSERT ON assets BEGIN
      INSERT INTO assets_fts (rowid, advertiser, niche) VALUES (new.id, new.advertiser, new.niche);
    END;
  `);
  dbInstance.exec(`
    CREATE TRIGGER IF NOT EXISTS assets_ad AFTER DELETE ON assets BEGIN
      DELETE FROM assets_fts WHERE rowid = old.id;
    END;
  `);
  dbInstance.exec(`
    CREATE TRIGGER IF NOT EXISTS assets_au AFTER UPDATE ON assets BEGIN
      UPDATE assets_fts SET advertiser = new.advertiser, niche = new.niche WHERE rowid = old.id;
    END;
  `);

  console.log('Database tables ensured.');
};

export function initDatabase() {
  return new Promise<void>((resolve, reject) => {
    const projectRoot = process.env.APP_ROOT;
    if (!projectRoot) {
        const errorMsg = 'FATAL: process.env.APP_ROOT is not defined! Cannot initialize database.';
        console.error(errorMsg);
        return reject(new Error(errorMsg));
    }
    
    const dataDir = path.join(projectRoot, 'data');
    const dbPath = path.join(dataDir, 'db.sqlite');

    console.log(`Initializing database at: ${dbPath}`);

    try {
      fs.ensureDirSync(dataDir);
      db = new Database(dbPath, { /* options */ });
      db.pragma('journal_mode = WAL');
      console.log('Database connection established.');
      
      // Create tables if they don't exist
      createTables(db);

      resolve();
    } catch (error: unknown) {
      console.error('Failed to initialize database:', error);
      reject(error);
    }
  });
}

// Function to get the DB instance
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Optional: Function to close the DB connection
export function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed.');
  }
}

// Helper function to get a single asset by ID
export function getAssetById(id: number): Asset | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
  return stmt.get(id) as Asset | undefined; // Type assertion
}

// Get all versions for a master asset
export function getAssetVersions(masterId: number): Asset[] {
  const db = getDb();
  // Select assets where master_id matches OR the id itself is the masterId (to include the master)
  const stmt = db.prepare(
    'SELECT * FROM assets WHERE master_id = ? OR id = ? ORDER BY version_no DESC'
  );
  return stmt.all(masterId, masterId) as Asset[]; // Type assertion
}

// Create a new version for an asset
// TODO: Implement actual file copying/linking if needed
export function createVersion(masterId: number): { success: boolean; newId?: number; asset?: Asset; error?: string } {
  const db = getDb();
  const masterAsset = getAssetById(masterId);
  if (!masterAsset) {
    return { success: false, error: 'Master asset not found' };
  }

  // Determine the master ID (it could be the asset itself if it's not a version yet)
  const actualMasterId = masterAsset.master_id || masterAsset.id;
  let newAsset: Asset | undefined; // Variable to hold the new asset data

  // Declare newPath here to make it accessible in the catch block
  let newPath: string = '';

  const transaction = db.transaction(() => {
    // Find the highest current version number for this master
    const versionStmt = db.prepare(
      'SELECT MAX(version_no) as max_version FROM assets WHERE master_id = ? OR id = ?'
    );
    const versionResult = versionStmt.get(actualMasterId, actualMasterId) as { max_version: number | null };
    const nextVersionNo = (versionResult?.max_version ?? 0) + 1;

    // Prepare data for the new version (copying most fields from master)
    // Note: This assumes a new file path will be generated or handled elsewhere.
    // For now, we'll create a placeholder path to avoid UNIQUE constraint violation.
    const timestamp = new Date().toISOString();
    // Ensure path uniqueness more robustly
    const parsedPath = path.parse(masterAsset.path);
    // Assign value to newPath here
    newPath = path.join(parsedPath.dir, `${parsedPath.name}_v${nextVersionNo}${parsedPath.ext}`);

    const insertStmt = db.prepare(`
      INSERT INTO assets (path, createdAt, mimeType, size, year, advertiser, niche, shares, master_id, version_no, thumbnailPath)
      VALUES (@path, @createdAt, @mimeType, @size, @year, @advertiser, @niche, @shares, @master_id, @version_no, @thumbnailPath)
    `);

    const newAssetData = {
        path: newPath,
        createdAt: timestamp,
        mimeType: masterAsset.mimeType,
        size: masterAsset.size,
        year: masterAsset.year,
        advertiser: masterAsset.advertiser,
        niche: masterAsset.niche,
        shares: masterAsset.shares,
        master_id: actualMasterId, // Link to the master
        version_no: nextVersionNo,
        thumbnailPath: null // New thumbnail needed
    };

    const info = insertStmt.run(newAssetData);
    const newId = Number(info.lastInsertRowid);

    // Fetch the newly created asset to return it
    newAsset = getAssetById(newId);
    if (!newAsset) {
        throw new Error("Failed to retrieve newly created version asset.");
    }

    return { success: true, newId, asset: newAsset };
  });

  try {
    return transaction();
  } catch (error) {
    console.error('Error creating version:', error);
    const message = error instanceof Error ? error.message : String(error);
    // Check for UNIQUE constraint error specifically, using newPath
     if (message.includes('UNIQUE constraint failed: assets.path') && newPath) {
        return { success: false, error: `Failed to create version: Path '${newPath}' might already exist.` };
     }
    return { success: false, error: message };
  }
}

// Promote a specific version to be the new master
export function promoteVersion(versionId: number): { success: boolean; error?: string } {
  const db = getDb();
  const versionAsset = getAssetById(versionId);

  if (!versionAsset) {
    return { success: false, error: 'Version asset not found' };
  }

  const currentMasterId = versionAsset.master_id;
  if (!currentMasterId) {
    // Check if it's already a master (master_id is NULL and version_no is 1)
    if (versionAsset.master_id === null && versionAsset.version_no === 1) {
       return { success: false, error: 'Asset is already the master.' };
    }
    // Otherwise, it's an unlinked asset, cannot promote.
    return { success: false, error: 'Asset is not part of a version group.' };
  }


  const transaction = db.transaction(() => {
    // 1. Get the current master asset
    const currentMasterAsset = getAssetById(currentMasterId);
    if (!currentMasterAsset) {
      // This shouldn't happen if foreign keys are enforced, but check anyway
      throw new Error('Current master asset data not found for ID: ' + currentMasterId);
    }

    // 2. Update the old master: set its master_id to the NEW master (versionId), assign new version_no
    // Find the highest version number in the group *excluding the one being promoted*
     const maxVersionStmt = db.prepare(
       'SELECT MAX(version_no) as max_v FROM assets WHERE (master_id = ? OR id = ?) AND id != ?'
     );
     const maxVersionResult = maxVersionStmt.get(currentMasterId, currentMasterId, versionId) as { max_v: number | null };
     const oldMasterNewVersionNo = (maxVersionResult?.max_v ?? 0) + 1;

    const updateOldMasterStmt = db.prepare(
      'UPDATE assets SET master_id = ?, version_no = ? WHERE id = ?'
    );
    // Make the old master a version of the *new* master (versionId)
    updateOldMasterStmt.run(versionId, oldMasterNewVersionNo, currentMasterId);


    // 3. Update the promoted version: set master_id to NULL, set version_no to 1
    const updatePromotedStmt = db.prepare(
      'UPDATE assets SET master_id = NULL, version_no = 1 WHERE id = ?'
    );
    updatePromotedStmt.run(versionId);

    // 4. Update all other versions: point their master_id to the new master (the promoted version)
    // Exclude the old master (already updated) and the newly promoted one
    const updateSiblingsStmt = db.prepare(
      'UPDATE assets SET master_id = ? WHERE master_id = ? AND id != ?'
    );
    updateSiblingsStmt.run(versionId, currentMasterId, currentMasterId); // Point siblings to new master (versionId)


    return { success: true };
  });

  try {
    return transaction();
  } catch (error) {
    console.error('Error promoting version:', error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// Remove an asset from its group (make it a master)
export function removeFromGroup(versionId: number): { success: boolean; error?: string } {
  const db = getDb();
  const versionAsset = getAssetById(versionId);

  if (!versionAsset) {
    return { success: false, error: 'Asset not found' };
  }

  if (versionAsset.master_id === null) {
    return { success: false, error: 'Asset is not part of a group' };
  }

  // Reset master_id to NULL and version_no to 1
  const stmt = db.prepare(
    'UPDATE assets SET master_id = NULL, version_no = 1 WHERE id = ?'
  );

  try {
    const info = stmt.run(versionId);
    return { success: info.changes > 0 };
  } catch (error) {
    console.error('Error removing from group:', error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


// Bulk update metadata for multiple assets
// Use Partial<Asset> for fields, but ensure they are valid updateable fields
export function bulkUpdateAssets(ids: number[], fields: Partial<Pick<Asset, 'year' | 'advertiser' | 'niche' | 'shares'>>): { success: boolean; updatedCount: number; error?: string } {
    const db = getDb();
    if (!ids || ids.length === 0) {
        return { success: false, updatedCount: 0, error: 'No asset IDs provided' };
    }
    if (!fields || Object.keys(fields).length === 0) {
        return { success: false, updatedCount: 0, error: 'No fields specified for update' };
    }

    const validFields: (keyof typeof fields)[] = ['year', 'advertiser', 'niche', 'shares'];
    const setClauses: string[] = [];
    const values: (string | number | null)[] = []; // More specific type

    for (const key in fields) {
        // Use Object.prototype.hasOwnProperty.call for safety
        if (Object.prototype.hasOwnProperty.call(fields, key) && validFields.includes(key as keyof typeof fields)) {
             const value = fields[key as keyof typeof fields];
             // Allow setting fields to null explicitly
             if (value !== undefined) {
                setClauses.push(`${key} = ?`);
                values.push(value);
             }
        }
    }


    if (setClauses.length === 0) {
        // This might happen if fields contains only undefined values
        return { success: false, updatedCount: 0, error: 'No valid fields or values provided for update' };
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE assets SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`;

    const stmt = db.prepare(sql);

    const transaction = db.transaction(() => {
      const info = stmt.run(...values, ...ids);
      // Also update FTS table
      // Note: This requires fetching the updated data or ensuring FTS trigger handles NULL correctly
      // For simplicity now, assume the trigger works. A more robust solution might re-index affected rows.
      return { success: true, updatedCount: info.changes };
    });

    try {
      return transaction();
    } catch (error) {
      console.error('Error bulk updating assets:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, updatedCount: 0, error: message };
  }
}

// TODO: Implement schema creation
/*
function createTables() {
    if (!db) return;
    const createAssetsTable = `
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL UNIQUE,
          // ... other columns from schema ...
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.exec(createAssetsTable);
    // Add other tables (tags, versions, etc.)
    console.log('Database tables checked/created.');
}
*/ 