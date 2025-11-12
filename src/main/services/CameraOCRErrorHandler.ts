/**
 * Comprehensive Error Handler for Camera OCR System
 * Provides centralized error handling, recovery mechanisms, and user-friendly messaging
 * for camera access, LLM processing, and expression parsing operations
 */

import type { 
  CameraError, 
  ProcessingError, 
  CameraErrorType, 
  ProcessingErrorType,
  OCRProcessingStage 
} from '../types/camera-ocr';

/**
 * Enhanced error handler specifically for Camera OCR operations
 * Extends the base ErrorHandler with camera and OCR specific functionality
 */
export class CameraOCRErrorHandler {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 30000; // 30 seconds

  /**
   * Creates a standardized camera error with recovery suggestions
   */
  static createCameraError(
    type: CameraErrorType,
    message: string,
    originalError?: Error,
    suggestedAction?: string
  ): CameraError {
    const error: CameraError = {
      type,
      message,
      recoverable: this.isCameraErrorRecoverable(type),
      suggestedAction: suggestedAction || this.getDefaultCameraRecoveryAction(type),
      originalError,
      timestamp: Date.now()
    };

    this.logCameraError(error);
    return error;
  }

  /**
   * Creates a standardized processing error with recovery suggestions
   */
  static createProcessingError(
    type: ProcessingErrorType,
    message: string,
    stage: OCRProcessingStage,
    originalError?: Error,
    suggestedAction?: string
  ): ProcessingError {
    const error: ProcessingError = {
      type,
      message,
      stage,
      recoverable: this.isProcessingErrorRecoverable(type),
      retryable: this.isProcessingErrorRetryable(type),
      suggestedAction: suggestedAction || this.getDefaultProcessingRecoveryAction(type),
      originalError,
      timestamp: Date.now()
    };

    this.logProcessingError(error);
    return error;
  }

  /**
   * Handles camera permission errors with platform-specific guidance
   */
  static handleCameraPermissionError(platform: 'electron-desktop' | 'web-browser', originalError?: Error): CameraError {
    let message: string;
    let suggestedAction: string;

    if (platform === 'electron-desktop') {
      if (process.platform === 'darwin') {
        message = 'Camera access denied by macOS. Please enable camera access in System Preferences.';
        suggestedAction = 'Open System Preferences > Security & Privacy > Camera and enable access for this application';
      } else if (process.platform === 'win32') {
        message = 'Camera access denied by Windows. Please enable camera access in Windows Settings.';
        suggestedAction = 'Open Windows Settings > Privacy > Camera and enable access for this application';
      } else {
        message = 'Camera access denied by system. Please check system camera permissions.';
        suggestedAction = 'Check system settings and grant camera access to this application';
      }
    } else {
      message = 'Camera access denied by browser. Please enable camera access for this website.';
      suggestedAction = 'Click the camera icon in the address bar or check browser settings to allow camera access';
    }

    return this.createCameraError('permission-denied', message, originalError, suggestedAction);
  }

  /**
   * Handles LLM service errors with appropriate recovery strategies
   */
  static handleLLMServiceError(originalError: Error, stage: OCRProcessingStage = 'processing'): ProcessingError {
    let type: ProcessingErrorType = 'llm-service-error';
    let message = 'LLM service error occurred';
    let suggestedAction = 'Try again with a clearer image';

    // Analyze the error to provide specific guidance
    const errorMessage = originalError.message.toLowerCase();

    if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
      type = 'llm-service-error';
      message = 'LLM service authentication failed. Please check API key configuration.';
      suggestedAction = 'Verify API key in application settings and ensure it has proper permissions';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      type = 'rate-limit-exceeded';
      message = 'LLM service rate limit exceeded. Please wait before trying again.';
      suggestedAction = 'Wait a few minutes before attempting another OCR operation';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      type = 'llm-service-error';
      message = 'Network timeout while processing image. Please check your internet connection.';
      suggestedAction = 'Check internet connection and try again';
    } else if (errorMessage.includes('image') && errorMessage.includes('invalid')) {
      type = 'image-invalid';
      message = 'Image format not supported by LLM service.';
      suggestedAction = 'Capture a new image in JPEG format with better quality';
    } else if (errorMessage.includes('no_math_found') || errorMessage.includes('no mathematical')) {
      type = 'insufficient-confidence';
      message = 'No mathematical expressions detected in the image.';
      suggestedAction = 'Ensure the image contains clear mathematical expressions and try again';
    }

