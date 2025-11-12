/**
 * Platform Detection Utility for Renderer Process
 * Identifies whether the application is running in Electron desktop or web browser environment
 */

import type { Platform } from '../types/camera-ocr';

export class RendererPlatformDetection {
  private static _detectedPlatform: Platform | null = null;

  /**
   * Detects the current platform environment in renderer process
   * @returns Platform type (electron-desktop or web-browser)
   */
  static detectPlatform(): Platform {
    if (this._detectedPlatform) {
      return this._detectedPlatform;
    }

    // Check for Electron renderer environment
    if (this.isElectronRenderer()) {
      this._detectedPlatform = 'electron-desktop';
    } else {
      this._detectedPlatform = 'web-browser';
    }

    return this._detectedPlatform;
  }

  /**
   * Checks if running in Electron renderer process
   * @returns true if running in Electron renderer, false otherwise
   */
  static isElectronRenderer(): boolean {
    // Check for Electron-specific globals in renderer
    if (typeof window !== 'undefined') {
      return !!(
        (window as any).electronAPI ||
        (window as any).electron ||
        (window as any).__electronLog ||
        // Check for Electron's process object in renderer
        (window.process && window.process.type === 'renderer') ||
        // Check for preload script indicators
        (window as any).ipcRenderer ||
        // Check for Electron version in process
        (window.process && window.process.versions && window.process.versions.electron)
      );
    }

    return false;
  }

  /**
   * Checks if running in web browser environment
   * @returns true if running in web browser, false otherwise
   */
  static isWebBrowser(): boolean {
    return !this.isElectronRenderer() && typeof window !== 'undefined';
  }

