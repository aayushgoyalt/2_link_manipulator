/**
 * Unified Camera Service Interface
 * Provides consistent API across platforms and processes
 */

import type { Platform, CameraService, CameraState, CameraCapabilities, CameraError } from '../types';

/**
 * Extended Camera Service Interface with additional utility methods
 * This interface provides a consistent API across all platforms and processes
 */
export interface UnifiedCameraService extends CameraService {
  // Core camera operations (inherited from CameraService)
  requestCameraPermission(): Promise<boolean>;
  captureImage(): Promise<string>;
  processImageWithLLM(imageData: string): Promise<string>;
  validateMathExpression(expression: string): boolean;
  cleanup(): Promise<void>;

  // Extended functionality
  getPlatform(): Platform;
  getCapabilities(): Promise<CameraCapabilities>;
  getState(): CameraState;
  isAvailable(): Promise<boolean>;
  
  // Configuration and settings
  updateSettings(settings: Partial<CameraServiceSettings>): Promise<void>;
  getSettings(): CameraServiceSettings;
  resetSettings(): Promise<void>;
  
  // Error handling and recovery
  getLastError(): CameraError | null;
  clearError(): void;
  canRecover(): boolean;
  attemptRecovery(): Promise<boolean>;
  
  // Event handling
  addEventListener(event: CameraServiceEvent, callback: CameraServiceEventCallback): void;
  removeEventListener(event: CameraServiceEvent, callback: CameraServiceEventCallback): void;
  
  // Health and diagnostics
  performHealthCheck(): Promise<CameraServiceHealth>;
  getDiagnostics(): CameraServiceDiagnostics;
}

/**
 * Camera Service Settings
 */
export interface CameraServiceSettings {
  preferredResolution: { width: number; height: number };
  imageQuality: number;
  compressionEnabled: boolean;
  autoFocus: boolean;
  maxRetries: number;
  timeout: number;
  debugMode: boolean;
}

/**
 * Camera Service Events
 */
export type CameraServiceEvent = 
  | 'permission-requested'
  | 'permission-granted'
  | 'permission-denied'
  | 'camera-activated'
  | 'camera-deactivated'
  | 'image-captured'
  | 'processing-started'
  | 'processing-completed'
  | 'processing-failed'
  | 'error-occurred'
  | 'recovery-attempted'
  | 'settings-updated';

/**
 * Camera Service Event Callback
 */
export type CameraServiceEventCallback = (data: any) => void;

/**
 * Camera Service Health Status
 */
export interface CameraServiceHealth {
  isHealthy: boolean;
  platform: Platform;
  cameraAvailable: boolean;
  permissionGranted: boolean;
  apiSupported: boolean;
  lastCheckTime: number;
  issues: HealthIssue[];
  recommendations: string[];
}

/**
 * Health Issue
 */
export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'permission' | 'hardware' | 'api' | 'configuration' | 'network';
  message: string;
  code: string;
  recoverable: boolean;
}

/**
 * Camera Service Diagnostics
 */
export interface CameraServiceDiagnostics {
  platform: Platform;
  serviceType: string;
  version: string;
  capabilities: CameraCapabilities;
  settings: CameraServiceSettings;
  state: CameraState;
  performance: PerformanceMetrics;
  errors: CameraError[];
  lastOperations: OperationLog[];
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  averagePermissionTime: number;
  averageCaptureTime: number;
  averageProcessingTime: number;
  successRate: number;
  totalOperations: number;
  failedOperations: number;
  lastResetTime: number;
}

/**
 * Operation Log Entry
 */
export interface OperationLog {
  operation: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Camera Service Factory Interface
 * Extended version of the factory with additional utility methods
 */
export interface UnifiedCameraServiceFactory {
  createService(platform?: Platform): UnifiedCameraService;
  detectPlatform(): Platform;
  isSupported(platform: Platform): boolean;
  getSupportedPlatforms(): Platform[];
  getPlatformCapabilities(platform?: Platform): any;
  validateConfiguration(): any;
  clearCache(): void;
  getStatistics(): any;
}

/**
 * Abstract Base Camera Service
 * Provides common functionality for all camera service implementations
 */
export abstract class AbstractCameraService implements UnifiedCameraService {
  protected platform: Platform;
  protected settings: CameraServiceSettings;
  protected state: CameraState;
  protected lastError: CameraError | null = null;
  protected eventListeners: Map<CameraServiceEvent, CameraServiceEventCallback[]> = new Map();
  protected performanceMetrics: PerformanceMetrics;
  protected operationLog: OperationLog[] = [];

  constructor(platform: Platform) {
    this.platform = platform;
    this.settings = this.getDefaultSettings();
    this.state = this.getInitialState();
    this.performanceMetrics = this.getInitialMetrics();
  }

  // Abstract methods that must be implemented by concrete classes
  abstract requestCameraPermission(): Promise<boolean>;
  abstract captureImage(): Promise<string>;
  abstract processImageWithLLM(imageData: string): Promise<string>;
  abstract cleanup(): Promise<void>;
  abstract getCapabilities(): Promise<CameraCapabilities>;
  abstract isAvailable(): Promise<boolean>;

  // Concrete implementations of common functionality
  getPlatform(): Platform {
    return this.platform;
  }

  getState(): CameraState {
    return { ...this.state };
  }

  getSettings(): CameraServiceSettings {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<CameraServiceSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settings-updated', { settings: this.settings });
  }

  async resetSettings(): Promise<void> {
    this.settings = this.getDefaultSettings();
    this.emit('settings-updated', { settings: this.settings });
  }

