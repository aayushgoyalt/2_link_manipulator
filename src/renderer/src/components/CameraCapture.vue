<script setup lang="ts">
/**
 * CameraCapture Component
 * Provides camera access, image capture, and OCR processing UI
 * Supports cross-platform functionality (Electron desktop and web browser)
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { RendererPlatformDetection } from '../utils/platformDetection';
import type {
  CameraUIProps,
  CameraState,
  CameraError,
  OCRProcessingState,
  ProcessingResult,
  ProcessingError,
  CameraModalStep,
  Platform,
  CameraPermissionState,
  OSPlatform,
  PlatformInstructions
} from '../types/camera-ocr';

// Component props and emits
const props = withDefaults(defineProps<CameraUIProps>(), {
  isVisible: false,
  isProcessing: false,
  processingState: undefined,
  config: undefined
});

const emit = defineEmits(['capture', 'upload', 'close', 'error', 'retry', 'manualEdit', 'confirm', 'expressionRecognized']);

// Continuous scanning state
const isContinuousMode = ref(true); // Enable continuous scanning by default
const scanInterval = ref<number | null>(null);
const lastScanTime = ref(0);
const SCAN_INTERVAL_MS = 2500; // Scan every 2.5 seconds
const isScanning = ref(false);

// Frame rate tracking for live feed
const currentFrameRate = ref(0);
const frameRateInterval = ref<number | null>(null);
const frameCount = ref(0);
const lastFrameRateUpdate = ref(0);

// Platform detection
const platform = ref<Platform>(RendererPlatformDetection.detectPlatform());

// Camera state management
const cameraState = ref<CameraState>({
  isActive: false,
  hasPermission: false,
  isProcessing: false,
  lastCapturedImage: undefined,
  error: undefined,
  capabilities: undefined
});

// Permission state
const permissionState = ref<CameraPermissionState>({
  granted: false,
  requested: false,
  denied: false
});

// Modal state management
const currentStep = ref<CameraModalStep>('permission');
const capturedImage = ref<string | undefined>(undefined);
const recognizedExpression = ref<string>('');
const processingState = ref<OCRProcessingState>({
  stage: 'idle',
  progress: 0,
  currentOperation: '',
  result: undefined,
  error: undefined
});

// Camera stream and video element
const videoStream = ref<MediaStream | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const canvasElement = ref<HTMLCanvasElement | null>(null);

// UI state
const isLoading = ref(false);
const showPermissionHelp = ref(false);

// Error handling
const currentError = ref<CameraError | ProcessingError | null>(null);
const canRetry = ref(false);

// Computed properties
const isElectron = computed(() => platform.value === 'electron-desktop');
const isWeb = computed(() => platform.value === 'web-browser');
const canCapture = computed(() => 
  cameraState.value.isActive && 
  cameraState.value.hasPermission && 
  !cameraState.value.isProcessing
);
const progressPercentage = computed(() => 
  Math.round(processingState.value.progress * 100)
);

/**
 * Initialize camera when component becomes visible
 */
watch(() => props.isVisible, async (visible) => {
  if (visible) {
    await initializeCamera();
  } else {
    await cleanup();
  }
});

/**
 * Watch for processing state changes from parent
 */
watch(() => props.processingState, (newState) => {
  if (newState) {
    processingState.value = { ...newState };
    
    if (newState.stage === 'complete' && newState.result) {
      handleProcessingComplete(newState.result);
    } else if (newState.stage === 'error' && newState.error) {
      handleProcessingError(newState.error);
    }
  }
}, { deep: true });

/**
 * Initialize camera access and permissions
 */
const initializeCamera = async () => {
  try {
    isLoading.value = true;
    currentError.value = null;
    
    // Validate platform requirements
    const validation = RendererPlatformDetection.validateCameraRequirements();
    if (!validation.isValid) {
      throw createCameraError(
        'platform-unsupported',
        `Platform requirements not met: ${validation.issues.join(', ')}`,
        false
      );
    }

    // Check if we already have permission
    if (await checkExistingPermission()) {
      await startCamera();
    } else {
      currentStep.value = 'permission';
    }
  } catch (error) {
    handleError(error);
  } finally {
    isLoading.value = false;
  }
};

/**
 * Check if camera permission is already granted
 */
