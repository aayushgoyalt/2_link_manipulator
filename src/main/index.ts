/**
 * Main Process Entry Point
 *
 * This is the Electron main process that manages the application lifecycle,
 * creates browser windows, and handles system-level operations.
 *
 * Key Responsibilities:
 * - Create and manage the main application window
 * - Handle application lifecycle events (ready, activate, quit)
 * - Configure window properties and security settings
 * - Set up IPC (Inter-Process Communication) handlers
 */

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

/**
 * Creates the main application window with configured settings
 *
 * Window Configuration:
 * - Initial size: 1400x900 pixels
 * - Minimum size: 1200x700 pixels
 * - Auto-hide menu bar for cleaner interface
 * - Preload script for secure IPC communication
 *
 * @returns {void}
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false, // Don't show until ready to prevent flickering
    autoHideMenuBar: true,
    resizable: true,
    ...(process.platform === 'linux' ? { icon } : {}), // Linux requires explicit icon
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), // Secure bridge between main and renderer
      sandbox: false // Required for some Node.js APIs
    }
  })

  // Show window only when content is ready to prevent white flash
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in default browser instead of new window
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app - use dev server in development, built files in production
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Application Initialization
 *
 * This runs when Electron is ready to create browser windows.
 * Sets up the app ID, window shortcuts, IPC handlers, and creates the main window.
 */
app.whenReady().then(() => {
  // Set app user model ID for Windows notifications
  electronApp.setAppUserModelId('com.electron')

  // Enable keyboard shortcuts optimization for all windows
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Example IPC handler - responds to 'ping' messages from renderer
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // macOS: Re-create window when dock icon is clicked and no windows are open
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/**
 * Quit when all windows are closed
 *
 * Exception: On macOS, apps typically stay active until user quits explicitly (Cmd+Q)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
