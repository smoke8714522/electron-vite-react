import { app, BrowserWindow, shell, ipcMain, dialog, protocol, Menu } from 'electron'
import { release } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs-extra'
import mime from 'mime-types'
// import { update } from './update' // Temporarily disable auto-updater
import { initDatabase, getDb } from '../../lib/db'
import type { Asset, CreateAssetPayload, BulkImportError, BulkImportResult, UpdateAssetPayload, DeleteAssetPayload, AddToGroupPayload, ApiResponse } from '../../src/types/api'
// Import the service instance, but don't assume it's ready yet
import { thumbnailService } from '../../lib/thumbnailService' 

// Calculate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set APP_ROOT correctly using the calculated __dirname
const projectRoot = path.join(__dirname, '../..')
process.env.APP_ROOT = projectRoot // Still useful for other potential consumers

// Initialize Thumbnail Service immediately after calculating projectRoot
try {
  thumbnailService.initialize(projectRoot);
} catch (error) {
    console.error("Failed to initialize ThumbnailService:", error);
    // Decide how to handle this - maybe exit the app?
    dialog.showErrorBox('Fatal Initialization Error', 'Failed to initialize thumbnail service. Application will exit.');
    app.quit();
    process.exit(1); // Ensure exit
}

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
export const MAIN_DIST = path.join(projectRoot, 'dist-electron')
export const RENDERER_DIST = path.join(projectRoot, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(projectRoot, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

// Function to create the main application menu
const createMenu = (targetWindow: BrowserWindow) => {
  const menuTemplate: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Library',
          click: () => {
            targetWindow.webContents.send('change-view', 'library');
          }
        },
        {
          label: 'Settings',
          click: () => {
            targetWindow.webContents.send('change-view', 'settings');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ]
    },
    // Add other menus (Edit, Window, Help) as needed
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};

async function createWindow() {
  win = new BrowserWindow({
    title: 'AdVault',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    show: false,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // Set up the menu *after* the window is created
  createMenu(win);

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Maximize and show when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win?.maximize();
    win?.show();
  });

  // Auto update
  // update(win) // Temporarily disable auto-updater
}

// --- Register Custom Protocol --- 
function registerCustomProtocols() {
  protocol.registerFileProtocol('app-thumb', (request, callback) => {
    // Extract the asset ID (or filename) from the URL
    // URL is like app-thumb://123.jpg
    const requestedPath = request.url.substring('app-thumb://'.length);
    // Construct the full, absolute path to the thumbnail file
    const thumbDir = path.join(projectRoot, 'cache', 'thumbnails');
    const filePath = path.join(thumbDir, requestedPath);
    
    // console.log(`app-thumb protocol: Requesting ${request.url}, resolving to ${filePath}`);
    callback(filePath);
  });
}

app.whenReady().then(async () => {
  // Register protocol *before* creating window or loading content
  registerCustomProtocols();

  // Initialize the database before creating the window
  try {
    // initDatabase initializes the connection accessible via getDb()
    await initDatabase(); 
  } catch (error: unknown) {
    console.error('Failed to initialize database on app ready:', error);
    dialog.showErrorBox('Fatal Error', 'Failed to initialize database. Application will exit.');
    app.quit();
    return; 
  }
  registerIpcHandlers(); 
  createWindow();
});

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// ======================================================
// Register IPC Handlers
// ======================================================
// Define a basic type for filters used in get-assets
interface AssetFilters {
    year?: number;
    advertiser?: string;
    niche?: string;
    sharesRange?: [number, number];
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

interface FilterParams {
    year?: number;
    advertiser?: string;
    niche?: string;
    // Add other potential parameter types here if needed for filtering
}

export function registerIpcHandlers() {
  console.log('Registering IPC Handlers with Real DB...');

  // GET ASSETS
  ipcMain.handle('get-assets', async (_event, filters: AssetFilters | undefined) => {
    console.log('IPC: get-assets called with filters:', filters);
    try {
      const db = getDb();
      let sql = 'SELECT * FROM assets WHERE master_id IS NULL';
      // Use a more specific type for params
      const params: FilterParams = {}; 
      
      // Build WHERE clause and params object (example)
      const whereClauses: string[] = ['master_id IS NULL']; // Start with base filter
      if (filters?.year) {
          whereClauses.push('year = @year');
          params.year = filters.year;
      }
      if (filters?.advertiser) {
          // Use LIKE for partial matching (case-insensitive depends on DB collation)
          whereClauses.push('advertiser LIKE @advertiser'); 
          params.advertiser = `%${filters.advertiser}%`; // Add wildcards for LIKE
      }
       if (filters?.niche) {
          whereClauses.push('niche LIKE @niche'); 
          params.niche = `%${filters.niche}%`;
      }
      // TODO: Add filtering for sharesRange, searchTerm (needs FTS query)

      if (whereClauses.length > 0) {
          sql = `SELECT * FROM assets WHERE ${whereClauses.join(' AND ')}`;
      }

      // Add ORDER BY clause
      sql += ` ORDER BY ${filters?.sortBy || 'createdAt'} ${filters?.sortOrder || 'DESC'}`;
      
      console.log('Executing SQL:', sql, params); // Log the generated SQL
      const stmt = db.prepare(sql);
      const assets = stmt.all(params) as Asset[]; // Pass typed params
      
      console.log(`IPC: Returning ${assets.length} assets from DB`);
      return { success: true, data: assets };
    } catch (error: unknown) { 
      console.error('Error in get-assets handler:', error);
      const message = error instanceof Error ? error.message : 'Failed to get assets';
      return { success: false, error: message };
    }
  });

  // CREATE ASSET
  ipcMain.handle('create-asset', async (_event, payload: CreateAssetPayload) => {
    console.log('IPC: create-asset', payload);
    try {
      const db = getDb();
      // Remove shares and thumbnailPath from INSERT - they have defaults or are set later
      const stmt = db.prepare(`
        INSERT INTO assets (path, mimeType, size, year, advertiser, niche) 
        VALUES (@path, @mimeType, @size, @year, @advertiser, @niche)
      `);
      const result = stmt.run({
        ...payload,
        year: payload.year ?? null,
        advertiser: payload.advertiser ?? null,
        niche: payload.niche ?? null,
        // Remove shares and thumbnailPath from bound parameters
      });
      
      // Get the newly created asset (including id and defaults like createdAt)
      const newAssetStmt = db.prepare('SELECT * FROM assets WHERE id = ?');
      const newAsset = newAssetStmt.get(result.lastInsertRowid) as Asset;
      
      console.log('Asset created in DB:', newAsset);
      return { success: true, data: newAsset };
    } catch (error: unknown) {
      console.error('Error creating asset:', error);
      const message = error instanceof Error ? error.message : 'Failed to create asset';
      return { success: false, error: message };
    }
  });

  // UPDATE ASSET
  ipcMain.handle('update-asset', async (_event, payload: UpdateAssetPayload) => {
    console.log('IPC: update-asset', payload);
    try {
        const db = getDb();
        const { id, fields } = payload;
        
        // Construct SET clause dynamically based on provided fields
        const setClauses = Object.keys(fields).map(key => `${key} = @${key}`);
        if (setClauses.length === 0) {
            return { success: false, error: 'No fields provided for update.' };
        }
        
        const sql = `UPDATE assets SET ${setClauses.join(', ')} WHERE id = @id`;
        const stmt = db.prepare(sql);
        const result = stmt.run({ ...fields, id });

        if (result.changes === 0) {
             return { success: false, error: `Asset with ID ${id} not found for update.` };
        }

        // Return the updated asset data
        const updatedAssetStmt = db.prepare('SELECT * FROM assets WHERE id = ?');
        const updatedAsset = updatedAssetStmt.get(id) as Asset;

        console.log(`Asset ${id} updated in DB.`);
        return { success: true, data: updatedAsset };
    } catch (error: unknown) {
        console.error(`Error updating asset ${payload.id}:`, error);
        const message = error instanceof Error ? error.message : 'Failed to update asset';
        return { success: false, error: message };
    }
  });

  // DELETE ASSET
  ipcMain.handle('delete-asset', async (_event, payload: DeleteAssetPayload) => {
    console.log('IPC: delete-asset', payload);
     try {
        const db = getDb();
        const { id } = payload;
        // TODO: Consider deleting the actual file from vault as well?
        const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return { success: false, error: `Asset with ID ${id} not found for deletion.` };
        }

        console.log(`Asset ${id} deleted from DB.`);
        // TODO: Also delete associated thumbnails?
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error deleting asset ${payload.id}:`, error);
        const message = error instanceof Error ? error.message : 'Failed to delete asset';
        return { success: false, error: message };
    }
  });

  // BULK IMPORT ASSETS
  ipcMain.handle('bulk-import-assets', async (_event): Promise<ApiResponse<BulkImportResult>> => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      // Ensure return matches the annotated type
      return { success: false, error: 'Main window not found' }; 
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections', 'dontAddToRecent'],
      title: 'Select Assets to Import',
      filters: [
        { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm', 'pdf'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths.length) {
      // Ensure return matches the annotated type
      return { success: true, data: { importedCount: 0, errors: [] } }; 
    }

    let importedCount = 0;
    const errors: BulkImportError[] = [];
    const vaultRoot = path.join(projectRoot, 'vault'); 
    await fs.ensureDir(vaultRoot);

    // Use a transaction for bulk insert/update efficiency
    const db = getDb();
    // Adjusted INSERT statement (remove shares, thumbnailPath)
    const insertStmt = db.prepare(`
        INSERT INTO assets (path, mimeType, size, year, advertiser, niche) 
        VALUES (@path, @mimeType, @size, @year, @advertiser, @niche)
        RETURNING id, createdAt, mimeType, version_no; -- Return needed fields
    `);
    const updateThumbStmt = db.prepare('UPDATE assets SET thumbnailPath = ? WHERE id = ?');

    // Make the transaction function async
    const runImport = db.transaction(async (files: string[]) => { 
        let localImportCount = 0;
        const localErrors: BulkImportError[] = [];
        for (const sourceFilePath of files) {
            let assetId: number | null = null;
            try {
                // Use await inside the async transaction function
                const stats = await fs.stat(sourceFilePath);
                if (stats.isDirectory()) continue;
                const mimeType = mime.lookup(sourceFilePath) || 'application/octet-stream';
                const fileName = path.basename(sourceFilePath);
                const uniqueFileName = `${Date.now()}-${fileName}`;
                const targetFilePath = path.join(vaultRoot, uniqueFileName);
                await fs.copy(sourceFilePath, targetFilePath, { overwrite: false, errorOnExist: true });
                const relativePath = path.relative(vaultRoot, targetFilePath);

                const assetData = {
                    path: relativePath,
                    mimeType: mimeType,
                    size: stats.size,
                    year: null, advertiser: null, niche: null, // Defaults
                };
                
                const insertResult = insertStmt.get(assetData) as { id: number, createdAt: string, mimeType: string, version_no: number };
                if (!insertResult || !insertResult.id) {
                    throw new Error('Failed to insert asset or retrieve ID');
                }
                assetId = insertResult.id;

                const thumbnailResultPath = await thumbnailService.generateThumbnail(
                    targetFilePath,
                    insertResult.mimeType,
                    assetId
                );

                if (thumbnailResultPath) {
                    updateThumbStmt.run(thumbnailResultPath, assetId);
                    console.log(`Asset ${assetId} thumbnail path updated in DB.`);
                }
                localImportCount++;
            } catch (error: unknown) {
                console.error(`Failed to import ${sourceFilePath}:`, error);
                let reason = 'Unknown error';
                if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
                    reason = 'File already exists in vault (name collision)';
                } else if (error instanceof Error) {
                    reason = error.message;
                } else {
                    reason = String(error);
                }
                localErrors.push({ filePath: sourceFilePath, reason });
            }
        }
        return { importedCount: localImportCount, errors: localErrors };
    });

    // Execute the transaction - await the async function
    const transactionResult = await runImport(result.filePaths);
    importedCount = transactionResult.importedCount;
    errors.push(...transactionResult.errors);

    mainWindow?.webContents.send('assets-updated');
    return { success: true, data: { importedCount, errors } }; 
  });

  // GET VERSIONS (Placeholder)
  ipcMain.handle('get-versions', async (_event, _payload: { masterId: number }) => { 
    // Use _payload.masterId here when implemented
    console.log('IPC: get-versions received:', _payload); 
    try {
      console.warn('get-versions handler not fully implemented yet.')
      // TODO: Implement dbService.getAssetVersions(_payload.masterId);
      return { success: true, data: [] }; // Placeholder
    } catch (error: unknown) { // Type the error
      console.error('Error fetching versions:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch versions';
      return { success: false, error: message };
    }
  });

  // ADD TO GROUP
  ipcMain.handle('add-to-group', async (_event, payload: AddToGroupPayload) => {
    console.log('IPC: add-to-group', payload);
    const { sourceId, targetId } = payload;
    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) {
        return { success: false, error: 'Invalid asset IDs provided.' };
    }
    try {
        const db = getDb();
        // TODO: Add checks - e.g., ensure targetId is a master asset (master_id IS NULL)?
        // Ensure sourceId is not already the targetId or already a version of targetId?
        const stmt = db.prepare('UPDATE assets SET master_id = ? WHERE id = ?');
        const result = stmt.run(targetId, sourceId);
        if (result.changes === 0) {
            return { success: false, error: `Asset with ID ${sourceId} not found for grouping.` };
        }
        console.log(`Asset ${sourceId} grouped under ${targetId}`);
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error adding asset ${sourceId} to group ${targetId}:`, error);
        const message = error instanceof Error ? error.message : 'Failed to group asset';
        return { success: false, error: message };
    }
  });

  console.log('IPC Handlers Registered.');
}
