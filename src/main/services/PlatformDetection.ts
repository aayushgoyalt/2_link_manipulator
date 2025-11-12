/**
 * Platform Detection Utility
 * Identifies whether the application is running in Electron desktop or web browser environment
 */

import type { Platform } from '../types/camera-ocr';

export class PlatformDetection {
  private static _detectedPlatform: Platform | null = null;

  /**
   * Detects the current platform environment
   * @returns Platform type (electron-desktop or web-browser)
   */
  static detectPlatform(): Platform {
    if (this._detectedPlatform) {
      return this._detectedPlatform;
    }

    // Check for Electron environment
    if (this.isElectronEnvironment()) {
      this._detectedPlatform = 'electron-desktop';
    } else {
      this._detectedPlatform = 'web-browser';
    }

    return this._detectedPlatform;
  }

  /**
   * Checks if running in Electron environment
   * @returns true if running in Electron, false otherwise
   */
  static isElectronEnvironment(): boolean {
    // Check for Electron-specific globals
    if (typeof window !== 'undefined') {
      // Check for Electron renderer process
      return !!(
        window.process &&
        window.process.type === 'renderer'
      ) || !!(
        (window as any).electronAPI ||
        (window as any).electron ||
        (window as any).__electronLog
      );
    }

    // Check for Electron main process
    if (typeof process !== 'undefined') {
      return !!(
        process.versions &&
        process.versions.electron
      ) || !!(
        process.type === 'browser' ||
        process.type === 'renderer'
      );
    }

    return false;
  }

  /**
   * Checks if running in web browser environment
   * @returns true if running in web browser, false otherwise
   */
  static isWebEnvironment(): boolean {
    return !this.isElectronEnvironment() && typeof window !== 'undefined';
  }

  /**
   * Gets platform-specific capabilities
   * @returns Object describing platform capabilities
   */
  static getPlatformCapabilities() {
    const platform = this.detectPlatform();
    
    return {
      platform,
      hasNativeCamera: platform === 'electron-desktop',
      hasWebRTC: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
      hasFileSystem: platform === 'electron-desktop',
      hasDesktopCapture: platform === 'electron-desktop',
      supportedAPIs: this.getSupportedAPIs(platform)
    };
  }

  /**
   * Gets list of supported APIs for the current platform
   * @param platform The platform to check APIs for
   * @returns Array of supported API names
   */
  private static getSupportedAPIs(platform: Platform): string[] {
    const apis: string[] = [];

    if (platform === 'electron-desktop') {
      apis.push('desktopCapturer', 'systemPreferences', 'shell', 'ipcRenderer');
      
      // Check for Node.js APIs availability
      if (typeof process !== 'undefined') {
        apis.push('fs', 'path', 'os');
      }
    }

    if (typeof navigator !== 'undefined') {
      if (navigator.mediaDevices) apis.push('getUserMedia');
      if (navigator.permissions) apis.push('permissions');
      if (navigator.clipboard) apis.push('clipboard');
    }

    if (typeof window !== 'undefined') {
      if (typeof window.File !== 'undefined') apis.push('File');
      if (typeof window.FileReader !== 'undefined') apis.push('FileReader');
      if (typeof window.URL !== 'undefined') apis.push('URL');
      if (typeof window.fetch !== 'undefined') apis.push('fetch');
    }

    return apis;
  }

  /**
   * Validates if a specific API is available on the current platform
   * @param apiName Name of the API to check
   * @returns true if API is available, false otherwise
   */
  static isAPIAvailable(apiName: string): boolean {
    const capabilities = this.getPlatformCapabilities();
    return capabilities.supportedAPIs.includes(apiName);
  }

  /**
   * Gets platform-specific configuration defaults
   * @returns Default configuration object for the current platform
   */
  static getPlatformDefaults() {
    const platform = this.detectPlatform();
    
    const baseDefaults = {
      camera: {
        preferredResolution: { width: 1280, height: 720, label: 'HD' },
        maxImageSize: 5 * 1024 * 1024, // 5MB
        imageQuality: 0.8,
        compressionEnabled: true,
        autoFocus: true
      },
      processing: {
        processingTimeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
        cacheEnabled: true,
        cacheDuration: 3600000, // 1 hour
        batchProcessing: false
      }
    };

    if (platform === 'electron-desktop') {
      return {
        ...baseDefaults,
        camera: {
          ...baseDefaults.camera,
          maxImageSize: 10 * 1024 * 1024, // 10MB for desktop
          preferredResolution: { width: 1920, height: 1080, label: 'Full HD' }
        },
        processing: {
          ...baseDefaults.processing,
          processingTimeout: 60000, // 60 seconds for desktop
          batchProcessing: true
        }
      };
    }

    return baseDefaults;
  }

  /**
   * Resets the cached platform detection result
   * Useful for testing or when environment changes
   */
  static resetDetection(): void {
    this._detectedPlatform = null;
  }

  /**
   * Gets detailed environment information for debugging
   * @returns Object with detailed environment information
   */
  static getEnvironmentInfo() {
    return {
      platform: this.detectPlatform(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      isElectron: this.isElectronEnvironment(),
      isWeb: this.isWebEnvironment(),
      nodeVersion: typeof process !== 'undefined' ? process.version : 'N/A',
      electronVersion: typeof process !== 'undefined' && process.versions ? process.versions.electron : 'N/A',
      chromeVersion: typeof process !== 'undefined' && process.versions ? process.versions.chrome : 'N/A',
      capabilities: this.getPlatformCapabilities(),
      timestamp: new Date().toISOString()
    };
  }
}