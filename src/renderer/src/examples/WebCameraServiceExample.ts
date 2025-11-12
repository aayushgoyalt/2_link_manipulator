/**
 * Web Camera Service Usage Example
 * Demonstrates how to use the WebCameraService in a web browser environment
 */

import { WebCameraService } from '../services/WebCameraService';
import { RendererCameraServiceFactory } from '../services/RendererCameraServiceFactory';
import { BrowserCompatibilityManager } from '../utils/browserCompatibility';

/**
 * Example class showing WebCameraService usage patterns
 */
export class WebCameraServiceExample {
  private cameraService: WebCameraService;

  constructor() {
    // Create camera service using the factory
    const factory = RendererCameraServiceFactory.getInstance();
    this.cameraService = factory.createService();
  }

  /**
   * Example: Check browser compatibility before using camera
   */
  async checkCompatibility(): Promise<void> {
    console.log('=== Browser Compatibility Check ===');
    
    // Get compatibility information
    const compatibility = BrowserCompatibilityManager.getCompatibility();
    console.log('Browser:', compatibility.browser, compatibility.version);
    console.log('Supports getUserMedia:', compatibility.supportsGetUserMedia);
    console.log('Max Resolution:', compatibility.maxResolution);
    console.log('Recommended Quality:', compatibility.recommendedQuality);
    
    if (compatibility.quirks.length > 0) {
      console.log('Browser Quirks:', compatibility.quirks);
    }
    
    if (compatibility.fallbacks.length > 0) {
      console.log('Recommended Fallbacks:', compatibility.fallbacks);
    }

    // Test compatibility
    const compatibilityTest = await BrowserCompatibilityManager.testCompatibility();
    console.log('Compatibility Test Results:', compatibilityTest);
    
    // Get setup instructions
    const instructions = BrowserCompatibilityManager.getSetupInstructions();
    console.log('Setup Instructions:', instructions);
  }

  /**
   * Example: Check if camera service is available
   */
  async checkAvailability(): Promise<boolean> {
    console.log('=== Camera Availability Check ===');
    
    const isAvailable = await this.cameraService.isAvailable();
    console.log('Camera Service Available:', isAvailable);
    
    if (!isAvailable) {
      console.log('Camera service is not available in this environment');
      return false;
    }

    // Get camera capabilities
    const capabilities = await this.cameraService.getCapabilities();
    console.log('Camera Capabilities:', capabilities);
    
    return true;
  }

  /**
   * Example: Request camera permission
   */
  async requestPermission(): Promise<boolean> {
    console.log('=== Camera Permission Request ===');
    
    try {
      const hasPermission = await this.cameraService.requestCameraPermission();
      console.log('Camera Permission Granted:', hasPermission);
      
      if (!hasPermission) {
        const state = this.cameraService.getState();
        if (state.error) {
          console.error('Permission Error:', state.error);
          console.log('Suggested Action:', state.error.suggestedAction);
        }
      }
      
      return hasPermission;
    } catch (error) {
      console.error('Permission Request Failed:', error);
      return false;
    }
  }

  /**
   * Example: Capture image from camera
   */
  async captureImage(): Promise<string | null> {
    console.log('=== Image Capture ===');
    
    try {
      const imageData = await this.cameraService.captureImage();
      console.log('Image Captured Successfully');
      console.log('Image Size:', imageData.length, 'characters');
      console.log('Image Type:', imageData.substring(0, 30) + '...');
      
      return imageData;
    } catch (error) {
      console.error('Image Capture Failed:', error);
      
      const state = this.cameraService.getState();
      if (state.error) {
        console.error('Capture Error:', state.error);
        console.log('Suggested Action:', state.error.suggestedAction);
      }
      
      return null;
    }
  }

  /**
   * Example: Validate mathematical expression
   */
  validateExpression(expression: string): boolean {
    console.log('=== Expression Validation ===');
    console.log('Expression:', expression);
    
    const isValid = this.cameraService.validateMathExpression(expression);
    console.log('Is Valid Math Expression:', isValid);
    
    return isValid;
  }

  /**
   * Example: Complete camera workflow
   */
  async performCompleteWorkflow(): Promise<void> {
    console.log('=== Complete Camera Workflow ===');
    
    // Step 1: Check compatibility
    await this.checkCompatibility();
    
    // Step 2: Check availability
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      console.log('Workflow stopped: Camera not available');
      return;
    }
    
