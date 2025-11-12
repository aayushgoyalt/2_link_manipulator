/**
 * Renderer Camera Service Factory
 * Creates camera service instances for the renderer process (web environment)
 */

import type { Platform } from '../types/camera-ocr';
import { RendererPlatformDetection } from '../utils/platformDetection';
import { WebCameraService } from './WebCameraService';

/**
 * Camera Service Factory for Renderer Process
 * Handles camera service creation in web browser environment
 */
export class RendererCameraServiceFactory {
  private static instance: RendererCameraServiceFactory | null = null;
  private serviceCache: Map<Platform, WebCameraService> = new Map();

  /**
   * Gets singleton instance of the renderer factory
   */
  static getInstance(): RendererCameraServiceFactory {
    if (!this.instance) {
      this.instance = new RendererCameraServiceFactory();
    }
    return this.instance;
  }

  /**
   * Creates appropriate camera service for renderer process
   * @param platform Optional platform override, defaults to auto-detection
   * @returns Camera service instance for the renderer process
   */
  createService(platform?: Platform): WebCameraService {
    const targetPlatform = platform || this.detectPlatform();

    // Only support web-browser platform in renderer
    if (targetPlatform !== 'web-browser') {
      throw new Error(`Renderer camera factory only supports web-browser platform, got: ${targetPlatform}`);
    }

    // Return cached service if available
    if (this.serviceCache.has(targetPlatform)) {
      return this.serviceCache.get(targetPlatform)!;
    }

    // Validate platform support
    if (!this.isSupported(targetPlatform)) {
      throw new Error(`Platform ${targetPlatform} is not supported for camera operations in renderer`);
    }

    // Create web camera service
    const service = new WebCameraService();

    // Cache the service
    this.serviceCache.set(targetPlatform, service);

    return service;
  }

  /**
   * Detects current platform using renderer platform detection
   * @returns Detected platform type
   */
  detectPlatform(): Platform {
    return RendererPlatformDetection.detectPlatform();
  }

  /**
   * Checks if a platform is supported for camera operations in renderer
   * @param platform Platform to check
   * @returns true if platform is supported, false otherwise
   */
  isSupported(platform: Platform): boolean {
    if (platform !== 'web-browser') {
      return false;
    }

    const capabilities = RendererPlatformDetection.getPlatformCapabilities();
    
    // Web browser requires WebRTC support and secure context
    return capabilities.hasWebRTC && capabilities.supportsHTTPS;
  }

  /**
   * Gets list of supported platforms for renderer
   * @returns Array of supported platform types
   */
  getSupportedPlatforms(): Platform[] {
    const platforms: Platform[] = ['web-browser'];
    return platforms.filter(platform => this.isSupported(platform));
  }

  /**
   * Gets platform capabilities for camera operations in renderer
   * @param platform Optional platform to check, defaults to current platform
   * @returns Object describing camera capabilities for the platform
   */
  getPlatformCapabilities(platform?: Platform) {
    const targetPlatform = platform || this.detectPlatform();
    const baseCaps = RendererPlatformDetection.getPlatformCapabilities();
    
    return {
      ...baseCaps,
      platform: targetPlatform,
      cameraSupported: this.isSupported(targetPlatform),
      recommendedService: 'WebRTC-based camera service',
      limitations: this.getPlatformLimitations(targetPlatform),
      browserInfo: baseCaps.browserInfo
    };
  }

  /**
   * Gets platform-specific limitations for renderer
   * @param platform Platform to get limitations for
   * @returns Array of limitation descriptions
   */
  private getPlatformLimitations(platform: Platform): string[] {
    const limitations: string[] = [];

    if (platform === 'web-browser') {
      limitations.push('Requires HTTPS for camera access (except localhost)');
      limitations.push('Limited by browser security policies');
      limitations.push('Camera permissions managed by browser');
      limitations.push('May not work in private/incognito mode');
      
      const browserInfo = RendererPlatformDetection.getBrowserInfo();
      if (browserInfo) {
        if (browserInfo.browser === 'safari') {
          limitations.push('Safari may require user interaction before camera access');
        }
        if (browserInfo.browser === 'firefox') {
          limitations.push('Firefox may show permission prompt for each session');
        }
      }
    }

    return limitations;
  }

