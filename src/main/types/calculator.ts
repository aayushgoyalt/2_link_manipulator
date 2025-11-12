/**
 * Shared Calculator Types for Main Process
 * Re-exports types from renderer to avoid import path issues
 */

import type { 
  CameraState, 
  OCRProcessingState, 
  CameraOCRConfig,
  ProcessingResult,
  CalculatorInput 
} from './camera-ocr';

export type Operation = '+' | '-' | '*' | '/' | '%';

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

// Enhanced Calculator State with Camera OCR support
export interface EnhancedCalculatorState {
  // Core calculator state
  currentValue: string;
  previousValue: string;
  operation: Operation | null;
  shouldResetDisplay: boolean;
  
  // History state
  history: HistoryState;
  showACOption: boolean;
  
  // Camera OCR state
  camera: CameraState;
  ocrProcessing: OCRProcessingState;
  ocrConfig: CameraOCRConfig;
  
  // OCR integration flags
  isOCRMode: boolean;
  lastOCRResult?: ProcessingResult;
  pendingOCRCalculation?: CalculatorInput;
}

// Calculator service interface with OCR support
export interface CalculatorService {
  // Core calculator operations
  performCalculation(operation: string): Promise<string>;
  addToHistory(record: Omit<CalculationRecord, 'id' | 'timestamp'>): Promise<CalculationRecord>;
  
  // OCR integration methods
  processOCRInput(input: CalculatorInput): Promise<string>;
  validateOCRExpression(expression: string): boolean;
  convertOCRToCalculation(expression: string, metadata?: any): Promise<CalculationRecord>;
}