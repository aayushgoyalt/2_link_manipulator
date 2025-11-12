/**
 * Electron Camera Service
 * Implements camera operations using Electron's native APIs and desktopCapturer
 * Provides cross-platform camera access for Mac and Windows desktop environments
 */

import { desktopCapturer, screen } from 'electron';
import { AbstractCameraService } from '../../shared/services/CameraServiceInterface';
import type { 
  CameraCapabilities, 
  CameraError
} from '../types/camera-ocr';
import { GeminiLLMService } from './LLMService';
import { CameraOCRErrorHandler, ErrorRecoveryManager } from './CameraOCRErrorHandler';
import { DebugLoggerService } from './DebugLoggerService';
import { PermissionManager } from './PermissionManager';


/**
 * Electron-specific camera service implementation
 * Uses Electron's desktopCapturer API for screen/camera capture
 * Handles native permission requests for Mac and Windows
 */
export class ElectronCameraService extends AbstractCameraService {
  private llmService: GeminiLLMService;
  private currentStream: MediaStream | null = null;
  private debugLogger?: DebugLoggerService;
  private permissionManager: any; // PermissionManager instance

  constructor(debugLogger?: DebugLoggerService) {
    super('electron-desktop');
    
    this.debugLogger = debugLogger;
    
    // Get API key from environment or configuration
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    
    // Log API key status (without exposing the key)
    console.log('Gemini API Key Status:', {
      configured: !!apiKey,
      length: apiKey.length,
      source: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : process.env.VITE_GEMINI_API_KEY ? 'VITE_GEMINI_API_KEY' : 'none'
    });
    
    this.llmService = new GeminiLLMService({
      provider: 'gemini',
      apiKey: apiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      maxTokens: process.env.GEMINI_MAX_TOKENS ? parseInt(process.env.GEMINI_MAX_TOKENS) : 1000,
      temperature: process.env.GEMINI_TEMPERATURE ? parseFloat(process.env.GEMINI_TEMPERATURE) : 0.1,
      timeout: process.env.GEMINI_TIMEOUT ? parseInt(process.env.GEMINI_TIMEOUT) : 30000
    });

    // Initialize permission manager
    this.permissionManager = PermissionManager.getInstance();

    // Log camera initialization
    if (this.debugLogger) {
      this.debugLogger.logCameraInit(true, {
        platform: this.platform,
        apiKeyConfigured: !!apiKey
      });
    }
  }

