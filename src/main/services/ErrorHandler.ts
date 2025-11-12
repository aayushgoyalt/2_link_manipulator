import type { StorageError, ValidationError, IPCError } from '../types/calculator';

/**
 * Error Handler utility for the MockDatabase and IPC operations
 * Provides centralized error handling, logging, and recovery mechanisms
 */
export class ErrorHandler {
  /**
   * Handle storage-related errors with appropriate logging and recovery
   */
  static handleStorageError(error: Error, operation: 'read' | 'write' | 'delete' | 'backup', filePath: string): StorageError {
    const storageError: StorageError = {
      name: 'StorageError',
      message: `Storage operation '${operation}' failed: ${error.message}`,
      operation,
      filePath,
      originalError: error
    };

    // Log the error for debugging
    console.error(`[StorageError] ${operation} operation failed:`, {
      filePath,
      error: error.message,
      stack: error.stack
    });

    // Check for specific error conditions and provide helpful messages
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      storageError.message = `Permission denied accessing file: ${filePath}. Check file permissions.`;
    } else if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
      storageError.message = `Insufficient disk space to ${operation} file: ${filePath}`;
    } else if ((error as NodeJS.ErrnoException).code === 'EMFILE') {
      storageError.message = `Too many open files. Cannot ${operation} file: ${filePath}`;
    }

    return storageError;
  }

  /**
   * Handle validation errors with detailed field information
   */
  static handleValidationError(field: string, value: any, expectedType: string, customMessage?: string): ValidationError {
    const validationError: ValidationError = {
      name: 'ValidationError',
      message: customMessage || `Invalid ${field}: expected ${expectedType}, got ${typeof value}`,
      field,
      value,
      expectedType
    };

    console.error(`[ValidationError] Field validation failed:`, {
      field,
      value,
      expectedType,
      actualType: typeof value
    });

    return validationError;
  }

  /**
   * Handle IPC communication errors
   */
  static handleIPCError(
    error: Error, 
    channel: string, 
    direction: 'renderer-to-main' | 'main-to-renderer'
  ): IPCError {
    const ipcError: IPCError = {
      name: 'IPCError',
      message: `IPC communication failed on channel '${channel}' (${direction}): ${error.message}`,
      channel,
      direction,
      originalError: error
    };

    console.error(`[IPCError] IPC communication failed:`, {
      channel,
      direction,
      error: error.message,
      stack: error.stack
    });

    return ipcError;
  }

  /**
   * Check if an error is recoverable and suggest recovery actions
   */
  static isRecoverableError(error: Error): boolean {
    if (error.name === 'StorageError') {
      const storageError = error as StorageError;
      const code = (storageError.originalError as NodeJS.ErrnoException).code;
      
      // These errors are typically not recoverable without user intervention
      const unrecoverableCodes = ['EACCES', 'ENOSPC', 'EROFS'];
      return !unrecoverableCodes.includes(code || '');
    }

    if (error.name === 'ValidationError') {
      // Validation errors are recoverable if the input can be corrected
      return true;
    }

    if (error.name === 'IPCError') {
      // IPC errors might be recoverable with retry
      return true;
    }

    return false;
  }

  /**
   * Get user-friendly error message for display in UI
   */
  static getUserFriendlyMessage(error: Error): string {
    if (error.name === 'StorageError') {
      const storageError = error as StorageError;
      const code = (storageError.originalError as NodeJS.ErrnoException).code;
      
      switch (code) {
        case 'EACCES':
          return 'Unable to access history file. Please check file permissions.';
        case 'ENOSPC':
          return 'Not enough disk space to save history. Please free up some space.';
        case 'EMFILE':
          return 'Too many files open. Please close some applications and try again.';
        default:
          return 'Failed to save calculation history. Please try again.';
      }
    }

    if (error.name === 'ValidationError') {
      return 'Invalid calculation data. Please try performing the calculation again.';
    }

    if (error.name === 'IPCError') {
      return 'Communication error. Please restart the application if the problem persists.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Sanitize file paths to prevent directory traversal attacks
   */
  static sanitizeFilePath(filePath: string): string {
    // Remove any path traversal attempts
    return filePath.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
  }

  /**
   * Validate file size to prevent disk space abuse
   */
  static validateFileSize(sizeInBytes: number, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  /**
   * Create a safe error object for IPC transmission (removes circular references)
   */
  static createSafeErrorForIPC(error: Error): { name: string; message: string; stack?: string } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
}

/**
 * Retry utility for operations that might fail temporarily
 */
export class RetryHandler {
  /**
   * Retry an async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          break;
        }

        // Only retry if the error is potentially recoverable
        if (!ErrorHandler.isRecoverableError(lastError)) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay:`, lastError.message);
      }
    }

    throw lastError!;
  }
}