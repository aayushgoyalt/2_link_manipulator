/**
 * Calculator Logic Composable
 * Handles all calculator state and operations
 */

import { ref } from 'vue'
import { calculate, formatDisplayValue, isValidNumber } from '../utils/calculatorLogic'
import type { Operation, CalculatorState } from '../types/calculator'

export function useCalculatorLogic() {
  // Calculator state
  const state = ref<CalculatorState>({
    currentValue: '0',
    previousValue: '',
    operation: null,
    shouldResetDisplay: false
  })

  // Clear button state
  const clearClickCount = ref(0)
  const clearTimeoutId = ref<NodeJS.Timeout | null>(null)

  /**
   * Handle number button clicks
   */
  const handleNumberClick = (num: string) => {
    if (state.value.shouldResetDisplay) {
      state.value.currentValue = num
      state.value.shouldResetDisplay = false
      return
    }

    // Prevent multiple decimal points
    if (num === '.' && state.value.currentValue.includes('.')) {
      return
    }

    // Replace initial zero unless adding decimal
    if (state.value.currentValue === '0' && num !== '.') {
      state.value.currentValue = num
    } else {
      state.value.currentValue += num
    }
  }

  /**
   * Handle operation button clicks
   */
  const handleOperationClick = (op: Operation, handleEquals: () => Promise<void>) => {
    if (!isValidNumber(state.value.currentValue)) return

    // If there's a pending operation, calculate it first
    if (
      state.value.operation &&
      state.value.previousValue &&
      !state.value.shouldResetDisplay
    ) {
      handleEquals()
    }

    state.value.previousValue = state.value.currentValue
    state.value.operation = op
    state.value.shouldResetDisplay = true
  }

  /**
   * Clear calculator state
   */
  const handleClear = () => {
    state.value.currentValue = '0'
    state.value.previousValue = ''
    state.value.operation = null
    state.value.shouldResetDisplay = false
  }

  /**
   * Toggle sign of current value
   */
  const handleToggleSign = () => {
    if (state.value.currentValue === '0' || state.value.currentValue === 'Error') return

    if (state.value.currentValue.startsWith('-')) {
      state.value.currentValue = state.value.currentValue.slice(1)
    } else {
      state.value.currentValue = '-' + state.value.currentValue
    }
  }

  /**
   * Delete last digit
   */
  const handleBackspace = () => {
    if (state.value.shouldResetDisplay || state.value.currentValue === 'Error') {
      state.value.currentValue = '0'
      state.value.shouldResetDisplay = false
      return
    }

    if (state.value.currentValue.length === 1) {
      state.value.currentValue = '0'
    } else {
      state.value.currentValue = state.value.currentValue.slice(0, -1)
    }
  }

  /**
   * Get operation symbol for display
   */
  const getOperationSymbol = (operation: Operation): string => {
    const symbols: Record<Operation, string> = {
      '+': '+',
      '-': '−',
      '*': '×',
      '/': '÷',
      '%': '%'
    }
    return symbols[operation]
  }

  /**
   * Perform calculation
   */
  const performCalculation = async (
    saveCalculation: (
      operation: string,
      result: string,
      operationType: Operation,
      isFromOCR?: boolean
    ) => Promise<void>
  ): Promise<void> => {
    if (
      state.value.operation &&
      state.value.previousValue &&
      isValidNumber(state.value.currentValue)
    ) {
      const operationString = `${state.value.previousValue} ${getOperationSymbol(state.value.operation)} ${state.value.currentValue}`

      try {
        const result = calculate(
          parseFloat(state.value.previousValue),
          parseFloat(state.value.currentValue),
          state.value.operation
        )

        const resultString = formatDisplayValue(result)
        await saveCalculation(operationString, resultString, state.value.operation)

        state.value.currentValue = resultString
        state.value.previousValue = ''
        state.value.operation = null
        state.value.shouldResetDisplay = true
      } catch (error) {
        const errorResult = 'Error'
        await saveCalculation(operationString, errorResult, state.value.operation || '+')

        state.value.currentValue = errorResult
        state.value.previousValue = ''
        state.value.operation = null
        state.value.shouldResetDisplay = true
      }
    }
  }

  return {
    state,
    clearClickCount,
    clearTimeoutId,
    handleNumberClick,
    handleOperationClick,
    handleClear,
    handleToggleSign,
    handleBackspace,
    getOperationSymbol,
    performCalculation
  }
}
