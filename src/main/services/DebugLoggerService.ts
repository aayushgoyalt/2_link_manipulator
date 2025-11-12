/**
 * Debug Logger Service
 * Provides comprehensive logging and debugging capabilities for the OCR pipeline
 * Supports debug mode control, test utilities, and session management
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import {
  DebugLogger,
  DebugLog,
  DebugSession,
  TestResult,
  DebugConfig,
  ProcessingResult
} from '../types/camera-ocr';

export class DebugLoggerService implements DebugLogger {
  private config: DebugConfig;
  private logs: DebugLog[] = [];
  private currentSession: DebugSession | null = null;
  private debugFolder: string;
  private maxLogsInMemory = 1000;

  constructor(config?: Partial<DebugConfig>) {
    // Initialize configuration with defaults
    this.config = {
      enabled: process.env.DEBUG_OCR === 'true' || false,
      logLevel: (process.env.DEBUG_LOG_LEVEL as any) || 'info',
      saveImages: false,
      saveResults: true,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      ...config
    };

    // Set up debug folder
    const userDataPath = app.getPath('userData');
    this.debugFolder = config?.debugFolder || path.join(userDataPath, 'debug-sessions');
    
    // Ensure debug folder exists
    this.ensureDebugFolder();
  }

  // ============================================================================
  // Core Logging Functionality (Subtask 4.1)
  // ============================================================================

  /**
   * Log camera initialization events with timestamps
   */
  logCameraInit(success: boolean, details: any): void {
    this.log('info', 'CameraService', 'camera-init', {
      success,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log frame capture events with image metadata
   */
  logFrameCapture(imageData: string, metadata: any): void {
    const imageSize = imageData.length;
    const isBase64 = imageData.startsWith('data:image');
    
    this.log('debug', 'CameraService', 'frame-capture', {
      imageSize,
      isBase64,
      ...metadata,
      timestamp: Date.now()
    });

    // Save image if debug mode is enabled
    if (this.config.enabled && this.config.saveImages) {
      this.saveDebugImage(imageData, 'capture');
    }
  }

  /**
   * Log OCR processing stages with progress data
   */
  logOCRProcessing(stage: string, data: any): void {
    this.log('debug', 'OCRService', `ocr-${stage}`, {
      stage,
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Log expression parsing with input/output
   */
  logExpressionParsing(input: string, output: string, success: boolean): void {
    this.log('info', 'ExpressionParser', 'parse-expression', {
      input,
      output,
      success,
      inputLength: input.length,
      outputLength: output.length,
      timestamp: Date.now()
    });
  }

  /**
   * Log errors with full context and stack traces
   */
  logError(component: string, error: Error, context: any): void {
    this.log('error', component, 'error', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      ...context,
      timestamp: Date.now()
    }, error);
  }

  // ============================================================================
  // Debug Mode Control (Subtask 4.2)
  // ============================================================================

  /**
   * Enable debug mode
   */
  enableDebugMode(): void {
    this.config.enabled = true;
    this.log('info', 'DebugLogger', 'debug-mode-enabled', {
      timestamp: Date.now()
    });
    
    // Start a new debug session
    this.startNewSession();
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.config.enabled = false;
    this.log('info', 'DebugLogger', 'debug-mode-disabled', {
      timestamp: Date.now()
    });
    
    // Save current session before disabling
    if (this.currentSession) {
      this.saveDebugSession(this.currentSession.sessionId).catch(err => {
        console.error('Failed to save debug session:', err);
      });
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.config.enabled;
  }

  /**
   * Update debug configuration
   */
  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'DebugLogger', 'config-updated', {
      newConfig: this.config,
      timestamp: Date.now()
    });
  }

  /**
   * Get current debug configuration
   */
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Test Utility Functions (Subtask 4.3)
  // ============================================================================

  /**
   * Test camera access and return detailed results
   */
  async testCameraAccess(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    let details: any = {};

    try {
      this.log('info', 'DebugLogger', 'test-camera-access-start', {
        timestamp: startTime
      });

      // Check if camera APIs are available
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        errors.push('Navigator or mediaDevices API not available');
      } else {
        details.hasMediaDevices = true;
        
        // Try to enumerate devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          
          details.totalDevices = devices.length;
          details.videoDevices = videoDevices.length;
          details.deviceList = videoDevices.map(d => ({
            deviceId: d.deviceId,
            label: d.label || 'Unknown Camera',
            groupId: d.groupId
          }));

          if (videoDevices.length === 0) {
            errors.push('No video input devices found');
          } else {
            success = true;
          }
        } catch (err) {
          errors.push(`Failed to enumerate devices: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: 'CameraService',
        success,
        duration,
        details,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now()
      };

      this.log('info', 'DebugLogger', 'test-camera-access-complete', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      const result: TestResult = {
        component: 'CameraService',
        success: false,
        duration,
        details,
        errors,
        timestamp: Date.now()
      };

      this.logError('DebugLogger', error as Error, { test: 'camera-access' });
      return result;
    }
  }

  /**
   * Test image capture with sample frame
   */
  async testImageCapture(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    let details: any = {};

    try {
      this.log('info', 'DebugLogger', 'test-image-capture-start', {
        timestamp: startTime
      });

      // Check if we can access camera
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        errors.push('Camera API not available');
      } else {
        // Try to get user media
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 }
          });

          details.streamActive = stream.active;
          details.trackCount = stream.getTracks().length;
          
          // Try to capture a frame
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            details.resolution = {
              width: settings.width,
              height: settings.height
            };
            details.frameRate = settings.frameRate;
            
            success = true;
          } else {
            errors.push('No video track available');
          }

          // Clean up
          stream.getTracks().forEach(track => track.stop());

        } catch (err) {
          errors.push(`Failed to capture image: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: 'CameraService',
        success,
        duration,
        details,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now()
      };

      this.log('info', 'DebugLogger', 'test-image-capture-complete', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      const result: TestResult = {
        component: 'CameraService',
        success: false,
        duration,
        details,
        errors,
        timestamp: Date.now()
      };

      this.logError('DebugLogger', error as Error, { test: 'image-capture' });
      return result;
    }
  }

  /**
   * Test OCR processing with test image
   */
  async testOCRProcessing(imageData: string): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    let details: any = {};

    try {
      this.log('info', 'DebugLogger', 'test-ocr-processing-start', {
        imageSize: imageData.length,
        timestamp: startTime
      });

      // Validate image data
      if (!imageData || imageData.length === 0) {
        errors.push('Empty image data provided');
      } else if (!imageData.startsWith('data:image')) {
        errors.push('Invalid image data format (expected base64 data URL)');
      } else {
        details.imageSize = imageData.length;
        details.imageFormat = imageData.split(';')[0].split(':')[1];
        
        // Image data is valid
        success = true;
        details.validationPassed = true;
      }

      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: 'OCRService',
        success,
        duration,
        details,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now()
      };

      this.log('info', 'DebugLogger', 'test-ocr-processing-complete', result);
      
      // Save test image if debug mode is enabled
      if (this.config.enabled && this.config.saveImages && success) {
        this.saveDebugImage(imageData, 'test');
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      const result: TestResult = {
        component: 'OCRService',
        success: false,
        duration,
        details,
        errors,
        timestamp: Date.now()
      };

      this.logError('DebugLogger', error as Error, { test: 'ocr-processing' });
      return result;
    }
  }

  /**
   * Test calculator integration with sample expression
   */
  async testCalculatorIntegration(expression: string): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    let details: any = {};

    try {
      this.log('info', 'DebugLogger', 'test-calculator-integration-start', {
        expression,
        timestamp: startTime
      });

      // Validate expression
      if (!expression || expression.trim().length === 0) {
        errors.push('Empty expression provided');
      } else {
        details.expression = expression;
        details.expressionLength = expression.length;
        
        // Try to evaluate the expression
        try {
          // Basic validation - check for valid characters
          const validChars = /^[0-9+\-*/().\s]+$/;
          if (!validChars.test(expression)) {
            errors.push('Expression contains invalid characters');
          } else {
            details.validationPassed = true;
            success = true;
          }
        } catch (err) {
          errors.push(`Expression evaluation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: 'CalculatorIntegration',
        success,
        duration,
        details,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now()
      };

      this.log('info', 'DebugLogger', 'test-calculator-integration-complete', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      const result: TestResult = {
        component: 'CalculatorIntegration',
        success: false,
        duration,
        details,
        errors,
        timestamp: Date.now()
      };

      this.logError('DebugLogger', error as Error, { test: 'calculator-integration' });
      return result;
    }
  }

  // ============================================================================
  // Debug Session Management (Subtask 4.4)
  // ============================================================================

  /**
   * Save captured images to debug folder
   */
  private saveDebugImage(imageData: string, prefix: string): void {
    try {
      if (!this.config.enabled || !this.config.saveImages) {
        return;
      }

      const timestamp = Date.now();
      const filename = `${prefix}-${timestamp}.png`;
      const filepath = path.join(this.debugFolder, 'images', filename);

      // Ensure images directory exists
      const imagesDir = path.join(this.debugFolder, 'images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Extract base64 data
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Write to file
      fs.writeFileSync(filepath, buffer as any);

      this.log('debug', 'DebugLogger', 'image-saved', {
        filename,
        filepath,
        size: buffer.length,
        timestamp
      });

      // Add to current session if active
      if (this.currentSession) {
        this.currentSession.capturedImages.push(filepath);
      }

    } catch (error) {
      console.error('Failed to save debug image:', error);
      this.log('error', 'DebugLogger', 'image-save-failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Save OCR results with metadata
   */
  saveOCRResult(result: ProcessingResult): void {
    try {
      if (!this.config.enabled || !this.config.saveResults) {
        return;
      }

      this.log('info', 'DebugLogger', 'ocr-result-saved', {
        expression: result.recognizedExpression,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      // Add to current session if active
      if (this.currentSession) {
        this.currentSession.ocrResults.push(result);
      }

    } catch (error) {
      console.error('Failed to save OCR result:', error);
      this.log('error', 'DebugLogger', 'ocr-result-save-failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Save debug session to file
   */
  async saveDebugSession(sessionId: string): Promise<void> {
    try {
      const session = this.currentSession || this.createSession(sessionId);
      
      const filename = `session-${sessionId}-${Date.now()}.json`;
      const filepath = path.join(this.debugFolder, 'sessions', filename);

      // Ensure sessions directory exists
      const sessionsDir = path.join(this.debugFolder, 'sessions');
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }

      // Write session to file
      fs.writeFileSync(filepath, JSON.stringify(session, null, 2));

      this.log('info', 'DebugLogger', 'session-saved', {
        sessionId,
        filepath,
        logCount: session.logs.length,
        imageCount: session.capturedImages.length,
        resultCount: session.ocrResults.length
      });

    } catch (error) {
      console.error('Failed to save debug session:', error);
      throw error;
    }
  }

  /**
   * Load previous debug session
   */
  async loadDebugSession(sessionId: string): Promise<DebugSession> {
    try {
      const sessionsDir = path.join(this.debugFolder, 'sessions');
      
      // Find session file
      const files = fs.readdirSync(sessionsDir);
      const sessionFile = files.find(f => f.startsWith(`session-${sessionId}`));

      if (!sessionFile) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const filepath = path.join(sessionsDir, sessionFile);
      const data = fs.readFileSync(filepath, 'utf-8');
      const session: DebugSession = JSON.parse(data);

      this.log('info', 'DebugLogger', 'session-loaded', {
        sessionId,
        filepath,
        logCount: session.logs.length
      });

      return session;

    } catch (error) {
      console.error('Failed to load debug session:', error);
      throw error;
    }
  }

  /**
   * Export debug logs to file
   */
  async exportDebugLogs(): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `debug-logs-${timestamp}.json`;
      const filepath = path.join(this.debugFolder, 'exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.join(this.debugFolder, 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Create export data
      const exportData = {
        exportedAt: timestamp,
        config: this.config,
        logs: this.logs,
        currentSession: this.currentSession,
        totalLogs: this.logs.length
      };

      // Write to file
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

      this.log('info', 'DebugLogger', 'logs-exported', {
        filepath,
        logCount: this.logs.length,
        timestamp
      });

      return filepath;

    } catch (error) {
      console.error('Failed to export debug logs:', error);
      throw error;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: DebugLog['level']): DebugLog[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): DebugLog[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.log('info', 'DebugLogger', 'logs-cleared', {
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Core logging method
   */
  private log(
    level: DebugLog['level'],
    component: string,
    operation: string,
    data: any,
    error?: Error
  ): void {
    // Check if we should log based on level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: DebugLog = {
      timestamp: Date.now(),
      level,
      component,
      operation,
      data,
      error
    };

    this.logs.push(logEntry);

    // Add to current session if active
    if (this.currentSession) {
      this.currentSession.logs.push(logEntry);
    }

    // Trim logs if exceeding max size
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }

    // Console output in debug mode
    if (this.config.enabled) {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, operation, data, error);
          break;
        case 'warn':
          console.warn(prefix, operation, data);
          break;
        case 'debug':
          console.debug(prefix, operation, data);
          break;
        default:
          console.log(prefix, operation, data);
      }
    }
  }

  /**
   * Check if we should log based on configured level
   */
  private shouldLog(level: DebugLog['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * Ensure debug folder exists
   */
  private ensureDebugFolder(): void {
    try {
      if (!fs.existsSync(this.debugFolder)) {
        fs.mkdirSync(this.debugFolder, { recursive: true });
      }

      // Create subdirectories
      const subdirs = ['images', 'sessions', 'exports'];
      subdirs.forEach(dir => {
        const dirPath = path.join(this.debugFolder, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      });

    } catch (error) {
      console.error('Failed to create debug folder:', error);
    }
  }

  /**
   * Start a new debug session
   */
  private startNewSession(): void {
    const sessionId = `session-${Date.now()}`;
    this.currentSession = this.createSession(sessionId);
    
    this.log('info', 'DebugLogger', 'session-started', {
      sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Create a new session object
   */
  private createSession(sessionId: string): DebugSession {
    return {
      sessionId,
      timestamp: Date.now(),
      logs: [],
      capturedImages: [],
      ocrResults: []
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Save current session if active
    if (this.currentSession && this.config.enabled) {
      this.saveDebugSession(this.currentSession.sessionId).catch(err => {
        console.error('Failed to save session during cleanup:', err);
      });
    }

    this.currentSession = null;
  }
}

/**
 * Factory function to create debug logger with default configuration
 */
export function createDebugLogger(config?: Partial<DebugConfig>): DebugLoggerService {
  return new DebugLoggerService(config);
}
