/**
 * Calculator Types
 * Defines the core types used throughout the calculator application
 */

export type Operation = '+' | '-' | '*' | '/' | '%';

export interface CalculatorState {
  currentValue: string;
  previousValue: string;
  operation: Operation | null;
  shouldResetDisplay: boolean;
}

export interface CalculatorButton {
  label: string;
  value: string;
  type: 'number' | 'operation' | 'function' | 'equals' | 'clear';
  className?: string;
}
