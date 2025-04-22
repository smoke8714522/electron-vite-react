/// <reference types="mime-types" />

import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { release } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs-extra'
import mime from 'mime-types'
// import { update } from './update' // Temporarily disable auto-updater
import { initDatabase, getDb } from '../../lib/db'
import type { Asset, CreateAssetPayload, BulkImportError, BulkImportResult } from '../../src/types/api'
import { thumbnailService } from '../../lib/thumbnailService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
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

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

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

  // Auto update
  // update(win) // Temporarily disable auto-updater
}

// Placeholder for DB service - replace with actual implementation
let inMemoryAssets: Asset[] = []; // In-memory store for the placeholder
const dbService = {
  async createAsset(data: CreateAssetPayload): Promise<Asset> {
    console.log('DB: Creating asset', data);
    const mockId = Date.now() % 10000;
    const newAsset: Asset = {
      id: mockId,
      createdAt: new Date().toISOString(),
      version_no: 1,
      shares: 0,
      master_id: null,
      ...data,
    };
    inMemoryAssets.push(newAsset); // Add to in-memory store
    console.log(`DB: In-memory assets count: ${inMemoryAssets.length}`);
    return newAsset;
  },
  // Placeholder for getting assets
  async getAssets(/* filters?: any */): Promise<Asset[]> {
    console.log('DB: Getting assets from memory');
    // Return a copy to prevent direct modification
    return [...inMemoryAssets]; 
  }
};

app.whenReady().then(async () => {
  // Initialize the database before creating the window
  try {
    await initDatabase();
  } catch (error) {
    console.error('Failed to initialize database on app ready:', error);
    // Optionally: show an error dialog to the user and quit
    // dialog.showErrorBox('Fatal Error', 'Failed to initialize database. Application will exit.');
    app.quit();
    return; // Prevent createWindow from being called
  }
  registerIpcHandlers(); // Register after DB is ready
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
function registerIpcHandlers() {

  ipcMain.handle('bulk-import-assets', async (): Promise<{ success: boolean; data?: BulkImportResult; error?: string }> => {
    let mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
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
      return { success: true, data: { importedCount: 0, errors: [] } };
    }

    let importedCount = 0;
    const errors: BulkImportError[] = [];
    const vaultRoot = path.join(app.getPath('userData'), 'vault');
    await fs.ensureDir(vaultRoot);

    for (const sourceFilePath of result.filePaths) {
      try {
        const stats = await fs.stat(sourceFilePath);
        if (stats.isDirectory()) continue;

        const mimeType = mime.lookup(sourceFilePath) || 'application/octet-stream';
        const fileName = path.basename(sourceFilePath);
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const targetFilePath = path.join(vaultRoot, uniqueFileName);

        await fs.copy(sourceFilePath, targetFilePath, { overwrite: false, errorOnExist: true });

        const relativePath = path.relative(vaultRoot, targetFilePath);

        // Ensure payload matches CreateAssetPayload definition
        const assetData: CreateAssetPayload = {
          path: relativePath,
          mimeType: mimeType,
          size: stats.size,
          // Optional fields are explicitly undefined if not set
          year: undefined,
          advertiser: undefined,
          niche: undefined,
          // master_id and version_no are handled by DB/defaults
        };

        const createdAsset = await dbService.createAsset(assetData);

        await thumbnailService.generateThumbnail(
          targetFilePath,
          createdAsset.mimeType,
          createdAsset.id
        );
        importedCount++;

      } catch (error: any) {
        console.error(`Failed to import ${sourceFilePath}:`, error);
        let reason = 'Unknown error';
        if (error.code === 'EEXIST') {
          reason = 'File already exists in vault (name collision)';
        } else if (error instanceof Error) {
          reason = error.message;
        }
        errors.push({ filePath: sourceFilePath, reason });
      }
    }

    mainWindow?.webContents.send('assets-updated');

    return { success: true, data: { importedCount, errors } };
  });

  // --- Update get-assets handler --- 
  ipcMain.handle('get-assets', async (/* event, args */) => {
      console.log('IPC: get-assets called');
      try {
        // Use the placeholder dbService to get assets
        const assets = await dbService.getAssets(); 
        console.log(`IPC: Returning ${assets.length} assets`);
        return { success: true, data: assets }; // Return actual (in-memory) assets
      } catch (error: any) {
        console.error('Error in get-assets handler:', error);
        return { success: false, error: error.message || 'Failed to get assets' };
      }
  });

  ipcMain.handle('update-asset', async (event, payload) => {
      console.log('IPC: update-asset called with payload:', payload);
      return { success: true, data: { id: payload.id, ...payload.fields } };
  });

   ipcMain.handle('delete-asset', async (event, payload) => {
      console.log('IPC: delete-asset called with payload:', payload);
      return { success: true };
   });
}