  /**
   * Validates camera requirements for renderer environment
   * @returns Validation result with any issues found
   */
  validateCameraRequirements() {
    const validation = RendererPlatformDetection.validateCameraRequirements();
    const issues: string[] = [...validation.issues];
    const warnings: string[] = [...validation.warnings];

    // Additional renderer-specific checks
    if (typeof window === 'undefined') {
      issues.push('Window object not available - not in browser environment');
    }

    if (typeof navigator === 'undefined') {
      issues.push('Navigator object not available - browser APIs not accessible');
    }

    if (!window.isSecureContext && window.location.protocol !== 'https:') {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        issues.push('Secure context required for camera access (HTTPS or localhost)');
      }
    }

    // Check for required APIs
    if (typeof HTMLVideoElement === 'undefined') {
      issues.push('HTMLVideoElement not available - video capture not supported');
    }

    if (typeof HTMLCanvasElement === 'undefined') {
      issues.push('HTMLCanvasElement not available - image processing not supported');
    }

    return {
      isValid: issues.length === 0,
      platform: validation.platform,
      issues,
      warnings,
      capabilities: validation.capabilities
    };
  }

  /**
   * Gets recommended camera settings for renderer environment
   * @returns Recommended settings object
   */
  getRecommendedSettings() {
    return RendererPlatformDetection.getRecommendedSettings();
  }

  /**
   * Clears service cache and cleanup
   */
  async clearCache(): Promise<void> {
    // Cleanup existing services
    const cleanupPromises = Array.from(this.serviceCache.values()).map(async (service) => {
      try {
        await service.cleanup();
      } catch (error) {
        console.warn('Error cleaning up renderer camera service:', error);
      }
    });

    await Promise.all(cleanupPromises);
    this.serviceCache.clear();
  }

  /**
   * Gets factory statistics for renderer
   * @returns Object with factory usage statistics
   */
  getStatistics() {
    return {
      cachedServices: this.serviceCache.size,
      supportedPlatforms: this.getSupportedPlatforms(),
      currentPlatform: this.detectPlatform(),
      platformCapabilities: this.getPlatformCapabilities(),
      validation: this.validateCameraRequirements(),
      recommendedSettings: this.getRecommendedSettings(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Tests camera functionality in renderer environment
   * @returns Test result with detailed information
   */
  async testCameraFunctionality() {
    const results = {
      platform: this.detectPlatform(),
      validation: this.validateCameraRequirements(),
      capabilities: null as any,
      permissionTest: null as any,
      captureTest: null as any,
      overallSuccess: false
    };

    try {
      // Test service creation
      const service = this.createService();
      
      // Test capabilities
      try {
        results.capabilities = await service.getCapabilities();
      } catch (error) {
        results.capabilities = { error: (error as Error).message };
      }

      // Test permission request
      try {
        const hasPermission = await service.requestCameraPermission();
        results.permissionTest = { 
          success: hasPermission, 
          granted: hasPermission 
        };
      } catch (error) {
        results.permissionTest = { 
          success: false, 
          error: (error as Error).message 
        };
      }

      // Test image capture (only if permission granted)
      if (results.permissionTest?.success) {
        try {
          const imageData = await service.captureImage();
          results.captureTest = { 
            success: true, 
            imageSize: imageData.length,
            hasData: imageData.startsWith('data:image/')
          };
        } catch (error) {
          results.captureTest = { 
            success: false, 
            error: (error as Error).message 
          };
        }
      }

      // Cleanup
      await service.cleanup();

      // Determine overall success
      results.overallSuccess = 
        results.validation.isValid &&
        results.capabilities && !results.capabilities.error &&
        results.permissionTest?.success === true;

    } catch (error) {
      results.captureTest = { 
        success: false, 
        error: `Service creation failed: ${(error as Error).message}` 
      };
    }

    return results;
  }
}

// Export singleton instance for convenience
export const rendererCameraServiceFactory = RendererCameraServiceFactory.getInstance();