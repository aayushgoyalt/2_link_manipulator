/**
 * Fallback Manager for Camera OCR Operations
 * Provides alternative methods when primary camera or OCR operations fail
 * Implements graceful degradation and user-friendly alternatives
 */

import type { 
  CameraError, 
  ProcessingError, 
  CameraCapabilities
} from '../types/camera-ocr';

/**
 * Available fallback options for different failure scenarios
 */
export type FallbackOption = 
  | 'manual-input'
  | 'file-upload'
  | 'screen-capture'
  | 'simplified-ocr'
  | 'offline-parsing'
  | 'alternative-llm'
  | 'basic-calculator';

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  primaryFailed: string;
  availableOptions: FallbackOption[];
  recommendedOption: FallbackOption;
  userMessage: string;
  instructions: string[];
}

/**
 * Fallback execution result
 */
export interface FallbackResult {
  success: boolean;
  option: FallbackOption;
  result?: any;
  error?: Error;
  userMessage: string;
}

/**
 * Manages fallback strategies for camera OCR failures
 */
export class FallbackManager {
  private static readonly FALLBACK_STRATEGIES: Record<string, FallbackStrategy> = {
    'camera-permission-denied': {
      primaryFailed: 'Camera access denied',
      availableOptions: ['file-upload', 'manual-input'],
      recommendedOption: 'file-upload',
      userMessage: 'Camera access is not available. You can upload an image file or enter the expression manually.',
      instructions: [
        'Click "Upload Image" to select a photo from your device',
        'Or click "Manual Input" to type the mathematical expression'
      ]
    },
    'camera-hardware-unavailable': {
      primaryFailed: 'Camera hardware not available',
      availableOptions: ['file-upload', 'screen-capture', 'manual-input'],
      recommendedOption: 'file-upload',
      userMessage: 'Camera is not available. You can upload an image or use screen capture instead.',
      instructions: [
        'Upload an image file containing mathematical expressions',
        'Use screen capture to capture part of your screen',
        'Enter the expression manually using the calculator'
      ]
    },
    'camera-capture-failed': {
      primaryFailed: 'Image capture failed',
      availableOptions: ['file-upload', 'manual-input', 'screen-capture'],
      recommendedOption: 'file-upload',
      userMessage: 'Failed to capture image. Try uploading an existing image or entering manually.',
      instructions: [
        'Select an image file from your device',
        'Ensure the image contains clear mathematical expressions',
        'Or type the expression directly into the calculator'
      ]
    },
    'llm-service-unavailable': {
      primaryFailed: 'Image analysis service unavailable',
      availableOptions: ['simplified-ocr', 'manual-input', 'offline-parsing'],
      recommendedOption: 'manual-input',
      userMessage: 'Image analysis is temporarily unavailable. Please enter the expression manually.',
      instructions: [
        'Look at the captured image and type the mathematical expression',
        'Use standard notation: +, -, *, /, (, )',
        'The expression will be calculated normally'
      ]
    },
    'llm-rate-limited': {
      primaryFailed: 'Too many requests to analysis service',
      availableOptions: ['manual-input', 'offline-parsing'],
      recommendedOption: 'manual-input',
      userMessage: 'Service rate limit reached. Please wait or enter the expression manually.',
      instructions: [
        'Wait a few minutes before trying camera capture again',
        'Or enter the mathematical expression manually',
        'Your calculation will work the same way'
      ]
    },
    'expression-parsing-failed': {
      primaryFailed: 'Could not extract mathematical expression',
      availableOptions: ['manual-input', 'alternative-llm', 'simplified-ocr'],
      recommendedOption: 'manual-input',
      userMessage: 'Could not detect mathematical expressions in the image. Please enter manually.',
      instructions: [
        'Look at your captured image',
        'Type the mathematical expression you see',
        'Use standard mathematical notation'
      ]
    },
    'image-quality-poor': {
      primaryFailed: 'Image quality insufficient for analysis',
      availableOptions: ['manual-input', 'file-upload'],
      recommendedOption: 'manual-input',
      userMessage: 'Image quality is too poor for analysis. Try a clearer image or manual input.',
      instructions: [
        'Capture a new image with better lighting',
        'Ensure mathematical expressions are clearly visible',
        'Or enter the expression manually'
      ]
    },
    'network-unavailable': {
      primaryFailed: 'No internet connection for image analysis',
      availableOptions: ['offline-parsing', 'manual-input'],
      recommendedOption: 'manual-input',
      userMessage: 'Internet connection required for image analysis. Please enter manually.',
      instructions: [
        'Check your internet connection',
        'Enter the mathematical expression manually',
        'Camera features will work when connection is restored'
      ]
    }
  };

