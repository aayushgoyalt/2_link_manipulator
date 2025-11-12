<script setup lang="ts">
/**
 * Calculator Display Component
 * Shows the current calculation value and previous operation
 * Requirements: 4.3, 4.4 - Programmatic value setting and focus support
 */

import { ref } from 'vue';

interface Props {
  currentValue: string;
  previousValue: string;
  operation: string | null;
}

defineProps<Props>();

// Ref to the display element for focus management
const displayElement = ref<HTMLDivElement | null>(null);

/**
 * Focus the calculator display
 * Requirement 4.4: Focus calculator for user interaction
 */
const focus = () => {
  if (displayElement.value) {
    displayElement.value.focus();
  }
};

/**
 * Expose methods to parent component
 * Requirement 4.3: Methods to set value programmatically and focus
 */
defineExpose({
  focus
});
</script>

<template>
  <div 
    ref="displayElement"
    tabindex="0"
    class="bg-slate-900 rounded-t-2xl p-3 text-right min-h-[80px] flex flex-col justify-end flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
  >
    <!-- Previous calculation display -->
    <div class="text-gray-400 text-sm h-5 mb-1 font-mono">
      <span v-if="previousValue && operation">
        {{ previousValue }} {{ operation }}
      </span>
    </div>
    
    <!-- Current value display -->
    <div class="text-white text-4xl font-light font-mono break-all leading-tight">
      {{ currentValue || '0' }}
    </div>
  </div>
</template>
