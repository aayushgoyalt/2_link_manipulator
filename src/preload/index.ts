/**
 * Preload Script
 *
 * This script runs in a privileged context before the renderer process loads.
 * It acts as a secure bridge between the main process (Node.js) and renderer process (browser).
 *
 * Security Model:
 * - Runs in an isolated context with access to both Node.js and DOM APIs
 * - Uses contextBridge to safely expose specific APIs to the renderer
 * - Prevents direct access to Node.js APIs from renderer for security
 *
 * Purpose:
 * - Expose safe, controlled APIs to the renderer process
 * - Maintain security by limiting what renderer can access
 * - Enable IPC communication between main and renderer processes
 */

import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * Custom API object for exposing additional functionality to renderer
 * Currently empty but can be extended with custom IPC methods
 */
const api = {}

/**
 * Context Isolation Check
 *
 * If context isolation is enabled (recommended for security):
 * - Use contextBridge to safely expose APIs
 *
 * If disabled (legacy mode):
 * - Directly attach APIs to window object
 */
if (process.contextIsolated) {
  try {
    // Expose Electron utilities (ipcRenderer, etc.) to renderer
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // Expose custom API methods to renderer
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback for non-isolated context (not recommended for production)
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
