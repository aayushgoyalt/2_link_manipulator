/**
 * Expression Parser and Validator for Mathematical Expressions
 * Handles parsing, validation, and normalization of mathematical expressions from LLM responses
 */

import { 
  ExpressionParser, 
  ParsedExpression, 
  CalculatorInput, 
  ExpressionComplexity,
  ProcessingMetadata 
} from '../types/camera-ocr';
import { CameraOCRErrorHandler } from './CameraOCRErrorHandler';

export class MathExpressionParser implements ExpressionParser {
  private readonly supportedOperators = ['+', '-', '*', '/', '(', ')'];

  parseExpression(rawExpression: string): ParsedExpression {
    try {
      // Handle special cases first
      if (!rawExpression || typeof rawExpression !== 'string') {
        const error = CameraOCRErrorHandler.handleExpressionParsingError('', new Error('No expression provided'));
        return {
          isValid: false,
          normalizedExpression: '',
          operands: [],
          operators: [],
          error: error.message,
          complexity: 'simple'
        };
      }

      // Check for "NO_MATH_FOUND" response from LLM
      if (rawExpression.toUpperCase().includes('NO_MATH_FOUND')) {
        const error = CameraOCRErrorHandler.handleExpressionParsingError(rawExpression);
        return {
          isValid: false,
          normalizedExpression: rawExpression,
          operands: [],
          operators: [],
          error: error.message,
          complexity: 'simple'
        };
      }

      // Clean and normalize the expression
      const normalizedExpression = this.normalizeExpression(rawExpression);
      
      if (!normalizedExpression) {
        const error = CameraOCRErrorHandler.handleExpressionParsingError(rawExpression, new Error('Expression normalization failed'));
        return {
          isValid: false,
          normalizedExpression: '',
          operands: [],
          operators: [],
          error: error.message,
          complexity: 'simple'
        };
      }

      // Validate syntax with detailed error reporting
      const syntaxValidation = this.validateSyntaxWithDetails(normalizedExpression);
      if (!syntaxValidation.isValid) {
        const error = CameraOCRErrorHandler.handleExpressionParsingError(
          normalizedExpression, 
          new Error(syntaxValidation.error || 'Invalid syntax')
        );
        return {
          isValid: false,
          normalizedExpression,
          operands: [],
          operators: [],
          error: error.message,
          complexity: 'simple'
        };
      }

      // Extract operands and operators
      const { operands, operators } = this.extractComponents(normalizedExpression);
      
      // Validate that we have meaningful mathematical content
      if (operands.length === 0 && operators.length === 0) {
        const error = CameraOCRErrorHandler.handleExpressionParsingError(
          normalizedExpression, 
          new Error('No mathematical content found')
        );
        return {
          isValid: false,
          normalizedExpression,
          operands: [],
          operators: [],
          error: error.message,
          complexity: 'simple'
        };
      }
      
      // Determine complexity
      const complexity = this.determineComplexity(normalizedExpression, operands, operators);

      // Final validation - try to evaluate the expression
      const evaluation = this.evaluateExpression(normalizedExpression);
      if (!evaluation.isValid) {
        const error = CameraOCRErrorHandler.handleExpressionParsingError(
          normalizedExpression, 
          new Error(evaluation.error || 'Expression evaluation failed')
        );
        return {
          isValid: false,
          normalizedExpression,
          operands,
          operators,
          error: error.message,
          complexity
        };
      }

      return {
        isValid: true,
        normalizedExpression,
        operands,
        operators,
        complexity
      };

    } catch (error) {
      const processingError = CameraOCRErrorHandler.handleExpressionParsingError(
        rawExpression, 
        error instanceof Error ? error : new Error('Unknown parsing error')
      );
      
      return {
        isValid: false,
        normalizedExpression: rawExpression,
        operands: [],
        operators: [],
        error: processingError.message,
        complexity: 'simple'
      };
    }
  }

