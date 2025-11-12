/**
 * Camera Service Factory
 * Creates appropriate camera service instances based on platform detection
 */

import type { Platform, CameraService, CameraServiceFactory as ICameraServiceFactory } from '../types/camera-ocr';
import { PlatformDetection } from './PlatformDetection';

// Import concrete implementations
import { ElectronCameraService } from './ElectronCameraService';

/**
 * Base Camera Service implementation
 * Provides common functionality and interface compliance
 */
abstract class BaseCameraService implements CameraService {
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  abstract requestCameraPermission(): Promise<boolean>;
  abstract captureImage(): Promise<string>;
  abstract processImageWithLLM(imageData: string): Promise<string>;
  abstract cleanup(): Promise<void>;

  /**
   * Basic mathematical expression validation
   * This is a placeholder implementation that will be enhanced in future tasks
   */
  validateMathExpression(expression: string): boolean {
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    // Basic validation - check for mathematical characters
    const mathPattern = /^[0-9+\-*/().\s=]+$/;
    return mathPattern.test(expression.trim());
  }

  /**
   * Gets platform-specific error message
   */
  protected getPlatformErrorMessage(operation: string): string {
    const platformName = this.platform === 'electron-desktop' ? 'desktop' : 'web browser';
    return `Camera ${operation} failed on ${platformName} platform`;
  }
}



/**
 * Web Camera Service Wrapper
 * Wraps the renderer-side WebCameraService for factory compatibility
 */
class WebCameraServiceWrapper extends BaseCameraService {
  constructor() {
    super('web-browser');
  }

  async requestCameraPermission(): Promise<boolean> {
    // In web environment, camera operations are handled by the renderer process
    // This wrapper provides interface compatibility but delegates to renderer
    throw new Error('Web camera operations should be handled by renderer process WebCameraService');
  }

  async captureImage(): Promise<string> {
    // In web environment, camera operations are handled by the renderer process
    throw new Error('Web camera operations should be handled by renderer process WebCameraService');
  }

  async processImageWithLLM(_imageData: string): Promise<string> {
    // LLM processing should be handled by main process services
    throw new Error('LLM processing should be handled by main process LLM service');
  }

  async cleanup(): Promise<void> {
    // Cleanup handled by renderer process
    console.log('WebCameraService cleanup delegated to renderer process');
  }
}

/**
 * Camera Service Factory Implementation
 * Provides cross-platform camera service creation and management
 */
export class CameraServiceFactory implements ICameraServiceFactory {
  private static instance: CameraServiceFactory | null = null;
  private serviceCache: Map<Platform, CameraService> = new Map();

  /**
   * Gets singleton instance of the factory
   */
  static getInstance(): CameraServiceFactory {
    if (!this.instance) {
      this.instance = new CameraServiceFactory();
    }
    return this.instance;
  }

  /**
   * Creates appropriate camera service based on platform
   * @param platform Optional platform override, defaults to auto-detection
   * @returns Camera service instance for the specified platform
   */
  createService(platform?: Platform): CameraService {
    const targetPlatform = platform || this.detectPlatform();

    // Return cached service if available
    if (this.serviceCache.has(targetPlatform)) {
      return this.serviceCache.get(targetPlatform)!;
    }

    // Validate platform support
    if (!this.isSupported(targetPlatform)) {
      throw new Error(`Platform ${targetPlatform} is not supported for camera operations`);
    }

    // Create appropriate service
    let service: CameraService;

    switch (targetPlatform) {
      case 'electron-desktop':
        service = new ElectronCameraService();
        break;
      case 'web-browser':
        service = new WebCameraServiceWrapper();
        break;
      default:
        throw new Error(`Unknown platform: ${targetPlatform}`);
    }

    // Cache the service
    this.serviceCache.set(targetPlatform, service);

    return service;
  }

  /**
   * Detects current platform using PlatformDetection utility
   * @returns Detected platform type
   */
  detectPlatform(): Platform {
    return PlatformDetection.detectPlatform();
  }

