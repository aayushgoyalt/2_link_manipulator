/**
 * OCR Logic Composable
 * Handles camera OCR functionality and expression processing
 */

import { formatDisplayValue } from '../utils/calculatorLogic'
import type { Operation, CalculatorState } from '../types/calculator'
import type { Ref } from 'vue'

export function useOCRLogic() {
  /**
   * Process OCR expression through the main process
   */
  const processOCRExpression = async (expression: string) => {
    try {
      if (window.api?.calculator) {
        return await window.api.calculator.processOCRExpression(expression)
      } else {
        // Fallback for web deployment
        const isValid = /^[\d+\-*/().\s]+$/.test(expression)
        return {
          success: true,
          data: {
            isValid,
            normalizedExpression: expression.trim(),
            calculationResult: undefined,
            error: isValid ? undefined : 'Invalid characters in expression',
            complexity: 'simple' as const,
            operands: [],
            operators: []
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OCR expression'
      }
    }
  }

  /**
   * Determine operation type from operators
   */
  const determineOperationType = (operators: string[]): Operation => {
    if (!operators || operators.length === 0) return '+'
    if (operators.includes('/')) return '/'
    if (operators.includes('*')) return '*'
    if (operators.includes('-')) return '-'
    if (operators.includes('%')) return '%'
    return '+'
  }

  /**
   * Handle OCR result and update calculator state
   */
  const handleOCRResult = async (
    expression: string,
    state: Ref<CalculatorState>,
    saveCalculation: (
      operation: string,
      result: string,
      operationType: Operation,
      isFromOCR?: boolean,
      metadata?: Record<string, unknown>
    ) => Promise<void>,
    performEquals: () => Promise<void>
  ) => {
    try {
      const trimmedExpression = expression.trim()
      if (!trimmedExpression) {
        throw new Error('Empty expression received from camera')
      }

      // Check for invalid data
      if (trimmedExpression.startsWith('data:image/') || trimmedExpression.length > 1000) {
        throw new Error(
          'Received image data instead of mathematical expression. Please ensure the LLM API key is configured correctly.'
        )
      }

      // Process the expression
      const parseResult = await processOCRExpression(trimmedExpression)

      if (!parseResult.success || !parseResult.data) {
        throw new Error('error' in parseResult ? parseResult.error : 'Failed to parse OCR expression')
      }

      const { isValid, normalizedExpression, calculationResult, error } = parseResult.data

      if (!isValid) {
        state.value.currentValue = normalizedExpression || trimmedExpression
        state.value.shouldResetDisplay = false
        throw new Error(`Invalid expression: ${error}`)
      }

      // Handle complete expression with result
      if (calculationResult !== undefined) {
        const resultString = formatDisplayValue(calculationResult)
        await saveCalculation(
          `OCR: ${normalizedExpression}`,
          resultString,
          determineOperationType(parseResult.data.operators || []),
          true,
          {
            confidence: 0.8,
            processingTime: 0,
            originalImage: '',
            recognizedExpression: trimmedExpression
          }
        )

        state.value.currentValue = resultString
        state.value.previousValue = ''
        state.value.operation = null
        state.value.shouldResetDisplay = true
      } else if (
        parseResult.data.complexity === 'simple' &&
        parseResult.data.operands &&
        parseResult.data.operands.length === 2 &&
        parseResult.data.operators &&
        parseResult.data.operators.length === 1
      ) {
        // Simple two-operand expression
        const [firstOperand, secondOperand] = parseResult.data.operands
        const operator = parseResult.data.operators[0] as Operation

        state.value.previousValue = firstOperand.toString()
        state.value.currentValue = secondOperand.toString()
        state.value.operation = operator
        state.value.shouldResetDisplay = false

        await performEquals()
      } else {
        // Complex or partial expression
        state.value.currentValue = normalizedExpression
        state.value.shouldResetDisplay = false
      }
    } catch (error) {
      console.error('Failed to process camera result:', error)
      state.value.currentValue = 'Error'
      state.value.shouldResetDisplay = true
    }
  }

  return {
    processOCRExpression,
    determineOperationType,
    handleOCRResult
  }
}