  /**
   * Gets browser information (only in web environment)
   * @returns Browser information object
   */
  static getBrowserInfo() {
    if (!this.isWebBrowser()) {
      return null;
    }

    const userAgent = navigator.userAgent;
    let browser = 'unknown';
    let version = 'unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Edg')) {
      browser = 'edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'unknown';
    }

    return {
      browser,
      version,
      userAgent,
      platform: navigator.platform,
      language: navigator.language
    };
  }

  /**
   * Gets platform-specific capabilities for renderer
   * @returns Object describing platform capabilities
   */
  static getPlatformCapabilities() {
    const platform = this.detectPlatform();
    
    return {
      platform,
      isElectron: platform === 'electron-desktop',
      isWeb: platform === 'web-browser',
      hasWebRTC: this.hasWebRTCSupport(),
      hasCamera: this.hasCameraSupport(),
      hasPermissionsAPI: this.hasPermissionsAPI(),
      hasFileAPI: this.hasFileAPI(),
      hasClipboardAPI: this.hasClipboardAPI(),
      supportsHTTPS: this.isHTTPS(),
      browserInfo: this.getBrowserInfo(),
      supportedAPIs: this.getSupportedAPIs()
    };
  }

  /**
   * Checks if WebRTC is supported
   * @returns true if WebRTC is supported, false otherwise
   */
  static hasWebRTCSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.RTCPeerConnection !== 'undefined'
    );
  }

  /**
   * Checks if camera access is potentially available
   * @returns true if camera APIs are available, false otherwise
   */
  static hasCameraSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Checks if Permissions API is available
   * @returns true if Permissions API is available, false otherwise
   */
  static hasPermissionsAPI(): boolean {
    return !!(navigator.permissions && navigator.permissions.query);
  }

  /**
   * Checks if File API is available
   * @returns true if File API is available, false otherwise
   */
  static hasFileAPI(): boolean {
    return !!(window.File && window.FileReader && window.FileList && window.Blob);
  }

  /**
   * Checks if Clipboard API is available
   * @returns true if Clipboard API is available, false otherwise
   */
  static hasClipboardAPI(): boolean {
    return !!(navigator.clipboard);
  }

  /**
   * Checks if running over HTTPS
   * @returns true if HTTPS, false otherwise
   */
  static isHTTPS(): boolean {
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  /**
   * Gets list of supported APIs in renderer
   * @returns Array of supported API names
   */
  private static getSupportedAPIs(): string[] {
    const apis: string[] = [];

    // Web APIs
    if (this.hasWebRTCSupport()) apis.push('webrtc');
    if (this.hasCameraSupport()) apis.push('camera');
    if (this.hasPermissionsAPI()) apis.push('permissions');
    if (this.hasFileAPI()) apis.push('file');
    if (this.hasClipboardAPI()) apis.push('clipboard');

    // Electron APIs (if available)
    if (this.isElectronRenderer()) {
      if ((window as any).electronAPI) apis.push('electronAPI');
      if ((window as any).ipcRenderer) apis.push('ipcRenderer');
    }

    // Standard web APIs
    if (typeof window.fetch !== 'undefined') apis.push('fetch');
    if (typeof window.URL !== 'undefined') apis.push('url');
    if (typeof window.Worker !== 'undefined') apis.push('webworker');
    if (typeof window.localStorage !== 'undefined') apis.push('localstorage');
    if (typeof window.sessionStorage !== 'undefined') apis.push('sessionstorage');

    return apis;
  }

  /**
   * Validates camera requirements for current platform
   * @returns Validation result with requirements check
   */
  static validateCameraRequirements() {
    const platform = this.detectPlatform();
    const capabilities = this.getPlatformCapabilities();
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check basic camera support
    if (!capabilities.hasCamera) {
      issues.push('Camera API is not available');
    }

    // Platform-specific checks
    if (platform === 'web-browser') {
      if (!capabilities.supportsHTTPS) {
        issues.push('HTTPS is required for camera access in web browsers');
      }

      if (!capabilities.hasWebRTC) {
        issues.push('WebRTC is not supported in this browser');
      }

      if (!capabilities.hasPermissionsAPI) {
        warnings.push('Permissions API is not available - permission handling may be limited');
      }

      // Browser-specific warnings
      const browserInfo = capabilities.browserInfo;
      if (browserInfo) {
        if (browserInfo.browser === 'safari' && parseInt(browserInfo.version) < 11) {
          warnings.push('Safari version may have limited camera support');
        }
        if (browserInfo.browser === 'firefox' && parseInt(browserInfo.version) < 60) {
          warnings.push('Firefox version may have limited camera support');
        }
      }
    }

    if (platform === 'electron-desktop') {
      if (!capabilities.isElectron) {
        issues.push('Electron APIs are not available');
      }
    }

    return {
      isValid: issues.length === 0,
      platform,
      issues,
      warnings,
      capabilities
    };
  }

  /**
   * Gets recommended camera settings for current platform
   * @returns Recommended settings object
   */
  static getRecommendedSettings() {
    const platform = this.detectPlatform();
    const capabilities = this.getPlatformCapabilities();

    const baseSettings = {
      preferredResolution: { width: 1280, height: 720 },
      imageQuality: 0.8,
      compressionEnabled: true,
      autoFocus: true,
      maxRetries: 3,
      timeout: 30000
    };

    if (platform === 'electron-desktop') {
      return {
        ...baseSettings,
        preferredResolution: { width: 1920, height: 1080 },
        imageQuality: 0.9,
        timeout: 60000,
        maxRetries: 5
      };
    }

    // Web browser optimizations
    const browserInfo = capabilities.browserInfo;
    if (browserInfo) {
      if (browserInfo.browser === 'safari') {
        return {
          ...baseSettings,
          imageQuality: 0.7, // Safari has better compression
          compressionEnabled: false // Let Safari handle it
        };
      }
      
      if (browserInfo.browser === 'firefox') {
        return {
          ...baseSettings,
          timeout: 45000, // Firefox can be slower
          maxRetries: 4
        };
      }
    }

    return baseSettings;
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
    const capabilities = this.getPlatformCapabilities();
    
    return {
      platform: this.detectPlatform(),
      isElectron: this.isElectronRenderer(),
      isWeb: this.isWebBrowser(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      capabilities,
      validation: this.validateCameraRequirements(),
      recommendedSettings: this.getRecommendedSettings(),
      timestamp: new Date().toISOString()
    };
  }
}