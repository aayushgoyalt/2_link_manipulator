import { contextBridge } from 'electron'
import { ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for history API
interface CalculationRecord {
  id: string
  operation: string
  result: string
  timestamp: number
  operationType: string
}

interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Types for camera API
interface CameraCapabilities {
  hasCamera: boolean
  supportedResolutions: Array<{
    width: number
    height: number
    label: string
  }>
  maxImageSize: number
}

interface PlatformInfo {
  platform: string
  capabilities: any
  supportedPlatforms: string[]
  validation: {
    isValid: boolean
    issues: string[]
    warnings: string[]
  }
}

// History API for renderer process
const historyAPI = {
  // Save a calculation to history
  saveCalculation: async (record: Omit<CalculationRecord, 'id' | 'timestamp'>): Promise<IPCResponse<CalculationRecord>> => {
    try {
      return await ipcRenderer.invoke('history:save', record)
    } catch (error) {
      console.error('History API saveCalculation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Load all calculations from history
  loadHistory: async (): Promise<IPCResponse<CalculationRecord[]>> => {
    try {
      return await ipcRenderer.invoke('history:load')
    } catch (error) {
      console.error('History API loadHistory error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Clear all calculation history
  clearHistory: async (): Promise<IPCResponse<void>> => {
    try {
      return await ipcRenderer.invoke('history:clear')
    } catch (error) {
      console.error('History API clearHistory error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Create a backup of current history
  createBackup: async (): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('history:backup')
    } catch (error) {
      console.error('History API createBackup error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get history statistics
  getStats: async (): Promise<IPCResponse<{
    totalCalculations: number
    operationCounts: Record<string, number>
    oldestCalculation?: Date
    newestCalculation?: Date
  }>> => {
    try {
      return await ipcRenderer.invoke('history:stats')
    } catch (error) {
      console.error('History API getStats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Camera API for renderer process
const cameraAPI = {
  // Request camera permission
  requestPermission: async (): Promise<IPCResponse<boolean>> => {
    try {
      return await ipcRenderer.invoke('camera:request-permission')
    } catch (error) {
      console.error('Camera API requestPermission error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Capture image from camera
  captureImage: async (): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('camera:capture-image')
    } catch (error) {
      console.error('Camera API captureImage error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Process image with OCR
  processOCR: async (imageData: string): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('camera:process-ocr', imageData)
    } catch (error) {
      console.error('Camera API processOCR error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Validate mathematical expression
  validateExpression: async (expression: string): Promise<IPCResponse<boolean>> => {
    try {
      return await ipcRenderer.invoke('camera:validate-expression', expression)
    } catch (error) {
      console.error('Camera API validateExpression error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get camera capabilities
  getCapabilities: async (): Promise<IPCResponse<CameraCapabilities>> => {
    try {
      return await ipcRenderer.invoke('camera:get-capabilities')
    } catch (error) {
      console.error('Camera API getCapabilities error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Check if camera is available
  isAvailable: async (): Promise<IPCResponse<boolean>> => {
    try {
      return await ipcRenderer.invoke('camera:is-available')
    } catch (error) {
      console.error('Camera API isAvailable error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Cleanup camera resources
  cleanup: async (): Promise<IPCResponse<void>> => {
    try {
      return await ipcRenderer.invoke('camera:cleanup')
    } catch (error) {
      console.error('Camera API cleanup error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get platform information
  getPlatformInfo: async (): Promise<IPCResponse<PlatformInfo>> => {
    try {
      return await ipcRenderer.invoke('camera:get-platform-info')
    } catch (error) {
      console.error('Camera API getPlatformInfo error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Calculator OCR API for renderer process
const calculatorAPI = {
  // Process OCR expression with expression parser
  processOCRExpression: async (expression: string): Promise<IPCResponse<{
    isValid: boolean
    normalizedExpression: string
    calculationResult?: number
    error?: string
    complexity: string
    operands: number[]
    operators: string[]
  }>> => {
    try {
      return await ipcRenderer.invoke('calculator:process-ocr-expression', expression)
    } catch (error) {
      console.error('Calculator API processOCRExpression error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Validate mathematical expression
  validateExpression: async (expression: string): Promise<IPCResponse<{
    isValid: boolean
    suggestions: string[]
  }>> => {
    try {
      return await ipcRenderer.invoke('calculator:validate-expression', expression)
    } catch (error) {
      console.error('Calculator API validateExpression error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Normalize mathematical expression
  normalizeExpression: async (expression: string): Promise<IPCResponse<{
    normalizedExpression: string
    isValid: boolean
  }>> => {
    try {
      return await ipcRenderer.invoke('calculator:normalize-expression', expression)
    } catch (error) {
      console.error('Calculator API normalizeExpression error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Evaluate mathematical expression
  evaluateExpression: async (expression: string): Promise<IPCResponse<{
    isValid: boolean
    result?: number
    error?: string
  }>> => {
    try {
      return await ipcRenderer.invoke('calculator:evaluate-expression', expression)
    } catch (error) {
      console.error('Calculator API evaluateExpression error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Custom APIs for renderer
const api = {
  history: historyAPI,
  camera: cameraAPI,
  calculator: calculatorAPI
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
        on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    ipcRenderer: {
      send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
      on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
      invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
    }
  }
  // @ts-ignore (define in dts)
  window.api = api
}
