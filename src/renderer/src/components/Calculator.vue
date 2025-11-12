<script setup lang="ts">
/**
 * Calculator Component
 * Main calculator logic and state management
 * Supports basic arithmetic operations: +, -, *, /, %
 */

import { ref, onMounted, onUnmounted, onErrorCaptured } from 'vue';
import CalculatorDisplay from './CalculatorDisplay.vue';
import CalculatorButton from './CalculatorButton.vue';
import HistoryPanel from './HistoryPanel.vue';
import CameraCapture from './CameraCapture.vue';
import CameraButton from './CameraButton.vue';
import { calculate, formatDisplayValue, isValidNumber } from '../utils/calculatorLogic';
import { useHistory } from '../composables/useHistory';
import { useCamera } from '../composables/useCamera';
import type { Operation, CalculatorState } from '../types/calculator';

// Calculator state management
const state = ref<CalculatorState>({
  currentValue: '0',
  previousValue: '',
  operation: null,
  shouldResetDisplay: false
});

// History management
const { saveCalculation, clearHistory, records, isLoading, error, loadHistory, retry } = useHistory();

/**
 * Process OCR expression through the main process expression parser
 */
const processOCRExpression = async (expression: string) => {
  try {
    if (window.api?.calculator) {
      return await window.api.calculator.processOCRExpression(expression);
    } else {
      // Fallback for web deployment - basic validation
      const isValid = /^[\d+\-*/().\s]+$/.test(expression);
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
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process OCR expression'
    };
  }
};

// Camera OCR functionality
const {
  modalState,
  processingState,
  openCamera,
  closeCamera,
  isProcessing: isCameraProcessing,
  hasError: hasCameraError,
  currentError: cameraError
} = useCamera();

// Enhanced Clear button state
const clearClickCount = ref(0);
const clearTimeoutId = ref<NodeJS.Timeout | null>(null);

// App initialization state
const isAppInitialized = ref(false);
const initializationError = ref<string | null>(null);

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
 * Performs the pending calculation and saves to history
 */
const handleEquals = async () => {
  // Check if we have a pending operation
  if (state.value.operation && state.value.previousValue && isValidNumber(state.value.currentValue)) {
    // Standard two-operand calculation
    const operationString = `${state.value.previousValue} ${getOperationSymbol(state.value.operation)} ${state.value.currentValue}`;
    
    try {
      const result = calculate(
        parseFloat(state.value.previousValue),
        parseFloat(state.value.currentValue),
        state.value.operation
      );
      
      const resultString = formatDisplayValue(result);
      
      // Save calculation to history
      await saveCalculation(operationString, resultString, state.value.operation);
      
      state.value.currentValue = resultString;
      state.value.previousValue = '';
      state.value.operation = null;
      state.value.shouldResetDisplay = true;
    } catch (error) {
      // Handle calculation errors (e.g., division by zero)
      const errorResult = 'Error';
      
      // Save error calculation to history for reference
      await saveCalculation(operationString, errorResult, state.value.operation || '+');
      
      state.value.currentValue = errorResult;
      state.value.previousValue = '';
      state.value.operation = null;
      state.value.shouldResetDisplay = true;
    }
  } else if (state.value.currentValue && state.value.currentValue !== '0' && state.value.currentValue !== 'Error') {
    // Try to evaluate current value as a complex expression
    try {
      const result = await evaluateComplexExpression(state.value.currentValue);
      
      // Save complex expression calculation to history
      await saveCalculation(
        state.value.currentValue, 
        result, 
        '+', // Use '+' as placeholder for complex expressions
        false // Not from OCR in this case
      );
      
      state.value.currentValue = result;
      state.value.previousValue = '';
      state.value.operation = null;
      state.value.shouldResetDisplay = true;
    } catch (error) {
      // If complex evaluation fails, treat as error
      const errorResult = 'Error';
      
      await saveCalculation(
        state.value.currentValue, 
        errorResult, 
        '+',
        false
      );
      
      state.value.currentValue = errorResult;
      state.value.previousValue = '';
      state.value.operation = null;
      state.value.shouldResetDisplay = true;
    }
  }
};

/**
 * Clears current calculator state (C functionality)
 */