  /**
   * Check permission status before requesting
   * Returns current permission status and platform-specific help if needed
   */
  async checkPermissionStatus(): Promise<{
    status: string;
    granted: boolean;
    platformInstructions?: any;
  }> {
    const startTime = Date.now();
    
    try {
      const osPlatform = this.permissionManager.detectOS();
      const status = await this.permissionManager.getPermissionStatus(osPlatform);
      
      const result = {
        status,
        granted: status === 'granted',
        platformInstructions: undefined as any
      };
      
      // If permission is denied, include platform-specific instructions
      if (status === 'denied') {
        result.platformInstructions = this.permissionManager.getPlatformInstructions(osPlatform);
      }
      
      this.logOperation('checkPermissionStatus', startTime, true, undefined, { status });
      
      return result;
    } catch (error) {
      this.logOperation('checkPermissionStatus', startTime, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Requests camera permission using Electron's native APIs
   * Handles platform-specific permission models for Mac and Windows
   * Now includes platform-specific help window support
   */
  async requestCameraPermission(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.emit('permission-requested', { platform: this.platform });
      
      const osPlatform = this.permissionManager.detectOS();
      
      // Check permission status first
      const permissionStatus = await this.checkPermissionStatus();
      
      // If already granted, return true
      if (permissionStatus.granted) {
        this.state.hasPermission = true;
        this.clearError();
        this.emit('permission-granted', { platform: this.platform });
        this.logOperation('requestPermission', startTime, true);
        return true;
      }
      
      // If denied, provide platform-specific help
      if (permissionStatus.status === 'denied') {
        const error = CameraOCRErrorHandler.handleCameraPermissionError('electron-desktop');
        error.platformInstructions = permissionStatus.platformInstructions;
        this.setError(error);
        this.logOperation('requestPermission', startTime, false, error.message);
        
        // Record error for pattern analysis
        ErrorRecoveryManager.recordError(error, {
          operationType: 'camera-permission',
          attemptNumber: 1,
          previousErrors: [],
          platform: process.platform,
          timestamp: Date.now()
        });
        
        return false;
      }
      
      // Request permission using permission manager
      const granted = await this.permissionManager.requestPermission(osPlatform);
      
      if (!granted) {
        const error: CameraError = {
          type: 'permission-denied',
          message: 'Camera permission was denied by user.',
          recoverable: true,
          suggestedAction: 'Grant camera access in system settings',
          platformInstructions: this.permissionManager.getPlatformInstructions(osPlatform),
          timestamp: Date.now()
        };
        this.setError(error);
        this.logOperation('requestPermission', startTime, false, error.message);
        return false;
      }
      
      // Update state
      this.state.hasPermission = true;
      this.clearError();
      
      this.emit('permission-granted', { platform: this.platform });
      this.logOperation('requestPermission', startTime, true);
      
      return true;
      
    } catch (error) {
      const cameraError: CameraError = {
        type: 'platform-unsupported',
        message: 'Failed to request camera permission on this platform.',
        recoverable: false,
        originalError: error as Error,
        timestamp: Date.now()
      };
      this.setError(cameraError);
      this.logOperation('requestPermission', startTime, false, cameraError.message);
      return false;
    }
  }

  /**
   * Auto-retry permission request after user grants permission
   * This is called from the renderer after user follows platform instructions
   */
  async retryPermissionAfterGrant(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Clear previous error
      this.clearError();
      
      // Check permission status again
      const permissionStatus = await this.checkPermissionStatus();
      
      if (permissionStatus.granted) {
        this.state.hasPermission = true;
        this.emit('permission-granted', { platform: this.platform, retry: true });
        this.logOperation('retryPermission', startTime, true);
        return true;
      }
      
      this.logOperation('retryPermission', startTime, false, 'Permission still not granted');
      return false;
    } catch (error) {
      this.logOperation('retryPermission', startTime, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Open system settings for camera permissions
   * Delegates to PermissionManager
   */
  openSystemSettings(): void {
    try {
      const osPlatform = this.permissionManager.detectOS();
      this.permissionManager.openSystemSettings(osPlatform);
    } catch (error) {
      console.error('Error opening system settings:', error);
    }
  }

  /**
   * Get video stream constraints for live feed
   * Returns optimal constraints for 1280x720 at 15+ FPS
   */
  getVideoConstraints(): MediaStreamConstraints {
    return {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { min: 15, ideal: 30 },
        facingMode: 'environment' // Prefer rear camera if available
      },
      audio: false
    };
  }

  /**
   * Initialize live video stream
   * Note: This method provides configuration, but actual getUserMedia call
   * must be made in the renderer process due to Electron security model
   */
  async initializeLiveStream(): Promise<{
    constraints: MediaStreamConstraints;
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Ensure we have permission first
      if (!this.state.hasPermission) {
        const hasPermission = await this.requestCameraPermission();
        if (!hasPermission) {
          return {
            constraints: this.getVideoConstraints(),
            success: false,
            error: 'Camera permission required for live stream'
          };
        }
      }
      
      // Mark camera as active
      this.state.isActive = true;
      this.emit('camera-activated', { mode: 'live-stream' });
      
      this.logOperation('initializeLiveStream', startTime, true);
      
      return {
        constraints: this.getVideoConstraints(),
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logOperation('initializeLiveStream', startTime, false, errorMessage);
      
      return {
        constraints: this.getVideoConstraints(),
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Capture frame from live video stream
   * Accepts base64 image data from renderer process
   * This is called after the renderer captures a frame from the video element
   */
  async captureFrameFromStream(imageData: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Validate image data
      if (!imageData || !imageData.startsWith('data:image/')) {
        throw new Error('Invalid image data format');
      }
      
      // Store captured image
      this.state.lastCapturedImage = imageData;
      
      // Log capture with metadata
      if (this.debugLogger) {
        const imageSize = Math.round(imageData.length / 1024);
        this.debugLogger.logFrameCapture(imageData, {
          size: `${imageSize}KB`,
          timestamp: Date.now(),
          source: 'live-stream'
        });
      }
      
      this.emit('image-captured', { 
        imageSize: imageData.length,
        source: 'live-stream'
      });
      
      this.logOperation('captureFrame', startTime, true, undefined, {
        imageSize: imageData.length
      });
      
      return imageData;
      
    } catch (error) {
      const cameraError: CameraError = {
        type: 'capture-failed',
        message: `Frame capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        suggestedAction: 'Try capturing again',
        originalError: error as Error,
        timestamp: Date.now()
      };
      
      this.setError(cameraError);
      this.logOperation('captureFrame', startTime, false, cameraError.message);
      
      throw cameraError;
    }
  }

  /**
   * Legacy captureImage method - redirects to proper implementation
   * Maintains backward compatibility
   */
  async captureImage(): Promise<string> {
    throw new Error('Use captureFrameFromStream() for live video capture. Camera capture must be initiated from renderer process.');
  }



  /**
   * Processes captured image with LLM service
   * Integrates with existing LLM service for OCR processing
   */
  async processImageWithLLM(imageData: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      this.state.isProcessing = true;
      this.emit('processing-started', { imageSize: imageData.length });
      
      // Use LLM service to analyze the image
      const result = await this.llmService.analyzeImage(imageData);
      
      if (!result.success || !result.expression) {
        throw new Error(result.error || 'Failed to extract mathematical expression from image');
      }
      
      this.state.isProcessing = false;
      this.emit('processing-completed', { 
        expression: result.expression,
        confidence: result.confidence,
        processingTime: result.processingTime
      });
      
      this.logOperation('processImage', startTime, true, undefined, {
        expression: result.expression,
        confidence: result.confidence,
        tokensUsed: result.tokensUsed
      });
      
      return result.expression;
      
    } catch (error) {
      this.state.isProcessing = false;
      
      const processingError: CameraError = {
        type: 'processing-failed',
        message: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        suggestedAction: 'Try capturing a clearer image with better lighting',
        originalError: error as Error,
        timestamp: Date.now()
      };
      
      this.setError(processingError);
      this.emit('processing-failed', { error: processingError });
      this.logOperation('processImage', startTime, false, processingError.message);
      
      throw processingError;
    }
  }

  /**
   * Gets camera capabilities for Electron environment
   * Detects available cameras and supported resolutions
   */
  async getCapabilities(): Promise<CameraCapabilities> {
    try {
      const capabilities: CameraCapabilities = {
        hasCamera: false,
        supportedResolutions: [],
        maxImageSize: 10 * 1024 * 1024 // 10MB default
      };
      
      // In Electron main process, we can't directly enumerate camera devices
      // Assume basic camera capability - actual detection should be done in renderer
      capabilities.hasCamera = true;
      capabilities.supportedResolutions = [
        { width: 640, height: 480, label: 'VGA (640x480)' },
        { width: 1280, height: 720, label: 'HD (1280x720)' },
        { width: 1920, height: 1080, label: 'Full HD (1920x1080)' }
      ];
      
      // Check screen capture capability as fallback
      try {
        const displays = screen.getAllDisplays();
        if (displays.length > 0) {
          // Add screen capture resolutions
          displays.forEach((display, index) => {
            capabilities.supportedResolutions.push({
              width: display.bounds.width,
              height: display.bounds.height,
              label: `Screen ${index + 1} (${display.bounds.width}x${display.bounds.height})`
            });
          });
        }
      } catch (error) {
        console.warn('Failed to get display information:', error);
      }
      
      this.state.capabilities = capabilities;
      return capabilities;
      
    } catch (error) {
      const fallbackCapabilities: CameraCapabilities = {
        hasCamera: false,
        supportedResolutions: [
          { width: 1280, height: 720, label: 'Default (1280x720)' }
        ],
        maxImageSize: 5 * 1024 * 1024 // 5MB fallback
      };
      
      this.state.capabilities = fallbackCapabilities;
      return fallbackCapabilities;
    }
  }

  /**
   * Checks if camera service is available on current platform
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (typeof process === 'undefined' || !process.versions?.electron) {
        return false;
      }
      
      // Check if required APIs are available
      const hasDesktopCapturer = typeof desktopCapturer !== 'undefined';
      
      // In main process, we only have desktopCapturer
      return hasDesktopCapturer;
      
    } catch (error) {
      console.warn('Error checking camera availability:', error);
      return false;
    }
  }

  /**
   * Stop video stream and release camera resources
   * This is called from renderer after stopping the MediaStream
   */
  async stopVideoStream(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Mark camera as inactive
      this.state.isActive = false;
      
      // Clear captured image
      this.state.lastCapturedImage = undefined;
      
      this.emit('camera-deactivated', { reason: 'stream-stopped' });
      
      this.logOperation('stopVideoStream', startTime, true);
      
    } catch (error) {
      console.warn('Error stopping video stream:', error);
      this.logOperation('stopVideoStream', startTime, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Cleanup camera resources and streams
   * Properly releases all video tracks and clears state
   */
  async cleanup(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Stop any active camera stream
      // Note: In Electron, the actual MediaStream is in the renderer process
      // This cleanup is for the main process state
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}, id: ${track.id}`);
        });
        this.currentStream = null;
      }
      
      // Reset state
      this.state.isActive = false;
      this.state.isProcessing = false;
      this.state.lastCapturedImage = undefined;
      
      // Clear any cached data
      this.clearError();
      
      this.emit('camera-deactivated', { reason: 'cleanup' });
      
      this.logOperation('cleanup', startTime, true);
      
      if (this.debugLogger) {
        this.debugLogger.logCameraInit(false, {
          reason: 'cleanup',
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.warn('Error during camera cleanup:', error);
      this.logOperation('cleanup', startTime, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}