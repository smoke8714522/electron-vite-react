import { ipcRenderer, contextBridge } from 'electron'
import type {
  IElectronAPI} from '../../src/types/api'

// --------- Expose some API to the Renderer process ---------
// contextBridge.exposeInMainWorld('ipcRenderer', { 
//   // ... existing ipcRenderer exposure (optional, can be removed if 'api' is preferred)
// })

// Define the API structure
const api: IElectronAPI = {
  // Assets
  getAssets: (payload) => ipcRenderer.invoke('get-assets', payload),
  createAsset: (payload) => ipcRenderer.invoke('create-asset', payload),
  updateAsset: (payload) => ipcRenderer.invoke('update-asset', payload),
  deleteAsset: (payload) => ipcRenderer.invoke('delete-asset', payload),

  // Bulk Operations
  bulkImportAssets: () => ipcRenderer.invoke('bulk-import-assets'),
  bulkUpdateAssets: (payload) => ipcRenderer.invoke('bulk-update-assets', payload),
  // bulkDeleteAssets is optional in IElectronAPI, only add if implemented

  // Versioning & Grouping
  getVersions: (payload) => ipcRenderer.invoke('get-versions', payload),
  createVersion: (payload) => ipcRenderer.invoke('create-version', payload),
  promoteVersion: (payload) => ipcRenderer.invoke('promote-version', payload),
  removeFromGroup: (payload) => ipcRenderer.invoke('remove-from-group', payload),
  addToGroup: (payload) => ipcRenderer.invoke('add-to-group', payload),
  getMasterAssets: (payload) => ipcRenderer.invoke('get-master-assets', payload),

  // System / File Dialogs
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

  // Add listener for menu-driven view changes
  onViewChange: (callback: (viewName: string) => void) => {
    // Define the handler function
    const handler = (_event: Electron.IpcRendererEvent, viewName: string) => {
      console.log('Preload: Received change-view:', viewName); // Log received view
      callback(viewName);
    };
    // Add the listener
    ipcRenderer.on('change-view', handler);
    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener('change-view', handler);
    };
  },

  // Other existing methods (ensure they match IElectronAPI)
  getThumbnailUrl: (assetId) => `/thumbnails/${assetId}.jpg`, // Example implementation if it stays
}

// Expose the API to the renderer process
try {
  contextBridge.exposeInMainWorld('api', api);
  console.log('Preload: API exposed successfully');
} catch (error) {
  console.error('Preload Error exposing API:', error);
}

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
async function useLoading(text = 'Loading') {
  await domReady()

  const styleContent = `
    .app-loading-wrap {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e1e1e; /* Dark background */
      z-index: 9999;
      color: #fff; /* White text */
      font-family: sans-serif;
      font-size: 1.2em;
    }
    .app-loading-text {
      margin-left: 0.8em;
    }
    /* Simple spinner */
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-left-color: #fff;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="spinner"></div><span class="app-loading-text">${text}...</span>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

// Wrap async operations in an IIFE to avoid top-level await
(async () => {
  try {
    const { appendLoading, removeLoading } = await useLoading('Loading AdVault2');
    appendLoading(); // Show loading indicator initially

    window.onmessage = (ev) => {
      if (ev.data.payload === 'removeLoading') {
        removeLoading();
      }
    };

    // Optional: Auto-remove after 5s
    setTimeout(removeLoading, 4999);
  } catch (error) {
      console.error("Error during preload loading indicator setup:", error);
      // Handle error appropriately, maybe show an error message in the DOM
  }
})();