const handleClear = () => {
  state.value.currentValue = '0';
  state.value.previousValue = '';
  state.value.operation = null;
  state.value.shouldResetDisplay = false;
};

/**
 * Clears all calculator state and history (AC functionality)
 */
const handleAllClear = async () => {
  // Clear calculator state
  handleClear();
  
  // Clear history
  await clearHistory();
  
  // Reset clear state
  clearClickCount.value = 0;
  if (clearTimeoutId.value) {
    clearTimeout(clearTimeoutId.value);
    clearTimeoutId.value = null;
  }
};

/**
 * Handles clear button click with double-click detection
 */
const handleClearClick = async () => {
  clearClickCount.value++;
  
  if (clearClickCount.value === 1) {
    // First click - clear calculator only
    handleClear();
    
    // Set timeout to reset click count
    clearTimeoutId.value = setTimeout(() => {
      clearClickCount.value = 0;
      clearTimeoutId.value = null;
    }, 500); // 500ms window for double click
  } else if (clearClickCount.value === 2) {
    // Double click - clear everything including history
    if (clearTimeoutId.value) {
      clearTimeout(clearTimeoutId.value);
      clearTimeoutId.value = null;
    }
    clearClickCount.value = 0;
    await handleAllClear();
  }
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

/**
 * Gets the display symbol for an operation
 */
const getOperationSymbol = (operation: Operation): string => {
  const symbols: Record<Operation, string> = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
    '%': '%'
  };
  return symbols[operation];
};

/**
 * Determine the primary operation type from a list of operators
 * Used for categorizing OCR expressions in history
 */
const determineOperationType = (operators: string[]): Operation => {
  if (!operators || operators.length === 0) return '+';
  
  // Priority order: /, *, -, +, %
  if (operators.includes('/')) return '/';
  if (operators.includes('*')) return '*';
  if (operators.includes('-')) return '-';
  if (operators.includes('%')) return '%';
  return '+';
};

/**
 * Evaluate a complex mathematical expression
 * This function handles expressions with parentheses and multiple operations
 */
