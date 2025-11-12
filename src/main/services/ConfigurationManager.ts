/**
 * Configuration Management for Camera OCR System
 * Handles API keys, service settings, and configuration validation
 */

import { 
  CameraOCRConfig, 
  LLMConfig, 
  CameraConfig, 
  ProcessingConfig, 
  UIConfig,
  ConfigValidation 
} from '../types/camera-ocr';


export interface ConfigurationStorage {
  load(): Promise<CameraOCRConfig | null>;
  save(config: CameraOCRConfig): Promise<void>;
  exists(): Promise<boolean>;
  backup(): Promise<void>;
  restore(): Promise<CameraOCRConfig | null>;
}

export class ConfigurationManager {
  private config: CameraOCRConfig;
  private storage: ConfigurationStorage;
  private readonly defaultConfig: CameraOCRConfig;

  constructor(storage: ConfigurationStorage) {
    this.storage = storage;
    this.defaultConfig = this.createDefaultConfig();
    this.config = { ...this.defaultConfig };
  }

  /**
   * Initialize configuration system
   */
  async initialize(): Promise<void> {
    try {
      const savedConfig = await this.storage.load();
      
      if (savedConfig) {
        // Merge with defaults to ensure all properties exist
        this.config = this.mergeWithDefaults(savedConfig);
        
        // Validate the loaded configuration
        const validation = this.validateConfiguration(this.config);
        if (!validation.isValid) {
          console.warn('Configuration validation failed:', validation.errors);
          // Use defaults for invalid parts
          this.config = this.repairConfiguration(this.config, validation);
        }
      } else {
        // Use default configuration
        this.config = { ...this.defaultConfig };
        await this.saveConfiguration();
      }
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      this.config = { ...this.defaultConfig };
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): CameraOCRConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(updates: Partial<CameraOCRConfig>): Promise<ConfigValidation> {
    const newConfig = this.deepMerge(this.config, updates);
    const validation = this.validateConfiguration(newConfig);

    if (validation.isValid) {
      this.config = newConfig;
      await this.saveConfiguration();
    }

    return validation;
  }

  /**
   * Get LLM configuration
   */
  getLLMConfig(): LLMConfig {
    return { ...this.config.llm };
  }

  /**
   * Update LLM configuration
   */
  async updateLLMConfig(updates: Partial<LLMConfig>): Promise<ConfigValidation> {
    return this.updateConfiguration({ llm: { ...this.config.llm, ...updates } });
  }

  /**
   * Get camera configuration
   */
  getCameraConfig(): CameraConfig {
    return { ...this.config.camera };
  }

  /**
   * Update camera configuration
   */
  async updateCameraConfig(updates: Partial<CameraConfig>): Promise<ConfigValidation> {
    return this.updateConfiguration({ camera: { ...this.config.camera, ...updates } });
  }

  /**
   * Get processing configuration
   */
  getProcessingConfig(): ProcessingConfig {
    return { ...this.config.processing };
  }

  /**
   * Update processing configuration
   */
  async updateProcessingConfig(updates: Partial<ProcessingConfig>): Promise<ConfigValidation> {
    return this.updateConfiguration({ processing: { ...this.config.processing, ...updates } });
  }

  /**
   * Get UI configuration
   */
  getUIConfig(): UIConfig {
    return { ...this.config.ui };
  }

  /**
   * Update UI configuration
   */
  async updateUIConfig(updates: Partial<UIConfig>): Promise<ConfigValidation> {
    return this.updateConfiguration({ ui: { ...this.config.ui, ...updates } });
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...this.defaultConfig };
    await this.saveConfiguration();
  }

  /**
   * Export configuration for backup
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configJson: string): Promise<ConfigValidation> {
    try {
      const importedConfig = JSON.parse(configJson) as CameraOCRConfig;
      const validation = this.validateConfiguration(importedConfig);

      if (validation.isValid) {
        this.config = importedConfig;
        await this.saveConfiguration();
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid JSON format'],
        warnings: []
      };
    }
  }

  /**
   * Check if API key is configured
   */
  hasValidAPIKey(): boolean {
    return !!(this.config.llm.apiKey && this.config.llm.apiKey.trim().length > 0);
  }

