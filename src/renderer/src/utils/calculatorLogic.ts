/**
 * Calculator Logic Utilities
 * Pure functions for calculator operations and state management
 */

import type { Operation } from '../types/calculator';

/**
 * Performs arithmetic operations between two numbers
 * @param firstOperand - The first number in the operation
 * @param secondOperand - The second number in the operation
 * @param operation - The arithmetic operation to perform
 * @returns The result of the calculation
 */
export function calculate(
  firstOperand: number,
  secondOperand: number,
  operation: Operation
): number {
  switch (operation) {
    case '+':
      return firstOperand + secondOperand;
    case '-':
      return firstOperand - secondOperand;
    case '*':
      return firstOperand * secondOperand;
    case '/':
      // Prevent division by zero
      if (secondOperand === 0) {
        throw new Error('Cannot divide by zero');
      }
      return firstOperand / secondOperand;
    case '%':
      return firstOperand % secondOperand;
    default:
      return secondOperand;
  }
}

/**
 * Formats a number for display, removing unnecessary decimals
 * @param value - The number to format
 * @returns Formatted string representation
 */
export function formatDisplayValue(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  // Handle very large or very small numbers with scientific notation
  if (Math.abs(numValue) > 1e10 || (Math.abs(numValue) < 1e-6 && numValue !== 0)) {
    return numValue.toExponential(6);
  }
  
  // Limit decimal places to avoid floating point issues
  return parseFloat(numValue.toFixed(10)).toString();
}

/**
 * Validates if a string can be parsed as a valid number
 * @param value - The string to validate
 * @returns True if the value is a valid number
 */
export function isValidNumber(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}