  /**
   * Determines appropriate fallback strategy based on error type
   */
  static getFallbackStrategy(error: CameraError | ProcessingError): FallbackStrategy {
    let strategyKey: string;

    if ('stage' in error) {
      // Processing error
      switch (error.type) {
        case 'llm-service-error':
          strategyKey = 'llm-service-unavailable';
          break;
        case 'rate-limit-exceeded':
          strategyKey = 'llm-rate-limited';
          break;
        case 'parsing-failed':
        case 'validation-failed':
          strategyKey = 'expression-parsing-failed';
          break;
        case 'image-invalid':
        case 'insufficient-confidence':
          strategyKey = 'image-quality-poor';
          break;
        case 'timeout':
          if (error.message.toLowerCase().includes('network')) {
            strategyKey = 'network-unavailable';
          } else {
            strategyKey = 'llm-service-unavailable';
          }
          break;
        default:
          strategyKey = 'llm-service-unavailable';
      }
    } else {
      // Camera error
      switch (error.type) {
        case 'permission-denied':
          strategyKey = 'camera-permission-denied';
          break;
        case 'hardware-unavailable':
          strategyKey = 'camera-hardware-unavailable';
          break;
        case 'capture-failed':
          strategyKey = 'camera-capture-failed';
          break;
        case 'network-error':
          strategyKey = 'network-unavailable';
          break;
        default:
          strategyKey = 'camera-capture-failed';
      }
    }

    return this.FALLBACK_STRATEGIES[strategyKey] || this.getDefaultFallbackStrategy();
  }