const evaluateComplexExpression = async (expression: string): Promise<string> => {
  try {
    if (window.api?.calculator) {
      const result = await window.api.calculator.evaluateExpression(expression);
      
      if (result.success && result.data && result.data.isValid && result.data.result !== undefined) {
        return formatDisplayValue(result.data.result);
      } else {
        throw new Error(result.data?.error || 'Failed to evaluate expression');
      }
    } else {
      // Fallback for web deployment - basic evaluation
      // This is a simplified version and should be replaced with a proper expression evaluator
      try {
        // Use Function constructor for safe evaluation (better than eval)
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        const func = new Function('return ' + sanitized);
        const result = func();
        
        if (typeof result === 'number' && isFinite(result)) {
          return formatDisplayValue(result);
        } else {
          throw new Error('Invalid calculation result');
        }
      } catch (error) {
        throw new Error('Failed to evaluate expression');
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to evaluate expression');
  }
};

// Note: Additional helper functions like validateAndGetSuggestions and normalizeExpression
// are available through the calculator API but not currently used in the UI.
// They can be added later for enhanced user feedback and expression formatting.

/**
 * Handle camera OCR result
 * Processes the recognized mathematical expression from camera using the expression parser
 */
const handleCameraResult = async (expression: string) => {
  try {
    // Parse and validate the expression
    const trimmedExpression = expression.trim();
    if (!trimmedExpression) {
      throw new Error('Empty expression received from camera');
    }

    // Check if this looks like base64 image data instead of a math expression
    if (trimmedExpression.startsWith('data:image/') || trimmedExpression.length > 1000) {
      throw new Error('Received image data instead of mathematical expression. Please ensure the LLM API key is configured correctly.');
    }

    // Process the expression through the main process expression parser
    const parseResult = await processOCRExpression(trimmedExpression);
    
    if (!parseResult.success || !parseResult.data) {
      throw new Error('error' in parseResult ? parseResult.error : 'Failed to parse OCR expression');
    }

    const { isValid, normalizedExpression, calculationResult, error } = parseResult.data;

    if (!isValid) {
      // Show the invalid expression and let user edit it
      state.value.currentValue = normalizedExpression || trimmedExpression;
      state.value.shouldResetDisplay = false;
      
      // Don't save invalid OCR attempts to history to avoid storing large image data
      // Just throw the error to show to the user
      throw new Error(`Invalid expression: ${error}`);
    }

    // Handle different types of expressions based on complexity
    if (calculationResult !== undefined) {
      // Complete expression with result - show the result directly
      const resultString = formatDisplayValue(calculationResult);
      
      // Save the complete OCR calculation to history
      await saveCalculation(
        `OCR: ${normalizedExpression}`, 
        resultString, 
        determineOperationType(parseResult.data.operators || []), // Determine operation type from expression
        true, // isFromOCR
        {
          confidence: 0.8,
          processingTime: 0,
          originalImage: '',
          recognizedExpression: trimmedExpression
        }
      );
      
      // Set the result as current value
      state.value.currentValue = resultString;
      state.value.previousValue = '';
      state.value.operation = null;
      state.value.shouldResetDisplay = true;
    } else if (parseResult.data.complexity === 'simple' && parseResult.data.operands && parseResult.data.operands.length === 1) {
      // Single number - set as current value
      state.value.currentValue = normalizedExpression;
      state.value.shouldResetDisplay = false;
    } else if (parseResult.data.complexity === 'simple' && parseResult.data.operands && parseResult.data.operands.length === 2 && parseResult.data.operators && parseResult.data.operators.length === 1) {
      // Simple two-operand expression - set up for calculation
      const [firstOperand, secondOperand] = parseResult.data.operands;
      const operator = parseResult.data.operators[0] as Operation;
      
      state.value.previousValue = firstOperand.toString();
      state.value.currentValue = secondOperand.toString();
      state.value.operation = operator;
      state.value.shouldResetDisplay = false;
      
      // Automatically calculate if it's a complete simple expression
      await handleEquals();
    } else {
      // Complex expression or partial expression - set as current value for user to review
      state.value.currentValue = normalizedExpression;
      state.value.shouldResetDisplay = false;
      
      // Save to history as OCR input for complex expressions
      await saveCalculation(
        `OCR Input: ${normalizedExpression}`, 
        normalizedExpression, 
        '+',
        true, // isFromOCR
        {
          confidence: 0.8,
          processingTime: 0,
          originalImage: '',
          recognizedExpression: trimmedExpression
        }
      );
    }
    
  } catch (error) {
    console.error('Failed to process camera result:', error);
    state.value.currentValue = 'Error';
    state.value.shouldResetDisplay = true;
    
    // Show user-friendly error message
    // In a real app, you might want to show a toast notification
    console.warn('OCR Error:', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Handle camera errors
 */
const handleCameraError = (error: any) => {
  console.error('Camera error:', error);
  // Could show a toast notification or other user feedback here
};

/**
 * Open camera for OCR capture
 */
const handleCameraClick = async () => {
  try {
    await openCamera();
  } catch (error) {
    console.error('Failed to open camera:', error);
    handleCameraError(error);
  }
};

/**
 * Initialize the application and load history
 */
const initializeApp = async () => {
  try {
    initializationError.value = null;
    
    // Load existing history when the component mounts
    await loadHistory();
    
    isAppInitialized.value = true;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    initializationError.value = error instanceof Error ? error.message : 'Failed to initialize application';
    
    // Try to recover by retrying once
    try {
      await retry();
      isAppInitialized.value = true;
      initializationError.value = null;
    } catch (retryError) {
      console.error('Failed to recover from initialization error:', retryError);
      // Keep the error state but allow the app to continue functioning
      isAppInitialized.value = true;
    }
  }
};

/**
 * Handle history loading errors and provide recovery options
 */
const handleHistoryError = async () => {
  try {
    await retry();
    initializationError.value = null;
  } catch (error) {
    console.error('Failed to recover history:', error);
    initializationError.value = error instanceof Error ? error.message : 'Failed to recover history';
  }
};

/**
 * Handle keyboard input for calculator operations
 */
const handleKeydown = (event: KeyboardEvent) => {
  // Prevent default behavior for calculator keys
  const key = event.key;
  
  if (key >= '0' && key <= '9') {
    event.preventDefault();
    handleNumberClick(key);
  } else if (key === '.') {
    event.preventDefault();
    handleNumberClick('.');
  } else if (['+', '-', '*', '/', '%'].includes(key)) {
    event.preventDefault();
    handleOperationClick(key as Operation);
  } else if (key === 'Enter' || key === '=') {
    event.preventDefault();
    handleEquals();
  } else if (key === 'Escape' || key === 'c' || key === 'C') {
    event.preventDefault();
    handleClearClick();
  } else if (key === 'Backspace') {
    event.preventDefault();
    handleBackspace();
  }
};

// Component lifecycle
onMounted(() => {
  initializeApp();
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeydown);
});

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Error boundary for history-related errors
onErrorCaptured((error, _instance, info) => {
  console.error('Calculator component error:', error, info);
  
  // If it's a history-related error, handle it gracefully
  if (info.includes('history') || error.message.includes('history')) {
    initializationError.value = error.message;
    return false; // Prevent error from propagating
  }
  
  return true; // Let other errors propagate
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 overflow-hidden">
    <!-- Main content container -->
    <div class="flex-1 flex gap-3 overflow-hidden max-h-full">
      <!-- Calculator container -->
      <div class="flex-1 flex flex-col bg-slate-800 rounded-2xl shadow-2xl overflow-hidden min-w-0">
        <!-- Display -->
        <CalculatorDisplay
          :current-value="state.currentValue"
          :previous-value="state.previousValue"
          :operation="state.operation"
        />
        
        <!-- Button grid -->
        <div class="flex-1 p-3 grid grid-cols-4 gap-2 content-stretch">
        <!-- Row 1: Clear, Backspace, Camera, / -->
        <div class="relative">
          <CalculatorButton
            label="C"
            variant="clear"
            @click="handleClearClick"
            :title="'Single click: Clear calculator | Double click: Clear all + history'"
          />
          <!-- Double-click indicator -->
          <div 
            v-if="clearClickCount > 0"
            class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          >
            Double-click for AC
          </div>
        </div>
        <CalculatorButton
          label="⌫"
          variant="function"
          @click="handleBackspace"
        />
        <!-- Camera OCR Button -->
        <div class="relative">
          <CameraButton
            :disabled="isCameraProcessing"
            :is-processing="isCameraProcessing"
            size="medium"
            variant="secondary"
            @click="handleCameraClick"
          />
          <!-- Camera error indicator -->
          <div 
            v-if="hasCameraError"
            class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800"
            :title="cameraError?.message"
          />
        </div>
        <CalculatorButton
          label="÷"
          variant="operation"
          @click="() => handleOperationClick('/')"
        />
        
        <!-- Row 2: %, 7, 8, 9 -->
        <CalculatorButton
          label="%"
          variant="operation"
          @click="() => handleOperationClick('%')"
        />

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
      
      <!-- History Panel -->
      <div class="w-80 flex-shrink-0">
        <!-- Initialization Error Banner -->
        <div
          v-if="initializationError && isAppInitialized"
          class="mb-2 p-3 bg-red-900/50 border border-red-700 rounded-lg"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-red-400 text-sm">⚠️</span>
              <span class="text-red-300 text-xs">History initialization failed</span>
            </div>
            <button
              @click="handleHistoryError"
              class="text-xs text-red-400 hover:text-red-300 transition-colors duration-200 px-2 py-1 rounded border border-red-600 hover:border-red-500"
            >
              Retry
            </button>
          </div>
          <p class="text-xs text-red-400 mt-1 opacity-75">{{ initializationError }}</p>
        </div>
        
        <HistoryPanel
          :records="records"
          :is-loading="isLoading || !isAppInitialized"
          :error="error"
        />
      </div>
    </div>
    
    <!-- App info -->
    <div class="text-center mt-2 text-gray-400 text-xs flex-shrink-0">
      <p class="font-semibold">Electron Calculator v1.0</p>
      <p class="mt-0.5">5 Operations: +, −, ×, ÷, % | Camera OCR</p>
    </div>

    <!-- Camera OCR Modal -->
    <CameraCapture
      :is-visible="modalState.isOpen"
      :is-processing="isCameraProcessing"
      :processing-state="processingState"
      @capture="handleCameraResult"
      @close="closeCamera"
      @error="handleCameraError"
      @retry="handleCameraClick"
      @confirm="handleCameraResult"
    />
  </div>
</template>
