<template>
  <div v-if="error" class="error-display" :class="errorTypeClass">
    <!-- Error Icon and Title -->
    <div class="error-header">
      <div class="error-icon">
        <component :is="errorIcon" class="w-6 h-6" />
      </div>
      <h3 class="error-title">{{ errorTitle }}</h3>
    </div>

    <!-- Error Message -->
    <div class="error-message">
      <p>{{ userFriendlyMessage }}</p>
    </div>

    <!-- Recovery Instructions -->
    <div v-if="recoveryInstructions.length > 0" class="recovery-section">
      <h4 class="recovery-title">What you can do:</h4>
      <ul class="recovery-list">
        <li v-for="(instruction, index) in recoveryInstructions" :key="index">
          {{ instruction }}
        </li>
      </ul>
    </div>

    <!-- Fallback Options -->
    <div v-if="fallbackOptions.length > 0" class="fallback-section">
      <h4 class="fallback-title">Alternative options:</h4>
      <div class="fallback-buttons">
        <button
          v-for="option in fallbackOptions"
          :key="option.option"
          @click="handleFallback(option.option)"
          :class="['fallback-btn', { 'primary': option.primary }]"
          class="flex items-center gap-2"
        >
          <component :is="option.icon" class="w-4 h-4" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
        v-if="canRetry"
        @click="handleRetry"
        :disabled="isRetrying"
        class="retry-btn"
      >
        <RefreshCw v-if="!isRetrying" class="w-4 h-4" />
        <Loader2 v-else class="w-4 h-4 animate-spin" />
        {{ isRetrying ? 'Retrying...' : 'Try Again' }}
      </button>
      
      <button
        v-if="showDetails"
        @click="toggleDetails"
        class="details-btn"
      >
        <ChevronDown :class="['w-4 h-4 transition-transform', { 'rotate-180': detailsExpanded }]" />
        {{ detailsExpanded ? 'Hide Details' : 'Show Details' }}
      </button>
      
      <button @click="handleDismiss" class="dismiss-btn">
        <X class="w-4 h-4" />
        Dismiss
      </button>
    </div>

    <!-- Error Details (Expandable) -->
    <div v-if="detailsExpanded && showDetails" class="error-details">
      <div class="details-content">
        <div class="detail-item">
          <span class="detail-label">Error Type:</span>
          <span class="detail-value">{{ error.type }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time:</span>
          <span class="detail-value">{{ formatTimestamp(error.timestamp) }}</span>
        </div>
        <div v-if="'stage' in error" class="detail-item">
          <span class="detail-label">Processing Stage:</span>
          <span class="detail-value">{{ error.stage }}</span>
        </div>
        <div v-if="error.originalError" class="detail-item">
          <span class="detail-label">Technical Details:</span>
          <span class="detail-value">{{ error.originalError.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { 
  CameraError, 
  ProcessingError
} from '../types/camera-ocr'
import type { FallbackOption } from '../../../shared/types'

interface Props {
  error: CameraError | ProcessingError
  showRetry?: boolean
  showDetails?: boolean
  isRetrying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showRetry: true,
  showDetails: true,
  isRetrying: false
})

const emit = defineEmits<{
  retry: []
  dismiss: []
  fallback: [option: FallbackOption]
}>()

const detailsExpanded = ref(false)

// Computed properties for error display
const errorTypeClass = computed(() => {
  if ('stage' in props.error) {
    // Processing error
    switch (props.error.type) {
      case 'rate-limit-exceeded':
        return 'error-warning'
      case 'timeout':
      case 'llm-service-error':
        return 'error-network'
      default:
        return 'error-processing'
    }
  } else {
    // Camera error
    switch (props.error.type) {
      case 'permission-denied':
        return 'error-permission'
      case 'hardware-unavailable':
        return 'error-hardware'
      case 'network-error':
        return 'error-network'
      default:
        return 'error-camera'
    }
  }
})

const errorIcon = computed(() => {
  // Icons not available - lucide-vue-next not installed
  // Return null for now, can be replaced with SVG icons later
  return null
})

const errorTitle = computed(() => {
  if ('stage' in props.error) {
    // Processing error titles
    switch (props.error.type) {
      case 'llm-service-error':
        return 'Service Unavailable'
      case 'rate-limit-exceeded':
        return 'Rate Limit Exceeded'
      case 'timeout':
        return 'Processing Timeout'
      case 'parsing-failed':
        return 'Expression Not Recognized'
      case 'image-invalid':
        return 'Image Quality Issue'
      default:
        return 'Processing Failed'
    }
  } else {
    // Camera error titles
    switch (props.error.type) {
      case 'permission-denied':
        return 'Camera Permission Required'
      case 'hardware-unavailable':
        return 'Camera Not Available'
      case 'capture-failed':
        return 'Capture Failed'
      case 'network-error':
        return 'Network Error'
      default:
        return 'Camera Error'
    }
  }
})

const userFriendlyMessage = computed(() => {
  // Use the error message directly as it should already be user-friendly
  return props.error.message
})

const canRetry = computed(() => {
  return props.showRetry && props.error.recoverable
})

const recoveryInstructions = computed(() => {
  const instructions: string[] = []
  
  if (props.error.suggestedAction) {
    instructions.push(props.error.suggestedAction)
  }
  
  // Add context-specific instructions
  if ('stage' in props.error) {
    // Processing error instructions
    switch (props.error.type) {
      case 'image-invalid':
        instructions.push('Ensure the image contains clear mathematical expressions')
        instructions.push('Try capturing with better lighting')
        break
      case 'llm-service-error':
        instructions.push('Check your internet connection')
        instructions.push('Try again in a few moments')
        break
      case 'rate-limit-exceeded':
        instructions.push('Wait a few minutes before trying again')
        break
    }
  } else {
    // Camera error instructions
    switch (props.error.type) {
      case 'permission-denied':
        instructions.push('Grant camera permission in your browser or system settings')
        instructions.push('Restart the application after granting permission')
        break
      case 'hardware-unavailable':
        instructions.push('Check that your camera is properly connected')
        instructions.push('Close other applications that might be using the camera')
        break
    }
  }
  
  return instructions
})

const fallbackOptions = computed(() => {
  // This would integrate with the FallbackManager to get available options
  const options: Array<{ option: FallbackOption; label: string; icon: any; primary: boolean }> = []
  
  if ('stage' in props.error) {
    // Processing error fallbacks
    switch (props.error.type) {
      case 'llm-service-error':
      case 'rate-limit-exceeded':
      case 'parsing-failed':
        options.push({ option: 'manual-input', label: 'Enter Manually', icon: null, primary: true })
        break
      case 'image-invalid':
        options.push({ option: 'file-upload', label: 'Upload Image', icon: null, primary: true })
        options.push({ option: 'manual-input', label: 'Enter Manually', icon: null, primary: false })
        break
    }
  } else {
    // Camera error fallbacks
    switch (props.error.type) {
      case 'permission-denied':
      case 'hardware-unavailable':
        options.push({ option: 'file-upload', label: 'Upload Image', icon: null, primary: true })
        options.push({ option: 'manual-input', label: 'Enter Manually', icon: null, primary: false })
        break
      case 'capture-failed':
        options.push({ option: 'file-upload', label: 'Upload Image', icon: null, primary: true })
        options.push({ option: 'screen-capture', label: 'Screen Capture', icon: null, primary: false })
        options.push({ option: 'manual-input', label: 'Enter Manually', icon: null, primary: false })
        break
    }
  }
  
  return options
})

// Event handlers
const handleRetry = () => {
  emit('retry')
}

const handleDismiss = () => {
  emit('dismiss')
}

const handleFallback = (option: FallbackOption) => {
  emit('fallback', option)
}

const toggleDetails = () => {
  detailsExpanded.value = !detailsExpanded.value
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.error-display {
  @apply bg-white border rounded-lg shadow-lg p-6 max-w-md mx-auto;
}

.error-camera {
  @apply border-orange-200 bg-orange-50;
}

.error-processing {
  @apply border-blue-200 bg-blue-50;
}

.error-permission {
  @apply border-yellow-200 bg-yellow-50;
}

.error-hardware {
  @apply border-red-200 bg-red-50;
}

.error-network {
  @apply border-purple-200 bg-purple-50;
}

.error-warning {
  @apply border-amber-200 bg-amber-50;
}

.error-header {
  @apply flex items-center gap-3 mb-4;
}

.error-icon {
  @apply flex-shrink-0 p-2 rounded-full;
}

.error-camera .error-icon {
  @apply bg-orange-100 text-orange-600;
}

.error-processing .error-icon {
  @apply bg-blue-100 text-blue-600;
}

.error-permission .error-icon {
  @apply bg-yellow-100 text-yellow-600;
}

.error-hardware .error-icon {
  @apply bg-red-100 text-red-600;
}

.error-network .error-icon {
  @apply bg-purple-100 text-purple-600;
}

.error-warning .error-icon {
  @apply bg-amber-100 text-amber-600;
}

.error-title {
  @apply text-lg font-semibold text-gray-900;
}

.error-message {
  @apply mb-4;
}

.error-message p {
  @apply text-gray-700 leading-relaxed;
}

.recovery-section,
.fallback-section {
  @apply mb-4;
}

.recovery-title,
.fallback-title {
  @apply text-sm font-medium text-gray-900 mb-2;
}

.recovery-list {
  @apply list-disc list-inside space-y-1 text-sm text-gray-600;
}

.fallback-buttons {
  @apply flex flex-wrap gap-2;
}

.fallback-btn {
  @apply px-3 py-2 text-sm font-medium rounded-md border transition-colors;
}

.fallback-btn.primary {
  @apply bg-blue-600 text-white border-blue-600 hover:bg-blue-700;
}

.fallback-btn:not(.primary) {
  @apply bg-white text-gray-700 border-gray-300 hover:bg-gray-50;
}

.action-buttons {
  @apply flex flex-wrap gap-2 pt-4 border-t border-gray-200;
}

.retry-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.details-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors;
}

.dismiss-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors ml-auto;
}

.error-details {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.details-content {
  @apply space-y-2;
}

.detail-item {
  @apply flex justify-between text-sm;
}

.detail-label {
  @apply font-medium text-gray-500;
}

.detail-value {
  @apply text-gray-900 font-mono text-xs;
}
</style>