  /**
   * Executes a fallback option
   */
  static async executeFallback(
    option: FallbackOption,
    context?: any
  ): Promise<FallbackResult> {
    try {
      switch (option) {
        case 'manual-input':
          return this.executeManualInput();
        
        case 'file-upload':
          return this.executeFileUpload(context);
        
        case 'screen-capture':
          return this.executeScreenCapture();
        
        case 'simplified-ocr':
          return this.executeSimplifiedOCR(context);
        
        case 'offline-parsing':
          return this.executeOfflineParsing(context);
        
        case 'alternative-llm':
          return this.executeAlternativeLLM(context);
        
        case 'basic-calculator':
          return this.executeBasicCalculator();
        
        default:
          throw new Error(`Unsupported fallback option: ${option}`);
      }
    } catch (error) {
      return {
        success: false,
        option,
        error: error as Error,
        userMessage: `Fallback option ${option} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets available fallback options based on current capabilities
   */
  static getAvailableFallbacks(
    error: CameraError | ProcessingError,
    capabilities?: CameraCapabilities
  ): FallbackOption[] {
    const strategy = this.getFallbackStrategy(error);
    const available: FallbackOption[] = [];

    for (const option of strategy.availableOptions) {
      if (this.isFallbackAvailable(option, capabilities)) {
        available.push(option);
      }
    }

    // Always ensure manual input is available as last resort
    if (!available.includes('manual-input')) {
      available.push('manual-input');
    }

    return available;
  }

  /**
   * Checks if a specific fallback option is available
   */
  static isFallbackAvailable(
    option: FallbackOption,
    _capabilities?: CameraCapabilities
  ): boolean {
    switch (option) {
      case 'manual-input':
      case 'basic-calculator':
        return true; // Always available
      
      case 'file-upload':
        return typeof FileReader !== 'undefined'; // Browser file API
      
      case 'screen-capture':
        // Available in Electron or browsers with screen capture API
        return typeof window !== 'undefined' && (
          !!(window as any).electronAPI ||
          !!(navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia)
        );
      
      case 'simplified-ocr':
        return false; // Would require additional OCR library
      
      case 'offline-parsing':
        return false; // Would require offline ML model
      
      case 'alternative-llm':
        return false; // Would require multiple LLM service configurations
      
      default:
        return false;
    }
  }

  /**
   * Creates user-friendly fallback instructions
   */
  static createFallbackInstructions(
    error: CameraError | ProcessingError,
    availableOptions: FallbackOption[]
  ): string[] {
    const strategy = this.getFallbackStrategy(error);
    const instructions: string[] = [];

    instructions.push(`Problem: ${strategy.primaryFailed}`);
    instructions.push(''); // Empty line for separation

    if (availableOptions.length > 0) {
      instructions.push('Available alternatives:');
      
      availableOptions.forEach((option, index) => {
        const optionInstructions = this.getFallbackOptionInstructions(option);
        instructions.push(`${index + 1}. ${optionInstructions.title}`);
        optionInstructions.steps.forEach(step => {
          instructions.push(`   • ${step}`);
        });
      });
    } else {
      instructions.push('No alternative options are currently available.');
      instructions.push('Please try again later or contact support.');
    }

    return instructions;
  }

  // Private helper methods

  private static getDefaultFallbackStrategy(): FallbackStrategy {
    return {
      primaryFailed: 'Operation failed',
      availableOptions: ['manual-input'],
      recommendedOption: 'manual-input',
      userMessage: 'The operation failed. Please enter the expression manually.',
      instructions: ['Enter the mathematical expression using the calculator keypad']
    };
  }

  private static async executeManualInput(): Promise<FallbackResult> {
    return {
      success: true,
      option: 'manual-input',
      userMessage: 'Please enter the mathematical expression manually using the calculator.'
    };
  }

  private static async executeFileUpload(_context?: any): Promise<FallbackResult> {
    // This would integrate with file upload UI component
    return {
      success: true,
      option: 'file-upload',
      userMessage: 'Please select an image file containing mathematical expressions.'
    };
  }

  private static async executeScreenCapture(): Promise<FallbackResult> {
    try {
      // Check if screen capture is available
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Electron screen capture
        return {
          success: true,
          option: 'screen-capture',
          userMessage: 'Screen capture mode activated. Select the area containing mathematical expressions.'
        };
      } else if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
        // Browser screen capture
        return {
          success: true,
          option: 'screen-capture',
          userMessage: 'Browser screen capture activated. Select the window or screen to capture.'
        };
      } else {
        throw new Error('Screen capture not supported on this platform');
      }
    } catch (error) {
      return {
        success: false,
        option: 'screen-capture',
        error: error as Error,
        userMessage: 'Screen capture is not available on this platform.'
      };
    }
  }

  private static async executeSimplifiedOCR(_context?: any): Promise<FallbackResult> {
    // Placeholder for simplified OCR implementation
    return {
      success: false,
      option: 'simplified-ocr',
      userMessage: 'Simplified OCR is not yet implemented. Please use manual input.'
    };
  }

  private static async executeOfflineParsing(_context?: any): Promise<FallbackResult> {
    // Placeholder for offline parsing implementation
    return {
      success: false,
      option: 'offline-parsing',
      userMessage: 'Offline parsing is not yet implemented. Please use manual input.'
    };
  }

  private static async executeAlternativeLLM(_context?: any): Promise<FallbackResult> {
    // Placeholder for alternative LLM service
    return {
      success: false,
      option: 'alternative-llm',
      userMessage: 'Alternative LLM service is not configured. Please use manual input.'
    };
  }

  private static async executeBasicCalculator(): Promise<FallbackResult> {
    return {
      success: true,
      option: 'basic-calculator',
      userMessage: 'Using basic calculator mode. Enter expressions using the keypad.'
    };
  }

  public static getFallbackOptionInstructions(option: FallbackOption): { title: string; steps: string[] } {
    const instructions: Record<FallbackOption, { title: string; steps: string[] }> = {
      'manual-input': {
        title: 'Enter expression manually',
        steps: [
          'Use the calculator keypad to enter the mathematical expression',
          'Use standard notation: +, -, *, /, (, )',
          'Press equals to calculate the result'
        ]
      },
      'file-upload': {
        title: 'Upload an image file',
        steps: [
          'Click the upload button to select an image',
          'Choose a clear image containing mathematical expressions',
          'The image will be processed automatically'
        ]
      },
      'screen-capture': {
        title: 'Capture part of your screen',
        steps: [
          'Click the screen capture button',
          'Select the area containing mathematical expressions',
          'The captured area will be processed for OCR'
        ]
      },
      'simplified-ocr': {
        title: 'Use simplified text recognition',
        steps: [
          'Basic text recognition will be attempted',
          'May work for simple, clearly written expressions',
          'Results may be less accurate than full OCR'
        ]
      },
      'offline-parsing': {
        title: 'Use offline expression parsing',
        steps: [
          'Local parsing without internet connection',
          'Limited to basic mathematical expressions',
          'No advanced recognition features'
        ]
      },
      'alternative-llm': {
        title: 'Try alternative analysis service',
        steps: [
          'Use backup image analysis service',
          'May have different capabilities or accuracy',
          'Requires additional service configuration'
        ]
      },
      'basic-calculator': {
        title: 'Use basic calculator mode',
        steps: [
          'Standard calculator functionality only',
          'No camera or OCR features',
          'Manual input using keypad'
        ]
      }
    };

    return instructions[option] || {
      title: 'Unknown option',
      steps: ['Please contact support for assistance']
    };
  }
}

/**
 * Fallback UI helper for creating user interface elements
 */
export class FallbackUIHelper {
  /**
   * Creates fallback option buttons configuration
   */
  static createFallbackButtons(
    availableOptions: FallbackOption[]
  ): Array<{ option: FallbackOption; label: string; icon: string; primary: boolean }> {
    const buttonConfigs: Record<FallbackOption, { label: string; icon: string; primary: boolean }> = {
      'manual-input': { label: 'Enter Manually', icon: 'keyboard', primary: true },
      'file-upload': { label: 'Upload Image', icon: 'upload', primary: true },
      'screen-capture': { label: 'Screen Capture', icon: 'monitor', primary: false },
      'simplified-ocr': { label: 'Simple OCR', icon: 'eye', primary: false },
      'offline-parsing': { label: 'Offline Mode', icon: 'wifi-off', primary: false },
      'alternative-llm': { label: 'Alternative Service', icon: 'refresh', primary: false },
      'basic-calculator': { label: 'Basic Calculator', icon: 'calculator', primary: false }
    };

    return availableOptions.map(option => ({
      option,
      ...buttonConfigs[option]
    }));
  }

  /**
   * Creates error message with fallback suggestions
   */
  static createErrorMessageWithFallbacks(
    error: CameraError | ProcessingError,
    availableOptions: FallbackOption[]
  ): { title: string; message: string; suggestions: string[] } {
    const strategy = FallbackManager.getFallbackStrategy(error);
    
    return {
      title: strategy.primaryFailed,
      message: strategy.userMessage,
      suggestions: availableOptions.map(option => {
        const instructions = FallbackManager.getFallbackOptionInstructions(option);
        return instructions.title;
      })
    };
  }
}