const checkExistingPermission = async (): Promise<boolean> => {
  try {
    if (isWeb.value && navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissionState.value.granted = permission.state === 'granted';
      permissionState.value.denied = permission.state === 'denied';
      return permission.state === 'granted';
    }
    
    // For Electron, we'll try to access the camera directly
    if (isElectron.value) {
      // In Electron, we can check via the main process
      // For now, we'll assume we need to request permission
      return false;
    }
    
    return false;
  } catch (error) {
    console.warn('Could not check camera permission:', error);
    return false;
  }
};

/**
 * Request camera permission from user
 */
const requestCameraPermission = async () => {
  try {
    isLoading.value = true;
    permissionState.value.requested = true;
    currentError.value = null;

    if (isElectron.value) {
      // For Electron, check permission via IPC first, then use getUserMedia
      if (window.api?.camera) {
        const response = await window.api.camera.requestPermission();
        if (response.success && response.data) {
          // Permission granted, now get the actual video stream
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment'
            } 
          });
          
          permissionState.value.granted = true;
          cameraState.value.hasPermission = true;
          videoStream.value = stream;
          await startCamera();
        } else {
          throw createCameraError(
            'permission-denied',
            response.error || 'Camera permission was denied. Please enable camera access in system settings.',
            true,
            'Open system settings and enable camera access for this application.'
          );
        }
      } else {
        throw new Error('Camera API not available');
      }
    } else {
      // For web browsers, use getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back camera for better OCR
        } 
      });
      
      permissionState.value.granted = true;
      cameraState.value.hasPermission = true;
      videoStream.value = stream;
      await startCamera();
    }
  } catch (error) {
    permissionState.value.denied = true;
    cameraState.value.hasPermission = false;
    
    // Load platform instructions for help window
    platformInstructions.value = await getPlatformInstructions();
    
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        handleError(createCameraError(
          'permission-denied',
          'Camera permission was denied. Please enable camera access and try again.',
          true,
          'Click the camera icon in your browser\'s address bar to enable camera access.'
        ));
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        handleError(createCameraError(
          'hardware-unavailable',
          'No camera device was found on this system.',
          false,
          'Please connect a camera device and try again.'
        ));
      } else {
        handleError(createCameraError(
          'capture-failed',
          `Failed to access camera: ${error.message}`,
          true
        ));
      }
    } else {
      handleError(error);
    }
  } finally {
    isLoading.value = false;
  }
};

/**
 * Start camera preview
 */
