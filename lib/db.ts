import path from 'node:path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';

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