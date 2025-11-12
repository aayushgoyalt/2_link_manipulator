/**
 * Browser Compatibility Utility
 * Handles browser-specific differences and provides fallback mechanisms
 * Ensures camera functionality works across Chrome, Firefox, Safari, and Edge
 */

import type { CameraResolution } from '../types/camera-ocr';

/**
 * Browser compatibility information
 */
export interface BrowserCompatibility {
  browser: string;
  version: string;
  supportsGetUserMedia: boolean;
  supportsConstraints: boolean;
  supportsPermissionsAPI: boolean;
  requiresUserInteraction: boolean;
  maxResolution: CameraResolution;
  recommendedQuality: number;
  quirks: string[];
  fallbacks: string[];
}

/**
 * Browser Compatibility Manager
 * Provides browser-specific optimizations and fallback mechanisms
 */
export class BrowserCompatibilityManager {
  private static compatibility: BrowserCompatibility | null = null;

  /**
   * Gets browser compatibility information
   */
  static getCompatibility(): BrowserCompatibility {
    if (this.compatibility) {
      return this.compatibility;
    }

    this.compatibility = this.detectBrowserCompatibility();
    return this.compatibility;
  }

  /**
   * Detects browser-specific compatibility information
   */
  private static detectBrowserCompatibility(): BrowserCompatibility {
    const userAgent = navigator.userAgent;
    let browser = 'unknown';
    let version = '0';
    const quirks: string[] = [];
    const fallbacks: string[] = [];

    // Detect browser type and version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Firefox')) {
      browser = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (userAgent.includes('Edg')) {
      browser = 'edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : '0';
    }

    // Browser-specific configurations
    let maxResolution: CameraResolution = { width: 1920, height: 1080, label: 'Full HD' };
    let recommendedQuality = 0.8;
    let requiresUserInteraction = false;

    switch (browser) {
      case 'chrome':
        if (parseInt(version) >= 53) {
          maxResolution = { width: 3840, height: 2160, label: '4K' };
          recommendedQuality = 0.85;
        }
        if (parseInt(version) < 53) {
          quirks.push('Older Chrome version may have limited camera support');
          fallbacks.push('Upgrade to Chrome 53+ for better camera support');
        }
        break;

      case 'firefox':
        if (parseInt(version) >= 60) {
          maxResolution = { width: 2560, height: 1440, label: '2K' };
          recommendedQuality = 0.8;
        }
        if (parseInt(version) < 60) {
          quirks.push('Older Firefox version may have limited camera constraints');
          fallbacks.push('Upgrade to Firefox 60+ for better camera support');
        }
        quirks.push('Firefox may show permission prompt for each session');
        break;

      case 'safari':
        if (parseInt(version) >= 11) {
          maxResolution = { width: 1920, height: 1080, label: 'Full HD' };
          recommendedQuality = 0.9; // Safari has better built-in compression
          requiresUserInteraction = true;
        }
        if (parseInt(version) < 11) {
          quirks.push('Safari version may have very limited camera support');
          fallbacks.push('Upgrade to Safari 11+ for camera support');
          maxResolution = { width: 1280, height: 720, label: 'HD' };
        }
        quirks.push('Safari requires user interaction before camera access');
        quirks.push('Safari may not support all camera constraints');
        break;

      case 'edge':
        if (parseInt(version) >= 79) { // Chromium-based Edge
          maxResolution = { width: 3840, height: 2160, label: '4K' };
          recommendedQuality = 0.85;
        } else { // Legacy Edge
          quirks.push('Legacy Edge has limited camera support');
          fallbacks.push('Upgrade to Chromium-based Edge for better camera support');
          maxResolution = { width: 1280, height: 720, label: 'HD' };
        }
        break;

      default:
        quirks.push('Unknown browser - camera support may be limited');
        fallbacks.push('Use Chrome, Firefox, Safari, or Edge for best camera support');
        maxResolution = { width: 1280, height: 720, label: 'HD' };
    }

    return {
      browser,
      version,
      supportsGetUserMedia: this.checkGetUserMediaSupport(),
      supportsConstraints: this.checkConstraintsSupport(),
      supportsPermissionsAPI: this.checkPermissionsAPISupport(),
      requiresUserInteraction,
      maxResolution,
      recommendedQuality,
      quirks,
      fallbacks
    };
  }

