import { app, BrowserWindow, shell, ipcMain, dialog, protocol, Menu } from 'electron'
import { release } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs-extra'
import mime from 'mime-types'
// import { update } from './update' // Temporarily disable auto-updater
import {
  initDatabase,
  getDb,
  getAssetById, // Ensure this helper is imported if used
  // Import the required DB functions
  getAssetVersions,
  createVersion,
  promoteVersion,
  removeFromGroup,
  bulkUpdateAssets,
  // Make sure createAsset (or equivalent logic) is available if used internally by bulk import
} from '../../lib/db'
import type {
  Asset,
  CreateAssetPayload,
  BulkImportError,
  BulkImportResult,
  UpdateAssetPayload,
  DeleteAssetPayload,
  AddToGroupPayload,
  ApiResponse,
  // Import specific payload types needed by new handlers
  GetVersionsPayload,
  CreateVersionPayload,
  PromoteVersionPayload,
  RemoveFromGroupPayload,
  BulkUpdatePayload,
} from '../../src/types/api'
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

// Generic error wrapper for handlers
function handleApiError(channel: string, error: unknown): ApiResponse<never> {
    console.error(`Error handling IPC [${channel}]:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: message };
}

export function registerIpcHandlers() {
  console.log('Registering IPC Handlers...');

  // GET ASSETS
  ipcMain.handle('get-assets', async (_event, filters: AssetFilters | undefined) => {
    console.log('IPC: get-assets called with filters:', filters);
    try {
      const db = getDb();
      // TODO: Refactor query building logic for clarity and security
      const sql = 'SELECT * FROM assets WHERE master_id IS NULL'; // Select only master assets by default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = []; 
      // Apply filters, sorting, pagination as needed...
      // Example: if (filters?.year) { sql += ' AND year = ?'; params.push(filters.year); } 
      const stmt = db.prepare(sql);
      const assets = stmt.all(...params) as Asset[];
      // TODO: Add version count aggregation
      return { success: true, data: assets }; // Assuming data structure is just the array
    } catch (error) {
      return handleApiError('get-assets', error);
    }
  });

  // CREATE ASSET (Simplified - Needs robust file handling)
  ipcMain.handle('create-asset', async (_event, payload: CreateAssetPayload) => {
     console.log('IPC: create-asset called with payload:', payload);
     try {
        const db = getDb();
        // Basic insert - Needs validation, file copy, metadata extraction, thumbnail trigger
        const stmt = db.prepare(
            'INSERT INTO assets (path, fileName, mimeType, size, year, advertiser, niche, shares, master_id, version_no) VALUES (@path, @fileName, @mimeType, @size, @year, @advertiser, @niche, 0, NULL, 1)'
        );
        const info = stmt.run(payload);
        const newId = Number(info.lastInsertRowid);
        const newAsset = getAssetById(newId); // Fetch to return full asset
        if (!newAsset) throw new Error('Failed to retrieve created asset');
        // TODO: Trigger thumbnail generation for newId
        return { success: true, data: newAsset };
     } catch (error) {
        return handleApiError('create-asset', error);
     }
  });

  // UPDATE ASSET
  ipcMain.handle('update-asset', async (_event, payload: UpdateAssetPayload) => {
      console.log('IPC: update-asset called with payload:', payload);
      try {
        const db = getDb();
        // TODO: Validate fields, build query safely
        const allowedFields = ['year', 'advertiser', 'niche', 'shares']; // Example
        const setClauses = Object.keys(payload.fields)
            .filter(key => allowedFields.includes(key))
            .map(key => `${key} = ?`);
        const values = Object.entries(payload.fields)
            .filter(([key]) => allowedFields.includes(key))
            .map(([, value]) => value);
        
        if (setClauses.length === 0) return { success: false, error: 'No valid fields to update' };

        const sql = `UPDATE assets SET ${setClauses.join(', ')} WHERE id = ?`;
        const stmt = db.prepare(sql);
        const info = stmt.run(...values, payload.id);
        
        if (info.changes === 0) return { success: false, error: 'Asset not found or no changes made.' };
        
        const updatedAsset = getAssetById(payload.id); // Fetch updated asset
        // TODO: Trigger thumbnail regeneration if needed
        return { success: true, data: updatedAsset };
      } catch (error) {
        return handleApiError('update-asset', error);
      }
  });

  // DELETE ASSET
  ipcMain.handle('delete-asset', async (_event, payload: DeleteAssetPayload) => {
     console.log('IPC: delete-asset called with payload:', payload);
     try {
        const db = getDb();
        // TODO: Add physical file deletion logic here (vault + cache)
        const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
        const info = stmt.run(payload.id);
        if (info.changes === 0) throw new Error('Asset not found');
        return { success: true, data: null };
     } catch (error) {
        return handleApiError('delete-asset', error);
     }
  });

  // BULK IMPORT ASSETS (Restore Core Logic)
  ipcMain.handle('bulk-import-assets', async (_event): Promise<ApiResponse<BulkImportResult>> => {
    console.log('IPC: bulk-import-assets called');
    if (!win) {
        return { success: false, error: 'Main window not available' };
    }

    try {
        const dialogResult = await dialog.showOpenDialog(win, {
            properties: ['openFile', 'multiSelections', 'dontAddToRecent'],
            title: 'Select Assets to Import',
            // Consider adding filters based on supported mime types
            filters: [
                { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm', 'pdf'] },
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
                { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });

        if (dialogResult.canceled || !dialogResult.filePaths.length) {
            console.log('Bulk import canceled by user.');
            return { success: true, data: { importedCount: 0, errors: [] } };
        }

        const filesToImport = dialogResult.filePaths;
        console.log(`Attempting to import ${filesToImport.length} files.`);

        let importedCount = 0;
        const errors: BulkImportError[] = [];
        const vaultRoot = path.join(projectRoot, 'vault');
        await fs.ensureDir(vaultRoot);

        const db = getDb();
        // Prepare statements outside the loop for efficiency
        // Use named parameters for clarity
        const insertStmt = db.prepare(`
            INSERT INTO assets (path, fileName, createdAt, mimeType, size, year, advertiser, niche, shares, master_id, version_no, thumbnailPath)
            VALUES (@path, @fileName, @createdAt, @mimeType, @size, @year, @advertiser, @niche, @shares, @master_id, @version_no, @thumbnailPath)
            ON CONFLICT(path) DO NOTHING -- Simple conflict handling: skip existing paths
        `);
        const updateThumbStmt = db.prepare('UPDATE assets SET thumbnailPath = @thumbnailPath WHERE id = @id');

        // Process files sequentially for simplicity, consider parallel processing for performance later
        for (const sourceFilePath of filesToImport) {
            const fileName = path.basename(sourceFilePath);
            let assetId: number | null = null;
            let targetFilePathInVault = '';

            try {
                const stats = await fs.stat(sourceFilePath);
                if (stats.isDirectory()) {
                    console.log(`Skipping directory: ${sourceFilePath}`);
                    continue; // Skip directories
                }

                const mimeType = mime.lookup(sourceFilePath) || 'application/octet-stream';
                // Create a potentially unique name for the vault to avoid collisions
                // Consider a more robust unique naming strategy if needed (e.g., hash)
                const uniqueFileName = `${Date.now()}-${fileName}`;
                targetFilePathInVault = path.join(vaultRoot, uniqueFileName);

                // Copy the file to the vault
                await fs.copy(sourceFilePath, targetFilePathInVault, { overwrite: false, errorOnExist: true });
                const relativePathInVault = path.relative(vaultRoot, targetFilePathInVault);

                // Prepare asset data for DB insertion
                const assetData = {
                    path: relativePathInVault, // Store relative path
                    fileName: fileName, // Store original filename separately
                    createdAt: new Date().toISOString(),
                    mimeType: mimeType,
                    size: stats.size,
                    year: null, // Defaults, user can edit later
                    advertiser: null,
                    niche: null,
                    shares: 0,
                    master_id: null,
                    version_no: 1,
                    thumbnailPath: null // Default, will be updated after generation
                };

                // Attempt to insert into DB
                const info = insertStmt.run(assetData);

                if (info.changes > 0) {
                    assetId = Number(info.lastInsertRowid);
                    console.log(`Successfully inserted asset ${assetId} (${fileName}) into DB.`);
                    importedCount++;

                    // Generate thumbnail (async, don't wait for all thumbs)
                    thumbnailService.generateThumbnail(targetFilePathInVault, mimeType, assetId)
                        .then(thumbnailResultPath => {
                            if (thumbnailResultPath && assetId) {
                                try {
                                    // Update DB with thumbnail path using a separate non-transactional write
                                    updateThumbStmt.run({ thumbnailPath: thumbnailResultPath, id: assetId });
                                    console.log(`Thumbnail path updated for asset ${assetId}`);
                                }
                                catch (thumbDbError) {
                                     console.error(`Failed to update thumbnail path in DB for asset ${assetId}:`, thumbDbError);
                                     // Non-fatal, log and continue
                                }
                            } 
                        })
                        .catch(thumbError => {
                            console.error(`Failed to generate thumbnail for ${fileName} (Asset ID: ${assetId}):`, thumbError);
                            // Log error but don't add to main import errors unless critical
                        });
                } else {
                    // If info.changes is 0, it means ON CONFLICT kicked in
                    console.log(`Skipped duplicate asset based on path: ${relativePathInVault}`);
                    // Optionally delete the copied file if it wasn't inserted?
                    // await fs.remove(targetFilePathInVault); 
                    errors.push({ filePath: sourceFilePath, reason: `Skipped: Asset with path '${relativePathInVault}' may already exist.` });
                }

            } catch (error: unknown) {
                console.error(`Failed processing ${sourceFilePath}:`, error);
                let reason = 'Unknown processing error';
                 if (error && typeof error === 'object') {
                    if ('code' in error && error.code === 'EEXIST') {
                        reason = 'File already exists in vault (possible name collision during copy)';
                    } else if (error instanceof Error) {
                        reason = error.message;
                    }
                } else {
                    reason = String(error);
                }
                errors.push({ filePath: sourceFilePath, reason });
                // Clean up potentially copied file if error occurred after copy but before DB insert success
                if (targetFilePathInVault && assetId === null) {
                    try { await fs.remove(targetFilePathInVault); } catch (cleanupError) { console.error('Failed to cleanup vault file after error:', cleanupError); }
                }
            }
        }

        console.log(`Bulk import summary: Imported ${importedCount}, Errors: ${errors.length}`);
        // Send signal to renderer to potentially refresh assets
        win?.webContents.send('assets-updated'); 
        return { success: true, data: { importedCount, errors } };

    } catch (error) {
        // Catch errors from dialog or initial setup
        return handleApiError('bulk-import-assets', error);
    }
  });
  
  // ADD TO GROUP (Placeholder - Needs DB function)
  ipcMain.handle('add-to-group', async (_event, payload: AddToGroupPayload) => {
      console.log('IPC: add-to-group called with payload:', payload);
      // TODO: Implement db.addToGroup(payload.sourceId, payload.targetId)
      console.warn('IPC: add-to-group DB function not implemented yet.');
      // Placeholder success
      return { success: true, data: null };
  });

  // GET VERSIONS
  ipcMain.handle('get-versions', async (_event, payload: GetVersionsPayload) => {
    console.log('IPC: get-versions called with payload:', payload);
    if (typeof payload?.masterId !== 'number') {
        return { success: false, error: 'Invalid masterId provided.' };
    }
    try {
      const assets = getAssetVersions(payload.masterId);
      return { success: true, data: assets };
    } catch (error) {
      return handleApiError('get-versions', error);
    }
  });

  // CREATE VERSION
  ipcMain.handle('create-version', async (_event, payload: CreateVersionPayload) => {
    console.log('IPC: create-version called with payload:', payload);
    if (typeof payload?.masterId !== 'number') {
      return { success: false, error: 'Invalid masterId provided.' };
    }
    try {
      // TODO: Add physical file copy/link logic if payload.filePath exists
      const result = createVersion(payload.masterId);
      // result now matches { id: number, version_no: number }
      // TODO: Trigger thumbnail generation for result.id
      return { success: true, data: result }; 
    } catch (error) {
      return handleApiError('create-version', error);
    }
  });

  // PROMOTE VERSION
  ipcMain.handle('promote-version', async (_event, payload: PromoteVersionPayload) => {
    console.log('IPC: promote-version called with payload:', payload);
    if (typeof payload?.versionId !== 'number') {
      return { success: false, error: 'Invalid versionId provided.' };
    }
    try {
      promoteVersion(payload.versionId); // Now returns void or throws
      // TODO: Trigger relevant thumbnail updates if needed
      return { success: true, data: null }; // Indicate success
    } catch (error) {
      return handleApiError('promote-version', error);
    }
  });

  // REMOVE FROM GROUP
  ipcMain.handle('remove-from-group', async (_event, payload: RemoveFromGroupPayload) => {
    console.log('IPC: remove-from-group called with payload:', payload);
    if (typeof payload?.versionId !== 'number') {
      return { success: false, error: 'Invalid versionId provided.' };
    }
    try {
      removeFromGroup(payload.versionId); // Now returns void or throws
      // TODO: Trigger thumbnail update if needed
      return { success: true, data: null }; // Indicate success
    } catch (error) {
      return handleApiError('remove-from-group', error);
    }
  });

  // BULK UPDATE ASSETS
  ipcMain.handle('bulk-update-assets', async (_event, payload: BulkUpdatePayload) => {
    console.log('IPC: bulk-update-assets called with payload:', payload);
    // Basic validation (can be more robust)
    if (!Array.isArray(payload?.ids) || payload.ids.length === 0) {
      return { success: false, error: 'Invalid or empty asset IDs provided.' };
    }
    if (typeof payload?.fields !== 'object' || payload.fields === null || Object.keys(payload.fields).length === 0) {
      return { success: false, error: 'Invalid or empty fields provided for update.' };
    }
    try {
      const result = bulkUpdateAssets(payload.ids, payload.fields);
      // result now matches { updatedCount: number; errors: BulkUpdateError[] }
      // TODO: Trigger thumbnail updates for successfully updated assets?
      return { success: true, data: result };
    } catch (error) {
      // This catches errors thrown *before* or *during* the transaction itself
      return handleApiError('bulk-update-assets', error);
    }
  });

  // GET MASTER ASSETS (If needed, add DB function first)
  // ipcMain.handle('get-master-assets', async (_event, payload) => { ... });

  // SHOW OPEN DIALOG (If needed, add to preload and types)
  // ipcMain.handle('show-open-dialog', async (_event) => { ... });

  console.log('IPC Handlers Registered.');
}
