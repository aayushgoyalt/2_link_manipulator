import { MockDatabase } from './MockDatabase';
import { ErrorHandler, RetryHandler } from './ErrorHandler';
import type { 
  CalculationRecord, 
  MockDBInterface
} from '../types/calculator';

/**
 * History Service - Main interface for calculation history operations
 * Provides error handling, retry logic, and data safety features
 */
export class HistoryService {
  private database: MockDBInterface;
  private isInitialized: boolean = false;

  constructor() {
    this.database = new MockDatabase();
  }

  /**
   * Initialize the history service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await RetryHandler.retry(async () => {
        await this.database.initialize();
      }, 3, 500);
      
      this.isInitialized = true;
      console.log('History service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize history service:', error);
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'read',
        'history database'
      );
    }
  }

  /**
   * Save a calculation to history with error handling and validation
   */
  async saveCalculation(record: Omit<CalculationRecord, 'id' | 'timestamp'>): Promise<CalculationRecord> {
    await this.ensureInitialized();

    try {
      // Additional validation before saving
      this.validateCalculationInput(record);

      const savedRecord = await RetryHandler.retry(async () => {
        return await this.database.create(record);
      }, 2, 1000);

      console.log('Calculation saved to history:', savedRecord.id);
      return savedRecord;
    } catch (error) {
      console.error('Failed to save calculation:', error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        throw error; // Re-throw validation errors as-is
      }
      
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'write',
        'calculation record'
      );
    }
  }

  /**
   * Load all calculations from history
   */
  async loadHistory(): Promise<CalculationRecord[]> {
    await this.ensureInitialized();

    try {
      const records = await RetryHandler.retry(async () => {
        return await this.database.findAll();
      }, 2, 1000);

      console.log(`Loaded ${records.length} calculation records from history`);
      return records;
    } catch (error) {
      console.error('Failed to load history:', error);
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'read',
        'history records'
      );
    }
  }

  /**
   * Clear all calculation history with backup
   */
  async clearHistory(): Promise<void> {
    await this.ensureInitialized();

    try {
      // Create backup before clearing
      const backupPath = await this.database.backup();
      console.log('History backup created at:', backupPath);

      await RetryHandler.retry(async () => {
        await this.database.deleteAll();
      }, 2, 1000);

      console.log('History cleared successfully');
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'delete',
        'history records'
      );
    }
  }

  /**
   * Create a backup of the current history
   */
  async createBackup(): Promise<string> {
    await this.ensureInitialized();

    try {
      const backupPath = await RetryHandler.retry(async () => {
        return await this.database.backup();
      }, 2, 1000);

      console.log('Manual backup created at:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'backup',
        'history database'
      );
    }
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<{
    totalCalculations: number;
    operationCounts: Record<string, number>;
    oldestCalculation?: Date;
    newestCalculation?: Date;
  }> {
    await this.ensureInitialized();

    try {
      const records = await this.loadHistory();
      
      const stats = {
        totalCalculations: records.length,
        operationCounts: {} as Record<string, number>,
        oldestCalculation: undefined as Date | undefined,
        newestCalculation: undefined as Date | undefined
      };

      if (records.length > 0) {
        // Count operations
        records.forEach(record => {
          const op = record.operationType;
          stats.operationCounts[op] = (stats.operationCounts[op] || 0) + 1;
        });

        // Find oldest and newest (records are sorted newest first)
        stats.newestCalculation = new Date(records[0].timestamp);
        stats.oldestCalculation = new Date(records[records.length - 1].timestamp);
      }

      return stats;
    } catch (error) {
      console.error('Failed to get history stats:', error);
      throw error; // Re-throw as this uses loadHistory which already handles errors
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Additional validation for calculation input
   */
  private validateCalculationInput(record: Omit<CalculationRecord, 'id' | 'timestamp'>): void {
    // Check for reasonable operation string length
    if (record.operation.length > 1000) {
      throw ErrorHandler.handleValidationError(
        'operation',
        record.operation,
        'string with length <= 1000',
        'Operation string is too long'
      );
    }

    // Check for reasonable result string length
    if (record.result.length > 100) {
      throw ErrorHandler.handleValidationError(
        'result',
        record.result,
        'string with length <= 100',
        'Result string is too long'
      );
    }

    // Validate that operation contains the operation type or its display symbol
    const operationSymbols: Record<string, string> = {
      '+': '+',
      '-': '−',
      '*': '×',
      '/': '÷',
      '%': '%'
    };
    
    const displaySymbol = operationSymbols[record.operationType];
    const hasOperationType = record.operation.includes(record.operationType);
    const hasDisplaySymbol = displaySymbol && record.operation.includes(displaySymbol);
    
    if (!hasOperationType && !hasDisplaySymbol) {
      throw ErrorHandler.handleValidationError(
        'operation',
        record.operation,
        `string containing '${record.operationType}' or '${displaySymbol}'`,
        'Operation string must contain the operation type'
      );
    }

    // Check for potentially malicious content
    const suspiciousPatterns = [/<script/i, /javascript:/i, /data:/i, /vbscript:/i];
    const combinedText = record.operation + record.result;
    
    if (suspiciousPatterns.some(pattern => pattern.test(combinedText))) {
      throw ErrorHandler.handleValidationError(
        'operation/result',
        combinedText,
        'safe text content',
        'Operation or result contains potentially unsafe content'
      );
    }
  }
}

// Export singleton instance
export const historyService = new HistoryService();