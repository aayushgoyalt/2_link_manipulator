/**
 * Camera OCR Types for Main Process
 * Defines types for camera operations, LLM integration, and OCR processing
 */

// Platform detection types
export type Platform = 'electron-desktop' | 'web-browser';

// Camera operation types
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

// Camera service interface
export interface CameraService {
  requestCameraPermission(): Promise<boolean>;
  captureImage(): Promise<string>;
  processImageWithLLM(imageData: string): Promise<string>;
  validateMathExpression(expression: string): boolean;
  cleanup(): Promise<void>;
}

// LLM integration types
export type LLMProvider = 'gemini' | 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMRequest {
  imageData: string;
  prompt: string;
  config: LLMConfig;
}

export interface LLMResponse {
  success: boolean;
  expression?: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
  tokensUsed?: number;
}

export interface LLMService {
  analyzeImage(imageData: string, prompt?: string): Promise<LLMResponse>;
  validateResponse(response: LLMResponse): boolean;
  extractMathExpression(response: LLMResponse): string;
  getUsageStats(): LLMUsageStats;
}

export interface LLMUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  averageProcessingTime: number;
}

// OCR processing states and pipeline
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
  imageSize: number;
  imageResolution: CameraResolution;
  llmProvider: LLMProvider;
  tokensUsed?: number;
  retryCount: number;
}

// Expression parsing types
export interface ExpressionParser {
  parseExpression(rawExpression: string): ParsedExpression;
  validateSyntax(expression: string): boolean;
  normalizeExpression(expression: string): string;
  convertToCalculatorFormat(expression: string): CalculatorInput;
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

// Configuration management
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

// Error types
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

// IPC Communication types for camera OCR
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

// Service factory types
export interface CameraServiceFactory {
  createService(platform: Platform): CameraService;
  detectPlatform(): Platform;
  isSupported(platform: Platform): boolean;
}

// Cache management types
export interface OCRCache {
  get(imageHash: string): ProcessingResult | null;
  set(imageHash: string, result: ProcessingResult): void;
  clear(): void;
  size(): number;
  cleanup(): void;
}

export interface CacheEntry {
  result: ProcessingResult;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

// Configuration validation types
export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}