/**
 * Camera Service Demo
 * Demonstrates the platform detection and camera service factory functionality
 */

import { PlatformDetection } from './PlatformDetection';
import { CameraServiceFactory } from './CameraServiceFactory';

/**
 * Demonstrates platform detection functionality
 */
export function demonstratePlatformDetection() {
  console.log('=== Platform Detection Demo ===');
  
  // Detect current platform
  const platform = PlatformDetection.detectPlatform();
  console.log(`Detected platform: ${platform}`);
  
  // Check environment types
  const isElectron = PlatformDetection.isElectronEnvironment();
  const isWeb = PlatformDetection.isWebEnvironment();
  console.log(`Is Electron: ${isElectron}`);
  console.log(`Is Web: ${isWeb}`);
  
  // Get platform capabilities
  const capabilities = PlatformDetection.getPlatformCapabilities();
  console.log('Platform capabilities:', {
    platform: capabilities.platform,
    hasNativeCamera: capabilities.hasNativeCamera,
    hasWebRTC: capabilities.hasWebRTC,
    hasFileSystem: capabilities.hasFileSystem,
    supportedAPIs: capabilities.supportedAPIs
  });
  
  // Get platform defaults
  const defaults = PlatformDetection.getPlatformDefaults();
  console.log('Platform defaults:', {
    cameraResolution: defaults.camera.preferredResolution,
    maxImageSize: defaults.camera.maxImageSize,
    processingTimeout: defaults.processing.processingTimeout
  });
  
  // Get environment info
  const envInfo = PlatformDetection.getEnvironmentInfo();
  console.log('Environment info:', {
    platform: envInfo.platform,
    isElectron: envInfo.isElectron,
    isWeb: envInfo.isWeb,
    nodeVersion: envInfo.nodeVersion,
    electronVersion: envInfo.electronVersion
  });
}

/**
 * Demonstrates camera service factory functionality
 */
export function demonstrateCameraServiceFactory() {
  console.log('\n=== Camera Service Factory Demo ===');
  
  const factory = CameraServiceFactory.getInstance();
  
  // Detect platform
  const platform = factory.detectPlatform();
  console.log(`Factory detected platform: ${platform}`);
  
  // Check platform support
  const isSupported = factory.isSupported(platform);
  console.log(`Platform ${platform} is supported: ${isSupported}`);
  
  // Get supported platforms
  const supportedPlatforms = factory.getSupportedPlatforms();
  console.log(`Supported platforms: ${supportedPlatforms.join(', ')}`);
  
  // Get platform capabilities
  const capabilities = factory.getPlatformCapabilities();
  console.log('Factory platform capabilities:', {
    platform: capabilities.platform,
    cameraSupported: capabilities.cameraSupported,
    recommendedService: capabilities.recommendedService,
    limitations: capabilities.limitations
  });
  
  // Validate configuration
  const validation = factory.validateConfiguration();
  console.log('Configuration validation:', {
    isValid: validation.isValid,
    issues: validation.issues,
    warnings: validation.warnings
  });
  
  // Get factory statistics
  const stats = factory.getStatistics();
  console.log('Factory statistics:', {
    cachedServices: stats.cachedServices,
    supportedPlatforms: stats.supportedPlatforms,
    currentPlatform: stats.currentPlatform
  });
  
  // Create camera service (if supported)
  if (isSupported) {
    try {
      const service = factory.createService();
      console.log('Camera service created successfully');
      console.log('Service methods available:', {
        requestCameraPermission: typeof service.requestCameraPermission,
        captureImage: typeof service.captureImage,
        processImageWithLLM: typeof service.processImageWithLLM,
        validateMathExpression: typeof service.validateMathExpression,
        cleanup: typeof service.cleanup
      });
      
      // Test math expression validation
      const testExpressions = [
        '2 + 2',
        '10 * 5',
        '(3 + 4) / 2',
        'hello world',
        '',
        '2 + abc'
      ];
      
      console.log('Math expression validation tests:');
      testExpressions.forEach(expr => {
        const isValid = service.validateMathExpression(expr);
        console.log(`  "${expr}" -> ${isValid ? 'VALID' : 'INVALID'}`);
      });
      
    } catch (error) {
      console.log('Camera service creation failed (expected for placeholder implementation):', error instanceof Error ? error.message : 'Unknown error');
    }
  } else {
    console.log('Camera service not supported on this platform');
  }
}

/**
 * Runs the complete demonstration
 */
export function runCameraServiceDemo() {
  try {
    demonstratePlatformDetection();
    demonstrateCameraServiceFactory();
    console.log('\n=== Demo completed successfully ===');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use in other modules
export { PlatformDetection, CameraServiceFactory };