    return this.createProcessingError(type, message, stage, originalError, suggestedAction);
  }

  /**
   * Handles expression parsing errors with validation feedback
   */
  static handleExpressionParsingError(expression: string, originalError?: Error): ProcessingError {
    let message: string;
    let suggestedAction: string;

    if (!expression || expression.trim().length === 0) {
      message = 'No mathematical expression was extracted from the image.';
      suggestedAction = 'Capture a clearer image with visible mathematical expressions';
    } else if (expression.includes('NO_MATH_FOUND')) {
      message = 'No mathematical content detected in the captured image.';
      suggestedAction = 'Ensure the image contains mathematical expressions and try again';
    } else {
      message = `Invalid mathematical expression: "${expression}". The expression contains unsupported characters or syntax.`;
      suggestedAction = 'Capture an image with standard mathematical notation (+, -, *, /, parentheses, numbers)';
    }

    return this.createProcessingError('parsing-failed', message, 'parsing', originalError, suggestedAction);
  }

  /**
   * Handles image preprocessing errors
   */
  static handleImageProcessingError(originalError: Error, stage: OCRProcessingStage = 'preprocessing'): ProcessingError {
    let message = 'Image processing failed';
    let suggestedAction = 'Try capturing a new image';

    const errorMessage = originalError.message.toLowerCase();

    if (errorMessage.includes('size') || errorMessage.includes('large')) {
      message = 'Image file is too large for processing.';
      suggestedAction = 'Capture image at lower resolution or enable compression in settings';
    } else if (errorMessage.includes('format') || errorMessage.includes('invalid')) {
      message = 'Image format is not supported.';
      suggestedAction = 'Ensure camera is capturing in JPEG format';
    } else if (errorMessage.includes('corrupt') || errorMessage.includes('damaged')) {
      message = 'Image data appears to be corrupted.';
      suggestedAction = 'Try capturing a new image';
    }

    return this.createProcessingError('image-invalid', message, stage, originalError, suggestedAction);
  }

  /**
   * Retry mechanism with exponential backoff for recoverable operations
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    errorHandler: (error: Error, attempt: number) => boolean,
    maxAttempts: number = CameraOCRErrorHandler.MAX_RETRY_ATTEMPTS,
    baseDelay: number = CameraOCRErrorHandler.BASE_RETRY_DELAY
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`Operation attempt ${attempt}/${maxAttempts} failed:`, lastError.message);

        // Check if error handler allows retry
        if (!errorHandler(lastError, attempt) || attempt === maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
          CameraOCRErrorHandler.MAX_RETRY_DELAY
        );

        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determines if a camera error is recoverable
   */
  static isCameraErrorRecoverable(type: CameraErrorType): boolean {
    const recoverableTypes: CameraErrorType[] = [
      'permission-denied',
      'capture-failed',
      'processing-failed',
      'network-error',
      'configuration-error'
    ];
    return recoverableTypes.includes(type);
  }

  /**
   * Determines if a processing error is recoverable
   */
  static isProcessingErrorRecoverable(type: ProcessingErrorType): boolean {
    const recoverableTypes: ProcessingErrorType[] = [
      'image-invalid',
      'llm-service-error',
      'parsing-failed',
      'validation-failed',
      'timeout',
      'insufficient-confidence'
    ];
    return recoverableTypes.includes(type);
  }

  /**
   * Determines if a processing error is retryable (can be automatically retried)
   */
  static isProcessingErrorRetryable(type: ProcessingErrorType): boolean {
    const retryableTypes: ProcessingErrorType[] = [
      'llm-service-error',
      'timeout',
      'processing-failed'
    ];
    return retryableTypes.includes(type);
  }

  /**
   * Gets user-friendly error message for display in UI
   */
  static getUserFriendlyMessage(error: CameraError | ProcessingError): string {
    if ('stage' in error) {
      // Processing error
      return this.getProcessingErrorUserMessage(error);
    } else {
      // Camera error
      return this.getCameraErrorUserMessage(error);
    }
  }

  /**
   * Gets recovery instructions for an error
   */
  static getRecoveryInstructions(error: CameraError | ProcessingError): string[] {
    const instructions: string[] = [];

    if (error.suggestedAction) {
      instructions.push(error.suggestedAction);
    }

    if (error.recoverable) {
      instructions.push('You can try the operation again');
    }

    if ('retryable' in error && error.retryable) {
      instructions.push('The system will automatically retry this operation');
    }

    // Add general troubleshooting steps
    if ('stage' in error) {
      instructions.push(...this.getProcessingTroubleshootingSteps(error));
    } else {
      instructions.push(...this.getCameraTroubleshootingSteps(error));
    }

    return instructions;
  }

  /**
   * Creates error recovery strategy based on error type and context
   */
  static createRecoveryStrategy(error: CameraError | ProcessingError): RecoveryStrategy {
    const strategy: RecoveryStrategy = {
      canRetry: error.recoverable,
      autoRetry: false,
      maxRetries: 0,
      retryDelay: 0,
      fallbackOptions: [],
      userActions: []
    };

    if ('stage' in error) {
      // Processing error recovery
      this.configureProcessingRecoveryStrategy(strategy, error);
    } else {
      // Camera error recovery
      this.configureCameraRecoveryStrategy(strategy, error);
    }

    return strategy;
  }

  // Private helper methods

  private static getDefaultCameraRecoveryAction(type: CameraErrorType): string {
    const actions: Record<CameraErrorType, string> = {
      'permission-denied': 'Grant camera permission in system or browser settings',
      'hardware-unavailable': 'Check camera hardware connection and try again',
      'platform-unsupported': 'Use a supported browser or platform',
      'capture-failed': 'Try capturing the image again',
      'processing-failed': 'Try again with better lighting or image quality',
      'network-error': 'Check internet connection and try again',
      'configuration-error': 'Check application settings and configuration'
    };
    return actions[type] || 'Try the operation again';
  }

  private static getDefaultProcessingRecoveryAction(type: ProcessingErrorType): string {
    const actions: Record<ProcessingErrorType, string> = {
      'image-invalid': 'Capture a new image with better quality',
      'llm-service-error': 'Check internet connection and try again',
      'parsing-failed': 'Capture image with clearer mathematical expressions',
      'validation-failed': 'Ensure image contains valid mathematical notation',
      'timeout': 'Try again with a smaller or clearer image',
      'rate-limit-exceeded': 'Wait a few minutes before trying again',
      'insufficient-confidence': 'Capture a clearer image with better lighting',
      'processing-failed': 'Try the operation again'
    };
    return actions[type] || 'Try the operation again';
  }

  private static getCameraErrorUserMessage(error: CameraError): string {
    const messages: Record<CameraErrorType, string> = {
      'permission-denied': 'Camera access is required to capture mathematical expressions',
      'hardware-unavailable': 'Camera is not available or not working properly',
      'platform-unsupported': 'Camera access is not supported on this platform',
      'capture-failed': 'Failed to capture image from camera',
      'processing-failed': 'Failed to process the captured image',
      'network-error': 'Network connection required for image processing',
      'configuration-error': 'Camera configuration needs to be updated'
    };
    return messages[error.type] || 'Camera operation failed';
  }

  private static getProcessingErrorUserMessage(error: ProcessingError): string {
    const messages: Record<ProcessingErrorType, string> = {
      'image-invalid': 'The captured image cannot be processed',
      'llm-service-error': 'Image analysis service is temporarily unavailable',
      'parsing-failed': 'Could not extract mathematical expression from image',
      'validation-failed': 'The detected expression is not valid mathematics',
      'timeout': 'Image processing took too long and was cancelled',
      'rate-limit-exceeded': 'Too many requests - please wait before trying again',
      'insufficient-confidence': 'Could not clearly detect mathematical expressions',
      'processing-failed': 'Image processing failed unexpectedly'
    };
    return messages[error.type] || 'Image processing failed';
  }

  private static getCameraTroubleshootingSteps(error: CameraError): string[] {
    const steps: string[] = [];

    switch (error.type) {
      case 'permission-denied':
        steps.push('Restart the application after granting permissions');
        steps.push('Check if other applications are using the camera');
        break;
      case 'hardware-unavailable':
        steps.push('Ensure camera is properly connected');
        steps.push('Close other applications that might be using the camera');
        steps.push('Try restarting your device');
        break;
      case 'capture-failed':
        steps.push('Ensure adequate lighting');
        steps.push('Hold the device steady while capturing');
        steps.push('Try capturing from a different angle');
        break;
    }

    return steps;
  }

  private static getProcessingTroubleshootingSteps(error: ProcessingError): string[] {
    const steps: string[] = [];

    switch (error.type) {
      case 'image-invalid':
        steps.push('Ensure image contains clear mathematical expressions');
        steps.push('Try capturing with better lighting');
        steps.push('Avoid blurry or low-quality images');
        break;
      case 'llm-service-error':
        steps.push('Check your internet connection');
        steps.push('Verify API key configuration');
        steps.push('Try again in a few minutes');
        break;
      case 'parsing-failed':
        steps.push('Use standard mathematical notation');
        steps.push('Ensure expressions are clearly written');
        steps.push('Avoid complex or unusual mathematical symbols');
        break;
    }

    return steps;
  }

  private static configureCameraRecoveryStrategy(strategy: RecoveryStrategy, error: CameraError): void {
    switch (error.type) {
      case 'capture-failed':
        strategy.autoRetry = true;
        strategy.maxRetries = 2;
        strategy.retryDelay = 1000;
        strategy.fallbackOptions = ['manual-input', 'file-upload'];
        break;
      case 'permission-denied':
        strategy.userActions = ['grant-permission', 'open-settings'];
        strategy.fallbackOptions = ['manual-input'];
        break;
      case 'hardware-unavailable':
        strategy.fallbackOptions = ['manual-input', 'file-upload'];
        break;
      default:
        strategy.maxRetries = 1;
        strategy.retryDelay = 2000;
    }
  }

  private static configureProcessingRecoveryStrategy(strategy: RecoveryStrategy, error: ProcessingError): void {
    switch (error.type) {
      case 'llm-service-error':
        strategy.autoRetry = true;
        strategy.maxRetries = 3;
        strategy.retryDelay = 2000;
        strategy.fallbackOptions = ['manual-input'];
        break;
      case 'timeout':
        strategy.autoRetry = true;
        strategy.maxRetries = 2;
        strategy.retryDelay = 5000;
        break;
      case 'rate-limit-exceeded':
        strategy.retryDelay = 60000; // 1 minute
        strategy.maxRetries = 1;
        break;
      case 'insufficient-confidence':
        strategy.fallbackOptions = ['manual-edit', 'recapture'];
        strategy.userActions = ['improve-lighting', 'better-angle'];
        break;
      default:
        strategy.maxRetries = 1;
        strategy.retryDelay = 1000;
    }
  }

  private static logCameraError(error: CameraError): void {
    console.error(`[CameraError] ${error.type}:`, {
      message: error.message,
      recoverable: error.recoverable,
      suggestedAction: error.suggestedAction,
      timestamp: new Date(error.timestamp).toISOString(),
      originalError: error.originalError?.message
    });
  }

  private static logProcessingError(error: ProcessingError): void {
    console.error(`[ProcessingError] ${error.type} at ${error.stage}:`, {
      message: error.message,
      recoverable: error.recoverable,
      retryable: error.retryable,
      suggestedAction: error.suggestedAction,
      timestamp: new Date(error.timestamp).toISOString(),
      originalError: error.originalError?.message
    });
  }
}

