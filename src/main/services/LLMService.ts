/**
 * LLM Service for Mathematical Expression Recognition
 * Handles integration with external LLM services (primarily Google Gemini)
 */

import { 
  LLMService, 
  LLMResponse, 
  LLMConfig, 
  LLMUsageStats
} from '../types/camera-ocr';
import { NetworkRetryHandler, CircuitBreaker } from './NetworkRetryHandler';
import { CameraOCRErrorHandler } from './CameraOCRErrorHandler';

export class GeminiLLMService implements LLMService {
  private config: LLMConfig;
  private usageStats: LLMUsageStats;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly defaultModel = 'gemini-pro-vision';
  private retryHandler: NetworkRetryHandler;
  private circuitBreaker: CircuitBreaker;
  private readonly mathPrompt = `
    Analyze this image and extract ONLY mathematical expressions. 
    Return the mathematical expression in standard notation that can be calculated.
    If multiple expressions are found, return the most prominent one.
    If no mathematical expressions are found, return "NO_MATH_FOUND".
    
    Rules:
    - Return only the mathematical expression, no explanations
    - Use standard operators: +, -, *, /, (, )
    - Convert written numbers to digits (e.g., "five" → "5")
    - Handle fractions as division (e.g., "1/2" → "1/2")
    - Ignore any text that is not mathematical
    
    Examples of valid responses:
    - "2 + 3 * 4"
    - "(15 - 3) / 2"
    - "25 * 0.5"
    - "NO_MATH_FOUND"
  `;