  validateMathExpression(expression: string): boolean {
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    // Basic validation - check for mathematical characters
    const mathPattern = /^[0-9+\-*/().\s=]+$/;
    return mathPattern.test(expression.trim());
  }

  getLastError(): CameraError | null {
    return this.lastError;
  }

  clearError(): void {
    this.lastError = null;
  }

  canRecover(): boolean {
    return this.lastError?.recoverable ?? false;
  }

  async attemptRecovery(): Promise<boolean> {
    if (!this.canRecover()) {
      return false;
    }

    try {
      this.emit('recovery-attempted', { error: this.lastError });
      
      // Basic recovery attempt - clear error and reset state
      this.clearError();
      this.state = this.getInitialState();
      
      return true;
    } catch (error) {
      this.setError({
        type: 'configuration-error',
        message: 'Recovery attempt failed',
        recoverable: false,
        timestamp: Date.now(),
        originalError: error as Error
      });
      return false;
    }
  }

  addEventListener(event: CameraServiceEvent, callback: CameraServiceEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: CameraServiceEvent, callback: CameraServiceEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  async performHealthCheck(): Promise<CameraServiceHealth> {
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];

    try {
      const isAvailable = await this.isAvailable();
      const capabilities = await this.getCapabilities();

      if (!isAvailable) {
        issues.push({
          severity: 'high',
          category: 'hardware',
          message: 'Camera is not available',
          code: 'CAMERA_UNAVAILABLE',
          recoverable: false
        });
        recommendations.push('Check camera hardware and drivers');
      }

      if (!capabilities.hasCamera) {
        issues.push({
          severity: 'critical',
          category: 'hardware',
          message: 'No camera detected',
          code: 'NO_CAMERA',
          recoverable: false
        });
        recommendations.push('Connect a camera device');
      }

      if (!this.state.hasPermission) {
        issues.push({
          severity: 'medium',
          category: 'permission',
          message: 'Camera permission not granted',
          code: 'PERMISSION_DENIED',
          recoverable: true
        });
        recommendations.push('Grant camera permissions in system settings');
      }

      return {
        isHealthy: issues.length === 0,
        platform: this.platform,
        cameraAvailable: isAvailable,
        permissionGranted: this.state.hasPermission,
        apiSupported: true,
        lastCheckTime: Date.now(),
        issues,
        recommendations
      };
    } catch (error) {
      issues.push({
        severity: 'critical',
        category: 'api',
        message: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        recoverable: false
      });

      return {
        isHealthy: false,
        platform: this.platform,
        cameraAvailable: false,
        permissionGranted: false,
        apiSupported: false,
        lastCheckTime: Date.now(),
        issues,
        recommendations: ['Restart the application', 'Check system compatibility']
      };
    }
  }

  getDiagnostics(): CameraServiceDiagnostics {
    return {
      platform: this.platform,
      serviceType: this.constructor.name,
      version: '1.0.0',
      capabilities: this.state.capabilities || {
        hasCamera: false,
        supportedResolutions: [],
        maxImageSize: 0
      },
      settings: this.settings,
      state: this.state,
      performance: this.performanceMetrics,
      errors: this.lastError ? [this.lastError] : [],
      lastOperations: this.operationLog.slice(-10) // Last 10 operations
    };
  }

  // Protected helper methods
  protected emit(event: CameraServiceEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`Error in camera service event listener for ${event}:`, error);
        }
      });
    }
  }

  protected setError(error: CameraError): void {
    this.lastError = error;
    this.state.error = error;
    this.emit('error-occurred', { error });
  }

  protected logOperation(operation: string, startTime: number, success: boolean, error?: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - startTime;
    
    this.operationLog.push({
      operation,
      timestamp: startTime,
      duration,
      success,
      error,
      metadata
    });

    // Keep only last 100 operations
    if (this.operationLog.length > 100) {
      this.operationLog = this.operationLog.slice(-100);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(operation, duration, success);
  }

  private updatePerformanceMetrics(operation: string, duration: number, success: boolean): void {
    this.performanceMetrics.totalOperations++;
    
    if (!success) {
      this.performanceMetrics.failedOperations++;
    }

    this.performanceMetrics.successRate = 
      (this.performanceMetrics.totalOperations - this.performanceMetrics.failedOperations) / 
      this.performanceMetrics.totalOperations;

    // Update operation-specific averages
    switch (operation) {
      case 'requestPermission':
        this.performanceMetrics.averagePermissionTime = 
          (this.performanceMetrics.averagePermissionTime + duration) / 2;
        break;
      case 'captureImage':
        this.performanceMetrics.averageCaptureTime = 
          (this.performanceMetrics.averageCaptureTime + duration) / 2;
        break;
      case 'processImage':
        this.performanceMetrics.averageProcessingTime = 
          (this.performanceMetrics.averageProcessingTime + duration) / 2;
        break;
    }
  }

  private getDefaultSettings(): CameraServiceSettings {
    return {
      preferredResolution: { width: 1280, height: 720 },
      imageQuality: 0.8,
      compressionEnabled: true,
      autoFocus: true,
      maxRetries: 3,
      timeout: 30000,
      debugMode: false
    };
  }

  private getInitialState(): CameraState {
    return {
      isActive: false,
      hasPermission: false,
      isProcessing: false,
      lastCapturedImage: undefined,
      error: undefined,
      capabilities: undefined
    };
  }

  private getInitialMetrics(): PerformanceMetrics {
    return {
      averagePermissionTime: 0,
      averageCaptureTime: 0,
      averageProcessingTime: 0,
      successRate: 1.0,
      totalOperations: 0,
      failedOperations: 0,
      lastResetTime: Date.now()
    };
  }
}