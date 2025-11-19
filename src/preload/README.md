# Preload Scripts Directory

## Purpose
This directory contains **preload scripts** that act as a secure bridge between the main process (Node.js) and renderer process (browser).

## What is a Preload Script?
A preload script:
- Runs before the renderer process loads
- Has access to both Node.js APIs and DOM APIs
- Uses `contextBridge` to safely expose APIs to the renderer
- Maintains security by limiting what the renderer can access
- Prevents direct Node.js access from the renderer (security best practice)

## Files

### `index.ts`
**Main preload script**

Responsibilities:
- Exposes Electron APIs to renderer via `contextBridge`
- Provides safe IPC communication methods
- Maintains security boundaries

Current implementation:
- Exposes `electronAPI` (from @electron-toolkit/preload)
- Exposes custom `api` object (currently empty, extensible)
- Handles both isolated and non-isolated contexts

### `index.d.ts`
**TypeScript type definitions**

Provides type information for APIs exposed to the renderer process.

## Security Architecture

```
Main Process (Node.js)
       ↕ IPC
Preload Script (Bridge)
  - Has Node.js access
  - Has DOM access
  - Uses contextBridge
       ↕ Exposed APIs
Renderer Process (Browser)
  - No Node.js access
  - Only sees exposed APIs
```

## Context Isolation

### With Context Isolation (Recommended)
```typescript
contextBridge.exposeInMainWorld('api', {
  doSomething: () => ipcRenderer.send('channel')
})

// Renderer can use:
window.api.doSomething()
```

### Without Context Isolation (Legacy)
```typescript
window.api = {
  doSomething: () => ipcRenderer.send('channel')
}
```

## Common Use Cases

### Expose IPC Methods
```typescript
const api = {
  sendMessage: (msg: string) => ipcRenderer.send('message', msg),
  onReply: (callback: Function) => ipcRenderer.on('reply', callback)
}

contextBridge.exposeInMainWorld('api', api)
```

### Expose File System Access
```typescript
import { readFile } from 'fs/promises'

const api = {
  readFile: async (path: string) => {
    // Validate path, implement security checks
    return await readFile(path, 'utf-8')
  }
}
```

### Expose System Information
```typescript
import { platform, arch } from 'os'

const api = {
  getPlatform: () => platform(),
  getArch: () => arch()
}
```

## Security Best Practices

1. **Never expose entire modules**: Don't do `contextBridge.exposeInMainWorld('fs', fs)`
2. **Validate inputs**: Check all data from renderer before using
3. **Limit functionality**: Only expose what's necessary
4. **Use allowlists**: Validate file paths, URLs, etc.
5. **Sanitize data**: Clean user input before processing

## Development Notes

- This code runs in a privileged context
- Changes require app restart (no hot reload)
- TypeScript types should match exposed APIs
- Test security boundaries carefully

## Extending the API

To add new functionality:

1. **Define the method** in `index.ts`:
```typescript
const api = {
  newMethod: (param: string) => {
    // Implementation
    return result
  }
}
```

2. **Add types** in `index.d.ts`:
```typescript
interface API {
  newMethod: (param: string) => ReturnType
}

declare global {
  interface Window {
    api: API
  }
}
```

3. **Use in renderer**:
```typescript
const result = await window.api.newMethod('value')
```

## Current Project Usage

This project currently uses minimal preload functionality:
- Exposes standard Electron APIs
- Provides empty `api` object for future extensions
- No custom IPC methods implemented yet

The infrastructure is in place for adding secure communication between main and renderer processes as needed.
