/**
 * Network Retry Handler for Camera OCR Operations
 * Implements exponential backoff and intelligent retry strategies for network operations
 * Specifically designed for LLM service calls and image processing operations
 */

import { CameraOCRErrorHandler } from './CameraOCRErrorHandler';
import type { ProcessingError, LLMResponse } from '../types/camera-ocr';

/**
 * Network operation retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableStatusCodes: number[];
  retryableErrorTypes: string[];
}

/**
 * Default retry configuration for different operation types
 */
export const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig> = {
  llm_service: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableErrorTypes: ['timeout', 'network', 'rate-limit', 'server-error']
  },
  image_upload: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableStatusCodes: [408, 500, 502, 503, 504],
    retryableErrorTypes: ['timeout', 'network', 'upload-failed']
  },
  api_request: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffMultiplier: 1.5,
    jitterEnabled: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableErrorTypes: ['rate-limit', 'server-error', 'timeout']
  }
};

/**
 * Network retry handler with exponential backoff and intelligent error analysis
 */
export class NetworkRetryHandler {
  private config: RetryConfig;

  constructor(operationType: string = 'api_request', customConfig?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIGS[operationType] || DEFAULT_RETRY_CONFIGS.api_request,
      ...customConfig
    };
  }

  /**
   * Executes an operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'network-operation'
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;
      
      try {
        console.log(`[NetworkRetry] Attempting ${operationName} (${attempt}/${this.config.maxAttempts})`);
        
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[NetworkRetry] ${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[NetworkRetry] ${operationName} failed on attempt ${attempt}:`, lastError.message);
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt >= this.config.maxAttempts) {
          console.error(`[NetworkRetry] ${operationName} failed permanently after ${attempt} attempts`);
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        console.log(`[NetworkRetry] Retrying ${operationName} in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    // Create appropriate error based on the failure
    throw this.createRetryFailureError(lastError!, operationName, attempt);
  }

  /**
   * Specialized retry for LLM service calls
   */
  async retryLLMOperation(
    operation: () => Promise<LLMResponse>,
    imageSize?: number
  ): Promise<LLMResponse> {
    return this.executeWithRetry(async () => {
      const result = await operation();
      
      // Validate LLM response
      if (!result.success && this.isRetryableLLMError(result.error)) {
        throw new Error(result.error || 'LLM service error');
      }
      
      return result;
    }, `LLM-analysis${imageSize ? ` (${Math.round(imageSize / 1024)}KB)` : ''}`);
  }

  /**
   * Specialized retry for fetch operations
   */
  async retryFetch(
    url: string,
    options: RequestInit = {},
    operationName: string = 'fetch'
  ): Promise<Response> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response status is retryable
        if (!response.ok && this.config.retryableStatusCodes.includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, `${operationName} (${url})`);
  }

  /**
   * Determines if an error is retryable based on configuration and error analysis
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Check for retryable error types
    for (const retryableType of this.config.retryableErrorTypes) {
      if (errorMessage.includes(retryableType.toLowerCase())) {
        return true;
      }
    }
    
    // Check for specific network error patterns
    const retryablePatterns = [
      'timeout',
      'network error',
      'connection refused',
      'connection reset',
      'socket hang up',
      'econnreset',
      'enotfound',
      'etimedout',
      'rate limit',
      'quota exceeded',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout'
    ];
    
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Determines if an LLM error is retryable
   */
  private isRetryableLLMError(errorMessage?: string): boolean {
    if (!errorMessage) return false;
    
    const message = errorMessage.toLowerCase();
    
    // Retryable LLM errors
    const retryablePatterns = [
      'timeout',
      'network',
      'rate limit',
      'quota',
      'service unavailable',
      'internal error',
      'server error',
      'connection',
      'temporary'
    ];
    
    // Non-retryable LLM errors
    const nonRetryablePatterns = [
      'api key',
      'authentication',
      'authorization',
      'invalid request',
      'malformed',
      'no_math_found'
    ];
    
    // Check non-retryable first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }
    
    // Check retryable patterns
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculates delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number): number {
    // Base exponential backoff
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply jitter to prevent thundering herd
    if (this.config.jitterEnabled) {
      const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
      delay += jitter;
    }
    
    // Cap at maximum delay
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates appropriate error when retry attempts are exhausted
   */
  private createRetryFailureError(originalError: Error, operationName: string, attempts: number): ProcessingError {
    const errorMessage = originalError.message.toLowerCase();
    
    let errorType: ProcessingError['type'] = 'processing-failed';
    let userMessage = `${operationName} failed after ${attempts} attempts`;
    let suggestedAction = 'Check your internet connection and try again';
    
    // Determine specific error type based on the failure
    if (errorMessage.includes('timeout')) {
      errorType = 'timeout';
      userMessage = 'Operation timed out - the service may be slow or unavailable';
      suggestedAction = 'Try again with a smaller image or check your internet connection';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      errorType = 'rate-limit-exceeded';
      userMessage = 'Service rate limit exceeded - too many requests';
      suggestedAction = 'Wait a few minutes before trying again';
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = 'llm-service-error';
      userMessage = 'Network connection failed - unable to reach the service';
      suggestedAction = 'Check your internet connection and try again';
    } else if (errorMessage.includes('server error') || errorMessage.includes('service unavailable')) {
      errorType = 'llm-service-error';
      userMessage = 'Service is temporarily unavailable';
      suggestedAction = 'The service may be experiencing issues - try again in a few minutes';
    }
    
    return CameraOCRErrorHandler.createProcessingError(
      errorType,
      userMessage,
      'processing',
      originalError,
      suggestedAction
    );
  }

  /**
   * Updates retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Gets retry statistics for monitoring
   */
  static getRetryStatistics(): RetryStatistics {
    // This would be implemented with actual tracking in a production system
    return {
      totalOperations: 0,
      successfulOperations: 0,
      retriedOperations: 0,
      averageAttempts: 0,
      mostCommonFailures: []
    };
  }
}

/**
 * Retry statistics interface
 */
export interface RetryStatistics {
  totalOperations: number;
  successfulOperations: number;
  retriedOperations: number;
  averageAttempts: number;
  mostCommonFailures: Array<{ error: string; count: number }>;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  /**
   * Executes operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service is temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Gets current circuit breaker state
   */
  getState(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Resets circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}