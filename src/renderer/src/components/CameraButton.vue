<script setup lang="ts">
/**
 * CameraButton Component
 * Button to trigger camera OCR functionality
 * Supports different sizes and variants for flexible integration
 */

import { computed } from 'vue';
import type { CameraButtonProps } from '../types/camera-ocr';

// Component props and emits
const props = withDefaults(defineProps<CameraButtonProps>(), {
  disabled: false,
  isProcessing: false,
  size: 'medium',
  variant: 'primary'
});

const emit = defineEmits(['click']);

// Computed styles based on props
const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-95 hover:opacity-90 py-4 w-full select-none';
  
  // Variant classes to match calculator buttons
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-400 disabled:bg-gray-600 text-white',
    icon: 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-gray-300 hover:text-white'
  };
  
  // Disabled state
  const disabledClasses = props.disabled || props.isProcessing 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer';
  
  return [
    baseClasses,
    variantClasses[props.variant],
    disabledClasses
  ].join(' ');
});

const iconSize = computed(() => {
  // Match calculator button icon sizes
  return 'w-7 h-7';
});

const handleClick = () => {
  if (!props.disabled && !props.isProcessing) {
    emit('click');
  }
};
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || isProcessing"
    @click="handleClick"
    :title="isProcessing ? 'Processing...' : 'Capture mathematical expression with camera'"
  >
    <!-- Processing spinner -->
    <svg
      v-if="isProcessing"
      :class="[iconSize, 'animate-spin']"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    
    <!-- Camera icon -->
    <svg
      v-else
      :class="iconSize"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>
</template>