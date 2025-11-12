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

export interface OCRServiceOptions {
  configManager: ConfigurationManager;
  onProgressUpdate?: (state: OCRProcessingState) => void;
  onError?: (error: ProcessingError) => void;
}

export class OCRService {
  private llmService: LLMService;
  private imagePreprocessor: ImagePreprocessor;
  private expressionParser: MathExpressionParser;
  private configManager: ConfigurationManager;
  private onProgressUpdate?: (state: OCRProcessingState) => void;
  private onError?: (error: ProcessingError) => void;
  
  private currentProcessingState: OCRProcessingState = {
    stage: 'idle',
    progress: 0,
    currentOperation: 'Ready'
  };

  constructor(options: OCRServiceOptions) {
    this.configManager = options.configManager;
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
   */
  async processImage(imageData: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const config = this.configManager.getProcessingConfig();

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

      // Preprocess image
      this.updateProcessingState('preprocessing', 15, 'Optimizing image for OCR...');
      
      const preprocessedImage = await this.preprocessImage(imageData);
      
      // Process with LLM (with retry logic)
      let llmResponse: LLMResponse | null = null;
      
      while (retryCount <= config.retryAttempts && !llmResponse?.success) {
        try {
          this.updateProcessingState(
            'processing', 
            30 + (retryCount * 20), 
            retryCount > 0 ? `Retrying OCR processing (attempt ${retryCount + 1})...` : 'Processing with AI...'
          );
          
          llmResponse = await this.processWithLLM(preprocessedImage.imageData);
          
          if (!llmResponse.success && retryCount < config.retryAttempts) {
            await this.delay(config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
            retryCount++;
          }
        } catch (error) {
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
      
      const parsedExpression = await this.parseExpression(llmResponse);
      
      // Validate final result
      this.updateProcessingState('validating', 90, 'Validating result...');
      
      const finalResult = await this.validateAndFinalize(
        imageData,
        preprocessedImage,
        llmResponse,
        parsedExpression,
        retryCount,
        startTime
      );

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
    startTime: number
  ): Promise<ProcessingResult> {
    
    // Validate the expression can be calculated
    const evaluation = this.expressionParser.evaluateExpression(expression);
    
    if (!evaluation.isValid) {
      throw this.createProcessingError(
        'validation-failed',
        `Expression validation failed: ${evaluation.error}`,
        'validating'
      );
    }

    // Check confidence threshold
    const minConfidence = 0.3; // Configurable threshold
    if ((llmResponse.confidence || 0) < minConfidence) {
      throw this.createProcessingError(
        'insufficient-confidence',
        `Low confidence score: ${llmResponse.confidence}. Please try with a clearer image.`,
        'validating'
      );
    }

    // Create processing metadata
    const metadata: ProcessingMetadata = {
      imageSize: preprocessedImage.originalSize,
      imageResolution: this.configManager.getCameraConfig().preferredResolution,
      llmProvider: this.configManager.getLLMConfig().provider,
      tokensUsed: llmResponse.tokensUsed,
      retryCount
    };

    // Create final result
    const result: ProcessingResult = {
      originalImage,
      recognizedExpression: expression,
      confidence: llmResponse.confidence || 0,
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
    const suggestions = {
      'image-invalid': 'Please capture a clearer image with better lighting',
      'llm-service-error': 'Check your internet connection and API key configuration',
      'parsing-failed': 'Ensure the image contains clear mathematical expressions',
      'validation-failed': 'Try capturing the expression again with better clarity',
      'timeout': 'Check your internet connection and try again',
      'rate-limit-exceeded': 'Please wait a moment before trying again',
      'insufficient-confidence': 'Try capturing the image with better lighting and focus'
    };

    return suggestions[type] || 'Please try again or contact support';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isProcessingError(error: any): boolean {
    return error && typeof error === 'object' && 'type' in error && 'stage' in error;
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