  validateSyntax(expression: string): boolean {
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    // Remove whitespace for validation
    const cleaned = expression.replace(/\s/g, '');

    // Check for empty expression
    if (cleaned.length === 0) {
      return false;
    }

    // Check for valid characters only
    const validCharRegex = /^[\d+\-*/().\s]+$/;
    if (!validCharRegex.test(cleaned)) {
      return false;
    }

    // Check for balanced parentheses
    if (!this.hasBalancedParentheses(cleaned)) {
      return false;
    }

    // Check for valid operator placement
    if (!this.hasValidOperatorPlacement(cleaned)) {
      return false;
    }

    // Check for valid number format
    if (!this.hasValidNumbers(cleaned)) {
      return false;
    }

    // Check for consecutive operators (except unary minus)
    if (!this.hasValidOperatorSequence(cleaned)) {
      return false;
    }

    return true;
  }

  normalizeExpression(expression: string): string {
    if (!expression || typeof expression !== 'string') {
      return '';
    }

    let normalized = expression.trim();

    // Remove any non-mathematical content
    normalized = this.removeNonMathContent(normalized);

    // Normalize operators
    normalized = normalized
      .replace(/×/g, '*')           // Multiplication symbol
      .replace(/÷/g, '/')           // Division symbol
      .replace(/−/g, '-')           // Minus symbol
      .replace(/\s*([+\-*/()])\s*/g, ' $1 ')  // Add spaces around operators
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();

    // Handle implicit multiplication (e.g., "2(3+4)" -> "2*(3+4)")
    normalized = this.addImplicitMultiplication(normalized);

    // Normalize decimal points
    normalized = this.normalizeDecimals(normalized);

    // Remove leading/trailing operators (except unary minus)
    normalized = this.cleanOperatorPlacement(normalized);

    return normalized;
  }

  convertToCalculatorFormat(expression: string): CalculatorInput {
    const parsed = this.parseExpression(expression);
    
    return {
      expression: parsed.normalizedExpression,
      isFromOCR: true,
      confidence: parsed.isValid ? 0.8 : 0.3,
      metadata: {
        imageSize: 0, // Will be filled by calling service
        imageResolution: { width: 0, height: 0, label: '' }, // Will be filled by calling service
        llmProvider: 'gemini', // Default provider
        retryCount: 0,
        processingTime: 0
      } as ProcessingMetadata
    };
  }

