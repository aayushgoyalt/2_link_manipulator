<script setup lang="ts">
/**
 * Calculator Display Component
 * Shows the current calculation value and previous operation
 */

interface Props {
  currentValue: string;
  previousValue: string;
  operation: string | null;
}

defineProps<Props>();
</script>

<template>
  <div class="bg-slate-900 rounded-t-2xl p-4 text-right min-h-[100px] flex flex-col justify-end flex-shrink-0">
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
