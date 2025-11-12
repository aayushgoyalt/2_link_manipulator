/**
 * Web Camera Service
 * Implements camera operations using WebRTC getUserMedia API for web browsers
 * Provides cross-platform camera access for Chrome, Firefox, Safari, and Edge
 */

import type { 
  CameraCapabilities, 
  CameraError,
  CameraState,
  Platform
} from '../types/camera-ocr';
import { BrowserCompatibilityManager } from '../utils/browserCompatibility';

/**
 * Web-specific camera service implementation
 * Uses WebRTC getUserMedia API for camera access
 * Handles browser permission requests and fallback mechanisms
 */
export class WebCameraService {
  private platform: Platform = 'web-browser';
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private state: CameraState;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.state = {
      isActive: false,
      hasPermission: false,
      isProcessing: false,
      lastCapturedImage: undefined,
      error: undefined,
      capabilities: undefined
    };
  }

  /**
   * Requests camera permission using WebRTC getUserMedia API
   * Handles browser-specific permission models and HTTPS requirements
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      this.emit('permission-requested', { platform: this.platform });
      
      // Check HTTPS requirement (except for localhost)
      if (!this.isSecureContext()) {
        const error: CameraError = {
          type: 'platform-unsupported',
          message: 'Camera access requires HTTPS connection (except on localhost)',
          recoverable: false,
          suggestedAction: 'Access the application over HTTPS',
          timestamp: Date.now()
        };
        this.setError(error);
        return false;
      }

      // Check if getUserMedia is supported
      if (!this.isGetUserMediaSupported()) {
        const error: CameraError = {
          type: 'platform-unsupported',
          message: 'Camera access is not supported in this browser',
          recoverable: false,
          suggestedAction: 'Use a modern browser (Chrome, Firefox, Safari, Edge)',
          timestamp: Date.now()
        };
        this.setError(error);
        return false;
      }

      // Check existing permission status if Permissions API is available
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (permission.state === 'denied') {
            const error: CameraError = {
              type: 'permission-denied',
              message: 'Camera access denied by browser. Please enable camera access in browser settings.',
              recoverable: true,
              suggestedAction: 'Click the camera icon in the address bar or check browser settings',
              timestamp: Date.now()
            };
            this.setError(error);
            return false;
          }
        } catch (permError) {
          // Permissions API might not support 'camera' query in all browsers
          console.warn('Permissions API query failed:', permError);
        }
      }

      // Request camera access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'environment' // Prefer back camera if available
          }
        });

        // Stop the stream immediately - we just needed to test permission
        stream.getTracks().forEach(track => track.stop());

        // Update state
        this.state.hasPermission = true;
        this.clearError();
        
        this.emit('permission-granted', { platform: this.platform });
        return true;

      } catch (getUserMediaError) {
        let errorType: CameraError['type'] = 'permission-denied';
        let message = 'Camera access denied';
        let suggestedAction = 'Grant camera permission when prompted';

        // Handle specific getUserMedia errors with browser-specific messages
        if (getUserMediaError instanceof Error) {
          const errorName = getUserMediaError.name;
          message = BrowserCompatibilityManager.getBrowserSpecificErrorMessage(getUserMediaError);
          
          switch (errorName) {
            case 'NotAllowedError':
              errorType = 'permission-denied';
              break;
            case 'NotFoundError':
              errorType = 'hardware-unavailable';
              break;
            case 'NotReadableError':
              errorType = 'hardware-unavailable';
              break;
            case 'OverconstrainedError':
              errorType = 'configuration-error';
              break;
            case 'SecurityError':
              errorType = 'platform-unsupported';
              break;
            default:
              errorType = 'capture-failed';
          }
          
          suggestedAction = BrowserCompatibilityManager.getSetupInstructions()[0] || 'Check camera hardware and browser settings';
        }

        const cameraError: CameraError = {
          type: errorType,
          message,
          recoverable: errorType !== 'hardware-unavailable',
          suggestedAction,
          originalError: getUserMediaError as Error,
          timestamp: Date.now()
        };

        this.setError(cameraError);
        return false;
      }

    } catch (error) {
      const cameraError: CameraError = {
        type: 'platform-unsupported',
        message: 'Failed to request camera permission',
        recoverable: false,
        originalError: error as Error,
        timestamp: Date.now()
      };
      this.setError(cameraError);
      return false;
    }
  }

  /**
   * Captures image using WebRTC getUserMedia and Canvas API
   * Provides high-quality image capture with browser compatibility
   */
  async captureImage(): Promise<string> {
    try {
      // Ensure we have permission first
      if (!this.state.hasPermission) {
        const hasPermission = await this.requestCameraPermission();
        if (!hasPermission) {
          throw new Error('Camera permission required for image capture');
        }
      }

      this.state.isProcessing = true;
      this.emit('camera-activated', { method: 'capture' });

      // Get camera stream
      const stream = await this.getCameraStream();
      this.currentStream = stream;

      // Create video element if not exists
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true; // Important for iOS Safari
      }

      // Set up video stream
      this.videoElement.srcObject = stream;

      // Wait for video to be ready
      await this.waitForVideoReady(this.videoElement);

      // Capture frame from video
      const imageData = await this.captureFrameFromVideo(this.videoElement);

      // Cleanup
      await this.stopCameraStream();

      this.state.lastCapturedImage = imageData;
      this.state.isProcessing = false;

      this.emit('image-captured', { 
        imageData,
        resolution: {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        }
      });

      return imageData;

    } catch (error) {
      this.state.isProcessing = false;
      await this.stopCameraStream();

      const cameraError: CameraError = {
        type: 'capture-failed',
        message: `Image capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        suggestedAction: 'Check camera hardware and try again',
        originalError: error as Error,
        timestamp: Date.now()
      };

      this.setError(cameraError);
      throw cameraError;
    }
  }

  /**
   * Processes captured image with LLM service
   * Note: This is a placeholder - actual LLM integration will be handled by the main process
   */
  async processImageWithLLM(imageData: string): Promise<string> {
    try {
      this.state.isProcessing = true;
      this.emit('processing-started', { imageSize: imageData.length });

      // In web environment, we need to send the image to the main process for LLM processing
      // This is because API keys and LLM services should be handled securely in the main process
      
      // For now, return a placeholder that indicates the need for main process integration
      throw new Error('LLM processing must be handled by the main process for security reasons');

    } catch (error) {
      this.state.isProcessing = false;

      const processingError: CameraError = {
        type: 'processing-failed',
        message: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        suggestedAction: 'Ensure proper integration with main process LLM service',
        originalError: error as Error,
        timestamp: Date.now()
      };

      this.setError(processingError);
      throw processingError;
    }
  }

  /**
   * Basic mathematical expression validation
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
   * Gets camera capabilities for web browser environment
   */
  async getCapabilities(): Promise<CameraCapabilities> {
    try {
      const capabilities: CameraCapabilities = {
        hasCamera: false,
        supportedResolutions: [],
        maxImageSize: 5 * 1024 * 1024 // 5MB default for web
      };

      // Check if camera is available
      if (this.isGetUserMediaSupported()) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          capabilities.hasCamera = videoDevices.length > 0;

          if (capabilities.hasCamera) {
            // Define common resolutions supported by web browsers
            capabilities.supportedResolutions = [
              { width: 640, height: 480, label: 'VGA (640x480)' },
              { width: 1280, height: 720, label: 'HD (1280x720)' },
              { width: 1920, height: 1080, label: 'Full HD (1920x1080)' }
            ];

            // Try to get more specific capabilities if supported
            if (navigator.mediaDevices.getSupportedConstraints) {
              const constraints = navigator.mediaDevices.getSupportedConstraints();
              if (constraints.width && constraints.height) {
                // Browser supports resolution constraints
                capabilities.supportedResolutions.push(
                  { width: 2560, height: 1440, label: '2K (2560x1440)' }
                );
              }
            }
          }
        } catch (error) {
          console.warn('Failed to enumerate camera devices:', error);
          // Fallback: assume basic camera capability
          capabilities.hasCamera = true;
          capabilities.supportedResolutions = [
            { width: 1280, height: 720, label: 'HD (1280x720)' }
          ];
        }
      }

      this.state.capabilities = capabilities;
      return capabilities;

    } catch (error) {
      const fallbackCapabilities: CameraCapabilities = {
        hasCamera: false,
        supportedResolutions: [
          { width: 1280, height: 720, label: 'Default (1280x720)' }
        ],
        maxImageSize: 2 * 1024 * 1024 // 2MB fallback
      };

      this.state.capabilities = fallbackCapabilities;
      return fallbackCapabilities;
    }
  }

  /**
   * Checks if camera service is available in current browser
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
      }

      // Check if required APIs are available
      const hasGetUserMedia = this.isGetUserMediaSupported();
      const hasCanvas = typeof HTMLCanvasElement !== 'undefined';
      const hasVideo = typeof HTMLVideoElement !== 'undefined';

      // Check secure context requirement
      const isSecure = this.isSecureContext();

      return hasGetUserMedia && hasCanvas && hasVideo && isSecure;

    } catch (error) {
      console.warn('Error checking camera availability:', error);
      return false;
    }
  }

  /**
   * Cleanup camera resources and streams
   */
  async cleanup(): Promise<void> {
    try {
      // Stop any active camera stream
      await this.stopCameraStream();

      // Clean up DOM elements
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      if (this.canvasElement) {
        this.canvasElement = null;
      }

      // Reset state
      this.state.isActive = false;
      this.state.isProcessing = false;
      this.state.lastCapturedImage = undefined;

      // Clear any cached data
      this.clearError();

      this.emit('camera-deactivated', { reason: 'cleanup' });

    } catch (error) {
      console.warn('Error during camera cleanup:', error);
    }
  }

  /**
   * Gets current camera state
   */
  getState(): CameraState {
    return { ...this.state };
  }

  /**
   * Gets platform type
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Gets browser compatibility information
   */
  getBrowserCompatibility() {
    return BrowserCompatibilityManager.getCompatibility();
  }

  /**
   * Gets setup instructions for current browser
   */
  getSetupInstructions(): string[] {
    return BrowserCompatibilityManager.getSetupInstructions();
  }

  /**
   * Tests browser compatibility
   */
  async testBrowserCompatibility() {
    return await BrowserCompatibilityManager.testCompatibility();
  }

  // Private helper methods

  /**
   * Checks if getUserMedia is supported
   */
  private isGetUserMediaSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Checks if running in secure context (HTTPS or localhost)
   */
  private isSecureContext(): boolean {
    return window.isSecureContext || 
           window.location.protocol === 'https:' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  /**
   * Gets camera stream with optimal settings using browser compatibility
   */
  private async getCameraStream(): Promise<MediaStream> {
    // Get optimal constraints for current browser
    const optimalConstraints = BrowserCompatibilityManager.getOptimalConstraints();

    try {
      return await navigator.mediaDevices.getUserMedia(optimalConstraints);
    } catch (error) {
      console.warn('Optimal camera constraints failed, trying fallback constraints:', error);
      
      // Try fallback constraints in order
      const fallbackConstraints = BrowserCompatibilityManager.getFallbackConstraints();
      
      for (const constraints of fallbackConstraints) {
        try {
          console.log('Trying fallback constraints:', constraints);
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (fallbackError) {
          console.warn('Fallback constraints failed:', fallbackError);
          continue;
        }
      }

      // If all fallbacks fail, throw the original error
      throw error;
    }
  }

  /**
   * Waits for video element to be ready for capture
   */
  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video ready timeout'));
      }, 10000); // 10 second timeout

      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          clearTimeout(timeout);
          resolve();
        }
      };

      video.addEventListener('loadeddata', checkReady);
      video.addEventListener('canplay', checkReady);
      
      // Check immediately in case video is already ready
      checkReady();
    });
  }

  /**
   * Captures frame from video element using canvas
   */
  private async captureFrameFromVideo(video: HTMLVideoElement): Promise<string> {
    // Create canvas if not exists
    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
    }

    const canvas = this.canvasElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 with quality optimization
    const quality = this.getOptimalImageQuality();
    const imageData = canvas.toDataURL('image/jpeg', quality);

    return imageData;
  }

  /**
   * Gets optimal image quality based on browser compatibility
   */
  private getOptimalImageQuality(): number {
    return BrowserCompatibilityManager.getOptimalImageQuality();
  }

  /**
   * Stops current camera stream
   */
  private async stopCameraStream(): Promise<void> {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Sets error state
   */
  private setError(error: CameraError): void {
    this.state.error = error;
    this.emit('error-occurred', { error });
  }

  /**
   * Clears error state
   */
  private clearError(): void {
    this.state.error = undefined;
  }

  /**
   * Emits event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`Error in camera service event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Adds event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Removes event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}