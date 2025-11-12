/**
 * Error Handling Composable for Camera OCR Operations
 * Provides reactive error state management and recovery mechanisms
 */

import { ref, computed, type Ref } from 'vue'
import type { 
  CameraError, 
  ProcessingError
} from '../types/camera-ocr'
import type { FallbackOption } from '../../../shared/types'

/**
 * Error handling composable for camera OCR operations
 */
export function useErrorHandling() {
  // Reactive state
  const currentError: Ref<CameraError | ProcessingError | null> = ref(null)
  const isRetrying = ref(false)
  const retryCount = ref(0)
  const errorHistory: Ref<Array<CameraError | ProcessingError>> = ref([])

  // Computed properties
  const hasError = computed(() => currentError.value !== null)
  
  const canRetry = computed(() => {
    if (!currentError.value) return false
    return currentError.value.recoverable && retryCount.value < 3
  })

  const errorType = computed(() => {
    if (!currentError.value) return null
    return 'stage' in currentError.value ? 'processing' : 'camera'
  })

  const errorSeverity = computed(() => {
    if (!currentError.value) return 'info'
    
    if ('stage' in currentError.value) {
      // Processing error severity
      switch (currentError.value.type) {
        case 'rate-limit-exceeded':
          return 'warning'
        case 'llm-service-error':
        case 'timeout':
          return 'error'
        case 'parsing-failed':
        case 'insufficient-confidence':
          return 'warning'
        default:
          return 'error'
      }
    } else {
      // Camera error severity
      switch (currentError.value.type) {
        case 'permission-denied':
          return 'warning'
        case 'hardware-unavailable':
          return 'error'
        case 'capture-failed':
          return 'warning'
        default:
          return 'error'
      }
    }
  })

  const userFriendlyMessage = computed(() => {
    if (!currentError.value) return ''
    return getUserFriendlyErrorMessage(currentError.value)
  })

  const recoveryInstructions = computed(() => {
    if (!currentError.value) return []
    return getRecoveryInstructions(currentError.value)
  })

  const availableFallbacks = computed(() => {
    if (!currentError.value) return []
    return getAvailableFallbacks(currentError.value)
  })

  // Methods
  const setError = (error: CameraError | ProcessingError) => {
    currentError.value = error
    errorHistory.value.push(error)
    
    // Keep only last 10 errors
    if (errorHistory.value.length > 10) {
      errorHistory.value = errorHistory.value.slice(-10)
    }
    
    console.error('Camera OCR Error:', error)
  }

  const clearError = () => {
    currentError.value = null
    retryCount.value = 0
    isRetrying.value = false
  }

  const retry = async (retryOperation: () => Promise<void>) => {
    if (!canRetry.value) return false
    
    isRetrying.value = true
    retryCount.value++
    
    try {
      await retryOperation()
      clearError()
      return true
    } catch (error) {
      if (error instanceof Error) {
        // Update the current error or create a new one
        const newError = createErrorFromException(error, currentError.value)
        setError(newError)
      }
      return false
    } finally {
      isRetrying.value = false
    }
  }

  const handleFallback = async (
    option: FallbackOption, 
    fallbackHandler: (option: FallbackOption) => Promise<void>
  ) => {
    try {
      await fallbackHandler(option)
      clearError()
      return true
    } catch (error) {
      console.error('Fallback failed:', error)
      return false
    }
  }

  const createCameraError = (
    type: CameraError['type'],
    message: string,
    originalError?: Error,
    suggestedAction?: string
  ): CameraError => {
    return {
      type,
      message,
      recoverable: isCameraErrorRecoverable(type),
      suggestedAction: suggestedAction || getDefaultCameraRecoveryAction(type),
      originalError,
      timestamp: Date.now()
    }
  }

  const createProcessingError = (
    type: ProcessingError['type'],
    message: string,
    stage: ProcessingError['stage'],
    originalError?: Error,
    suggestedAction?: string
  ): ProcessingError => {
    return {
      type,
      message,
      stage,
      recoverable: isProcessingErrorRecoverable(type),
      retryable: isProcessingErrorRetryable(type),
      suggestedAction: suggestedAction || getDefaultProcessingRecoveryAction(type),
      originalError,
      timestamp: Date.now()
    }
  }

  const getErrorStatistics = () => {
    const stats = {
      totalErrors: errorHistory.value.length,
      cameraErrors: 0,
      processingErrors: 0,
      recoverableErrors: 0,
      mostCommonType: '',
      averageRetryCount: retryCount.value
    }

    const typeCounts: Record<string, number> = {}

    errorHistory.value.forEach(error => {
      if ('stage' in error) {
        stats.processingErrors++
      } else {
        stats.cameraErrors++
      }

      if (error.recoverable) {
        stats.recoverableErrors++
      }

      const key = error.type
      typeCounts[key] = (typeCounts[key] || 0) + 1
    })

    // Find most common error type
    let maxCount = 0
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count
        stats.mostCommonType = type
      }
    })

    return stats
  }

  return {
    // State
    currentError,
    isRetrying,
    retryCount,
    errorHistory,
    
    // Computed
    hasError,
    canRetry,
    errorType,
    errorSeverity,
    userFriendlyMessage,
    recoveryInstructions,
    availableFallbacks,
    
    // Methods
    setError,
    clearError,
    retry,
    handleFallback,
    createCameraError,
    createProcessingError,
    getErrorStatistics
  }
}

// Helper functions
function getUserFriendlyErrorMessage(error: CameraError | ProcessingError): string {
  // Return the error message as it should already be user-friendly
  return error.message
}

