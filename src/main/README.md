# Main Process Directory

## Purpose
This directory contains the **Electron main process** code that runs in a Node.js environment.

## What is the Main Process?
The main process is responsible for:
- Creating and managing application windows
- Handling application lifecycle events (startup, quit, etc.)
- Managing system-level operations (file system, OS integration)
- Setting up IPC (Inter-Process Communication) channels
- Controlling native menus and dialogs

## Files

### `index.ts`
**Main entry point for the Electron application**

Key responsibilities:
- Creates the main browser window with configured settings
- Sets up window event handlers (ready-to-show, close, etc.)
- Configures security settings (preload script, context isolation)
- Handles application lifecycle events (ready, activate, window-all-closed)
- Manages IPC communication handlers

Window configuration:
- Size: 1400x900 (min: 1200x700)
- Auto-hide menu bar for cleaner interface
- Preload script for secure renderer communication
- Platform-specific icon handling (Linux)

## Process Architecture

```
Main Process (Node.js)
  ├── Full Node.js API access
  ├── Creates BrowserWindow instances
  ├── Manages app lifecycle
  └── Communicates with renderer via IPC
```

## Security Model
- **Context Isolation**: Enabled (renderer can't access Node.js directly)
- **Preload Script**: Acts as secure bridge between main and renderer
- **Sandbox**: Disabled (required for some Node.js APIs)

## Development Notes
- This code runs in Node.js, not the browser
- Has access to all Node.js modules and Electron APIs
- Cannot directly access DOM or browser APIs
- Communicates with renderer process via IPC

## Common Modifications
- Add new IPC handlers: `ipcMain.on('channel', handler)`
- Create additional windows: Call `new BrowserWindow()`
- Add native menus: Use `Menu.buildFromTemplate()`
- Handle file operations: Use Node.js `fs` module
