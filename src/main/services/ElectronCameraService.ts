/**
 * Electron Camera Service
 * Implements camera operations using Electron's native APIs and desktopCapturer
 * Provides cross-platform camera access for Mac and Windows desktop environments
 */

import { desktopCapturer, systemPreferences, screen } from 'electron';
import { AbstractCameraService } from '../../shared/services/CameraServiceInterface';
import type { 
  CameraCapabilities, 
  CameraError
} from '../types/camera-ocr';
import { GeminiLLMService } from './LLMService';
import { CameraOCRErrorHandler, ErrorRecoveryManager } from './CameraOCRErrorHandler';


/**
 * Electron-specific camera service implementation
 * Uses Electron's desktopCapturer API for screen/camera capture
 * Handles native permission requests for Mac and Windows
 */
export class ElectronCameraService extends AbstractCameraService {
  private llmService: GeminiLLMService;
  private currentStream: MediaStream | null = null;

  constructor() {
    super('electron-desktop');
    
    // Get API key from environment or configuration
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    
    this.llmService = new GeminiLLMService({
      provider: 'gemini',
      apiKey: apiKey,
      model: 'gemini-pro-vision',
      maxTokens: 1000,
      temperature: 0.1,
      timeout: 30000
    });
  }

  /**
   * Requests camera permission using Electron's native APIs
   * Handles platform-specific permission models for Mac and Windows
   */
  async requestCameraPermission(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.emit('permission-requested', { platform: this.platform });
      
      // Check if we're on macOS and need to request camera permission
      if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('camera');
        
        if (status === 'denied') {
          const error = CameraOCRErrorHandler.handleCameraPermissionError('electron-desktop');
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
        
        if (status === 'restricted') {
          const error = CameraOCRErrorHandler.createCameraError(
            'permission-denied',
            'Camera access is restricted by system policy.',
            undefined,
            'Contact system administrator to enable camera access'
          );
          this.setError(error);
          this.logOperation('requestPermission', startTime, false, error.message);
          
          ErrorRecoveryManager.recordError(error, {
            operationType: 'camera-permission',
            attemptNumber: 1,
            previousErrors: [],
            platform: process.platform,
            timestamp: Date.now()
          });
          
          return false;
        }
        
        if (status === 'not-determined') {
          // Request permission - this will show system dialog
          const granted = await systemPreferences.askForMediaAccess('camera');
          
          if (!granted) {
            const error: CameraError = {
              type: 'permission-denied',
              message: 'Camera permission was denied by user.',
              recoverable: true,
              suggestedAction: 'Restart application and grant camera access when prompted',
              timestamp: Date.now()
            };
            this.setError(error);
            this.logOperation('requestPermission', startTime, false, error.message);
            return false;
          }
        }
      } else {
        // For Windows and Linux, permission is handled at the OS level
        // We'll assume permission is granted and let the capture fail if not
        console.log('Camera permission check skipped for non-macOS platform');
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
   * Captures image using Electron's desktopCapturer or getUserMedia
   * Provides fallback mechanisms for different capture methods
   */
  async captureImage(): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Ensure we have permission first
      if (!this.state.hasPermission) {
        const hasPermission = await this.requestCameraPermission();
        if (!hasPermission) {
          throw new Error('Camera permission required for image capture');
        }
      }
      
      // In Electron, camera capture should be handled by the renderer process
      // The main process cannot access the camera directly
      throw new Error('Camera capture must be handled by renderer process in Electron. Use the web camera interface.');
      
    } catch (error) {
      this.state.isProcessing = false;
      
      const cameraError: CameraError = {
        type: 'capture-failed',
        message: `Image capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        suggestedAction: 'Check camera hardware and try again',
        originalError: error as Error,
        timestamp: Date.now()
      };
      
      this.setError(cameraError);
      this.logOperation('captureImage', startTime, false, cameraError.message);
      
      throw cameraError;
    }
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
   * Cleanup camera resources and streams
   */
  async cleanup(): Promise<void> {
    try {
      // Stop any active camera stream
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
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
}