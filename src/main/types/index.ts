/**
 * Main Process Types Index
 * Centralized exports for all main process types
 */

// Calculator types
export * from './calculator';

// Camera OCR types (main process specific)
export * from './camera-ocr';

// Shared types (selective import to avoid conflicts)
export type {
  BaseError,
  BaseConfig,
  BaseState,
  EventPayload,
  EventHandler,
  ValidationRule,
  ValidationSchema,
  ConfigValidation,
  PlatformInfo,
  PlatformCapabilities
} from '../../shared/types';