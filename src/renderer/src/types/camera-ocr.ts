/**
 * Camera OCR Types for Renderer Process
 * Defines types for camera UI components and state management
 */

// Import Ref and ComputedRef from Vue for type definitions
import type { Ref, ComputedRef } from 'vue';

// Core types that need to be duplicated for renderer (to avoid cross-process imports)
export type Platform = 'electron-desktop' | 'web-browser';

export interface CameraPermissionState {
  granted: boolean;
  requested: boolean;
  denied: boolean;
}

export interface CameraCapabilities {
  hasCamera: boolean;
  supportedResolutions: CameraResolution[];
  maxImageSize: number;
}

export interface CameraResolution {
  width: number;
  height: number;
  label: string;
}

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  isProcessing: boolean;
  lastCapturedImage?: string;
  error?: CameraError;
  capabilities?: CameraCapabilities;
}

export type LLMProvider = 'gemini' | 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  success: boolean;
  expression?: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
  tokensUsed?: number;
}

export type OCRProcessingStage = 
  | 'idle'
  | 'capturing'
  | 'preprocessing'
  | 'uploading'
  | 'processing'
  | 'parsing'
  | 'validating'
  | 'complete'
  | 'error';

export interface OCRProcessingState {
  stage: OCRProcessingStage;
  progress: number;
  currentOperation: string;
  result?: ProcessingResult;
  error?: ProcessingError;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessingResult {
  originalImage: string;
  recognizedExpression: string;
  confidence: number;
  calculationResult?: string;
  timestamp: number;
  processingTime: number;
  metadata: ProcessingMetadata;
}

export interface ProcessingMetadata {
  imageSize?: number;
  imageResolution?: CameraResolution;
  llmProvider?: LLMProvider;
  tokensUsed?: number;
  retryCount?: number;
  platform?: Platform;
  processingMethod?: string;
}

export interface ParsedExpression {
  isValid: boolean;
  normalizedExpression: string;
  operands: number[];
  operators: string[];
  error?: string;
  complexity: ExpressionComplexity;
}

export type ExpressionComplexity = 'simple' | 'moderate' | 'complex';

export interface CalculatorInput {
  expression: string;
  isFromOCR: boolean;
  confidence?: number;
  metadata?: ProcessingMetadata;
}

export interface CameraOCRConfig {
  llm: LLMConfig;
  camera: CameraConfig;
  processing: ProcessingConfig;
  ui: UIConfig;
}

export interface CameraConfig {
  preferredResolution: CameraResolution;
  maxImageSize: number;
  imageQuality: number;
  compressionEnabled: boolean;
  autoFocus: boolean;
}

export interface ProcessingConfig {
  processingTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheDuration: number;
  batchProcessing: boolean;
}

export interface UIConfig {
  showProcessingDetails: boolean;
  enableManualCorrection: boolean;
  confirmBeforeCalculation: boolean;
  showConfidenceScore: boolean;
}

export type CameraErrorType = 
  | 'permission-denied'
  | 'hardware-unavailable'
  | 'platform-unsupported'
  | 'capture-failed'
  | 'processing-failed'
  | 'network-error'
  | 'configuration-error';

export interface CameraError {
  type: CameraErrorType;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
  originalError?: Error;
  timestamp: number;
}

export type ProcessingErrorType =
  | 'image-invalid'
  | 'llm-service-error'
  | 'parsing-failed'
  | 'validation-failed'
  | 'timeout'
  | 'rate-limit-exceeded'
  | 'insufficient-confidence'
  | 'processing-failed';

export interface ProcessingError {
  type: ProcessingErrorType;
  message: string;
  stage: OCRProcessingStage;
  recoverable: boolean;
  retryable: boolean;
  suggestedAction?: string;
  originalError?: Error;
  timestamp: number;
}

export interface CameraOCRIPCChannels {
  'camera:request-permission': () => void;
  'camera:capture-image': () => void;
  'camera:process-ocr': (imageData: string) => void;
  'camera:cancel-processing': () => void;
  'camera:get-config': () => void;
  'camera:update-config': (config: Partial<CameraOCRConfig>) => void;
  'camera:get-capabilities': () => void;
}

export interface CameraOCRIPCResponses {
  'camera:permission-result': (granted: boolean, error?: CameraError) => void;
  'camera:image-captured': (imageData: string, error?: CameraError) => void;
  'camera:processing-update': (state: OCRProcessingState) => void;
  'camera:processing-complete': (result: ProcessingResult) => void;
  'camera:processing-error': (error: ProcessingError) => void;
  'camera:config-updated': (config: CameraOCRConfig) => void;
  'camera:capabilities-result': (capabilities: CameraCapabilities) => void;
}

// UI Component types specific to renderer
export interface CameraUIProps {
  isVisible: boolean;
  isProcessing: boolean;
  processingState?: OCRProcessingState;
  config?: UIConfig;
}

export interface CameraUIEmits {
  capture: (imageData: string) => void;
  close: () => void;
  error: (error: CameraError) => void;
  retry: () => void;
  manualEdit: (expression: string) => void;
  confirm: (expression: string) => void;
}

export interface CameraPreviewProps {
  stream?: MediaStream;
  isActive: boolean;
  resolution?: CameraResolution;
  showOverlay?: boolean;
}

export interface CameraPreviewEmits {
  capture: () => void;
  error: (error: CameraError) => void;
}

export interface ProcessingIndicatorProps {
  state: OCRProcessingState;
  showDetails?: boolean;
  allowCancel?: boolean;
}

export interface ProcessingIndicatorEmits {
  cancel: () => void;
}

export interface ExpressionConfirmationProps {
  expression: string;
  confidence?: number;
  allowEdit?: boolean;
  showConfidence?: boolean;
}

export interface ExpressionConfirmationEmits {
  confirm: (expression: string) => void;
  edit: (expression: string) => void;
  cancel: () => void;
}

// Camera modal state management
export interface CameraModalState {
  isOpen: boolean;
  currentStep: CameraModalStep;
  capturedImage?: string;
  recognizedExpression?: string;
  processingState?: OCRProcessingState;
  error?: CameraError | ProcessingError;
  canRetry: boolean;
}

export type CameraModalStep = 
  | 'permission'
  | 'preview'
  | 'capture'
  | 'processing'
  | 'confirmation'
  | 'error';

// Camera button component types
export interface CameraButtonProps {
  disabled?: boolean;
  isProcessing?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'icon';
}

export interface CameraButtonEmits {
  click: () => void;
}

// Error display component types
export interface ErrorDisplayProps {
  error: CameraError | ProcessingError;
  showRetry?: boolean;
  showDetails?: boolean;
}

export interface ErrorDisplayEmits {
  retry: () => void;
  dismiss: () => void;
  showDetails: () => void;
}

// Permission request component types
export interface PermissionRequestProps {
  permissionState: CameraPermissionState;
  platform: Platform;
}

export interface PermissionRequestEmits {
  requestPermission: () => void;
  openSettings: () => void;
  cancel: () => void;
}

// Camera settings component types
export interface CameraSettingsProps {
  config: CameraConfig;
  capabilities: CameraCapabilities;
}

export interface CameraSettingsEmits {
  updateConfig: (config: Partial<CameraConfig>) => void;
  reset: () => void;
}

// Composable types for camera functionality
export interface UseCameraReturn {
  // State
  cameraState: Ref<CameraState>;
  modalState: Ref<CameraModalState>;
  processingState: Ref<OCRProcessingState>;
  
