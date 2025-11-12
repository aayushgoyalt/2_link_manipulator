import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { 
  CalculationRecord, 
  DatabaseSchema, 
  MockDBInterface
} from '../types/calculator';
import { ErrorHandler, RetryHandler } from './ErrorHandler';

export class MockDatabase implements MockDBInterface {
  private filePath: string;
  private data: DatabaseSchema;
  private isInitialized: boolean = false;

  constructor() {
    // Use userData directory for persistent storage
    const userDataPath = app.getPath('userData');
    const fileName = app.isPackaged ? 'calculator-history.json' : 'calculator-history-dev.json';
    this.filePath = join(userDataPath, fileName);
    
    this.data = {
      version: '1.0',
      lastModified: Date.now(),
      records: []
    };
  }

  /**
   * Initialize the database by loading existing data or creating new file
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we have write permissions to the directory
      await this.validateDirectoryAccess();
      
      // Try to load existing data with retry mechanism
      await RetryHandler.retry(async () => {
        await this.load();
      }, 3, 500);
      
      this.isInitialized = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // If it's a storage error, check if it's recoverable
      if (err.name === 'StorageError' && !ErrorHandler.isRecoverableError(err)) {
        throw err; // Re-throw unrecoverable errors
      }
      
      // For other errors or corrupted data, create backup and start fresh
      console.warn('Failed to load existing database, attempting recovery:', err.message);
      
      try {
        // Try to backup corrupted file if it exists
        await this.backupCorruptedFile();
        
        // Start with fresh database
        await this.save();
        this.isInitialized = true;
      } catch (recoveryError) {
        const storageError = ErrorHandler.handleStorageError(
          recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
          'write',
          this.filePath
        );
        throw storageError;
      }
    }
  }

  /**
   * Create a new calculation record
   */
  async create(record: Omit<CalculationRecord, 'id' | 'timestamp'>): Promise<CalculationRecord> {
    await this.ensureInitialized();
    
    // Validate the input record with enhanced validation
    this.validateRecord(record);
    
    // Check if we're approaching storage limits
    await this.validateStorageLimits();

    const newRecord: CalculationRecord = {
      ...record,
      id: this.generateId(),
      timestamp: Date.now()
    };

    // Validate the complete record before adding
    this.validateCompleteRecord(newRecord);

    this.data.records.push(newRecord);
    this.data.lastModified = Date.now();
    
    // Save with retry mechanism for better reliability
    await RetryHandler.retry(async () => {
      await this.save();
    }, 3, 500);
    
    return newRecord;
  }

  /**
   * Find all calculation records, sorted by timestamp (newest first)
   */
  async findAll(): Promise<CalculationRecord[]> {
    await this.ensureInitialized();
    
    // Return a copy sorted by timestamp (newest first)
    return [...this.data.records].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete all calculation records
   */
  async deleteAll(): Promise<void> {
    await this.ensureInitialized();
    
    // Create backup before clearing with enhanced error handling
    try {
      await this.backup();
    } catch (error) {
      // Log backup failure but don't prevent deletion
      console.warn('Failed to create backup before deletion:', error);
      
      // Only proceed if user data safety isn't at risk
      if (this.data.records.length > 0) {
        throw ErrorHandler.handleStorageError(
          error instanceof Error ? error : new Error(String(error)),
          'backup',
          this.filePath
        );
      }
    }
    
    this.data.records = [];
    this.data.lastModified = Date.now();
    
    // Save with retry mechanism
    await RetryHandler.retry(async () => {
      await this.save();
    }, 3, 500);
  }

  /**
   * Create a backup of the current database
   */
  async backup(): Promise<string> {
    await this.ensureInitialized();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTimestamp = ErrorHandler.sanitizeFilePath(timestamp);
    const backupPath = this.filePath.replace('.json', `_backup_${sanitizedTimestamp}.json`);
    
    try {
      // Validate data before backup
      this.validateDatabaseSchema(this.data);
      
      const dataToBackup = JSON.stringify(this.data, null, 2);
      
      // Check backup size before writing
      const backupSizeInBytes = Buffer.byteLength(dataToBackup, 'utf8');
      if (!ErrorHandler.validateFileSize(backupSizeInBytes, 50)) { // 50MB limit for backups
        throw new Error(`Backup file too large: ${Math.round(backupSizeInBytes / 1024 / 1024)}MB exceeds 50MB limit`);
      }
      
      // Ensure backup directory exists and is writable
      await this.validateDirectoryAccess();
      
      // Write backup with retry mechanism
      await RetryHandler.retry(async () => {
        await fs.writeFile(backupPath, dataToBackup, 'utf8');
      }, 3, 1000);
      
      // Verify backup was written correctly
      await this.verifyBackup(backupPath, dataToBackup);
      
      // Clean up old backups to prevent disk space issues
      await this.cleanupOldBackups();
      
      return backupPath;
    } catch (error) {
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'backup',
        backupPath
      );
    }
  }