  constructor(config: LLMConfig) {
    this.config = config;
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      averageProcessingTime: 0
    };
    this.retryHandler = new NetworkRetryHandler('llm_service');
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
  }

  async analyzeImage(imageData: string, customPrompt?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    this.usageStats.totalRequests++;

    try {
      // Validate inputs
      if (!this.config.apiKey) {
        const error = CameraOCRErrorHandler.createProcessingError(
          'llm-service-error',
          'LLM API key not configured',
          'processing',
          new Error('API key missing'),
          'Configure API key in application settings'
        );
        throw error;
      }

      if (!imageData || !imageData.startsWith('data:image/')) {
        const error = CameraOCRErrorHandler.createProcessingError(
          'image-invalid',
          'Invalid image data format',
          'preprocessing',
          new Error('Invalid image format'),
          'Ensure image is in proper base64 format'
        );
        throw error;
      }

      // Use circuit breaker and retry handler for the API call
      const result = await this.circuitBreaker.execute(async () => {
        return await this.retryHandler.retryLLMOperation(async () => {
          return await this.makeAPIRequest(imageData, customPrompt);
        }, imageData.length);
      });

      // Update usage stats for successful request
      this.usageStats.successfulRequests++;
      const tokensUsed = result.tokensUsed || 0;
      this.usageStats.totalTokensUsed += tokensUsed;
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      return {
        ...result,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.usageStats.failedRequests++;
      this.updateAverageProcessingTime(processingTime);

      console.error('LLM Service Error:', error);

      // Handle different types of errors appropriately
      if (error instanceof Error && 'type' in error) {
        // Already a ProcessingError from our error handler
        return {
          success: false,
          error: error.message,
          processingTime
        };
      }

      // Create appropriate error based on the failure
      const processingError = CameraOCRErrorHandler.handleLLMServiceError(
        error instanceof Error ? error : new Error(String(error)),
        'processing'
      );

      return {
        success: false,
        error: processingError.message,
        processingTime
      };
    }
  }

  /**
   * Makes the actual API request with proper error handling
   */
  private async makeAPIRequest(imageData: string, customPrompt?: string): Promise<LLMResponse> {
    // Prepare the request
    const prompt = customPrompt || this.mathPrompt;
    const model = this.config.model || this.defaultModel;
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.config.apiKey}`;

    // Extract base64 data from data URL
    const base64Data = imageData.split(',')[1];
    const mimeType = imageData.split(';')[0].split(':')[1];

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: this.config.temperature || 0.1,
        maxOutputTokens: this.config.maxTokens || 100,
        topP: 0.8,
        topK: 10
      }
    };

    // Make the API request with retry handler
    const response = await this.retryHandler.retryFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }, 'Gemini API');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      // Handle specific API error codes
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status >= 500) {
        throw new Error(`Server error: ${errorMessage}`);
      } else {
        throw new Error(`API request failed: ${response.status} - ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Extract the response text
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates received from API');
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('No content in API response');
    }

    const responseText = content.parts[0].text?.trim();
    if (!responseText) {
      throw new Error('Empty response from API');
    }

    // Validate and extract expression
    const expression = this.extractMathExpression({ 
      success: true, 
      expression: responseText,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0
    });

    const confidence = this.calculateConfidence(responseText, expression);

    return {
      success: true,
      expression: expression === 'NO_MATH_FOUND' ? undefined : expression,
      confidence,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0
    };
  }

  validateResponse(response: LLMResponse): boolean {
    if (!response.success) {
      return false;
    }

    if (!response.expression) {
      return false;
    }

    // Basic validation of mathematical expression
    const mathRegex = /^[\d\s+\-*/().]+$/;
    return mathRegex.test(response.expression);
  }

  extractMathExpression(response: LLMResponse): string {
    if (!response.success || !response.expression) {
      return '';
    }

    let expression = response.expression.trim();

    // Handle "NO_MATH_FOUND" response
    if (expression.toUpperCase().includes('NO_MATH_FOUND')) {
      return 'NO_MATH_FOUND';
    }

    // Clean up the expression
    expression = this.cleanExpression(expression);

    // Validate the cleaned expression
    if (!this.isValidMathExpression(expression)) {
      return '';
    }

    return expression;
  }

  getUsageStats(): LLMUsageStats {
    return { ...this.usageStats };
  }

  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  resetUsageStats(): void {
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      averageProcessingTime: 0
    };
  }

  private cleanExpression(expression: string): string {
    // Remove any explanatory text and keep only the mathematical expression
    let cleaned = expression;

    // Remove common prefixes/suffixes
    const patterns = [
      /^.*?(?:expression|equation|calculation):\s*/i,
      /^.*?(?:answer|result):\s*/i,
      /^.*?(?:is|equals?):\s*/i,
      /\s*(?:=.*)?$/,
      /['""`]/g,
      /\s+/g
    ];

    patterns.forEach(pattern => {
      if (pattern.global) {
        cleaned = cleaned.replace(pattern, pattern.source === '\\s+' ? ' ' : '');
      } else {
        cleaned = cleaned.replace(pattern, '');
      }
    });

    // Normalize operators
    cleaned = cleaned
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\s*([+\-*/()])\s*/g, '$1')
      .trim();

    return cleaned;
  }

  private isValidMathExpression(expression: string): boolean {
    if (!expression || expression.length === 0) {
      return false;
    }

    // Check for valid characters only
    const validChars = /^[\d+\-*/().\s]+$/;
    if (!validChars.test(expression)) {
      return false;
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return false;
    }
    if (parenCount !== 0) return false;

    // Check for valid operator placement
    const operatorRegex = /[+\-*/]{2,}/;
    if (operatorRegex.test(expression)) {
      return false;
    }

    // Check that expression doesn't start or end with operators (except minus)
    if (/^[+*/]|[+\-*/]$/.test(expression)) {
      return false;
    }

    return true;
  }

  private calculateConfidence(rawResponse: string, extractedExpression: string): number {
    if (extractedExpression === 'NO_MATH_FOUND' || !extractedExpression) {
      return 0;
    }

    let confidence = 0.5; // Base confidence

    // Higher confidence for cleaner responses
    if (rawResponse.length < 50) confidence += 0.2;
    
    // Higher confidence for expressions with numbers
    if (/\d/.test(extractedExpression)) confidence += 0.2;
    
    // Higher confidence for balanced expressions
    if (this.isWellFormed(extractedExpression)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private isWellFormed(expression: string): boolean {
    // Check if expression has proper structure (number operator number pattern)
    const wellFormedPattern = /^\d+(\s*[+\-*/]\s*\d+)*$/;
    return wellFormedPattern.test(expression.replace(/[()]/g, ''));
  }

  private updateAverageProcessingTime(newTime: number): void {
    const totalRequests = this.usageStats.totalRequests;
    const currentAverage = this.usageStats.averageProcessingTime;
    this.usageStats.averageProcessingTime = 
      ((currentAverage * (totalRequests - 1)) + newTime) / totalRequests;
  }
}

/**
 * Factory function to create LLM service instances
 */
export function createLLMService(config: LLMConfig): LLMService {
  switch (config.provider) {
    case 'gemini':
      return new GeminiLLMService(config);
    case 'openai':
      // TODO: Implement OpenAI service
      throw new Error('OpenAI provider not yet implemented');
    case 'claude':
      // TODO: Implement Claude service
      throw new Error('Claude provider not yet implemented');
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}