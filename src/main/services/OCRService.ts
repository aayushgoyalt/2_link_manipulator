/**
 * Main OCR Service - Orchestrates LLM, Image Processing, and Expression Parsing
 * This service coordinates all components for mathematical expression recognition
 */

import { 
  LLMService,
  LLMResponse,
  ProcessingResult,
  ProcessingError,
  OCRProcessingState,
  OCRProcessingStage,
  ProcessingMetadata,
  CameraOCRConfig
} from '../types/camera-ocr';

import { createLLMService } from './LLMService';
import { ImagePreprocessor, ProcessedImageResult } from './ImagePreprocessor';
import { MathExpressionParser } from './ExpressionParser';
import { ConfigurationManager } from './ConfigurationManager';
import { DebugLoggerService } from './DebugLoggerService';

export interface OCRServiceOptions {
  configManager: ConfigurationManager;
  debugLogger?: DebugLoggerService;
  onProgressUpdate?: (state: OCRProcessingState) => void;
  onError?: (error: ProcessingError) => void;
}

export class OCRService {
  private llmService: LLMService;
  private imagePreprocessor: ImagePreprocessor;
  private expressionParser: MathExpressionParser;
  private configManager: ConfigurationManager;
  private debugLogger?: DebugLoggerService;
  private onProgressUpdate?: (state: OCRProcessingState) => void;
  private onError?: (error: ProcessingError) => void;
  
  private currentProcessingState: OCRProcessingState = {
    stage: 'idle',
    progress: 0,
    currentOperation: 'Ready'
  };

  constructor(options: OCRServiceOptions) {
    this.configManager = options.configManager;
    this.debugLogger = options.debugLogger;
    this.onProgressUpdate = options.onProgressUpdate;
    this.onError = options.onError;

    // Initialize services
    const config = this.configManager.getConfiguration();
    this.llmService = createLLMService(config.llm);
    this.imagePreprocessor = new ImagePreprocessor(config.camera);
    this.expressionParser = new MathExpressionParser();
  }

  /**
   * Process image and extract mathematical expression
   * Handles both camera capture and file upload sources
   * @param imageData - Base64 encoded image data
   * @param source - Source of the image ('capture' or 'upload')
   */
  async processImage(imageData: string, source: 'capture' | 'upload' = 'capture'): Promise<ProcessingResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const config = this.configManager.getProcessingConfig();

    // Log OCR processing start with source information
    if (this.debugLogger) {
      this.debugLogger.logOCRProcessing('start', {
        imageSize: imageData.length,
        source,
        timestamp: startTime
      });
    }

    try {
      // Validate input
      this.updateProcessingState('capturing', 5, 'Validating image...');
      
      const validation = this.imagePreprocessor.validateImage(imageData);
      if (!validation.isValid) {
        throw this.createProcessingError(
          'image-invalid',
          `Image validation failed: ${validation.errors.join(', ')}`,
          'capturing'
        );
      }

      // Log validation success
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('validation', {
          isValid: validation.isValid,
          imageSize: imageData.length,
          source
        });
      }

      // Save original image if debug mode is enabled
      if (this.debugLogger && this.debugLogger.isDebugMode()) {
        this.debugLogger.logFrameCapture(imageData, {
          source,
          stage: 'original',
          timestamp: Date.now()
        });
      }

      // Preprocess image
      this.updateProcessingState('preprocessing', 15, 'Optimizing image for OCR...');
      
      const preprocessedImage = await this.preprocessImage(imageData);
      
