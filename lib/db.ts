import path from 'node:path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import type { Asset } from '../src/types/api'; // Import Asset type

// Define BulkUpdateError type locally if not defined globally
interface BulkUpdateError {
  id: number;
  error: string;
}

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
  // Ensure the return type matches exactly Asset[]
  const results = stmt.all(masterId, masterId);
  return results as Asset[];
}

// Create a new version for an asset
// TODO: Implement actual file copying/linking if needed
export function createVersion(masterId: number): { id: number; version_no: number } {
  const db = getDb();
  const masterAsset = getAssetById(masterId);
  if (!masterAsset) {
    throw new Error('Master asset not found');
  }

  const actualMasterId = masterAsset.master_id || masterAsset.id;
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

    if (!newId) { // Check if insert succeeded
        throw new Error("Failed to insert new version record into database.");
    }

    // Return only id and version_no as requested
    return { id: newId, version_no: nextVersionNo };
  });

  try {
    // Execute transaction and return result
    return transaction();
  } catch (error) {
    console.error('Error creating version:', error);
    const message = error instanceof Error ? error.message : String(error);
    // Check for UNIQUE constraint error specifically, using newPath
     if (message.includes('UNIQUE constraint failed: assets.path') && newPath) {
        // Re-throw specific error
        throw new Error(`Failed to create version: Path '${newPath}' might already exist.`);
     }
    // Re-throw general error
    throw error;
  }
}

// Promote a specific version to be the new master
export function promoteVersion(versionId: number): void {
  const db = getDb();
  const versionAsset = getAssetById(versionId);

  if (!versionAsset) {
    throw new Error('Version asset not found');
  }

  const currentMasterId = versionAsset.master_id;
  if (!currentMasterId) {
    // Check if it's already a master (master_id is NULL and version_no is 1)
    if (versionAsset.master_id === null && versionAsset.version_no === 1) {
       throw new Error('Asset is already the master.');
    }
    // Otherwise, it's an unlinked asset, cannot promote.
    throw new Error('Asset is not part of a version group.');
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
  });

  try {
    transaction(); // Execute transaction
    // No return value for void function
  } catch (error) {
    console.error('Error promoting version:', error);
    // Re-throw error to be caught by IPC handler
    throw error;
  }
}

// Remove an asset from its group (make it a master)
export function removeFromGroup(versionId: number): void {
  const db = getDb();
  const versionAsset = getAssetById(versionId);

  if (!versionAsset) {
    throw new Error('Asset not found');
  }

  if (versionAsset.master_id === null) {
    throw new Error('Asset is not part of a group');
  }

  // Reset master_id to NULL and version_no to 1
  const stmt = db.prepare(
    'UPDATE assets SET master_id = NULL, version_no = 1 WHERE id = ?'
  );

  try {
    const info = stmt.run(versionId);
    if (info.changes === 0) {
        // This could happen if the ID doesn't exist, though getAssetById checks first
        throw new Error('Failed to update asset record, asset might not exist or already removed.');
    }
    // No return value for void function
  } catch (error) {
    console.error('Error removing from group:', error);
    // Re-throw error
    throw error;
  }
}

// Bulk update metadata for multiple assets
// Use Partial<Asset> for fields, but ensure they are valid updateable fields
export function bulkUpdateAssets(
    ids: number[],
    fields: Partial<Pick<Asset, 'year' | 'advertiser' | 'niche' | 'shares'>>
): { updatedCount: number; errors: BulkUpdateError[] } {
    const db = getDb();
    const errors: BulkUpdateError[] = [];
    let updatedCount = 0;

    if (!ids || ids.length === 0) {
        throw new Error('No asset IDs provided'); // Throw error for invalid input
    }
    if (!fields || Object.keys(fields).length === 0) {
        throw new Error('No fields specified for update'); // Throw error
    }

    const validFields: (keyof typeof fields)[] = ['year', 'advertiser', 'niche', 'shares'];
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    for (const key in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, key) && validFields.includes(key as keyof typeof fields)) {
             const value = fields[key as keyof typeof fields];
             if (value !== undefined) {
                setClauses.push(`${key} = ?`);
                values.push(value);
             }
        }
    }

    if (setClauses.length === 0) {
        throw new Error('No valid fields or values provided for update'); // Throw error
    }

    // Process updates individually within a transaction to collect errors per ID
    const transaction = db.transaction((assetIds: number[]) => {
      const sqlBase = `UPDATE assets SET ${setClauses.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(sqlBase);
      let successfulUpdates = 0;

      for (const id of assetIds) {
          try {
              const info = stmt.run(...values, id);
              if (info.changes > 0) {
                  successfulUpdates++;
              } else {
                  // Asset ID might not exist
                  errors.push({ id, error: 'Asset ID not found or no change required.' });
              }
              // TODO: Handle FTS update trigger implicitly, or update manually if needed.
          } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              errors.push({ id, error: message });
              console.error(`Error updating asset ID ${id}:`, err);
          }
      }
      return successfulUpdates;
    });

    try {
        updatedCount = transaction(ids);
        // Return collected errors and count
        return { updatedCount, errors };
    } catch (error) { // Catch potential transaction-level errors (less likely here)
        console.error('Error during bulk update transaction:', error);
        // If the whole transaction fails, we might not have individual errors.
        // Re-throw the main error. Individual errors are already collected.
        throw error;
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