function getRecoveryInstructions(error: CameraError | ProcessingError): string[] {
  const instructions: string[] = []
  
  if (error.suggestedAction) {
    instructions.push(error.suggestedAction)
  }
  
  // Add general recovery steps based on error type
  if ('stage' in error) {
    // Processing error instructions
    switch (error.type) {
      case 'image-invalid':
        instructions.push('Capture a new image with better lighting')
        instructions.push('Ensure mathematical expressions are clearly visible')
        break
      case 'llm-service-error':
        instructions.push('Check your internet connection')
        instructions.push('Wait a moment and try again')
        break
      case 'parsing-failed':
        instructions.push('Try capturing clearer mathematical expressions')
        instructions.push('Use standard mathematical notation')
        break
      case 'rate-limit-exceeded':
        instructions.push('Wait a few minutes before trying again')
        break
    }
  } else {
    // Camera error instructions
    switch (error.type) {
      case 'permission-denied':
        instructions.push('Grant camera permission in browser settings')
        instructions.push('Refresh the page after granting permission')
        break
      case 'hardware-unavailable':
        instructions.push('Check camera hardware connection')
        instructions.push('Close other applications using the camera')
        break
      case 'capture-failed':
        instructions.push('Ensure adequate lighting')
        instructions.push('Hold device steady while capturing')
        break
    }
  }
  
  return instructions
}

function getAvailableFallbacks(error: CameraError | ProcessingError): FallbackOption[] {
  const fallbacks: FallbackOption[] = []
  
  if ('stage' in error) {
    // Processing error fallbacks
    switch (error.type) {
      case 'llm-service-error':
      case 'rate-limit-exceeded':
      case 'parsing-failed':
        fallbacks.push('manual-input')
        break
      case 'image-invalid':
        fallbacks.push('file-upload', 'manual-input')
        break
      case 'timeout':
        fallbacks.push('manual-input')
        break
    }
  } else {
    // Camera error fallbacks
    switch (error.type) {
      case 'permission-denied':
      case 'hardware-unavailable':
        fallbacks.push('file-upload', 'manual-input')
        break
      case 'capture-failed':
        fallbacks.push('file-upload', 'manual-input')
        break
      case 'network-error':
        fallbacks.push('manual-input')
        break
    }
  }
  
  // Always include manual input as last resort
  if (!fallbacks.includes('manual-input')) {
    fallbacks.push('manual-input')
  }
  
  return fallbacks
}

function createErrorFromException(
  exception: Error, 
  _currentError: CameraError | ProcessingError | null
): CameraError | ProcessingError {
  const message = exception.message.toLowerCase()
  
  // Try to determine error type from exception
  if (message.includes('permission') || message.includes('denied')) {
    return {
      type: 'permission-denied',
      message: 'Camera permission was denied',
      recoverable: true,
      suggestedAction: 'Grant camera permission and try again',
      originalError: exception,
      timestamp: Date.now()
    } as CameraError
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: 'llm-service-error',
      message: 'Network error occurred during processing',
      stage: 'processing',
      recoverable: true,
      retryable: true,
      suggestedAction: 'Check internet connection and try again',
      originalError: exception,
      timestamp: Date.now()
    } as ProcessingError
  }
  
  // Default to processing error if we can't determine type
  return {
    type: 'processing-failed',
    message: exception.message || 'An unexpected error occurred',
    stage: 'processing',
    recoverable: true,
    retryable: false,
    suggestedAction: 'Try the operation again',
    originalError: exception,
    timestamp: Date.now()
  } as ProcessingError
}

function isCameraErrorRecoverable(type: CameraError['type']): boolean {
  const recoverableTypes: CameraError['type'][] = [
    'permission-denied',
    'capture-failed',
    'processing-failed',
    'network-error',
    'configuration-error'
  ]
  return recoverableTypes.includes(type)
}

function isProcessingErrorRecoverable(type: ProcessingError['type']): boolean {
  const recoverableTypes: ProcessingError['type'][] = [
    'image-invalid',
    'llm-service-error',
    'parsing-failed',
    'validation-failed',
    'timeout',
    'insufficient-confidence'
  ]
  return recoverableTypes.includes(type)
}

function isProcessingErrorRetryable(type: ProcessingError['type']): boolean {
  const retryableTypes: ProcessingError['type'][] = [
    'llm-service-error',
    'timeout',
    'processing-failed'
  ]
  return retryableTypes.includes(type)
}

function getDefaultCameraRecoveryAction(type: CameraError['type']): string {
  const actions: Record<CameraError['type'], string> = {
    'permission-denied': 'Grant camera permission in browser settings',
    'hardware-unavailable': 'Check camera hardware and try again',
    'platform-unsupported': 'Use a supported browser',
    'capture-failed': 'Try capturing again',
    'processing-failed': 'Try again with better image quality',
    'network-error': 'Check internet connection',
    'configuration-error': 'Check application settings'
  }
  return actions[type] || 'Try the operation again'
}

function getDefaultProcessingRecoveryAction(type: ProcessingError['type']): string {
  const actions: Record<ProcessingError['type'], string> = {
    'image-invalid': 'Capture a clearer image',
    'llm-service-error': 'Check internet connection and try again',
    'parsing-failed': 'Capture image with clearer expressions',
    'validation-failed': 'Use standard mathematical notation',
    'timeout': 'Try with a smaller image',
    'rate-limit-exceeded': 'Wait before trying again',
    'insufficient-confidence': 'Capture a clearer image',
    'processing-failed': 'Try the operation again'
  }
  return actions[type] || 'Try the operation again'
}