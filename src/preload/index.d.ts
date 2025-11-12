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

// Image Upload API types
interface ImageValidationResult {
  isValid: boolean
  errors: string[]
  fileInfo?: {
    size: number
    format: string
    dimensions: { width: number; height: number }
    path: string
  }
}

interface ImageAPI {
  openDialog: () => Promise<IPCResponse<string | null>>
  validate: (filePath: string) => Promise<IPCResponse<ImageValidationResult>>
  readBase64: (filePath: string) => Promise<IPCResponse<string>>
  getSupportedFormats: () => Promise<IPCResponse<string[]>>
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

interface PermissionAPI {
  getStatus: () => Promise<IPCResponse<PermissionStatus>>
  getPlatform: () => Promise<IPCResponse<OSPlatform>>
  getInstructions: (platform: OSPlatform) => Promise<IPCResponse<PlatformInstructions>>
  openSettings: (platform: OSPlatform) => Promise<IPCResponse<boolean>>
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

interface CameraAccessTestResult extends TestResult {
  permissionStatus?: string
  deviceCount?: number
  deviceDetails?: Array<{
    deviceId: string
    label: string
    capabilities?: MediaTrackCapabilities
  }>
}

interface OCRPipelineTestResult extends TestResult {
  recognizedExpression?: string
  confidence?: number
  processingStages?: Array<{
    stage: string
    duration: number
    success: boolean
  }>
}

interface CalculatorIntegrationTestResult extends TestResult {
  expressionInserted?: boolean
  calculatorFocused?: boolean
  userCanSolve?: boolean
}

interface ErrorHandlingTestResult extends TestResult {
  errorType?: string
  errorHandled?: boolean
  recoveryAttempted?: boolean
  userFeedbackProvided?: boolean
}

interface AllTestResults {
  cameraAccess: CameraAccessTestResult
  ocrPipeline: OCRPipelineTestResult
  calculatorIntegration: CalculatorIntegrationTestResult
  errorHandling: ErrorHandlingTestResult
  overallSuccess: boolean
}

interface DebugAPI {
  enable: () => Promise<IPCResponse<void>>
  disable: () => Promise<IPCResponse<void>>
  testCamera: () => Promise<IPCResponse<TestResult>>
  testOCR: (imageData: string) => Promise<IPCResponse<TestResult>>
  exportLogs: () => Promise<IPCResponse<string>>
}

// Test Utilities API types
interface TestAPI {
  cameraAccess: () => Promise<IPCResponse<CameraAccessTestResult>>
  ocrPipeline: (testImages?: string[]) => Promise<IPCResponse<OCRPipelineTestResult>>
  calculatorIntegration: (expression: string) => Promise<IPCResponse<CalculatorIntegrationTestResult>>
  errorHandling: () => Promise<IPCResponse<ErrorHandlingTestResult>>
  runAll: (testImages?: string[]) => Promise<IPCResponse<AllTestResults>>
  generateReport: (results: AllTestResults) => Promise<IPCResponse<string>>
}

declare global {
  interface Window {
    electron: ExtendedElectronAPI
    api: {
      history: HistoryAPI
      camera: CameraAPI
      calculator: CalculatorAPI
      image: ImageAPI
      permission: PermissionAPI
      debug: DebugAPI
      test: TestAPI
    }
  }
}
