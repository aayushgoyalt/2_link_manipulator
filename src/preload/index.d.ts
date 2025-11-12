import { ElectronAPI } from '@electron-toolkit/preload'

// History API types
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

interface HistoryAPI {
  saveCalculation: (record: Omit<CalculationRecord, 'id' | 'timestamp'>) => Promise<IPCResponse<CalculationRecord>>
  loadHistory: () => Promise<IPCResponse<CalculationRecord[]>>
  clearHistory: () => Promise<IPCResponse<void>>
  createBackup: () => Promise<IPCResponse<string>>
  getStats: () => Promise<IPCResponse<{
    totalCalculations: number
    operationCounts: Record<string, number>
    oldestCalculation?: Date
    newestCalculation?: Date
  }>>
}

// Camera API types
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

interface CameraAPI {
  requestPermission: () => Promise<IPCResponse<boolean>>
  captureImage: () => Promise<IPCResponse<string>>
  processOCR: (imageData: string) => Promise<IPCResponse<string>>
  validateExpression: (expression: string) => Promise<IPCResponse<boolean>>
  getCapabilities: () => Promise<IPCResponse<CameraCapabilities>>
  isAvailable: () => Promise<IPCResponse<boolean>>
  cleanup: () => Promise<IPCResponse<void>>
  getPlatformInfo: () => Promise<IPCResponse<PlatformInfo>>
}

// Calculator API types
interface CalculatorAPI {
  processOCRExpression: (expression: string) => Promise<IPCResponse<{
    isValid: boolean
    normalizedExpression: string
    calculationResult?: number
    error?: string
    complexity: string
    operands: number[]
    operators: string[]
  }>>
  validateExpression: (expression: string) => Promise<IPCResponse<{
    isValid: boolean
    suggestions: string[]
  }>>
  normalizeExpression: (expression: string) => Promise<IPCResponse<{
    normalizedExpression: string
    isValid: boolean
  }>>
  evaluateExpression: (expression: string) => Promise<IPCResponse<{
    isValid: boolean
    result?: number
    error?: string
  }>>
}

interface ExtendedElectronAPI extends ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void
    on: (channel: string, listener: (...args: any[]) => void) => void
    invoke: (channel: string, ...args: any[]) => Promise<any>
  }
}

declare global {
  interface Window {
    electron: ExtendedElectronAPI
    api: {
      history: HistoryAPI
      camera: CameraAPI
      calculator: CalculatorAPI
    }
  }
}
