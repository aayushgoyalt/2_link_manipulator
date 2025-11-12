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
  // Live feed support
  isLiveFeedActive?: boolean;
  currentFrameRate?: number;
  targetFrameRate?: number;
  videoStream?: MediaStream;
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
  source?: 'capture' | 'upload';
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
  debug?: DebugConfig;
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
  platformInstructions?: PlatformInstructions;
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
  // Permission manager IPC
  'permission:get-status': () => void;
  'permission:get-instructions': (platform: OSPlatform) => void;
  'permission:open-settings': (platform: OSPlatform) => void;
  // Image upload IPC
  'image:open-dialog': () => void;
  'image:validate': (filePath: string) => void;
  'image:read-base64': (filePath: string) => void;
  // Debug logger IPC
  'debug:enable': () => void;
  'debug:disable': () => void;
  'debug:test-camera': () => void;
  'debug:test-ocr': (imageData: string) => void;
  'debug:export-logs': () => void;
}

export interface CameraOCRIPCResponses {
  'camera:permission-result': (granted: boolean, error?: CameraError) => void;
  'camera:image-captured': (imageData: string, error?: CameraError) => void;
  'camera:processing-update': (state: OCRProcessingState) => void;
  'camera:processing-complete': (result: ProcessingResult) => void;
  'camera:processing-error': (error: ProcessingError) => void;
  'camera:config-updated': (config: CameraOCRConfig) => void;
  'camera:capabilities-result': (capabilities: CameraCapabilities) => void;
  // Permission manager responses
  'permission:status-result': (status: PermissionStatus) => void;
  'permission:instructions-result': (instructions: PlatformInstructions) => void;
  // Image upload responses
  'image:dialog-result': (filePath: string | null) => void;
  'image:validation-result': (result: ImageValidationResult) => void;
  'image:base64-result': (data: string) => void;
  // Debug logger responses
  'debug:test-result': (result: TestResult) => void;
  'debug:logs-exported': (path: string) => void;
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

// Permission Manager types
export type OSPlatform = 'windows' | 'macos' | 'linux';

export interface PermissionManager {
  requestPermission(platform: OSPlatform): Promise<boolean>;
  getPermissionStatus(platform: OSPlatform): Promise<PermissionStatus>;
  getPlatformInstructions(platform: OSPlatform): PlatformInstructions;
  openSystemSettings(platform: OSPlatform): void;
}

export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unavailable';

export interface PlatformInstructions {
  platform: OSPlatform;
  title: string;
  steps: string[];
  settingsPath?: string;
  canAutoOpen: boolean;
}

export interface PermissionResult {
  granted: boolean;
  status: PermissionStatus;
  error?: string;
  platformInstructions?: PlatformInstructions;
}

// Image Upload Handler types
export interface ImageUploadHandler {
  openFileDialog(): Promise<string | null>;
  validateImageFile(filePath: string): Promise<ImageValidationResult>;
  readImageAsBase64(filePath: string): Promise<string>;
  getSupportedFormats(): string[];
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: ImageFileInfo;
}

export interface ImageFileInfo {
  size: number;
  format: string;
  dimensions: { width: number; height: number };
  path: string;
}

export const SUPPORTED_IMAGE_FORMATS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
] as const;

export type SupportedImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];

// Debug Logger types
export interface DebugLogger {
  // Logging methods
  logCameraInit(success: boolean, details: any): void;
  logFrameCapture(imageData: string, metadata: any): void;
  logOCRProcessing(stage: string, data: any): void;
  logExpressionParsing(input: string, output: string, success: boolean): void;
  logError(component: string, error: Error, context: any): void;
  
  // Debug mode control
  enableDebugMode(): void;
  disableDebugMode(): void;
  isDebugMode(): boolean;
  
  // Test utilities
  testCameraAccess(): Promise<TestResult>;
  testImageCapture(): Promise<TestResult>;
  testOCRProcessing(imageData: string): Promise<TestResult>;
  testCalculatorIntegration(expression: string): Promise<TestResult>;
  
  // Data persistence
  saveDebugSession(sessionId: string): Promise<void>;
  loadDebugSession(sessionId: string): Promise<DebugSession>;
  exportDebugLogs(): Promise<string>;
}

export interface TestResult {
  component: string;
  success: boolean;
  duration: number;
  details: any;
  errors?: string[];
  timestamp: number;
}

export interface DebugSession {
  sessionId: string;
  timestamp: number;
  logs: DebugLog[];
  capturedImages: string[];
  ocrResults: ProcessingResult[];
}

export interface DebugLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  operation: string;
  data: any;
  error?: Error;
}

export interface DebugConfig {
  enabled: boolean;
  logLevel: 'info' | 'debug' | 'warn' | 'error';
  saveImages: boolean;
  saveResults: boolean;
  maxLogSize: number;
  debugFolder?: string;
}