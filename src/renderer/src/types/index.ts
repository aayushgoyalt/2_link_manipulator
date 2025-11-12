/**
 * Renderer Process Types Index
 * Centralized exports for all renderer process types
 */

// Calculator types
export * from './calculator';

// Camera OCR types (renderer process specific)
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
} from '../../../shared/types';