  // Actions
  openCamera: () => Promise<void>;
  closeCamera: () => void;
  captureImage: () => Promise<void>;
  processImage: (imageData: string) => Promise<void>;
  cancelProcessing: () => void;
  retryOperation: () => Promise<void>;
  
  // Computed
  canCapture: ComputedRef<boolean>;
  isProcessing: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  currentError: ComputedRef<CameraError | ProcessingError | null>;
}

export interface UseOCRProcessingReturn {
  // State
  processingState: Ref<OCRProcessingState>;
  result: Ref<ProcessingResult | null>;
  error: Ref<ProcessingError | null>;
  
  // Actions
  startProcessing: (imageData: string) => Promise<void>;
  cancelProcessing: () => void;
  clearResult: () => void;
  
  // Computed
  isProcessing: ComputedRef<boolean>;
  progress: ComputedRef<number>;
  canCancel: ComputedRef<boolean>;
}

// Event types for camera operations
export interface CameraEvents {
  'camera:opened': { timestamp: number };
  'camera:closed': { timestamp: number };
  'camera:permission-requested': { timestamp: number };
  'camera:permission-granted': { timestamp: number };
  'camera:permission-denied': { timestamp: number };
  'camera:image-captured': { 
    timestamp: number;
    imageSize: number;
    resolution: CameraResolution;
  };
  'camera:processing-started': { 
    timestamp: number;
    imageSize: number;
  };
  'camera:processing-completed': { 
    timestamp: number;
    result: ProcessingResult;
  };
  'camera:processing-failed': { 
    timestamp: number;
    error: ProcessingError;
  };
  'camera:expression-confirmed': { 
    timestamp: number;
    expression: string;
    confidence?: number;
  };
}

// Validation types for camera operations
export interface CameraValidation {
  validateImageData: (imageData: string) => ValidationResult;
  validateExpression: (expression: string) => ValidationResult;
  validateConfig: (config: Partial<CameraOCRConfig>) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: CameraValidationError[];
  warnings: CameraValidationWarning[];
}

export interface CameraValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CameraValidationWarning {
  field: string;
  message: string;
  code: string;
}