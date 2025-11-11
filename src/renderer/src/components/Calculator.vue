<script setup lang="ts">
/**
 * Calculator Component
 * Main calculator logic and state management
 * Supports basic arithmetic operations: +, -, *, /, %
 */

import { ref } from 'vue';
import CalculatorDisplay from './CalculatorDisplay.vue';
import CalculatorButton from './CalculatorButton.vue';
import { calculate, formatDisplayValue, isValidNumber } from '../utils/calculatorLogic';
import type { Operation, CalculatorState } from '../types/calculator';

// Calculator state management
const state = ref<CalculatorState>({
  currentValue: '0',
  previousValue: '',
  operation: null,
  shouldResetDisplay: false
});

/**
 * Handles number button clicks
 * Appends digit to current value or starts new number
 */
const handleNumberClick = (num: string) => {
  if (state.value.shouldResetDisplay) {
    state.value.currentValue = num;
    state.value.shouldResetDisplay = false;
    return;
  }
  
  // Prevent multiple decimal points
  if (num === '.' && state.value.currentValue.includes('.')) {
    return;
  }
  
  // Replace initial zero unless adding decimal
  if (state.value.currentValue === '0' && num !== '.') {
    state.value.currentValue = num;
  } else {
    state.value.currentValue += num;
  }
};

/**
 * Handles operation button clicks (+, -, *, /, %)
 * Performs pending calculation if one exists
 */
const handleOperationClick = (op: Operation) => {
  if (!isValidNumber(state.value.currentValue)) return;
  
  // If there's a pending operation, calculate it first
  if (state.value.operation && state.value.previousValue && !state.value.shouldResetDisplay) {
    handleEquals();
  }
  
  state.value.previousValue = state.value.currentValue;
  state.value.operation = op;
  state.value.shouldResetDisplay = true;
};

/**
 * Handles equals button click
 * Performs the pending calculation
 */
const handleEquals = () => {
  if (!state.value.operation || !state.value.previousValue) return;
  if (!isValidNumber(state.value.currentValue)) return;
  
  try {
    const result = calculate(
      parseFloat(state.value.previousValue),
      parseFloat(state.value.currentValue),
      state.value.operation
    );
    
    state.value.currentValue = formatDisplayValue(result);
    state.value.previousValue = '';
    state.value.operation = null;
    state.value.shouldResetDisplay = true;
  } catch (error) {
    // Handle calculation errors (e.g., division by zero)
    state.value.currentValue = 'Error';
    state.value.previousValue = '';
    state.value.operation = null;
    state.value.shouldResetDisplay = true;
  }
};

/**
 * Clears all calculator state
 */
const handleClear = () => {
  state.value.currentValue = '0';
  state.value.previousValue = '';
  state.value.operation = null;
  state.value.shouldResetDisplay = false;
};

/**
 * Toggles the sign of the current value (positive/negative)
 */
const handleToggleSign = () => {
  if (state.value.currentValue === '0' || state.value.currentValue === 'Error') return;
  
  if (state.value.currentValue.startsWith('-')) {
    state.value.currentValue = state.value.currentValue.slice(1);
  } else {
    state.value.currentValue = '-' + state.value.currentValue;
  }
};

/**
 * Deletes the last digit from current value
 */
const handleBackspace = () => {
  if (state.value.shouldResetDisplay || state.value.currentValue === 'Error') {
    state.value.currentValue = '0';
    state.value.shouldResetDisplay = false;
    return;
  }
  
  if (state.value.currentValue.length === 1) {
    state.value.currentValue = '0';
  } else {
    state.value.currentValue = state.value.currentValue.slice(0, -1);
  }
};
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 overflow-hidden">
    <!-- Calculator container -->
    <div class="flex-1 flex flex-col bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-full">
      <!-- Display -->
      <CalculatorDisplay
        :current-value="state.currentValue"
        :previous-value="state.previousValue"
        :operation="state.operation"
      />
      
      <!-- Button grid -->
      <div class="flex-1 p-3 grid grid-cols-4 gap-2 content-stretch">
        <!-- Row 1: Clear, Backspace, %, / -->
        <CalculatorButton
          label="C"
          variant="clear"
          @click="handleClear"
        />
        <CalculatorButton
          label="⌫"
          variant="function"
          @click="handleBackspace"
        />
        <CalculatorButton
          label="%"
          variant="operation"
          @click="() => handleOperationClick('%')"
        />
        <CalculatorButton
          label="÷"
          variant="operation"
          @click="() => handleOperationClick('/')"
        />
        
        <!-- Row 2: 7, 8, 9, * -->
        <CalculatorButton
          label="7"
          variant="number"
          @click="() => handleNumberClick('7')"
        />
        <CalculatorButton
          label="8"
          variant="number"
          @click="() => handleNumberClick('8')"
        />
        <CalculatorButton
          label="9"
          variant="number"
          @click="() => handleNumberClick('9')"
        />
        <CalculatorButton
          label="×"
          variant="operation"
          @click="() => handleOperationClick('*')"
        />
        
        <!-- Row 3: 4, 5, 6, - -->
        <CalculatorButton
          label="4"
          variant="number"
          @click="() => handleNumberClick('4')"
        />
        <CalculatorButton
          label="5"
          variant="number"
          @click="() => handleNumberClick('5')"
        />
        <CalculatorButton
          label="6"
          variant="number"
          @click="() => handleNumberClick('6')"
        />
        <CalculatorButton
          label="−"
          variant="operation"
          @click="() => handleOperationClick('-')"
        />
        
        <!-- Row 4: 1, 2, 3, + -->
        <CalculatorButton
          label="1"
          variant="number"
          @click="() => handleNumberClick('1')"
        />
        <CalculatorButton
          label="2"
          variant="number"
          @click="() => handleNumberClick('2')"
        />
        <CalculatorButton
          label="3"
          variant="number"
          @click="() => handleNumberClick('3')"
        />
        <CalculatorButton
          label="+"
          variant="operation"
          @click="() => handleOperationClick('+')"
        />
        
        <!-- Row 5: +/-, 0, ., = -->
        <CalculatorButton
          label="±"
          variant="function"
          @click="handleToggleSign"
        />
        <CalculatorButton
          label="0"
          variant="number"
          @click="() => handleNumberClick('0')"
        />
        <CalculatorButton
          label="."
          variant="number"
          @click="() => handleNumberClick('.')"
        />
        <CalculatorButton
          label="="
          variant="equals"
          @click="handleEquals"
        />
      </div>
    </div>
    
    <!-- App info -->
    <div class="text-center mt-2 text-gray-400 text-xs flex-shrink-0">
      <p class="font-semibold">Electron Calculator v1.0</p>
      <p class="mt-0.5">5 Operations: +, −, ×, ÷, %</p>
    </div>
  </div>
</template>