  /**
   * Evaluate expression to check if it's mathematically valid
   */
  evaluateExpression(expression: string): { isValid: boolean; result?: number; error?: string } {
    try {
      const parsed = this.parseExpression(expression);
      
      if (!parsed.isValid) {
        return { isValid: false, error: parsed.error };
      }

      // Use Function constructor for safe evaluation (better than eval)
      // This is still potentially unsafe, but we've validated the input
      const result = this.safeEvaluate(parsed.normalizedExpression);
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return { isValid: false, error: 'Invalid calculation result' };
      }

      return { isValid: true, result };

    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Evaluation failed' 
      };
    }
  }

  /**
   * Get suggestions for common expression corrections
   */
  getSuggestions(expression: string): string[] {
    const suggestions: string[] = [];
    
    if (!expression) {
      return ['Enter a mathematical expression'];
    }

    const issues = this.identifyIssues(expression);
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'unbalanced-parentheses':
          suggestions.push('Check parentheses - make sure they are balanced');
          break;
        case 'invalid-operators':
          suggestions.push('Use only +, -, *, / operators');
          break;
        case 'consecutive-operators':
          suggestions.push('Remove consecutive operators');
          break;
        case 'invalid-numbers':
          suggestions.push('Check number format - use decimal points correctly');
          break;
        case 'empty-expression':
          suggestions.push('Expression cannot be empty');
          break;
        default:
          suggestions.push('Check expression syntax');
      }
    });

    return suggestions.length > 0 ? suggestions : ['Expression looks good!'];
  }

  private removeNonMathContent(expression: string): string {
    // Remove common prefixes and suffixes
    let cleaned = expression;

    // Remove text before mathematical expressions
    const prefixPatterns = [
      /^.*?(?:equals?|is|=)\s*/i,
      /^.*?(?:calculate|solve|compute)\s*/i,
      /^.*?(?:expression|equation):\s*/i,
      /^.*?(?:answer|result):\s*/i
    ];

    prefixPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove text after mathematical expressions
    const suffixPatterns = [
      /\s*(?:equals?|is|=).*$/i,
      /\s*(?:where|when|if).*$/i,
      /\s*[.!?].*$/
    ];

    suffixPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove quotes and other non-math characters
    cleaned = cleaned.replace(/['""`]/g, '');

    return cleaned.trim();
  }

  private hasBalancedParentheses(expression: string): boolean {
    let count = 0;
    for (const char of expression) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private hasValidOperatorPlacement(expression: string): boolean {
    // Check for operators at start/end (except unary minus)
    if (/^[+*/]|[+\-*/]$/.test(expression)) {
      return false;
    }

    // Check for operators after opening parenthesis (except unary minus)
    if (/\([+*/]/.test(expression)) {
      return false;
    }

    // Check for operators before closing parenthesis
    if (/[+\-*/]\)/.test(expression)) {
      return false;
    }

    return true;
  }

  private hasValidNumbers(expression: string): boolean {
    // Check for valid decimal numbers
    const numberRegex = /\d+\.?\d*/g;
    const numbers = expression.match(numberRegex) || [];
    
    return numbers.every(num => {
      // Check for multiple decimal points
      return (num.match(/\./g) || []).length <= 1;
    });
  }

  private hasValidOperatorSequence(expression: string): boolean {
    // Check for consecutive operators (allowing unary minus)
    const consecutiveOps = /[+*/]{2,}|[+*/]-[+*/]/g;
    return !consecutiveOps.test(expression);
  }

  private addImplicitMultiplication(expression: string): string {
    // Add multiplication between number and opening parenthesis
    return expression.replace(/(\d)\s*\(/g, '$1 * (');
  }

  private normalizeDecimals(expression: string): string {
    // Ensure proper decimal format
    return expression.replace(/(\d)\.(\d)/g, '$1.$2');
  }

  private cleanOperatorPlacement(expression: string): string {
    // Remove leading operators except unary minus
    let cleaned = expression.replace(/^[+*/]\s*/, '');
    
    // Remove trailing operators
    cleaned = cleaned.replace(/\s*[+\-*/]$/, '');
    
    return cleaned;
  }

  private extractComponents(expression: string): { operands: number[]; operators: string[] } {
    const operands: number[] = [];
    const operators: string[] = [];

    // Split by operators while keeping the operators
    const parts = expression.split(/([+\-*/()])/);
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;

      if (this.supportedOperators.includes(trimmed)) {
        if (trimmed !== '(' && trimmed !== ')') {
          operators.push(trimmed);
        }
      } else {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) {
          operands.push(num);
        }
      }
    });

    return { operands, operators };
  }

  private determineComplexity(
    expression: string, 
    operands: number[], 
    operators: string[]
  ): ExpressionComplexity {
    // Simple: single operation or just numbers
    if (operators.length <= 1 && operands.length <= 2) {
      return 'simple';
    }

    // Complex: has parentheses or many operations
    if (expression.includes('(') || operators.length > 3 || operands.length > 4) {
      return 'complex';
    }

    // Moderate: multiple operations without parentheses
    return 'moderate';
  }

  private safeEvaluate(expression: string): number {
    // Create a safe evaluation context
    const allowedChars = /^[\d+\-*/().\s]+$/;
    if (!allowedChars.test(expression)) {
      throw new Error('Invalid characters in expression');
    }

    // Use Function constructor for evaluation (safer than eval)
    try {
      const func = new Function('return ' + expression);
      return func();
    } catch (error) {
      throw new Error('Failed to evaluate expression');
    }
  }

  /**
   * Enhanced syntax validation with detailed error reporting
   */
  private validateSyntaxWithDetails(expression: string): { isValid: boolean; error?: string } {
    if (!expression || typeof expression !== 'string') {
      return { isValid: false, error: 'Expression must be a non-empty string' };
    }

    const cleaned = expression.replace(/\s/g, '');
    if (cleaned.length === 0) {
      return { isValid: false, error: 'Expression cannot be empty' };
    }

    // Check for valid characters only
    const validCharRegex = /^[\d+\-*/().\s]+$/;
    if (!validCharRegex.test(cleaned)) {
      return { isValid: false, error: 'Expression contains invalid characters. Use only numbers and +, -, *, /, (, )' };
    }

    // Check for balanced parentheses
    if (!this.hasBalancedParentheses(cleaned)) {
      return { isValid: false, error: 'Parentheses are not balanced' };
    }

    // Check for valid operator placement
    if (!this.hasValidOperatorPlacement(cleaned)) {
      return { isValid: false, error: 'Invalid operator placement. Operators cannot be at the start or end of expression' };
    }

    // Check for valid number format
    if (!this.hasValidNumbers(cleaned)) {
      return { isValid: false, error: 'Invalid number format. Check decimal points' };
    }

    // Check for consecutive operators
    if (!this.hasValidOperatorSequence(cleaned)) {
      return { isValid: false, error: 'Consecutive operators are not allowed' };
    }

    // Check for division by zero patterns
    if (/\/\s*0(?!\d)/.test(cleaned)) {
      return { isValid: false, error: 'Division by zero is not allowed' };
    }

    return { isValid: true };
  }

  private identifyIssues(expression: string): Array<{ type: string; message: string }> {
    const issues: Array<{ type: string; message: string }> = [];

    if (!expression.trim()) {
      issues.push({ type: 'empty-expression', message: 'Expression is empty' });
      return issues;
    }

    if (!this.hasBalancedParentheses(expression)) {
      issues.push({ type: 'unbalanced-parentheses', message: 'Unbalanced parentheses' });
    }

    if (!/^[\d+\-*/().\s]+$/.test(expression)) {
      issues.push({ type: 'invalid-characters', message: 'Contains invalid characters' });
    }

    if (!this.hasValidOperatorPlacement(expression)) {
      issues.push({ type: 'invalid-operators', message: 'Invalid operator placement' });
    }

    if (!this.hasValidOperatorSequence(expression)) {
      issues.push({ type: 'consecutive-operators', message: 'Consecutive operators found' });
    }

    if (!this.hasValidNumbers(expression)) {
      issues.push({ type: 'invalid-numbers', message: 'Invalid number format' });
    }

    return issues;
  }
}

