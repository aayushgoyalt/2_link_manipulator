/**
 * Camera Composable
 * Provides reactive camera state management and operations
 * Handles cross-platform camera functionality and OCR processing
 */

import { ref, computed, onUnmounted } from 'vue';
import { RendererPlatformDetection } from '../utils/platformDetection';
import type {
  UseCameraReturn,
  CameraState,
  CameraModalState,
  OCRProcessingState,
  CameraError,
  ProcessingError,
  ProcessingResult,
  Platform
} from '../types/camera-ocr';

export function useCamera(): UseCameraReturn {
  // Platform detection
  const platform = ref<Platform>(RendererPlatformDetection.detectPlatform());
  const isElectron = computed(() => platform.value === 'electron-desktop');

  // Camera state
  const cameraState = ref<CameraState>({
    isActive: false,
    hasPermission: false,
    isProcessing: false,
    lastCapturedImage: undefined,
    error: undefined,
    capabilities: undefined
  });

  // Modal state
  const modalState = ref<CameraModalState>({
    isOpen: false,
    currentStep: 'permission',
    capturedImage: undefined,
    recognizedExpression: undefined,
    processingState: undefined,
    error: undefined,
    canRetry: false
  });

  // OCR processing state
  const processingState = ref<OCRProcessingState>({
    stage: 'idle',
    progress: 0,
    currentOperation: '',
    result: undefined,
    error: undefined
  });

  // Computed properties
  const canCapture = computed(() => 
    cameraState.value.isActive && 
    cameraState.value.hasPermission && 
    !cameraState.value.isProcessing
  );

  const isProcessing = computed(() => 
    cameraState.value.isProcessing || 
    processingState.value.stage !== 'idle'
  );

  const hasError = computed(() => 
    !!(cameraState.value.error || processingState.value.error || modalState.value.error)
  );

  const currentError = computed(() => 
    cameraState.value.error || 
    processingState.value.error || 
    modalState.value.error || 
    null
  );

  /**
   * Open camera modal and initialize camera
   */
  const openCamera = async (): Promise<void> => {
    try {
      modalState.value.isOpen = true;
      modalState.value.currentStep = 'permission';
      modalState.value.error = undefined;
      
      // Reset camera state
      cameraState.value.error = undefined;
      cameraState.value.isProcessing = false;
      
      // Reset processing state
      processingState.value = {
        stage: 'idle',
        progress: 0,
        currentOperation: ''
      };

      // Validate platform requirements
      const validation = RendererPlatformDetection.validateCameraRequirements();
      if (!validation.isValid) {
        throw createCameraError(
          'platform-unsupported',
          `Platform requirements not met: ${validation.issues.join(', ')}`,
          false
        );
      }

      // Check existing permissions
      if (await checkCameraPermission()) {
        modalState.value.currentStep = 'preview';
        cameraState.value.hasPermission = true;
      }
    } catch (error) {
      handleError(error);
    }
  };

  /**
   * Close camera modal and cleanup
   */
  const closeCamera = (): void => {
    modalState.value.isOpen = false;
    modalState.value.currentStep = 'permission';
    modalState.value.capturedImage = undefined;
    modalState.value.recognizedExpression = undefined;
    modalState.value.error = undefined;
    modalState.value.canRetry = false;
    
    // Reset camera state
    cameraState.value.isActive = false;
    cameraState.value.isProcessing = false;
    cameraState.value.error = undefined;
    
    // Reset processing state
    processingState.value = {
      stage: 'idle',
      progress: 0,
      currentOperation: ''
    };
  };

  /**
   * Capture image from camera
   */
  const captureImage = async (): Promise<void> => {
    if (!canCapture.value) {
      throw createCameraError(
        'capture-failed',
        'Camera is not ready for capture',
        true
      );
    }

    try {
      cameraState.value.isProcessing = true;
      modalState.value.currentStep = 'capture';

      let imageData: string;

      if (isElectron.value) {
        // Use Electron IPC for image capture
        if (window.electron?.ipcRenderer) {
          imageData = await window.electron.ipcRenderer.invoke('camera:capture-image');
          if (!imageData) {
            throw new Error('Failed to capture image from camera');
          }
        } else {
          throw new Error('Electron IPC not available');
        }
      } else {
        // For web browsers, this would be handled by the CameraCapture component
        // This is a placeholder for the web implementation
        throw new Error('Web camera capture should be handled by CameraCapture component');
      }

      modalState.value.capturedImage = imageData;
      cameraState.value.lastCapturedImage = imageData;

      // Start OCR processing
      await processImage(imageData);
    } catch (error) {
      handleError(createCameraError(
        'capture-failed',
        error instanceof Error ? error.message : 'Failed to capture image',
        true
      ));
    } finally {
      cameraState.value.isProcessing = false;
    }
  };

  /**
   * Process captured image with OCR
   */
  const processImage = async (imageData: string): Promise<void> => {
    try {
      modalState.value.currentStep = 'processing';
      
      processingState.value = {
        stage: 'preprocessing',
        progress: 0.1,
        currentOperation: 'Preparing image for analysis...',
        startTime: Date.now()
      };

      if (isElectron.value) {
        // Set up IPC listeners for processing updates
        setupProcessingListeners();
        
        // Start OCR processing via IPC
        if (window.electron?.ipcRenderer) {
          await window.electron.ipcRenderer.invoke('camera:process-ocr', imageData);
        } else {
          throw new Error('Electron IPC not available');
        }
      } else {
        // For web deployment, this would need to be implemented
        // with a backend service or client-side OCR library
        throw new Error('Web OCR processing not yet implemented');
      }
    } catch (error) {
      handleProcessingError({
        type: 'llm-service-error',
        message: error instanceof Error ? error.message : 'OCR processing failed',
        stage: processingState.value.stage,
        recoverable: true,
        retryable: true,
        timestamp: Date.now()
      });
    }
  };

  /**
   * Cancel ongoing OCR processing
   */
  const cancelProcessing = (): void => {
    if (isElectron.value && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('camera:cancel-processing');
    }

    processingState.value = {
      stage: 'idle',
      progress: 0,
      currentOperation: ''
    };

    modalState.value.currentStep = 'preview';
    cameraState.value.isProcessing = false;
  };

  /**
   * Retry the last failed operation
   */
  const retryOperation = async (): Promise<void> => {
    const error = currentError.value;
    if (!error) return;

    // Clear current error
    cameraState.value.error = undefined;
    processingState.value.error = undefined;
    modalState.value.error = undefined;
    modalState.value.canRetry = false;

    try {
      if (error.type === 'permission-denied') {
        // Retry permission request
        modalState.value.currentStep = 'permission';
      } else if (modalState.value.capturedImage && 
                 (error.type === 'processing-failed' || error.type === 'llm-service-error')) {
        // Retry OCR processing
        await processImage(modalState.value.capturedImage);
      } else {
        // Retry from camera preview
        modalState.value.currentStep = 'preview';
      }
    } catch (retryError) {
      handleError(retryError);
    }
  };

  /**
   * Check if camera permission is already granted
   */
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      if (platform.value === 'web-browser' && navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return permission.state === 'granted';
      }
      
      if (isElectron.value && window.electron?.ipcRenderer) {
        // Check via Electron IPC
        return await window.electron.ipcRenderer.invoke('camera:check-permission') || false;
      }
      
      return false;
    } catch (error) {
      console.warn('Could not check camera permission:', error);
      return false;
    }
  };

  /**
   * Set up IPC listeners for processing updates (Electron only)
   */
  const setupProcessingListeners = (): void => {
    if (!isElectron.value) return;

    if (!window.electron?.ipcRenderer) return;

    // Listen for processing updates
    window.electron.ipcRenderer.on('camera:processing-update', (_, state: OCRProcessingState) => {
      processingState.value = { ...state };
      modalState.value.processingState = { ...state };
    });

    // Listen for processing completion
    window.electron.ipcRenderer.on('camera:processing-complete', (_, result: ProcessingResult) => {
      processingState.value = {
        stage: 'complete',
        progress: 1,
        currentOperation: 'Processing complete',
        result
      };
      
      modalState.value.recognizedExpression = result.recognizedExpression;
      modalState.value.currentStep = 'confirmation';
    });

    // Listen for processing errors
    window.electron.ipcRenderer.on('camera:processing-error', (_, error: ProcessingError) => {
      handleProcessingError(error);
    });
  };

  /**
   * Handle processing-specific errors
   */
  const handleProcessingError = (error: ProcessingError): void => {
    processingState.value = {
      stage: 'error',
      progress: 0,
      currentOperation: 'Processing failed',
      error
    };

    modalState.value.error = error;
    modalState.value.currentStep = 'error';
    modalState.value.canRetry = error.retryable;
  };

  /**
   * Create a standardized camera error
   */
  const createCameraError = (
    type: CameraError['type'],
    message: string,
    recoverable: boolean,
    suggestedAction?: string
  ): CameraError => ({
    type,
    message,
    recoverable,
    suggestedAction,
    timestamp: Date.now()
  });

  /**
   * Handle any error that occurs
   */
  const handleError = (error: any): void => {
    let cameraError: CameraError;

    if (error && typeof error === 'object' && 'type' in error) {
      cameraError = error as CameraError;
    } else {
      cameraError = createCameraError(
        'configuration-error',
        error instanceof Error ? error.message : 'An unknown error occurred',
        true
      );
    }

    cameraState.value.error = cameraError;
    modalState.value.error = cameraError;
    modalState.value.currentStep = 'error';
    modalState.value.canRetry = cameraError.recoverable;
  };

  /**
   * Cleanup function for component unmounting
   */
  const cleanup = (): void => {
    closeCamera();
    
    // Remove any IPC listeners if needed
    if (isElectron.value && window.electron?.ipcRenderer) {
      // Note: Electron IPC renderer doesn't provide removeAllListeners for specific channels
      // The listeners will be cleaned up when the renderer process is destroyed
      // In a production app, you might want to store listener references and remove them individually
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    cameraState,
    modalState,
    processingState,
    
    // Actions
    openCamera,
    closeCamera,
    captureImage,
    processImage,
    cancelProcessing,
    retryOperation,
    
    // Computed
    canCapture,
    isProcessing,
    hasError,
    currentError
  };
}