/**
 * Calculator Types
 * Defines the core types used throughout the calculator application
 */

import type { 
  CameraState, 
  OCRProcessingState, 
  CameraOCRConfig,
  ProcessingResult,
  CalculatorInput,
  CameraModalState 
} from './camera-ocr';

export type Operation = '+' | '-' | '*' | '/' | '%';

export interface CalculatorState {
  currentValue: string;
  previousValue: string;
  operation: Operation | null;
  shouldResetDisplay: boolean;
}

export interface CalculatorButton {
  label: string;
  value: string;
  type: 'number' | 'operation' | 'function' | 'equals' | 'clear';
  className?: string;
}

// History-related types

export interface CalculationRecord {
  id: string;                    // Unique identifier (UUID)
  operation: string;             // Full operation string (e.g., "5 + 3")
  result: string;                // Calculation result
  timestamp: number;             // Unix timestamp
  operationType: Operation;      // Operation type for categorization
  isFromOCR?: boolean;           // Whether this calculation came from OCR
  ocrMetadata?: {                // OCR-specific metadata
    confidence: number;
    processingTime: number;
    originalImage?: string;
    recognizedExpression: string;
  };
}

export interface HistoryState {
  records: CalculationRecord[];
  isLoading: boolean;
  error: string | null;
}

// Enhanced Calculator State with history and camera OCR
export interface EnhancedCalculatorState extends CalculatorState {
  history: HistoryState;
  showACOption: boolean;
  
  // Camera OCR state
  camera: CameraState;
  ocrProcessing: OCRProcessingState;
  ocrConfig: CameraOCRConfig;
  cameraModal: CameraModalState;
  
  // OCR integration flags
  isOCRMode: boolean;
  lastOCRResult?: ProcessingResult;
  pendingOCRCalculation?: CalculatorInput;
}

// IPC Communication Types

// Renderer to Main IPC channels
export interface HistoryIPCChannels {
  'history:save': (record: Omit<CalculationRecord, 'id' | 'timestamp'>) => void;
  'history:load': () => void;
  'history:clear': () => void;
}

// Main to Renderer IPC responses
export interface HistoryIPCResponses {
  'history:loaded': (records: CalculationRecord[]) => void;
  'history:saved': (record: CalculationRecord) => void;
  'history:cleared': () => void;
  'history:error': (error: string) => void;
}

// Extended IPC channels including camera OCR
export interface ExtendedIPCChannels extends HistoryIPCChannels {
  // Calculator operations with OCR support
  'calculator:process-ocr': (input: CalculatorInput) => void;
  'calculator:validate-expression': (expression: string) => void;
  
  // Camera OCR operations (re-exported from camera-ocr types)
  'camera:request-permission': () => void;
  'camera:capture-image': () => void;
  'camera:process-ocr': (imageData: string) => void;
  'camera:cancel-processing': () => void;
  'camera:get-config': () => void;
  'camera:update-config': (config: Partial<CameraOCRConfig>) => void;
}

export interface ExtendedIPCResponses extends HistoryIPCResponses {
  // Calculator responses with OCR support
  'calculator:ocr-processed': (result: string, metadata?: any) => void;
  'calculator:expression-validated': (isValid: boolean, error?: string) => void;
  
  // Camera OCR responses (re-exported from camera-ocr types)
  'camera:permission-result': (granted: boolean, error?: any) => void;
  'camera:image-captured': (imageData: string, error?: any) => void;
  'camera:processing-update': (state: OCRProcessingState) => void;
  'camera:processing-complete': (result: ProcessingResult) => void;
  'camera:processing-error': (error: any) => void;
  'camera:config-updated': (config: CameraOCRConfig) => void;
}

// MockDB Interface and Error Types

export interface MockDBInterface {
  initialize(): Promise<void>;
  create(record: Omit<CalculationRecord, 'id' | 'timestamp'>): Promise<CalculationRecord>;
  findAll(): Promise<CalculationRecord[]>;
  deleteAll(): Promise<void>;
  backup(): Promise<string>;
}

export interface DatabaseSchema {
  version: string;
  lastModified: number;
  records: CalculationRecord[];
}

// Error handling types
export interface ValidationError extends Error {
  field: string;
  value: any;
  expectedType: string;
}

export interface StorageError extends Error {
  operation: 'read' | 'write' | 'delete' | 'backup';
  filePath: string;
  originalError: Error;
}

export interface IPCError extends Error {
  channel: string;
  direction: 'renderer-to-main' | 'main-to-renderer';
  originalError: Error;
}

// Component Props and Emits interfaces

export interface HistoryPanelProps {
  records: CalculationRecord[];
  isLoading: boolean;
  error: string | null;
}

export interface HistoryPanelEmits {
  clearHistory: () => void;
}

// Calculator component props and emits with OCR support
export interface CalculatorProps {
  initialState?: Partial<EnhancedCalculatorState>;
  enableOCR?: boolean;
  ocrConfig?: Partial<CameraOCRConfig>;
}

export interface CalculatorEmits {
  stateChange: (state: EnhancedCalculatorState) => void;
  calculation: (record: CalculationRecord) => void;
  ocrResult: (result: ProcessingResult) => void;
  error: (error: string) => void;
}

// Calculator button with OCR support
export interface EnhancedCalculatorButton extends CalculatorButton {
  isOCRTrigger?: boolean;
  ocrAction?: 'open-camera' | 'process-image' | 'confirm-expression';
}
