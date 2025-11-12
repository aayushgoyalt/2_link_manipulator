/**
 * Shared Types
 * Common types that can be used across main and renderer processes
 */

// Basic operation type
export type Operation = '+' | '-' | '*' | '/' | '%';

// Common utility types
export interface BaseError {
  message: string;
  timestamp: number;
  code?: string;
  stack?: string;
}

export interface BaseConfig {
  version: string;
  lastModified: number;
}

export interface BaseState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// Event system types
export interface EventPayload<T = any> {
  type: string;
  data: T;
  timestamp: number;
  source: 'main' | 'renderer';
}

export interface EventHandler<T = any> {
  (payload: EventPayload<T>): void | Promise<void>;
}

// Validation utilities
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationSchema<T = any> {
  rules: ValidationRule<T>[];
  required?: boolean;
}

// Configuration validation
export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Platform detection utilities
export interface PlatformInfo {
  type: 'electron-desktop' | 'web-browser';
  os?: 'windows' | 'macos' | 'linux';
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
  version?: string;
  capabilities: PlatformCapabilities;
}

export interface PlatformCapabilities {
  hasCamera: boolean;
  hasFileSystem: boolean;
  hasNotifications: boolean;
  hasClipboard: boolean;
  supportsWebRTC: boolean;
  supportsElectronAPIs: boolean;
}

// Camera service types (shared across processes)
export type Platform = 'electron-desktop' | 'web-browser';

export interface CameraResolution {
  width: number;
  height: number;
  label: string;
}

export interface CameraCapabilities {
  hasCamera: boolean;
  supportedResolutions: CameraResolution[];
  maxImageSize: number;
}

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  isProcessing: boolean;
  lastCapturedImage?: string;
  error?: CameraError;
  capabilities?: CameraCapabilities;
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

export interface CameraService {
  requestCameraPermission(): Promise<boolean>;
  captureImage(): Promise<string>;
  processImageWithLLM(imageData: string): Promise<string>;
  validateMathExpression(expression: string): boolean;
  cleanup(): Promise<void>;
}

export interface CameraServiceFactory {
  createService(platform?: Platform): CameraService;
  detectPlatform(): Platform;
  isSupported(platform: Platform): boolean;
}

// Fallback options for error recovery
export type FallbackOption = 
  | 'manual-input'
  | 'file-upload'
  | 'screen-capture'
  | 'simplified-ocr'
  | 'offline-parsing'
  | 'alternative-llm'
  | 'basic-calculator';