/**
 * Recovery strategy interface for error handling
 */
export interface RecoveryStrategy {
  canRetry: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackOptions: string[];
  userActions: string[];
}

/**
 * Error context for tracking error patterns and recovery success
 */
export interface ErrorContext {
  operationType: 'camera-permission' | 'image-capture' | 'image-processing' | 'expression-parsing';
  attemptNumber: number;
  previousErrors: (CameraError | ProcessingError)[];
  userAgent?: string;
  platform: string;
  timestamp: number;
}

/**
 * Error recovery manager for tracking and optimizing recovery strategies
 */
export class ErrorRecoveryManager {
  private static errorHistory: Map<string, ErrorContext[]> = new Map();
  private static recoverySuccessRates: Map<string, number> = new Map();

  /**
   * Records an error occurrence for pattern analysis
   */
  static recordError(error: CameraError | ProcessingError, context: ErrorContext): void {
    const errorKey = this.getErrorKey(error);
    
    if (!this.errorHistory.has(errorKey)) {
      this.errorHistory.set(errorKey, []);
    }
    
    this.errorHistory.get(errorKey)!.push(context);
    
    // Keep only recent errors (last 100 per type)
    const history = this.errorHistory.get(errorKey)!;
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Records successful recovery for success rate tracking
   */
  static recordRecoverySuccess(error: CameraError | ProcessingError): void {
    const errorKey = this.getErrorKey(error);
    const currentRate = this.recoverySuccessRates.get(errorKey) || 0;
    this.recoverySuccessRates.set(errorKey, Math.min(currentRate + 0.1, 1.0));
  }

  /**
   * Records failed recovery for success rate tracking
   */
  static recordRecoveryFailure(error: CameraError | ProcessingError): void {
    const errorKey = this.getErrorKey(error);
    const currentRate = this.recoverySuccessRates.get(errorKey) || 0;
    this.recoverySuccessRates.set(errorKey, Math.max(currentRate - 0.1, 0.0));
  }

  /**
   * Gets optimized recovery strategy based on historical data
   */
  static getOptimizedRecoveryStrategy(error: CameraError | ProcessingError): RecoveryStrategy {
    const baseStrategy = CameraOCRErrorHandler.createRecoveryStrategy(error);
    const errorKey = this.getErrorKey(error);
    const successRate = this.recoverySuccessRates.get(errorKey) || 0.5;
    
    // Adjust strategy based on success rate
    if (successRate < 0.3) {
      // Low success rate - reduce retries, suggest fallbacks
      baseStrategy.maxRetries = Math.max(1, baseStrategy.maxRetries - 1);
      baseStrategy.autoRetry = false;
    } else if (successRate > 0.8) {
      // High success rate - allow more retries
      baseStrategy.maxRetries = Math.min(5, baseStrategy.maxRetries + 1);
    }
    
    return baseStrategy;
  }

  /**
   * Gets error statistics for monitoring and debugging
   */
  static getErrorStatistics(): ErrorStatistics {
    const stats: ErrorStatistics = {
      totalErrors: 0,
      errorsByType: {},
      averageRecoveryRate: 0,
      mostCommonErrors: []
    };

    // Calculate total errors and by type
    for (const [errorKey, history] of this.errorHistory.entries()) {
      stats.totalErrors += history.length;
      stats.errorsByType[errorKey] = history.length;
    }

    // Calculate average recovery rate
    const rates = Array.from(this.recoverySuccessRates.values());
    stats.averageRecoveryRate = rates.length > 0 
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length 
      : 0;

    // Find most common errors
    stats.mostCommonErrors = Object.entries(stats.errorsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return stats;
  }

  private static getErrorKey(error: CameraError | ProcessingError): string {
    if ('stage' in error) {
      return `processing-${error.type}-${error.stage}`;
    } else {
      return `camera-${error.type}`;
    }
  }
}

/**
 * Error statistics interface
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  averageRecoveryRate: number;
  mostCommonErrors: Array<{ type: string; count: number }>;
}