  /**
   * Validate API key format
   */
  validateAPIKey(apiKey: string): { isValid: boolean; error?: string } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { isValid: false, error: 'API key cannot be empty' };
    }

    // Basic format validation for Gemini API keys
    if (this.config.llm.provider === 'gemini') {
      if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        return { isValid: false, error: 'Invalid Gemini API key format' };
      }
    }

    return { isValid: true };
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(environment: 'development' | 'production' | 'test'): Partial<CameraOCRConfig> {
    const envConfigs = {
      development: {
        processing: {
          ...this.config.processing,
          processingTimeout: 60000, // Longer timeout for development
          retryAttempts: 1 // Fewer retries for faster development
        },
        ui: {
          ...this.config.ui,
          showProcessingDetails: true // Show more details in development
        }
      },
      production: {
        processing: {
          ...this.config.processing,
          processingTimeout: 30000, // Standard timeout
          retryAttempts: 3 // More retries for reliability
        },
        ui: {
          ...this.config.ui,
          showProcessingDetails: false // Hide technical details from users
        }
      },
      test: {
        processing: {
          ...this.config.processing,
          processingTimeout: 10000, // Short timeout for tests
          retryAttempts: 0, // No retries in tests
          cacheEnabled: false // Disable cache for consistent test results
        }
      }
    };

    return envConfigs[environment] || {};
  }

  private createDefaultConfig(): CameraOCRConfig {
    return {
      llm: {
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-pro-vision',
        maxTokens: 100,
        temperature: 0.1,
        timeout: 30000
      },
      camera: {
        preferredResolution: { width: 1920, height: 1080, label: 'HD' },
        maxImageSize: 5 * 1024 * 1024, // 5MB
        imageQuality: 0.8,
        compressionEnabled: true,
        autoFocus: true
      },
      processing: {
        processingTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        cacheEnabled: true,
        cacheDuration: 3600000, // 1 hour
        batchProcessing: false
      },
      ui: {
        showProcessingDetails: false,
        enableManualCorrection: true,
        confirmBeforeCalculation: true,
        showConfidenceScore: true
      }
    };
  }

  private validateConfiguration(config: CameraOCRConfig): ConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate LLM configuration
    if (!config.llm) {
      errors.push('LLM configuration is missing');
    } else {
      if (!config.llm.provider) {
        errors.push('LLM provider is required');
      }
      
      if (config.llm.maxTokens && (config.llm.maxTokens < 10 || config.llm.maxTokens > 1000)) {
        warnings.push('Max tokens should be between 10 and 1000');
      }
      
      if (config.llm.temperature && (config.llm.temperature < 0 || config.llm.temperature > 1)) {
        errors.push('Temperature must be between 0 and 1');
      }
      
      if (config.llm.timeout && config.llm.timeout < 5000) {
        warnings.push('Timeout less than 5 seconds may cause failures');
      }
    }

    // Validate camera configuration
    if (!config.camera) {
      errors.push('Camera configuration is missing');
    } else {
      if (config.camera.maxImageSize && config.camera.maxImageSize < 100000) {
        warnings.push('Max image size is very small, may affect quality');
      }
      
      if (config.camera.imageQuality && (config.camera.imageQuality < 0.1 || config.camera.imageQuality > 1)) {
        errors.push('Image quality must be between 0.1 and 1');
      }
      
      if (!config.camera.preferredResolution) {
        errors.push('Preferred resolution is required');
      }
    }

    // Validate processing configuration
    if (!config.processing) {
      errors.push('Processing configuration is missing');
    } else {
      if (config.processing.retryAttempts && config.processing.retryAttempts < 0) {
        errors.push('Retry attempts cannot be negative');
      }
      
      if (config.processing.retryDelay && config.processing.retryDelay < 100) {
        warnings.push('Very short retry delay may cause rate limiting');
      }
      
      if (config.processing.cacheDuration && config.processing.cacheDuration < 60000) {
        warnings.push('Short cache duration may reduce performance benefits');
      }
    }

    // Validate UI configuration
    if (!config.ui) {
      errors.push('UI configuration is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private mergeWithDefaults(config: Partial<CameraOCRConfig>): CameraOCRConfig {
    return this.deepMerge(this.defaultConfig, config);
  }

  private repairConfiguration(config: CameraOCRConfig, validation: ConfigValidation): CameraOCRConfig {
    const repairedConfig = { ...config };

    // Repair based on validation errors
    validation.errors.forEach(error => {
      if (error.includes('LLM configuration')) {
        repairedConfig.llm = { ...this.defaultConfig.llm };
      }
      if (error.includes('Camera configuration')) {
        repairedConfig.camera = { ...this.defaultConfig.camera };
      }
      if (error.includes('Processing configuration')) {
        repairedConfig.processing = { ...this.defaultConfig.processing };
      }
      if (error.includes('UI configuration')) {
        repairedConfig.ui = { ...this.defaultConfig.ui };
      }
    });

    return repairedConfig;
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key], source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }

    return result;
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await this.storage.save(this.config);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Configuration save failed');
    }
  }
}

