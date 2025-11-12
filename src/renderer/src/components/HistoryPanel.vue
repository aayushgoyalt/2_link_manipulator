<script setup lang="ts">
/**
 * HistoryPanel Component
 * Displays calculation history with loading and error states
 * Supports scrollable list and real-time updates
 */

import { computed } from 'vue';
import { useHistory } from '../composables/useHistory';
import type { CalculationRecord } from '../types/calculator';

// Props interface
interface Props {
  records?: CalculationRecord[];
  isLoading?: boolean;
  error?: string | null;
}

// Emits interface
interface Emits {
  (e: 'clearHistory'): void;
  (e: 'loadHistory'): void;
}

// Component props with defaults
const props = withDefaults(defineProps<Props>(), {
  records: () => [],
  isLoading: false,
  error: null
});

// Component emits
const emit = defineEmits<Emits>();

// Use history composable for data management
const {
  records: historyRecords,
  isLoading: historyLoading,
  error: historyError,
  loadHistory: loadHistoryData,
  clearHistory: clearHistoryData,
  addRecord,
  retry,
  formatTimestamp,
  formatOperation,
  getOperationSymbol
} = useHistory();

// Computed properties - use props if provided, otherwise use composable state
const displayRecords = computed(() => {
  return props.records.length > 0 ? props.records : historyRecords.value;
});

const isLoadingState = computed(() => {
  return props.isLoading || historyLoading.value;
});

const errorState = computed(() => {
  return props.error || historyError.value;
});

const hasRecords = computed(() => {
  return displayRecords.value.length > 0;
});

// Load history wrapper
const loadHistory = async () => {
  if (props.records.length > 0) return; // Don't load if props are provided
  
  await loadHistoryData();
  emit('loadHistory');
};

// Clear history wrapper
const clearHistory = async () => {
  if (props.records.length > 0) {
    // If using props, just emit the event
    emit('clearHistory');
  } else {
    // If using internal state, clear it directly
    const success = await clearHistoryData();
    if (success) {
      emit('clearHistory');
    }
  }
};

// Handle real-time updates when new calculations are added
const handleNewCalculation = (record: CalculationRecord) => {
  if (props.records.length > 0) return; // Don't update if using props
  
  addRecord(record);
};

// Retry loading history
const retryLoad = async () => {
  await retry();
};

// Confirm before clearing history
const confirmClearHistory = async () => {
  const confirmed = confirm(`Are you sure you want to clear all ${displayRecords.value.length} calculation(s) from history? This action cannot be undone.`);
  if (confirmed) {
    await clearHistory();
  }
};

// Expose methods for parent component
defineExpose({
  loadHistory,
  handleNewCalculation,
  clearHistory: clearHistoryData,
  addRecord,
  retry: retryLoad
});
</script>

<template>
  <div class="flex flex-col h-full bg-slate-700 rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-3 bg-slate-600 border-b border-slate-500">
      <h3 class="text-sm font-semibold text-gray-200">History</h3>
      <button
        v-if="hasRecords && !isLoadingState"
        @click="confirmClearHistory"
        class="text-xs text-red-400 hover:text-red-300 transition-colors duration-200 px-3 py-1 rounded border border-red-400 hover:border-red-300 hover:bg-red-400/10"
        title="Clear all history"
      >
        🗑️ Clear All
      </button>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div
        v-if="isLoadingState"
        class="flex items-center justify-center h-full text-gray-400"
      >
        <div class="flex flex-col items-center space-y-2">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
          <span class="text-xs">Loading history...</span>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorState"
        class="flex items-center justify-center h-full p-4"
      >
        <div class="text-center">
          <div class="text-red-400 text-sm mb-2">⚠️ Error</div>
          <p class="text-xs text-gray-400 mb-3">{{ errorState }}</p>
          <button
            @click="retryLoad"
            class="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200 px-3 py-1 rounded border border-blue-400 hover:border-blue-300"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!hasRecords"
        class="flex items-center justify-center h-full text-gray-400"
      >
        <div class="text-center">
          <div class="text-2xl mb-2">📊</div>
          <p class="text-xs">No calculations yet</p>
          <p class="text-xs text-gray-500 mt-1">Start calculating to see history</p>
        </div>
      </div>

      <!-- History List -->
      <div
        v-else
        class="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-600"
      >
        <div class="p-2 space-y-1">
          <div
            v-for="record in displayRecords"
            :key="record.id"
            class="group bg-slate-600 hover:bg-slate-550 rounded-lg p-3 transition-colors duration-200 border border-slate-500 hover:border-slate-400"
          >
            <!-- Operation and Result -->
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-200 font-mono">
                {{ formatOperation(record.operation, record.result) }}
              </span>
              <span
                class="text-xs px-2 py-1 rounded-full bg-slate-500 text-gray-300 font-mono"
                :class="{
                  'bg-blue-500 text-white': record.operationType === '+',
                  'bg-red-500 text-white': record.operationType === '-',
                  'bg-green-500 text-white': record.operationType === '*',
                  'bg-yellow-500 text-white': record.operationType === '/',
                  'bg-purple-500 text-white': record.operationType === '%'
                }"
              >
                {{ getOperationSymbol(record.operationType) }}
              </span>
            </div>
            
            <!-- Timestamp -->
            <div class="text-xs text-gray-400">
              {{ formatTimestamp(record.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div
      v-if="hasRecords && !isLoadingState"
      class="p-2 bg-slate-600 border-t border-slate-500 text-center"
    >
      <span class="text-xs text-gray-400">
        {{ displayRecords.length }} calculation{{ displayRecords.length !== 1 ? 's' : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styles */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thumb-slate-500::-webkit-scrollbar-thumb {
  background-color: rgb(100 116 139);
  border-radius: 4px;
}

.scrollbar-track-slate-600::-webkit-scrollbar-track {
  background-color: rgb(71 85 105);
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

/* Hover state for slate-550 (custom color) */
.hover\:bg-slate-550:hover {
  background-color: rgb(75 90 115);
}
</style>