  /**
   * Checks if a platform is supported for camera operations
   * @param platform Platform to check
   * @returns true if platform is supported, false otherwise
   */
  isSupported(platform: Platform): boolean {
    const capabilities = PlatformDetection.getPlatformCapabilities();
    
    switch (platform) {
      case 'electron-desktop':
        // Electron desktop requires either native camera or WebRTC support
        return capabilities.hasNativeCamera || capabilities.hasWebRTC;
      case 'web-browser':
        // Web browser requires WebRTC support
        return capabilities.hasWebRTC;
      default:
        return false;
    }
  }

  /**
   * Gets list of all supported platforms
   * @returns Array of supported platform types
   */
  getSupportedPlatforms(): Platform[] {
    const platforms: Platform[] = ['electron-desktop', 'web-browser'];
    return platforms.filter(platform => this.isSupported(platform));
  }

  /**
   * Gets platform capabilities for camera operations
   * @param platform Optional platform to check, defaults to current platform
   * @returns Object describing camera capabilities for the platform
   */
  getPlatformCapabilities(platform?: Platform) {
    const targetPlatform = platform || this.detectPlatform();
    const baseCaps = PlatformDetection.getPlatformCapabilities();
    
    return {
      ...baseCaps,
      platform: targetPlatform,
      cameraSupported: this.isSupported(targetPlatform),
      recommendedService: this.getRecommendedServiceType(targetPlatform),
      limitations: this.getPlatformLimitations(targetPlatform)
    };
  }

  /**
   * Gets recommended service type for a platform
   * @param platform Platform to get recommendation for
   * @returns Recommended service type description
   */
  private getRecommendedServiceType(platform: Platform): string {
    switch (platform) {
      case 'electron-desktop':
        return 'Native Electron camera service with desktop capture capabilities';
      case 'web-browser':
        return 'WebRTC-based camera service with browser compatibility';
      default:
        return 'Unknown service type';
    }
  }

  /**
   * Gets platform-specific limitations
   * @param platform Platform to get limitations for
   * @returns Array of limitation descriptions
   */
  private getPlatformLimitations(platform: Platform): string[] {
    const limitations: string[] = [];

    switch (platform) {
      case 'electron-desktop':
        limitations.push('Requires camera permissions at OS level');
        limitations.push('May require additional setup for some camera hardware');
        break;
      case 'web-browser':
        limitations.push('Requires HTTPS for camera access');
        limitations.push('Limited by browser security policies');
        limitations.push('May not work in all browser environments');
        break;
    }

    return limitations;
  }

  /**
   * Clears service cache
   * Useful for testing or when services need to be recreated
   */
  clearCache(): void {
    // Cleanup existing services
    this.serviceCache.forEach(async (service) => {
      try {
        await service.cleanup();
      } catch (error) {
        console.warn('Error cleaning up camera service:', error);
      }
    });

    this.serviceCache.clear();
  }

  /**
   * Gets factory statistics
   * @returns Object with factory usage statistics
   */
  getStatistics() {
    return {
      cachedServices: this.serviceCache.size,
      supportedPlatforms: this.getSupportedPlatforms(),
      currentPlatform: this.detectPlatform(),
      platformCapabilities: this.getPlatformCapabilities(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates factory configuration and platform support
   * @returns Validation result with any issues found
   */
  validateConfiguration() {
    const issues: string[] = [];
    const warnings: string[] = [];

    const currentPlatform = this.detectPlatform();
    const capabilities = PlatformDetection.getPlatformCapabilities();

    // Check platform support
    if (!this.isSupported(currentPlatform)) {
      issues.push(`Current platform ${currentPlatform} is not supported for camera operations`);
    }

    // Check API availability
    if (!capabilities.hasWebRTC && currentPlatform === 'web-browser') {
      issues.push('WebRTC is not available in web browser environment');
    }

    if (!capabilities.hasNativeCamera && !capabilities.hasWebRTC && currentPlatform === 'electron-desktop') {
      warnings.push('Neither native camera nor WebRTC is available in Electron environment');
    }

    // Check for HTTPS requirement in web environment
    if (currentPlatform === 'web-browser' && typeof window !== 'undefined') {
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        warnings.push('HTTPS is required for camera access in web browsers (except localhost)');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      platform: currentPlatform,
      capabilities
    };
  }
}

// Export singleton instance for convenience
export const cameraServiceFactory = CameraServiceFactory.getInstance();