import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { app } from 'electron';

let db: Database.Database | null = null;

const createTables = (dbInstance: Database.Database) => {
  // Enable WAL mode for better concurrency
  dbInstance.pragma('journal_mode = WAL');

  // Assets table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      year INTEGER,
      advertiser TEXT,
      niche TEXT,
      shares INTEGER DEFAULT 0,
      master_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
      version_no INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Indexes
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_assets_master ON assets(master_id);`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_assets_master_version ON assets(master_id, version_no);`);

  // Custom Fields table (as per backend.md)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('text', 'number', 'date', 'boolean'))
    );
  `);

  // Asset Custom Values table (as per backend.md)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS asset_custom_values (
      assetId INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      fieldId INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
      value TEXT,
      PRIMARY KEY (assetId, fieldId)
    );
  `);

  // FTS5 table (as per backend.md)
  dbInstance.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts
    USING fts5(advertiser, niche, content='assets', content_rowid='id');
  `);

  // Trigger to keep FTS table updated
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

export const initDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  // Ensure the directory exists
  fs.mkdirSync(userDataPath, { recursive: true });

  const dbPath = path.join(userDataPath, 'db.sqlite');
  console.log(`Initializing database at: ${dbPath}`);

  try {
    db = new Database(dbPath, { verbose: console.log }); // Add verbose logging
    createTables(db);
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Handle specific errors or re-throw if critical
    throw error; // Re-throw for main process to handle
  }

  return db;
};

export const getDb = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}; 