  /**
   * Load data from file
   */
  private async load(): Promise<void> {
    try {
      // Check if file exists and is readable
      await fs.access(this.filePath, fs.constants.R_OK);
      
      const fileContent = await fs.readFile(this.filePath, 'utf8');
      
      // Validate file content is not empty
      if (!fileContent.trim()) {
        throw new Error('Database file is empty');
      }
      
      let parsedData: any;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON in database file: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }
      
      // Validate the loaded data structure with enhanced validation
      this.validateDatabaseSchema(parsedData);
      
      // Additional integrity checks
      this.validateDataIntegrity(parsedData);
      
      this.data = parsedData;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'ENOENT') {
        // File doesn't exist, will be created on first save
        return;
      }
      
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'read',
        this.filePath
      );
    }
  }

  /**
   * Save data to file
   */
  private async save(): Promise<void> {
    try {
      // Validate data before saving
      this.validateDatabaseSchema(this.data);
      
      const dataToSave = JSON.stringify(this.data, null, 2);
      
      // Check file size before writing
      const fileSizeInBytes = Buffer.byteLength(dataToSave, 'utf8');
      if (!ErrorHandler.validateFileSize(fileSizeInBytes, 100)) { // 100MB limit
        throw new Error(`Database file too large: ${Math.round(fileSizeInBytes / 1024 / 1024)}MB exceeds 100MB limit`);
      }
      
      // Ensure directory exists and is writable
      await this.validateDirectoryAccess();
      
      // Create temporary file first for atomic write
      const tempPath = `${this.filePath}.tmp`;
      
      try {
        // Write to temporary file
        await fs.writeFile(tempPath, dataToSave, 'utf8');
        
        // Verify the temporary file was written correctly
        const writtenContent = await fs.readFile(tempPath, 'utf8');
        if (writtenContent !== dataToSave) {
          throw new Error('File verification failed: written content does not match expected data');
        }
        
        // Atomically replace the original file
        await fs.rename(tempPath, this.filePath);
      } catch (error) {
        // Clean up temporary file if it exists
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    } catch (error) {
      throw ErrorHandler.handleStorageError(
        error instanceof Error ? error : new Error(String(error)),
        'write',
        this.filePath
      );
    }
  }

  /**
   * Generate a unique identifier using UUID
   */
  private generateId(): string {
    return randomUUID();
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Validate a calculation record structure with enhanced validation
   */
  private validateRecord(record: Omit<CalculationRecord, 'id' | 'timestamp'>): void {
    // Validate operation field
    if (!record.operation || typeof record.operation !== 'string') {
      throw ErrorHandler.handleValidationError('operation', record.operation, 'string', 'Operation must be a non-empty string');
    }
    
    if (record.operation.length > 1000) {
      throw ErrorHandler.handleValidationError('operation', record.operation, 'string', 'Operation string too long (max 1000 characters)');
    }
    
    // Allow mathematical operations with both basic and display symbols, plus OCR prefix
    // Allow letters, colon, and space for "OCR: " prefix
    if (!/^[A-Za-z]*:?\s*[\d\s+\-*/.%()×÷−]+$/.test(record.operation)) {
      throw ErrorHandler.handleValidationError('operation', record.operation, 'string', 'Operation contains invalid characters');
    }

    // Validate result field
    if (!record.result || typeof record.result !== 'string') {
      throw ErrorHandler.handleValidationError('result', record.result, 'string', 'Result must be a non-empty string');
    }
    
    if (record.result.length > 100) {
      throw ErrorHandler.handleValidationError('result', record.result, 'string', 'Result string too long (max 100 characters)');
    }
    
    // Validate result is either a number, "Error", or "Infinity"
    if (record.result !== 'Error' && record.result !== 'Infinity' && record.result !== '-Infinity' && isNaN(Number(record.result))) {
      throw ErrorHandler.handleValidationError('result', record.result, 'string', 'Result must be a valid number, "Error", "Infinity", or "-Infinity"');
    }

    // Validate operationType field
    if (!record.operationType || !this.isValidOperation(record.operationType)) {
      throw ErrorHandler.handleValidationError('operationType', record.operationType, 'Operation', 'OperationType must be a valid operation (+, -, *, /, %)');
    }
  }

  /**
   * Validate a complete calculation record (including id and timestamp)
   */
  private validateCompleteRecord(record: CalculationRecord): void {
    // Validate ID
    if (!record.id || typeof record.id !== 'string') {
      throw ErrorHandler.handleValidationError('id', record.id, 'string', 'ID must be a non-empty string');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(record.id)) {
      throw ErrorHandler.handleValidationError('id', record.id, 'UUID', 'ID must be a valid UUID');
    }

    // Validate timestamp
    if (!record.timestamp || typeof record.timestamp !== 'number') {
      throw ErrorHandler.handleValidationError('timestamp', record.timestamp, 'number', 'Timestamp must be a number');
    }
    
    if (record.timestamp < 0 || record.timestamp > Date.now() + 60000) { // Allow 1 minute future for clock skew
      throw ErrorHandler.handleValidationError('timestamp', record.timestamp, 'number', 'Timestamp must be a valid Unix timestamp');
    }

    // Check for duplicate IDs in existing records
    const existingRecord = this.data.records.find(r => r.id === record.id);
    if (existingRecord) {
      throw ErrorHandler.handleValidationError('id', record.id, 'unique string', 'Record with this ID already exists');
    }
  }

  /**
   * Validate database schema structure with enhanced validation
   */
  private validateDatabaseSchema(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid database schema: must be an object');
    }

    // Validate version
    if (!data.version || typeof data.version !== 'string') {
      throw new Error('Invalid database schema: version must be a string');
    }
    
    if (!/^\d+\.\d+$/.test(data.version)) {
      throw new Error('Invalid database schema: version must be in format "x.y"');
    }

    // Validate lastModified
    if (typeof data.lastModified !== 'number') {
      throw new Error('Invalid database schema: lastModified must be a number');
    }
    
    if (data.lastModified < 0 || data.lastModified > Date.now() + 60000) {
      throw new Error('Invalid database schema: lastModified must be a valid timestamp');
    }

    // Validate records array
    if (!Array.isArray(data.records)) {
      throw new Error('Invalid database schema: records must be an array');
    }
    
    if (data.records.length > 10000) {
      throw new Error('Invalid database schema: too many records (max 10000)');
    }

    // Validate each record with enhanced validation
    const seenIds = new Set<string>();
    data.records.forEach((record: any, index: number) => {
      try {
        // Validate basic structure
        if (!record || typeof record !== 'object') {
          throw new Error('record must be an object');
        }

        // Validate ID
        if (!record.id || typeof record.id !== 'string') {
          throw new Error('id must be a non-empty string');
        }
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(record.id)) {
          throw new Error('id must be a valid UUID');
        }
        
        if (seenIds.has(record.id)) {
          throw new Error('duplicate id found');
        }
        seenIds.add(record.id);

        // Validate operation
        if (!record.operation || typeof record.operation !== 'string') {
          throw new Error('operation must be a non-empty string');
        }
        
        if (record.operation.length > 1000) {
          throw new Error('operation string too long');
        }

        // Validate result
        if (!record.result || typeof record.result !== 'string') {
          throw new Error('result must be a non-empty string');
        }
        
        if (record.result.length > 100) {
          throw new Error('result string too long');
        }

        // Validate timestamp
        if (typeof record.timestamp !== 'number') {
          throw new Error('timestamp must be a number');
        }
        
        if (record.timestamp < 0 || record.timestamp > Date.now() + 60000) {
          throw new Error('timestamp must be a valid Unix timestamp');
        }

        // Validate operationType
        if (!record.operationType || !this.isValidOperation(record.operationType)) {
          throw new Error('operationType must be a valid operation');
        }
      } catch (error) {
        throw new Error(`Invalid record at index ${index}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    });
  }

  /**
   * Validate data integrity (check for corruption, inconsistencies)
   */
  private validateDataIntegrity(data: DatabaseSchema): void {
    // Check for timestamp consistency
    const now = Date.now();
    const futureThreshold = now + 60000; // 1 minute future tolerance
    const pastThreshold = now - (365 * 24 * 60 * 60 * 1000); // 1 year ago
    
    data.records.forEach((record, index) => {
      if (record.timestamp > futureThreshold) {
        console.warn(`Record ${index} has future timestamp: ${new Date(record.timestamp).toISOString()}`);
      }
      
      if (record.timestamp < pastThreshold) {
        console.warn(`Record ${index} has very old timestamp: ${new Date(record.timestamp).toISOString()}`);
      }
    });

    // Check for records sorted by timestamp (newest first when retrieved)
    const sortedRecords = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
    const timestampMismatch = data.records.some((record, index) => {
      const sortedRecord = sortedRecords[index];
      return sortedRecord && record.id !== sortedRecord.id;
    });
    
    if (timestampMismatch) {
      console.warn('Records are not properly sorted by timestamp');
    }

    // Validate lastModified is reasonable
    if (data.lastModified > now + 60000) {
      throw new Error('Database lastModified timestamp is in the future');
    }
    
    if (data.records.length > 0) {
      const newestRecord = Math.max(...data.records.map(r => r.timestamp));
      if (data.lastModified < newestRecord - 60000) { // Allow 1 minute tolerance
        console.warn('Database lastModified is older than newest record');
      }
    }
  }

  /**
   * Check if operation type is valid
   */
  private isValidOperation(op: any): boolean {
    return ['+', '-', '*', '/', '%'].includes(op);
  }

  /**
   * Validate directory access and permissions
   */
  private async validateDirectoryAccess(): Promise<void> {
    try {
      const directory = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
      
      // Check if directory exists and is accessible
      await fs.access(directory, fs.constants.F_OK);
      
      // Check write permissions
      await fs.access(directory, fs.constants.W_OK);
      
      // Check read permissions
      await fs.access(directory, fs.constants.R_OK);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      let message = 'Directory access validation failed';
      
      if (err.code === 'ENOENT') {
        message = 'Database directory does not exist';
      } else if (err.code === 'EACCES') {
        message = 'Insufficient permissions to access database directory';
      }
      
      throw ErrorHandler.handleStorageError(
        new Error(message),
        'write',
        this.filePath
      );
    }
  }

  /**
   * Validate storage limits to prevent disk space abuse
   */
  private async validateStorageLimits(): Promise<void> {
    // Check number of records limit
    if (this.data.records.length >= 10000) {
      throw new Error('Maximum number of records (10000) reached. Please clear some history.');
    }

    // Check estimated file size
    const estimatedSize = JSON.stringify(this.data).length;
    if (!ErrorHandler.validateFileSize(estimatedSize, 100)) { // 100MB limit
      throw new Error('Database size limit exceeded. Please clear some history.');
    }

    // Check available disk space (if possible)
    try {
      await fs.stat(this.filePath.substring(0, this.filePath.lastIndexOf('/')));
      // Note: Node.js doesn't provide direct disk space info, but we can check if directory is accessible
    } catch (error) {
      // Directory access issues will be caught by validateDirectoryAccess
    }
  }

  /**
   * Backup corrupted file for recovery purposes
   */
  private async backupCorruptedFile(): Promise<void> {
    try {
      // Check if original file exists
      await fs.access(this.filePath, fs.constants.F_OK);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const corruptedBackupPath = this.filePath.replace('.json', `_corrupted_${timestamp}.json`);
      
      // Copy corrupted file to backup location
      await fs.copyFile(this.filePath, corruptedBackupPath);
      
      console.warn(`Corrupted database backed up to: ${corruptedBackupPath}`);
    } catch (error) {
      // If we can't backup the corrupted file, log but don't throw
      console.warn('Could not backup corrupted file:', error);
    }
  }

  /**
   * Verify backup file integrity
   */
  private async verifyBackup(backupPath: string, expectedContent: string): Promise<void> {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf8');
      
      if (backupContent !== expectedContent) {
        throw new Error('Backup verification failed: content mismatch');
      }
      
      // Try to parse the backup to ensure it's valid JSON
      const parsedBackup = JSON.parse(backupContent);
      this.validateDatabaseSchema(parsedBackup);
    } catch (error) {
      // Remove invalid backup
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Backup verification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Clean up old backup files to prevent disk space issues
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const directory = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
      const files = await fs.readdir(directory);
      
      // Find backup files for this database
      const backupFiles = files
        .filter(file => file.includes('_backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: join(directory, file)
        }));
      
      // Keep only the 5 most recent backups
      if (backupFiles.length > 5) {
        // Sort by modification time (newest first)
        const filesWithStats = await Promise.all(
          backupFiles.map(async file => {
            const stats = await fs.stat(file.path);
            return { ...file, mtime: stats.mtime };
          })
        );
        
        filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        // Delete old backups
        const filesToDelete = filesWithStats.slice(5);
        await Promise.all(
          filesToDelete.map(async file => {
            try {
              await fs.unlink(file.path);
              console.log(`Cleaned up old backup: ${file.name}`);
            } catch (error) {
              console.warn(`Failed to delete old backup ${file.name}:`, error);
            }
          })
        );
      }
    } catch (error) {
      // Log cleanup errors but don't throw - this is not critical
      console.warn('Failed to cleanup old backups:', error);
    }
  }
}