  /**
   * Checks if getUserMedia is supported
   */
  private static checkGetUserMediaSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Checks if camera constraints are supported
   */
  private static checkConstraintsSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getSupportedConstraints
    );
  }

  /**
   * Checks if Permissions API is supported
   */
  private static checkPermissionsAPISupport(): boolean {
    return !!(navigator.permissions && navigator.permissions.query);
  }

  /**
   * Gets optimal camera constraints for current browser
   */
  static getOptimalConstraints(preferredResolution?: CameraResolution): MediaStreamConstraints {
    const compatibility = this.getCompatibility();
    const targetResolution = preferredResolution || { width: 1280, height: 720, label: 'HD' };

    // Ensure resolution doesn't exceed browser maximum
    const maxWidth = Math.min(targetResolution.width, compatibility.maxResolution.width);
    const maxHeight = Math.min(targetResolution.height, compatibility.maxResolution.height);

    let videoConstraints: MediaTrackConstraints = {
      width: { ideal: maxWidth, min: 640 },
      height: { ideal: maxHeight, min: 480 },
      facingMode: 'environment'
    };

    // Browser-specific optimizations
    switch (compatibility.browser) {
      case 'safari':
        // Safari is picky about constraints
        videoConstraints = {
          width: { ideal: maxWidth, max: maxWidth },
          height: { ideal: maxHeight, max: maxHeight }
        };
        break;

      case 'firefox':
        // Firefox sometimes struggles with high frame rates
        videoConstraints = {
          ...videoConstraints,
          frameRate: { ideal: 24, max: 30 }
        };
        break;

      case 'chrome':
      case 'edge':
        // Chrome and Edge support advanced constraints
        videoConstraints = {
          ...videoConstraints,
          frameRate: { ideal: 30, min: 15 },
          aspectRatio: { ideal: 16/9 }
        };
        break;
    }

    const constraints: MediaStreamConstraints = {
      video: videoConstraints
    };

    return constraints;
  }

  /**
   * Gets fallback constraints if optimal constraints fail
   */
  static getFallbackConstraints(): MediaStreamConstraints[] {
    return [
      // Basic HD constraints
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      // VGA fallback
      {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      },
      // Minimal constraints
      {
        video: true
      }
    ];
  }

  /**
   * Gets optimal image quality for current browser
   */
  static getOptimalImageQuality(): number {
    const compatibility = this.getCompatibility();
    return compatibility.recommendedQuality;
  }

  /**
   * Checks if user interaction is required before camera access
   */
  static requiresUserInteraction(): boolean {
    const compatibility = this.getCompatibility();
    return compatibility.requiresUserInteraction;
  }

  /**
   * Gets browser-specific error messages
   */
  static getBrowserSpecificErrorMessage(error: Error): string {
    const compatibility = this.getCompatibility();
    const errorName = error.name;
    const browser = compatibility.browser;

    switch (errorName) {
      case 'NotAllowedError':
        switch (browser) {
          case 'safari':
            return 'Camera access denied. Safari requires you to allow camera access in the browser prompt. You may need to refresh the page and try again.';
          case 'firefox':
            return 'Camera access denied. Firefox may ask for permission each session. Click "Allow" in the permission prompt.';
          case 'chrome':
          case 'edge':
            return 'Camera access denied. Click the camera icon in the address bar to grant permission, or check your browser settings.';
          default:
            return 'Camera access denied. Please grant camera permission in your browser settings.';
        }

      case 'NotFoundError':
        return `No camera found. Please connect a camera device and refresh the page. ${browser === 'safari' ? 'Safari may require you to restart the browser after connecting a camera.' : ''}`;

      case 'NotReadableError':
        switch (browser) {
          case 'safari':
            return 'Camera is busy or not accessible. Close other applications using the camera and try again. Safari may require you to restart the browser.';
          default:
            return 'Camera is already in use by another application. Close other applications using the camera and try again.';
        }

      case 'OverconstrainedError':
        return `Camera doesn't support the requested settings. ${browser === 'safari' ? 'Safari has limited support for camera constraints.' : 'Try with different camera settings.'}`;

      case 'SecurityError':
        return `Camera access blocked by browser security. ${window.location.protocol !== 'https:' ? 'Camera access requires HTTPS (except on localhost).' : 'Check your browser security settings.'}`;

      default:
        return `Camera error in ${browser}: ${error.message}. ${compatibility.fallbacks[0] || 'Try refreshing the page.'}`;
    }
  }

  /**
   * Gets browser-specific setup instructions
   */
  static getSetupInstructions(): string[] {
    const compatibility = this.getCompatibility();
    const instructions: string[] = [];

    switch (compatibility.browser) {
      case 'chrome':
        instructions.push('Click the camera icon in the address bar when prompted');
        instructions.push('Select "Allow" to grant camera permission');
        instructions.push('If blocked, click the lock icon and change camera setting to "Allow"');
        break;

      case 'firefox':
        instructions.push('Click "Allow" when Firefox asks for camera permission');
        instructions.push('Firefox may ask for permission each time you visit');
        instructions.push('To permanently allow: click the shield icon and select "Allow Camera"');
        break;

      case 'safari':
        instructions.push('Safari will ask for camera permission - click "Allow"');
        instructions.push('You may need to interact with the page first (click a button)');
        instructions.push('If permission is denied, go to Safari > Preferences > Websites > Camera');
        instructions.push('Find this website and change setting to "Allow"');
        break;

      case 'edge':
        instructions.push('Click "Allow" when Edge asks for camera permission');
        instructions.push('If blocked, click the camera icon in the address bar');
        instructions.push('Select "Allow" and refresh the page');
        break;

      default:
        instructions.push('Grant camera permission when your browser asks');
        instructions.push('Look for a camera icon in the address bar');
        instructions.push('Check browser settings if camera access is blocked');
    }

    // Add HTTPS requirement if not secure
    if (!window.isSecureContext && window.location.protocol !== 'https:') {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        instructions.unshift('Camera access requires HTTPS - please use a secure connection');
      }
    }

    return instructions;
  }

  /**
   * Tests browser compatibility and returns detailed results
   */
  static async testCompatibility() {
    const compatibility = this.getCompatibility();
    const results = {
      compatibility,
      tests: {
        getUserMedia: false,
        constraints: false,
        permissions: false,
        secureContext: false,
        videoElement: false,
        canvasElement: false
      },
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Test getUserMedia support
    try {
      results.tests.getUserMedia = this.checkGetUserMediaSupport();
      if (!results.tests.getUserMedia) {
        results.issues.push('getUserMedia API not supported');
        results.recommendations.push('Upgrade to a modern browser version');
      }
    } catch (error) {
      results.issues.push(`getUserMedia test failed: ${(error as Error).message}`);
    }

    // Test constraints support
    try {
      results.tests.constraints = this.checkConstraintsSupport();
      if (!results.tests.constraints) {
        results.recommendations.push('Camera constraints may be limited');
      }
    } catch (error) {
      results.issues.push(`Constraints test failed: ${(error as Error).message}`);
    }

    // Test permissions API
    try {
      results.tests.permissions = this.checkPermissionsAPISupport();
      if (!results.tests.permissions) {
        results.recommendations.push('Permission status checking may be limited');
      }
    } catch (error) {
      results.issues.push(`Permissions API test failed: ${(error as Error).message}`);
    }

    // Test secure context
    results.tests.secureContext = window.isSecureContext || 
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    
    if (!results.tests.secureContext) {
      results.issues.push('Secure context required for camera access');
      results.recommendations.push('Use HTTPS or localhost for camera functionality');
    }

    // Test video element support
    results.tests.videoElement = typeof HTMLVideoElement !== 'undefined';
    if (!results.tests.videoElement) {
      results.issues.push('Video element not supported');
    }

    // Test canvas element support
    results.tests.canvasElement = typeof HTMLCanvasElement !== 'undefined';
    if (!results.tests.canvasElement) {
      results.issues.push('Canvas element not supported');
    }

    // Add browser-specific recommendations
    compatibility.fallbacks.forEach(fallback => {
      results.recommendations.push(fallback);
    });

    return results;
  }

  /**
   * Resets cached compatibility information
   */
  static resetCompatibility(): void {
    this.compatibility = null;
  }
}