    // Step 3: Request permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('Workflow stopped: Permission denied');
      return;
    }
    
    // Step 4: Capture image
    const imageData = await this.captureImage();
    if (!imageData) {
      console.log('Workflow stopped: Image capture failed');
      return;
    }
    
    // Step 5: Validate some example expressions
    const expressions = ['2 + 3', '(5 * 2) / 3', 'hello world', '123.45 + 67.89'];
    expressions.forEach(expr => this.validateExpression(expr));
    
    // Step 6: Cleanup
    await this.cleanup();
    
    console.log('Workflow completed successfully!');
  }

  /**
   * Example: Handle errors gracefully
   */
  async handleErrorScenarios(): Promise<void> {
    console.log('=== Error Handling Examples ===');
    
    // Test with invalid expressions
    const invalidExpressions = ['', 'abc', null, undefined, 123];
    invalidExpressions.forEach(expr => {
      try {
        const isValid = this.cameraService.validateMathExpression(expr as any);
        console.log(`Expression "${expr}": ${isValid}`);
      } catch (error) {
        console.log(`Expression "${expr}" caused error:`, error);
      }
    });
    
    // Test LLM processing (should fail with security message)
    try {
      await this.cameraService.processImageWithLLM('test-image-data');
    } catch (error) {
      console.log('Expected LLM processing error:', (error as Error).message);
    }
  }

  /**
   * Example: Get service information
   */
  getServiceInfo(): void {
    console.log('=== Service Information ===');
    
    console.log('Platform:', this.cameraService.getPlatform());
    console.log('Browser Compatibility:', this.cameraService.getBrowserCompatibility());
    console.log('Setup Instructions:', this.cameraService.getSetupInstructions());
    console.log('Current State:', this.cameraService.getState());
  }

  /**
   * Example: Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('=== Cleanup ===');
    
    try {
      await this.cameraService.cleanup();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

/**
 * Factory example showing different ways to create camera services
 */
export class CameraServiceFactoryExample {
  /**
   * Example: Using the factory to create services
   */
  static demonstrateFactory(): void {
    console.log('=== Camera Service Factory Examples ===');
    
    const factory = RendererCameraServiceFactory.getInstance();
    
    // Get factory information
    console.log('Supported Platforms:', factory.getSupportedPlatforms());
    console.log('Current Platform:', factory.detectPlatform());
    console.log('Platform Capabilities:', factory.getPlatformCapabilities());
    console.log('Factory Statistics:', factory.getStatistics());
    
    // Validate requirements
    const validation = factory.validateCameraRequirements();
    console.log('Requirements Validation:', validation);
    
    // Get recommended settings
    const settings = factory.getRecommendedSettings();
    console.log('Recommended Settings:', settings);
    
    // Create service
    try {
      const service = factory.createService();
      console.log('Service created successfully:', service.getPlatform());
    } catch (error) {
      console.error('Service creation failed:', error);
    }
  }

  /**
   * Example: Test camera functionality
   */
  static async testCameraFunctionality(): Promise<void> {
    console.log('=== Camera Functionality Test ===');
    
    const factory = RendererCameraServiceFactory.getInstance();
    
    try {
      const testResults = await factory.testCameraFunctionality();
      console.log('Camera Test Results:', testResults);
      
      if (testResults.overallSuccess) {
        console.log('✅ Camera functionality test passed!');
      } else {
        console.log('❌ Camera functionality test failed');
        console.log('Issues found:', testResults.validation.issues);
      }
    } catch (error) {
      console.error('Camera test failed:', error);
    }
  }
}

// Export convenience functions for easy usage
export const createWebCameraService = () => {
  const factory = RendererCameraServiceFactory.getInstance();
  return factory.createService();
};

export const checkBrowserCompatibility = async () => {
  return await BrowserCompatibilityManager.testCompatibility();
};

export const getSetupInstructions = () => {
  return BrowserCompatibilityManager.getSetupInstructions();
};

// Example usage (can be called from browser console or other components)
export const runCameraExample = async () => {
  const example = new WebCameraServiceExample();
  
  try {
    await example.performCompleteWorkflow();
  } catch (error) {
    console.error('Camera example failed:', error);
  }
};

export const runFactoryExample = () => {
  CameraServiceFactoryExample.demonstrateFactory();
};

export const runCameraTest = async () => {
  await CameraServiceFactoryExample.testCameraFunctionality();
};