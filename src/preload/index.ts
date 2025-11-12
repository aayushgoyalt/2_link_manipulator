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

// Permission Manager API types
type OSPlatform = 'windows' | 'macos' | 'linux'
type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unavailable'

interface PlatformInstructions {
  platform: OSPlatform
  title: string
  steps: string[]
  settingsPath?: string
  canAutoOpen: boolean
}

// Permission Manager API for renderer process
const permissionAPI = {
  // Get permission status
  getStatus: async (): Promise<IPCResponse<PermissionStatus>> => {
    try {
      return await ipcRenderer.invoke('permission:get-status')
    } catch (error) {
      console.error('Permission API getStatus error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get current platform
  getPlatform: async (): Promise<IPCResponse<OSPlatform>> => {
    try {
      return await ipcRenderer.invoke('permission:get-platform')
    } catch (error) {
      console.error('Permission API getPlatform error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get platform-specific instructions
  getInstructions: async (platform: OSPlatform): Promise<IPCResponse<PlatformInstructions>> => {
    try {
      return await ipcRenderer.invoke('permission:get-instructions', platform)
    } catch (error) {
      console.error('Permission API getInstructions error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Open system settings
  openSettings: async (platform: OSPlatform): Promise<IPCResponse<boolean>> => {
    try {
      return await ipcRenderer.invoke('permission:open-settings', platform)
    } catch (error) {
      console.error('Permission API openSettings error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Debug Logger API types
interface TestResult {
  component: string
  success: boolean
  duration: number
  details: any
  errors?: string[]
  timestamp: number
}

// Debug Logger API for renderer process
const debugAPI = {
  // Enable debug mode
  enable: async (): Promise<IPCResponse<void>> => {
    try {
      return await ipcRenderer.invoke('debug:enable')
    } catch (error) {
      console.error('Debug API enable error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Disable debug mode
  disable: async (): Promise<IPCResponse<void>> => {
    try {
      return await ipcRenderer.invoke('debug:disable')
    } catch (error) {
      console.error('Debug API disable error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Test camera access
  testCamera: async (): Promise<IPCResponse<TestResult>> => {
    try {
      return await ipcRenderer.invoke('debug:test-camera')
    } catch (error) {
      console.error('Debug API testCamera error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Test OCR processing
  testOCR: async (imageData: string): Promise<IPCResponse<TestResult>> => {
    try {
      return await ipcRenderer.invoke('debug:test-ocr', imageData)
    } catch (error) {
      console.error('Debug API testOCR error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Export debug logs
  exportLogs: async (): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('debug:export-logs')
    } catch (error) {
      console.error('Debug API exportLogs error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Image Upload API for renderer process
const imageAPI = {
  // Open file dialog to select image
  openDialog: async (): Promise<IPCResponse<string | null>> => {
    try {
      return await ipcRenderer.invoke('image:open-dialog')
    } catch (error) {
      console.error('Image API openDialog error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Validate image file
  validate: async (filePath: string): Promise<IPCResponse<{
    isValid: boolean
    errors: string[]
    fileInfo?: {
      size: number
      format: string
      dimensions: { width: number; height: number }
      path: string
    }
  }>> => {
    try {
      return await ipcRenderer.invoke('image:validate', filePath)
    } catch (error) {
      console.error('Image API validate error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Read image as base64
  readBase64: async (filePath: string): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('image:read-base64', filePath)
    } catch (error) {
      console.error('Image API readBase64 error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Get supported image formats
  getSupportedFormats: async (): Promise<IPCResponse<string[]>> => {
    try {
      return await ipcRenderer.invoke('image:get-supported-formats')
    } catch (error) {
      console.error('Image API getSupportedFormats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  }
}

// Test Utilities API for renderer process
const testAPI = {
  // Test camera access
  cameraAccess: async (): Promise<IPCResponse<any>> => {
    try {
      return await ipcRenderer.invoke('test:camera-access')
    } catch (error) {
      console.error('Test API cameraAccess error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Test OCR pipeline
  ocrPipeline: async (testImages?: string[]): Promise<IPCResponse<any>> => {
    try {
      return await ipcRenderer.invoke('test:ocr-pipeline', testImages)
    } catch (error) {
      console.error('Test API ocrPipeline error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Test calculator integration
  calculatorIntegration: async (expression: string): Promise<IPCResponse<any>> => {
    try {
      return await ipcRenderer.invoke('test:calculator-integration', expression)
    } catch (error) {
      console.error('Test API calculatorIntegration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Test error handling
  errorHandling: async (): Promise<IPCResponse<any>> => {
    try {
      return await ipcRenderer.invoke('test:error-handling')
    } catch (error) {
      console.error('Test API errorHandling error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Run all tests
  runAll: async (testImages?: string[]): Promise<IPCResponse<any>> => {
    try {
      return await ipcRenderer.invoke('test:run-all', testImages)
    } catch (error) {
      console.error('Test API runAll error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication failed'
      }
    }
  },

  // Generate test report
  generateReport: async (results: any): Promise<IPCResponse<string>> => {
    try {
      return await ipcRenderer.invoke('test:generate-report', results)
    } catch (error) {
      console.error('Test API generateReport error:', error)
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
  calculator: calculatorAPI,
  image: imageAPI,
  permission: permissionAPI,
  debug: debugAPI,
  test: testAPI
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
  // @ts-ignore (define in dts)
  window.api = api
}