/**
 * Utility functions for expression handling
 */
export const ExpressionUtils = {
  /**
   * Check if expression contains only basic arithmetic
   */
  isBasicArithmetic(expression: string): boolean {
    return /^[\d+\-*/().\s]+$/.test(expression);
  },

  /**
   * Extract numbers from expression
   */
  extractNumbers(expression: string): number[] {
    const matches = expression.match(/\d+\.?\d*/g) || [];
    return matches.map((match: string) => parseFloat(match)).filter(num => !isNaN(num));
  },

  /**
   * Extract operators from expression
   */
  extractOperators(expression: string): string[] {
    const matches = expression.match(/[+\-*/]/g) || [];
    return matches;
  },

  /**
   * Format expression for display
   */
  formatForDisplay(expression: string): string {
    return expression
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Check if expression is likely a mathematical equation
   */
  looksLikeMath(text: string): boolean {
    // Check for mathematical patterns
    const mathPatterns = [
      /\d+\s*[+\-*/]\s*\d+/,           // Basic arithmetic
      /\d+\s*\(\s*\d+/,                // Number with parentheses
      /\(\s*\d+.*\d+\s*\)/,            // Parenthetical expressions
      /\d+\.\d+/,                      // Decimal numbers
      /\d+\s*[+\-*/]\s*\d+\s*[+\-*/]/ // Multiple operations
    ];

    return mathPatterns.some(pattern => pattern.test(text));
  }
};