const startCamera = async () => {
  try {
    if (!videoStream.value) {
      throw new Error('Video stream not available');
    }
    
    // Set step to preview to render the video element
    currentStep.value = 'preview';
    
    // Wait for Vue to render the video element
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!videoElement.value) {
      throw new Error('Video element not available after render');
    }
    
    // Set video stream source
    videoElement.value.srcObject = videoStream.value;
    
    // Wait for video to be ready before playing
    await new Promise<void>((resolve, reject) => {
      if (!videoElement.value) {
        reject(new Error('Video element became null'));
        return;
      }
      
      const video = videoElement.value;
      
      video.onloadedmetadata = () => resolve();
      video.onerror = (e) => {
        console.error('Video load error:', e);
        reject(new Error('Video failed to load'));
      };
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Video load timeout')), 5000);
    });
    
    await videoElement.value.play();
    cameraState.value.isActive = true;
    
    // Start frame rate monitoring
    startFrameRateMonitoring();
    
    // Start continuous scanning if enabled
    if (isContinuousMode.value) {
      startContinuousScanning();
    }
  } catch (error) {
    console.error('Camera start error:', error);
    handleError(createCameraError(
      'capture-failed',
      `Failed to start camera preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    ));
  }
};

/**
 * Start monitoring frame rate of video feed
 */
const startFrameRateMonitoring = () => {
  if (frameRateInterval.value) return;
  
  lastFrameRateUpdate.value = Date.now();
  frameCount.value = 0;
  
  frameRateInterval.value = window.setInterval(() => {
    const now = Date.now();
    const elapsed = (now - lastFrameRateUpdate.value) / 1000;
    
    if (elapsed > 0) {
      currentFrameRate.value = Math.round(frameCount.value / elapsed);
      frameCount.value = 0;
      lastFrameRateUpdate.value = now;
    }
  }, 1000);
  
  // Count frames using requestAnimationFrame
  const countFrame = () => {
    if (cameraState.value.isActive && videoElement.value && !videoElement.value.paused) {
      frameCount.value++;
      requestAnimationFrame(countFrame);
    }
  };
  requestAnimationFrame(countFrame);
};

/**
 * Stop monitoring frame rate
 */
const stopFrameRateMonitoring = () => {
  if (frameRateInterval.value) {
    clearInterval(frameRateInterval.value);
    frameRateInterval.value = null;
    currentFrameRate.value = 0;
    frameCount.value = 0;
  }
};

/**
 * Start continuous scanning of video feed
 */
const startContinuousScanning = () => {
  if (scanInterval.value) return; // Already scanning
  
  scanInterval.value = window.setInterval(async () => {
    // Skip if already processing or not enough time has passed
    if (isScanning.value || !canCapture.value) return;
    
    const now = Date.now();
    if (now - lastScanTime.value < SCAN_INTERVAL_MS) return;
    
    lastScanTime.value = now;
    await performAutoScan();
  }, 1000); // Check every second, but only scan based on SCAN_INTERVAL_MS
};

/**
 * Stop continuous scanning
 */
const stopContinuousScanning = () => {
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
};

/**
 * Perform automatic scan of current video frame
 */
const performAutoScan = async () => {
  if (!canCapture.value || isScanning.value) return;
  
  try {
    isScanning.value = true;
    
    // Capture current frame without showing capture UI
    let imageData: string;
    
    if (videoElement.value && canvasElement.value) {
      // Capture from video element (works for both web and Electron)
      const canvas = canvasElement.value;
      const video = videoElement.value;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      imageData = canvas.toDataURL('image/jpeg', 0.8);
    } else {
      return; // No video element available
    }
    
    // Process with OCR silently (don't show processing UI)
    await processAutoScan(imageData);
    
  } catch (error) {
    // Silently fail for auto-scans, don't interrupt the user
    console.warn('Auto-scan failed:', error);
  } finally {
    isScanning.value = false;
  }
};

/**
 * Process auto-scan result silently
 */
const processAutoScan = async (imageData: string) => {
  try {
    if (isElectron.value && window.api?.camera) {
      const response = await window.api.camera.processOCR(imageData);
      
      if (response.success && response.data) {
        const expression = response.data;
        
        // Only emit if we got a valid expression
        if (expression && expression.length > 0 && expression.length < 100) {
          // Auto-confirm the expression to calculator
          emit('confirm', expression);
        }
      }
    }
  } catch (error) {
    // Silently fail
    console.warn('Auto-scan processing failed:', error);
  }
};

/**
 * Capture image from camera
 */
const captureImage = async () => {
  try {
    if (!canCapture.value) return;
    
    cameraState.value.isProcessing = true;
    currentStep.value = 'capture';
    
    let imageData: string;
    
    if (videoElement.value && canvasElement.value) {
      // Capture from video element (works for both web and Electron)
      const canvas = canvasElement.value;
      const video = videoElement.value;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data as base64
      imageData = canvas.toDataURL('image/jpeg', 0.8);
    } else {
      throw new Error('Video element not available for capture');
    }
    
    capturedImage.value = imageData;
    cameraState.value.lastCapturedImage = imageData;
    
    // Emit capture event
    emit('capture', imageData);
    
    // Start OCR processing
    await startOCRProcessing(imageData);
    
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
 * Start OCR processing of captured image
 */
const startOCRProcessing = async (imageData: string) => {
  try {
    currentStep.value = 'processing';
    processingState.value = {
      stage: 'preprocessing',
      progress: 0.1,
      currentOperation: 'Preparing image for analysis...',
      startTime: Date.now()
    };
    
    if (isElectron.value) {
      // Use Electron IPC for OCR processing
      if (window.api?.camera) {
        const response = await window.api.camera.processOCR(imageData);
        if (!response.success) {
          throw new Error(response.error || 'OCR processing failed');
        }
        // The response should contain the recognized expression
        if (response.data) {
          handleProcessingComplete({
            recognizedExpression: response.data,
            confidence: 0.8, // Default confidence
            processingTime: Date.now() - (processingState.value.startTime || Date.now()),
            originalImage: imageData,
            timestamp: Date.now(),
            metadata: {
              platform: platform.value,
              processingMethod: 'llm-ocr'
            }
          });
        }
      } else {
        throw new Error('Camera API not available');
      }
    } else {
      // For web, we would need to send to a backend service
      // This is a placeholder - actual implementation would depend on backend setup
      throw new Error('OCR processing not yet implemented for web platform');
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
 * Handle successful OCR processing completion
 * Auto-confirms and closes modal (Requirement 4.1, 4.5)
 */
const handleProcessingComplete = (result: ProcessingResult) => {
  recognizedExpression.value = result.recognizedExpression;
  
  processingState.value = {
    stage: 'complete',
    progress: 1,
    currentOperation: 'Processing complete',
    result
  };
  
  // Auto-confirm and close modal (Requirement 4.1, 4.5)
  const expression = result.recognizedExpression;
  if (expression && expression.length > 0) {
    // Emit expression directly to calculator
    emit('confirm', expression);
    emit('expressionRecognized', expression);
    // Close modal after short delay to show success
    setTimeout(() => {
      closeModal();
    }, 500);
  } else {
    // If no expression, show error
    currentStep.value = 'error';
    handleProcessingError({
      type: 'parsing-failed',
      message: 'No mathematical expression was recognized in the image',
      stage: 'parsing',
      recoverable: true,
      retryable: true,
      suggestedAction: 'Try capturing the image again with better lighting and positioning',
      timestamp: Date.now()
    });
  }
};

/**
 * Handle OCR processing error
 */
const handleProcessingError = (error: ProcessingError) => {
  currentError.value = error;
  canRetry.value = error.retryable;
  currentStep.value = 'error';
  
  processingState.value = {
    stage: 'error',
    progress: 0,
    currentOperation: 'Processing failed',
    error
  };
  
  // Convert ProcessingError to CameraError for emit compatibility
  const cameraError: CameraError = {
    type: 'processing-failed',
    message: error.message,
    recoverable: error.recoverable,
    suggestedAction: error.suggestedAction,
    timestamp: error.timestamp
  };
  emit('error', cameraError);
};

/**
 * Handle image upload from file picker
 */
const handleImageUpload = async () => {
  try {
    cameraState.value.isProcessing = true;
    
    if (isElectron.value && window.api?.image) {
      // Use Electron IPC to open file dialog
      const response = await window.api.image.openDialog();
      if (response.success && response.data) {
        const filePath = response.data;
        
        // Validate the image file
        const validationResponse = await window.api.image.validate(filePath);
        if (!validationResponse.success || !validationResponse.data?.isValid) {
          throw new Error(validationResponse.data?.errors?.join(', ') || 'Invalid image file');
        }
        
        // Read image as base64
        const imageResponse = await window.api.image.readBase64(filePath);
        if (imageResponse.success && imageResponse.data) {
          const imageData = imageResponse.data;
          capturedImage.value = imageData;
          cameraState.value.lastCapturedImage = imageData;
          
          // Show preview briefly before processing
          currentStep.value = 'capture';
          
          // Emit upload event
          emit('upload', imageData);
          
          // Start OCR processing after brief delay to show preview
          setTimeout(async () => {
            await startOCRProcessing(imageData);
          }, 300);
        } else {
          throw new Error(imageResponse.error || 'Failed to read image file');
        }
      } else {
        // User cancelled the dialog
        cameraState.value.isProcessing = false;
      }
    } else if (isWeb.value) {
      // For web, use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/jpg,image/webp';
      
      input.onchange = async (e) => {
        try {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            cameraState.value.isProcessing = false;
            return;
          }
          
          // Validate file type
          if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
            throw new Error('Unsupported file format. Please use PNG, JPEG, or WEBP.');
          }
          
          // Read file as base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const imageData = event.target?.result as string;
            capturedImage.value = imageData;
            cameraState.value.lastCapturedImage = imageData;
            
            // Show preview briefly before processing
            currentStep.value = 'capture';
            
            // Emit upload event
            emit('upload', imageData);
            
            // Start OCR processing after brief delay to show preview
            setTimeout(async () => {
              await startOCRProcessing(imageData);
            }, 300);
          };
          reader.onerror = () => {
            throw new Error('Failed to read image file');
          };
          reader.readAsDataURL(file);
        } catch (error) {
          cameraState.value.isProcessing = false;
          handleError(createCameraError(
            'capture-failed',
            error instanceof Error ? error.message : 'Failed to upload image',
            true
          ));
        }
      };
      
      // Handle cancel
      input.oncancel = () => {
        cameraState.value.isProcessing = false;
      };
      
      input.click();
    }
  } catch (error) {
    cameraState.value.isProcessing = false;
    handleError(createCameraError(
      'capture-failed',
      error instanceof Error ? error.message : 'Failed to upload image',
      true
    ));
  }
};

/**
 * Retry the current operation
 */
const retryOperation = async () => {
  currentError.value = null;
  canRetry.value = false;
  
  if (currentStep.value === 'error') {
    if (capturedImage.value) {
      // Retry OCR processing
      await startOCRProcessing(capturedImage.value);
    } else {
      // Retry from camera preview
      currentStep.value = 'preview';
    }
  } else if (currentStep.value === 'permission') {
    // Retry permission request
    await requestCameraPermission();
  }
  
  emit('retry');
};

/**
 * Close the camera modal
 */
const closeModal = () => {
  emit('close');
};

/**
 * Cancel current processing
 */
const cancelProcessing = () => {
  // Cancel processing and return to preview
  processingState.value = {
    stage: 'idle',
    progress: 0,
    currentOperation: ''
  };
  
  currentStep.value = 'preview';
};

/**
 * Open system settings for camera permissions
 */
const openSystemSettings = async () => {
  try {
    if (isElectron.value && window.api?.permission) {
      // Get platform-specific instructions
      const platform = await detectOSPlatform();
      
      // Try to open system settings
      const response = await window.api.permission.openSettings(platform);
      if (!response.success) {
        // If can't auto-open, show help window
        showPermissionHelp.value = true;
      }
    } else {
      // For web browsers, show instructions
      showPermissionHelp.value = true;
    }
  } catch (error) {
    console.error('Failed to open system settings:', error);
    showPermissionHelp.value = true;
  }
};

/**
 * Detect OS platform for permission instructions
 */
const detectOSPlatform = async (): Promise<OSPlatform> => {
  if (isElectron.value && window.api?.permission) {
    try {
      const response = await window.api.permission.getPlatform();
      if (response.success && response.data) {
        return response.data as OSPlatform;
      }
    } catch (error) {
      console.error('Failed to detect platform:', error);
    }
  }
  
  // Fallback detection
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';
  return 'linux';
};

/**
 * Get platform-specific permission instructions
 */
const getPlatformInstructions = async (): Promise<PlatformInstructions | null> => {
  try {
    const platform = await detectOSPlatform();
    
    if (isElectron.value && window.api?.permission) {
      const response = await window.api.permission.getInstructions(platform);
      if (response.success && response.data) {
        return response.data;
      }
    }
    
    // Fallback instructions
    const instructions: Record<OSPlatform, PlatformInstructions> = {
      macos: {
        platform: 'macos',
        title: 'Enable Camera Access on macOS',
        steps: [
          'Open System Preferences',
          'Click on "Security & Privacy"',
          'Select the "Camera" tab',
          'Check the box next to this application',
          'Restart the application if needed'
        ],
        settingsPath: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
        canAutoOpen: true
      },
      windows: {
        platform: 'windows',
        title: 'Enable Camera Access on Windows',
        steps: [
          'Open Windows Settings',
          'Go to Privacy > Camera',
          'Turn on "Allow apps to access your camera"',
          'Scroll down and enable access for this application',
          'Restart the application if needed'
        ],
        settingsPath: 'ms-settings:privacy-webcam',
        canAutoOpen: true
      },
      linux: {
        platform: 'linux',
        title: 'Enable Camera Access on Linux',
        steps: [
          'Check if your camera is detected: ls /dev/video*',
          'Ensure your user is in the "video" group',
          'Grant camera permissions to the application',
          'Restart the application if needed'
        ],
        canAutoOpen: false
      }
    };
    
    return instructions[platform];
  } catch (error) {
    console.error('Failed to get platform instructions:', error);
    return null;
  }
};

// Platform instructions state
const platformInstructions = ref<PlatformInstructions | null>(null);

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
const handleError = (error: any) => {
  if (error && typeof error === 'object' && 'type' in error) {
    currentError.value = error as CameraError;
  } else {
    currentError.value = createCameraError(
      'configuration-error',
      error instanceof Error ? error.message : 'An unknown error occurred',
      true
    );
  }
  
  currentStep.value = 'error';
  canRetry.value = currentError.value.recoverable;
  
  emit('error', currentError.value);
};

/**
 * Cleanup camera resources
 */
const cleanup = async () => {
  // Stop continuous scanning
  stopContinuousScanning();
  
  // Stop frame rate monitoring
  stopFrameRateMonitoring();
  
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop());
    videoStream.value = null;
  }
  
  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
  
  cameraState.value.isActive = false;
  cameraState.value.isProcessing = false;
  
  // Reset state
  currentStep.value = 'permission';
  capturedImage.value = undefined;
  recognizedExpression.value = '';
  currentError.value = null;
  canRetry.value = false;
  isScanning.value = false;
  showPermissionHelp.value = false;
  platformInstructions.value = null;
  
  processingState.value = {
    stage: 'idle',
    progress: 0,
    currentOperation: ''
  };
};

// Lifecycle hooks
onMounted(() => {
  if (props.isVisible) {
    initializeCamera();
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 class="text-xl font-semibold text-white">Camera OCR</h2>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-white transition-colors duration-200 p-1"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Permission Step -->
        <div v-if="currentStep === 'permission'" class="text-center">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">Camera Access Required</h3>
            <p class="text-gray-300 mb-4">
              To capture mathematical expressions, we need access to your camera.
            </p>
            
            <!-- Platform-specific instructions -->
            <div v-if="isWeb" class="text-sm text-gray-400 mb-4 p-3 bg-slate-700 rounded-lg">
              <p class="mb-2">Your browser will ask for camera permission.</p>
              <p>Make sure to click "Allow" when prompted.</p>
            </div>
            
            <div v-if="isElectron" class="text-sm text-gray-400 mb-4 p-3 bg-slate-700 rounded-lg">
              <p class="mb-2">The system will request camera access.</p>
              <p>You may need to enable camera permissions in system settings.</p>
            </div>
          </div>

          <div class="flex gap-3 justify-center">
            <button
              @click="requestCameraPermission"
              :disabled="isLoading"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? 'Requesting...' : 'Enable Camera' }}
            </button>
            
            <button
              @click="closeModal"
              class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>

          <!-- Permission help -->
          <div v-if="permissionState.denied" class="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <p class="text-red-300 text-sm mb-2">Camera permission was denied.</p>
            <button
              @click="showPermissionHelp = true"
              class="text-red-400 hover:text-red-300 text-sm underline"
            >
              Show help to enable camera access
            </button>
          </div>
        </div>

        <!-- Permission Help Window (Requirement 9.1-9.5) -->
        <div v-if="showPermissionHelp" class="text-center">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-yellow-600 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">{{ platformInstructions?.title || 'Camera Permission Help' }}</h3>
            <p class="text-gray-300 mb-4">
              Follow these steps to enable camera access:
            </p>
            
            <!-- Platform-specific instructions -->
            <div class="text-left text-sm text-gray-300 mb-4 p-4 bg-slate-700 rounded-lg">
              <ol class="list-decimal list-inside space-y-2">
                <li v-for="(step, index) in platformInstructions?.steps" :key="index">{{ step }}</li>
              </ol>
            </div>
          </div>

          <div class="flex gap-3 justify-center flex-wrap">
            <button
              v-if="platformInstructions?.canAutoOpen"
              @click="openSystemSettings"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              Open System Settings
            </button>
            
            <button
              @click="retryOperation"
              class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
            >
              Retry
            </button>
            
            <button
              @click="handleImageUpload"
              class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
            >
              Upload Image Instead
            </button>
            
            <button
              @click="showPermissionHelp = false; closeModal()"
              class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Camera Preview Step -->
        <div v-if="currentStep === 'preview'" class="text-center">
          <div class="relative mb-4 bg-black rounded-lg overflow-hidden">
            <!-- Camera preview (works for both Web and Electron) -->
            <video
              ref="videoElement"
              autoplay
              playsinline
              muted
              class="w-full h-80 object-cover"
            />

            <!-- Visual guides for positioning math expressions (Requirement 1.2) -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <!-- Corner guides -->
              <div class="relative w-4/5 h-3/4">
                <!-- Top-left corner -->
                <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
                <!-- Top-right corner -->
                <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
                <!-- Bottom-left corner -->
                <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
                <!-- Bottom-right corner -->
                <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
                
                <!-- Center guide text -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <p class="text-white text-sm bg-black bg-opacity-60 px-3 py-1.5 rounded-lg">
                    Position math expression here
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Frame rate indicator (Requirement 1.4) -->
            <div class="absolute top-2 left-2 flex items-center gap-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full">
              <svg class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span class="text-white text-xs font-medium">{{ currentFrameRate }} FPS</span>
            </div>
            
            <!-- Scanning indicator -->
            <div v-if="isContinuousMode" class="absolute top-2 right-2 flex items-center gap-2 bg-black bg-opacity-70 px-3 py-1.5 rounded-full">
              <div class="w-2 h-2 rounded-full" :class="isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></div>
              <span class="text-white text-xs">{{ isScanning ? 'Scanning...' : 'Live OCR' }}</span>
            </div>
          </div>

          <div class="flex gap-3 justify-center flex-wrap">
            <button
              @click="captureImage"
              :disabled="!canCapture"
              class="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              Manual Capture
            </button>
            
            <button
              @click="handleImageUpload"
              class="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Image
            </button>
            
            <button
              @click="closeModal"
              class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Capture Step (shows uploaded/captured image preview) -->
        <div v-if="currentStep === 'capture'" class="text-center">
          <div class="mb-6">
            <!-- Captured/uploaded image preview -->
            <div v-if="capturedImage" class="mb-4">
              <img
                :src="capturedImage"
                alt="Selected image"
                class="w-full max-w-md mx-auto rounded-lg border border-slate-600"
              />
            </div>

            <h3 class="text-lg font-medium text-white mb-2">Image Selected</h3>
            <p class="text-gray-300 mb-4">Processing will begin shortly...</p>
          </div>
        </div>

        <!-- Processing Step -->
        <div v-if="currentStep === 'processing'" class="text-center">
          <div class="mb-6">
            <!-- Captured image preview -->
            <div v-if="capturedImage" class="mb-4">
              <img
                :src="capturedImage"
                alt="Captured expression"
                class="w-full max-w-md mx-auto rounded-lg border border-slate-600"
              />
            </div>

            <!-- Processing indicator -->
            <div class="mb-4">
              <div class="w-16 h-16 mx-auto mb-4 relative">
                <svg class="w-16 h-16 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xs font-medium text-white">{{ progressPercentage }}%</span>
                </div>
              </div>
              
              <h3 class="text-lg font-medium text-white mb-2">Processing Image</h3>
              <p class="text-gray-300 mb-4">{{ processingState.currentOperation }}</p>
              
              <!-- Progress bar -->
              <div class="w-full bg-slate-700 rounded-full h-2 mb-4">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${progressPercentage}%` }"
                ></div>
              </div>
            </div>
          </div>

          <button
            @click="cancelProcessing"
            class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </div>

        <!-- Error Step -->
        <div v-if="currentStep === 'error'" class="text-center">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 class="text-lg font-medium text-white mb-2">Something went wrong</h3>
            
            <div class="p-4 bg-red-900/50 border border-red-700 rounded-lg mb-4">
              <p class="text-red-300 text-sm mb-2">{{ currentError?.message }}</p>
              <p v-if="currentError?.suggestedAction" class="text-red-400 text-xs">
                {{ currentError.suggestedAction }}
              </p>
            </div>
          </div>

          <div class="flex gap-3 justify-center">
            <button
              v-if="canRetry"
              @click="retryOperation"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
            
            <button
              @click="closeModal"
              class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden canvas for image capture -->
    <canvas ref="canvasElement" class="hidden" />
  </div>
</template>

<style scoped>
/* Custom styles for camera component */
.camera-overlay {
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .camera-modal {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
}
</style>