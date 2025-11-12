/**
 * History Management Composable
 * Provides reactive state and methods for managing calculation history
 * Handles IPC communication and real-time updates
 */

import { ref, computed, onMounted } from 'vue';
import type { CalculationRecord, HistoryState, Operation } from '../types/calculator';

export function useHistory() {
  // Reactive state for history management
  const historyState = ref<HistoryState>({
    records: [],
    isLoading: false,
    error: null
  });

  // Computed properties
  const records = computed(() => historyState.value.records);
  const isLoading = computed(() => historyState.value.isLoading);
  const error = computed(() => historyState.value.error);
  const hasRecords = computed(() => historyState.value.records.length > 0);
  const recordCount = computed(() => historyState.value.records.length);

  // Load history from main process
  const loadHistory = async (): Promise<void> => {
    historyState.value.isLoading = true;
    historyState.value.error = null;

    try {
      const response = await window.api.history.loadHistory();
      
      if (response.success && response.data) {
        // Sort records by timestamp (newest first) and ensure type compatibility
        historyState.value.records = response.data.map(record => ({
          ...record,
          operationType: record.operationType as Operation
        })).sort((a, b) => b.timestamp - a.timestamp);
      } else {
        historyState.value.error = response.error || 'Failed to load history';
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      historyState.value.error = error instanceof Error ? error.message : 'Failed to load history';
    } finally {
      historyState.value.isLoading = false;
    }
  };

  // Save a new calculation to history
  const saveCalculation = async (
    operation: string,
    result: string,
    operationType: Operation,
    isFromOCR?: boolean,
    ocrMetadata?: {
      confidence: number;
      processingTime: number;
      originalImage?: string;
      recognizedExpression: string;
    }
  ): Promise<CalculationRecord | null> => {
    try {
      const record = {
        operation,
        result,
        operationType,
        isFromOCR,
        ocrMetadata
      };

      const response = await window.api.history.saveCalculation(record);
      
      if (response.success && response.data) {
        // Ensure type compatibility and add the new record to the beginning of the list
        const typedRecord = {
          ...response.data,
          operationType: response.data.operationType as Operation
        };
        historyState.value.records.unshift(typedRecord);
        
        // Keep only the last 100 records for performance
        if (historyState.value.records.length > 100) {
          historyState.value.records = historyState.value.records.slice(0, 100);
        }
        
        return typedRecord;
      } else {
        console.error('Failed to save calculation:', response.error);
        historyState.value.error = response.error || 'Failed to save calculation';
        return null;
      }
    } catch (error) {
      console.error('Failed to save calculation:', error);
      historyState.value.error = error instanceof Error ? error.message : 'Failed to save calculation';
      return null;
    }
  };

  // Clear all history
  const clearHistory = async (): Promise<boolean> => {
    try {
      const response = await window.api.history.clearHistory();
      
      if (response.success) {
        historyState.value.records = [];
        historyState.value.error = null;
        return true;
      } else {
        historyState.value.error = response.error || 'Failed to clear history';
        return false;
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      historyState.value.error = error instanceof Error ? error.message : 'Failed to clear history';
      return false;
    }
  };

  // Create a backup of current history
  const createBackup = async (): Promise<string | null> => {
    try {
      const response = await window.api.history.createBackup();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        historyState.value.error = response.error || 'Failed to create backup';
        return null;
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      historyState.value.error = error instanceof Error ? error.message : 'Failed to create backup';
      return null;
    }
  };

  // Get history statistics
  const getStats = async () => {
    try {
      const response = await window.api.history.getStats();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        historyState.value.error = response.error || 'Failed to get statistics';
        return null;
      }
    } catch (error) {
      console.error('Failed to get statistics:', error);
      historyState.value.error = error instanceof Error ? error.message : 'Failed to get statistics';
      return null;
    }
  };

  // Add a record directly (for real-time updates)
  const addRecord = (record: CalculationRecord): void => {
    historyState.value.records.unshift(record);
    
    // Keep only the last 100 records for performance
    if (historyState.value.records.length > 100) {
      historyState.value.records = historyState.value.records.slice(0, 100);
    }
  };

  // Remove a specific record by ID
  const removeRecord = (id: string): void => {
    const index = historyState.value.records.findIndex(record => record.id === id);
    if (index !== -1) {
      historyState.value.records.splice(index, 1);
    }
  };

  // Clear error state
  const clearError = (): void => {
    historyState.value.error = null;
  };

  // Retry last failed operation
  const retry = async (): Promise<void> => {
    historyState.value.error = null;
    await loadHistory();
  };

  // Format helpers
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatOperation = (operation: string, result: string): string => {
    return `${operation} = ${result}`;
  };

  const getOperationSymbol = (operationType: string): string => {
    const symbols: Record<string, string> = {
      '+': '+',
      '-': '−',
      '*': '×',
      '/': '÷',
      '%': '%'
    };
    return symbols[operationType] || operationType;
  };

  // Auto-load history on composable initialization
  onMounted(() => {
    loadHistory();
  });

  return {
    // State
    records,
    isLoading,
    error,
    hasRecords,
    recordCount,
    
    // Actions
    loadHistory,
    saveCalculation,
    clearHistory,
    createBackup,
    getStats,
    addRecord,
    removeRecord,
    clearError,
    retry,
    
    // Helpers
    formatTimestamp,
    formatOperation,
    getOperationSymbol
  };
}