      // Log preprocessing completion
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('preprocessing-complete', {
          originalSize: preprocessedImage.originalSize,
          processedSize: preprocessedImage.imageData.length,
          compressionRatio: (preprocessedImage.imageData.length / imageData.length).toFixed(2),
          source
        });
      }
      
      // Process with LLM (with retry logic)
      let llmResponse: LLMResponse | null = null;
      
      while (retryCount <= config.retryAttempts && !llmResponse?.success) {
        try {
          this.updateProcessingState(
            'processing', 
            30 + (retryCount * 20), 
            retryCount > 0 ? `Retrying OCR processing (attempt ${retryCount + 1})...` : 'Processing with AI...'
          );
          
          // Log LLM processing start
          if (this.debugLogger) {
            this.debugLogger.logOCRProcessing('llm-processing-start', {
              attempt: retryCount + 1,
              maxAttempts: config.retryAttempts + 1,
              source
            });
          }
          
          const llmStartTime = Date.now();
          llmResponse = await this.processWithLLM(preprocessedImage.imageData);
          const llmDuration = Date.now() - llmStartTime;
          
          // Log LLM processing result
          if (this.debugLogger) {
            this.debugLogger.logOCRProcessing('llm-processing-complete', {
              success: llmResponse.success,
              confidence: llmResponse.confidence,
              tokensUsed: llmResponse.tokensUsed,
              duration: llmDuration,
              attempt: retryCount + 1,
              source
            });
          }
          
          if (!llmResponse.success && retryCount < config.retryAttempts) {
            const delayMs = config.retryDelay * Math.pow(2, retryCount);
            
            // Log retry delay
            if (this.debugLogger) {
              this.debugLogger.logOCRProcessing('retry-delay', {
                attempt: retryCount + 1,
                delayMs,
                reason: llmResponse.error || 'Unknown error'
              });
            }
            
            await this.delay(delayMs); // Exponential backoff
            retryCount++;
          }
        } catch (error) {
          // Log retry error
          if (this.debugLogger && error instanceof Error) {
            this.debugLogger.logError('OCRService', error, {
              stage: 'llm-processing',
              attempt: retryCount + 1,
              source
            });
          }
          
          if (retryCount >= config.retryAttempts) {
            throw error;
          }
          retryCount++;
          await this.delay(config.retryDelay * Math.pow(2, retryCount));
        }
      }

      if (!llmResponse?.success) {
        throw this.createProcessingError(
          'llm-service-error',
          llmResponse?.error || 'LLM processing failed after all retries',
          'processing'
        );
      }

      // Parse and validate expression
      this.updateProcessingState('parsing', 80, 'Parsing mathematical expression...');
      
      // Log parsing start
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('parsing-start', {
          rawExpression: llmResponse.expression,
          source
        });
      }
      
      const parsedExpression = await this.parseExpression(llmResponse);
      
      // Log expression parsing
      if (this.debugLogger) {
        this.debugLogger.logExpressionParsing(
          llmResponse.expression || '',
          parsedExpression,
          true
        );
      }
      
      // Validate final result
      this.updateProcessingState('validating', 90, 'Validating result...');
      
      // Log validation start
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('validation-start', {
          expression: parsedExpression,
          confidence: llmResponse.confidence,
          source
        });
      }
      
      const finalResult = await this.validateAndFinalize(
        imageData,
        preprocessedImage,
        llmResponse,
        parsedExpression,
        retryCount,
        startTime,
        source
      );

      // Log OCR result with comprehensive metrics
      if (this.debugLogger) {
        this.debugLogger.saveOCRResult(finalResult);
        this.debugLogger.logOCRProcessing('complete', {
          expression: finalResult.recognizedExpression,
          confidence: finalResult.confidence,
          processingTime: finalResult.processingTime,
          retryCount: finalResult.metadata.retryCount,
          tokensUsed: finalResult.metadata.tokensUsed,
          source: finalResult.metadata.source,
          calculationResult: finalResult.calculationResult,
          timestamp: finalResult.timestamp
        });
      }

      this.updateProcessingState('complete', 100, 'Processing complete!');
      
      return finalResult;

    } catch (error) {
      const processingError = this.isProcessingError(error)
        ? error as ProcessingError
        : this.createProcessingError(
            'processing-failed',
            error instanceof Error ? error.message : 'Unknown error occurred',
            this.currentProcessingState.stage
          );

      // Log error with full context
      if (this.debugLogger && error instanceof Error) {
        this.debugLogger.logError('OCRService', error, {
          stage: this.currentProcessingState.stage,
          retryCount,
          processingTime: Date.now() - startTime,
          source,
          errorType: processingError.type,
          recoverable: processingError.recoverable,
          retryable: processingError.retryable,
          suggestedAction: processingError.suggestedAction,
          imageSize: imageData.length
        });
      }

      // Log detailed error information for debugging
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('error', {
          errorType: processingError.type,
          errorMessage: processingError.message,
          stage: processingError.stage,
          recoverable: processingError.recoverable,
          retryable: processingError.retryable,
          suggestedAction: processingError.suggestedAction,
          retryCount,
          source,
          processingTime: Date.now() - startTime,
          timestamp: processingError.timestamp
        });
      }

      this.updateProcessingState('error', 0, 'Processing failed');
      
      if (this.onError) {
        this.onError(processingError);
      }

      throw processingError;
    }
  }

  /**
   * Cancel current processing operation
   */
  cancelProcessing(): void {
    this.updateProcessingState('idle', 0, 'Processing cancelled');
  }

  /**
   * Get current processing state
   */
  getProcessingState(): OCRProcessingState {
    return { ...this.currentProcessingState };
  }

  /**
   * Update configuration and reinitialize services
   */
  async updateConfiguration(config: Partial<CameraOCRConfig>): Promise<void> {
    const validation = await this.configManager.updateConfiguration(config);
    
    if (!validation.isValid) {
      throw new Error(`Configuration update failed: ${validation.errors.join(', ')}`);
    }
    
    // Reinitialize services with new configuration
    const newConfig = this.configManager.getConfiguration();
    this.llmService = createLLMService(newConfig.llm);
    this.imagePreprocessor = new ImagePreprocessor(newConfig.camera);
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return this.llmService.getUsageStats();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.imagePreprocessor.cleanup();
    this.currentProcessingState = {
      stage: 'idle',
      progress: 0,
      currentOperation: 'Ready'
    };
  }

  private async preprocessImage(imageData: string): Promise<ProcessedImageResult> {
    try {
      const options = this.imagePreprocessor.getOptimalProcessingOptions(imageData);
      return await this.imagePreprocessor.processImageForOCR(imageData, options);
    } catch (error) {
      throw this.createProcessingError(
        'image-invalid',
        `Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'preprocessing'
      );
    }
  }

  private async processWithLLM(imageData: string): Promise<LLMResponse> {
    try {
      const config = this.configManager.getLLMConfig();
      
      if (!config.apiKey) {
        throw this.createProcessingError(
          'llm-service-error',
          'LLM API key not configured',
          'processing'
        );
      }

      return await this.llmService.analyzeImage(imageData);
    } catch (error) {
      throw this.createProcessingError(
        'llm-service-error',
        `LLM processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'processing'
      );
    }
  }

  private async parseExpression(llmResponse: LLMResponse): Promise<string> {
    try {
      if (!llmResponse.expression) {
        throw new Error('No mathematical expression found in image');
      }

      const extractedExpression = this.llmService.extractMathExpression(llmResponse);
      
      if (!extractedExpression || extractedExpression === 'NO_MATH_FOUND') {
        throw new Error('No valid mathematical expression could be extracted');
      }

      const parsed = this.expressionParser.parseExpression(extractedExpression);
      
      if (!parsed.isValid) {
        throw new Error(`Invalid expression: ${parsed.error}`);
      }

      return parsed.normalizedExpression;
    } catch (error) {
      throw this.createProcessingError(
        'parsing-failed',
        `Expression parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parsing'
      );
    }
  }

  private async validateAndFinalize(
    originalImage: string,
    preprocessedImage: ProcessedImageResult,
    llmResponse: LLMResponse,
    expression: string,
    retryCount: number,
    startTime: number,
    source: 'capture' | 'upload' = 'capture'
  ): Promise<ProcessingResult> {
    
    // Validate the expression can be calculated
    const evaluation = this.expressionParser.evaluateExpression(expression);
    
    if (!evaluation.isValid) {
      const error = this.createProcessingError(
        'validation-failed',
        `Expression validation failed: ${evaluation.error}`,
        'validating'
      );
      
      // Log validation failure with full context
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('validation-failed', {
          expression,
          evaluationError: evaluation.error,
          confidence: llmResponse.confidence,
          source,
          retryCount
        });
      }
      
      throw error;
    }

    // Check confidence thresholds
    const confidence = llmResponse.confidence || 0;
    const minConfidence = 0.3; // Hard minimum threshold
    const warningConfidence = 0.6; // Warning threshold
    
    if (confidence < minConfidence) {
      const error = this.createProcessingError(
        'insufficient-confidence',
        `Low confidence score: ${(confidence * 100).toFixed(1)}%. Please try with a clearer image.`,
        'validating'
      );
      
      // Log low confidence with full context
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('insufficient-confidence', {
          confidence,
          minConfidence,
          expression,
          source,
          retryCount,
          suggestion: 'Improve image quality, lighting, or focus'
        });
      }
      
      throw error;
    }
    
    // Log warning for moderate confidence
    if (confidence < warningConfidence) {
      if (this.debugLogger) {
        this.debugLogger.logOCRProcessing('low-confidence-warning', {
          confidence,
          warningConfidence,
          expression,
          source,
          message: 'Result accepted but confidence is below optimal threshold'
        });
      }
    }

    // Log successful validation
    if (this.debugLogger) {
      this.debugLogger.logOCRProcessing('validation-success', {
        expression,
        confidence,
        calculationResult: evaluation.result?.toString(),
        source,
        retryCount
      });
    }

    // Create processing metadata
    const metadata: ProcessingMetadata = {
      imageSize: preprocessedImage.originalSize,
      imageResolution: this.configManager.getCameraConfig().preferredResolution,
      llmProvider: this.configManager.getLLMConfig().provider,
      tokensUsed: llmResponse.tokensUsed,
      retryCount,
      source
    };

    // Create final result
    const result: ProcessingResult = {
      originalImage,
      recognizedExpression: expression,
      confidence,
      calculationResult: evaluation.result?.toString(),
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      metadata
    };

    return result;
  }

  private updateProcessingState(
    stage: OCRProcessingStage, 
    progress: number, 
    operation: string
  ): void {
    this.currentProcessingState = {
      stage,
      progress,
      currentOperation: operation,
      startTime: this.currentProcessingState.startTime || Date.now(),
      estimatedTimeRemaining: this.calculateEstimatedTime(progress)
    };

    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...this.currentProcessingState });
    }
  }

  private calculateEstimatedTime(progress: number): number | undefined {
    if (!this.currentProcessingState.startTime || progress <= 0) {
      return undefined;
    }

    const elapsed = Date.now() - this.currentProcessingState.startTime;
    const estimatedTotal = (elapsed / progress) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  private createProcessingError(
    type: ProcessingError['type'],
    message: string,
    stage: OCRProcessingStage
  ): ProcessingError {
    return {
      type,
      message,
      stage,
      recoverable: this.isRecoverableError(type),
      retryable: this.isRetryableError(type),
      suggestedAction: this.getSuggestedAction(type),
      timestamp: Date.now()
    };
  }

  private isRecoverableError(type: ProcessingError['type']): boolean {
    const recoverableTypes = [
      'image-invalid',
      'insufficient-confidence',
      'parsing-failed'
    ];
    return recoverableTypes.includes(type);
  }

  private isRetryableError(type: ProcessingError['type']): boolean {
    const retryableTypes = [
      'llm-service-error',
      'timeout',
      'rate-limit-exceeded'
    ];
    return retryableTypes.includes(type);
  }

  private getSuggestedAction(type: ProcessingError['type']): string {
    const suggestions: Record<ProcessingError['type'], string> = {
      'image-invalid': 'Please capture a clearer image with better lighting and ensure the math expression is visible',
      'llm-service-error': 'Check your internet connection and API key configuration. If the problem persists, try again in a few moments',
      'parsing-failed': 'Ensure the image contains clear mathematical expressions. Try repositioning the camera or using better lighting',
      'validation-failed': 'The recognized expression could not be validated. Try capturing the expression again with better clarity',
      'timeout': 'The request timed out. Check your internet connection and try again',
      'rate-limit-exceeded': 'API rate limit reached. Please wait a moment before trying again',
      'insufficient-confidence': 'The recognition confidence is too low. Try capturing the image with better lighting, focus, and contrast. Ensure the math expression is clearly visible',
      'processing-failed': 'Processing failed unexpectedly. Please try again or use the image upload feature'
    };

    return suggestions[type] || 'An unexpected error occurred. Please try again or contact support';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isProcessingError(error: any): boolean {
    return error && typeof error === 'object' && 'type' in error && 'stage' in error;
  }

  /**
   * Get detailed retry suggestions based on error type and context
   */
  getRetrySuggestions(error: ProcessingError): string[] {
    const suggestions: string[] = [];
    
    // Add general retry suggestion if retryable
    if (error.retryable) {
      suggestions.push('Try processing the image again');
    }
    
    // Add specific suggestions based on error type
    switch (error.type) {
      case 'image-invalid':
        suggestions.push('Ensure the image is in a supported format (PNG, JPEG, WEBP)');
        suggestions.push('Check that the image file is not corrupted');
        suggestions.push('Try capturing a new image with better quality');
        break;
        
      case 'insufficient-confidence':
        suggestions.push('Improve lighting conditions');
        suggestions.push('Ensure the math expression is clearly visible and in focus');
        suggestions.push('Position the camera closer to the expression');
        suggestions.push('Use a plain background to reduce noise');
        suggestions.push('Try uploading a higher quality image instead');
        break;
        
      case 'parsing-failed':
        suggestions.push('Ensure the expression uses standard mathematical notation');
        suggestions.push('Write numbers and operators more clearly');
        suggestions.push('Avoid ambiguous symbols or handwriting');
        suggestions.push('Try typing the expression manually if recognition continues to fail');
        break;
        
      case 'llm-service-error':
        suggestions.push('Check your internet connection');
        suggestions.push('Verify your API key is configured correctly');
        suggestions.push('Wait a moment and try again');
        suggestions.push('Check if the LLM service is experiencing issues');
        break;
        
      case 'timeout':
        suggestions.push('Check your internet connection speed');
        suggestions.push('Try with a smaller or compressed image');
        suggestions.push('Wait a moment and try again');
        break;
        
      case 'rate-limit-exceeded':
        suggestions.push('Wait a few minutes before trying again');
        suggestions.push('Consider upgrading your API plan if this happens frequently');
        break;
        
      case 'validation-failed':
        suggestions.push('Ensure the expression is mathematically valid');
        suggestions.push('Check for missing operators or operands');
        suggestions.push('Try simplifying the expression');
        break;
        
      case 'processing-failed':
        suggestions.push('Try using the image upload feature instead of camera capture');
        suggestions.push('Restart the application if the problem persists');
        suggestions.push('Check the debug logs for more information');
        break;
    }
    
    // Add recovery suggestion if recoverable
    if (error.recoverable) {
      suggestions.push('This error is recoverable - you can try again immediately');
    }
    
    return suggestions;
  }

  /**
   * Check if an error should trigger an automatic retry
   */
  shouldAutoRetry(error: ProcessingError, currentRetryCount: number): boolean {
    const maxAutoRetries = this.configManager.getProcessingConfig().retryAttempts;
    
    // Don't auto-retry if we've exceeded the limit
    if (currentRetryCount >= maxAutoRetries) {
      return false;
    }
    
    // Auto-retry for specific error types
    const autoRetryTypes: ProcessingError['type'][] = [
      'llm-service-error',
      'timeout',
      'processing-failed'
    ];
    
    return autoRetryTypes.includes(error.type) && error.retryable;
  }
}

/**
 * Factory function to create OCR service with default configuration
 */
export async function createOCRService(
  configManager: ConfigurationManager,
  options: Partial<OCRServiceOptions> = {}
): Promise<OCRService> {
  
  // Ensure configuration is initialized
  await configManager.initialize();
  
  return new OCRService({
    configManager,
    ...options
  });
}