/**
 * File-based configuration storage implementation
 */
export class FileConfigurationStorage implements ConfigurationStorage {
  private readonly configPath: string;
  private readonly backupPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.backupPath = configPath + '.backup';
  }

  async load(): Promise<CameraOCRConfig | null> {
    try {
      // In a real implementation, this would use fs.readFile
      // For now, we'll use localStorage or similar browser storage
      if (typeof window !== 'undefined' && window.localStorage) {
        const configData = localStorage.getItem('camera-ocr-config');
        return configData ? JSON.parse(configData) : null;
      }
      
      // For Node.js/Electron main process, you would use:
      // const fs = require('fs').promises;
      // const data = await fs.readFile(this.configPath, 'utf8');
      // return JSON.parse(data);
      console.log(`Configuration path: ${this.configPath}`);
      
      return null;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  async save(config: CameraOCRConfig): Promise<void> {
    try {
      const configData = JSON.stringify(config, null, 2);
      
      // In a real implementation, this would use fs.writeFile
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('camera-ocr-config', configData);
        return;
      }
      
      // For Node.js/Electron main process, you would use:
      // const fs = require('fs').promises;
      // await fs.writeFile(this.configPath, configData, 'utf8');
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  async exists(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('camera-ocr-config') !== null;
      }
      
      // For Node.js/Electron main process:
      // const fs = require('fs').promises;
      // await fs.access(this.configPath);
      // return true;
      
      return false;
    } catch {
      return false;
    }
  }

  async backup(): Promise<void> {
    try {
      const config = await this.load();
      if (config) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('camera-ocr-config-backup', JSON.stringify(config));
        }
        
        // For Node.js/Electron main process:
        // const fs = require('fs').promises;
        // const configData = JSON.stringify(config, null, 2);
        // await fs.writeFile(this.backupPath, configData, 'utf8');
        console.log(`Backup path: ${this.backupPath}`);
      }
    } catch (error) {
      console.error('Failed to backup configuration:', error);
      throw error;
    }
  }

  async restore(): Promise<CameraOCRConfig | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const backupData = localStorage.getItem('camera-ocr-config-backup');
        return backupData ? JSON.parse(backupData) : null;
      }
      
      // For Node.js/Electron main process:
      // const fs = require('fs').promises;
      // const data = await fs.readFile(this.backupPath, 'utf8');
      // return JSON.parse(data);
      
      return null;
    } catch (error) {
      console.error('Failed to restore configuration:', error);
      return null;
    }
  }
}

/**
 * Environment variable configuration loader
 */
export class EnvironmentConfigLoader {
  static loadFromEnvironment(): Partial<CameraOCRConfig> {
    const config: Partial<CameraOCRConfig> = {};

    // Load LLM configuration from environment
    if (process.env.GEMINI_API_KEY) {
      config.llm = {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-pro-vision',
        maxTokens: process.env.GEMINI_MAX_TOKENS ? parseInt(process.env.GEMINI_MAX_TOKENS) : undefined,
        temperature: process.env.GEMINI_TEMPERATURE ? parseFloat(process.env.GEMINI_TEMPERATURE) : undefined,
        timeout: process.env.GEMINI_TIMEOUT ? parseInt(process.env.GEMINI_TIMEOUT) : undefined
      };
    }

    // Load processing configuration from environment
    if (process.env.OCR_PROCESSING_TIMEOUT || process.env.OCR_RETRY_ATTEMPTS) {
      config.processing = {
        processingTimeout: process.env.OCR_PROCESSING_TIMEOUT ? parseInt(process.env.OCR_PROCESSING_TIMEOUT) : 30000,
        retryAttempts: process.env.OCR_RETRY_ATTEMPTS ? parseInt(process.env.OCR_RETRY_ATTEMPTS) : 3,
        retryDelay: process.env.OCR_RETRY_DELAY ? parseInt(process.env.OCR_RETRY_DELAY) : 1000,
        cacheEnabled: process.env.OCR_CACHE_ENABLED !== 'false',
        cacheDuration: process.env.OCR_CACHE_DURATION ? parseInt(process.env.OCR_CACHE_DURATION) : 3600000,
        batchProcessing: process.env.OCR_BATCH_PROCESSING === 'true'
      };
    }

    return config;
  }
}