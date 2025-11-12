# Camera OCR Mathematical Expression Recognition - Design Document

## Overview

This design document outlines the implementation of a camera-based OCR feature that allows users to capture mathematical expressions using their device's camera and automatically solve them through integration with external LLM services (primarily Google Gemini). The feature will be seamlessly integrated into the existing Electron-based calculator application while maintaining cross-platform compatibility for Mac, Windows, and web deployments.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Camera UI     │    │   Camera Service │    │  LLM Service    │
│   Component     │◄──►│   (Main Process) │◄──►│   (External)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Calculator     │    │  Image Processing│    │   Expression    │
│  Integration    │    │     Utils        │    │    Parser      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Platform-Specific Implementation Strategy

**Desktop (Electron - Mac/Windows):**
- Use Electron's `desktopCapturer` API for screen capture
- Implement native camera access through `navigator.mediaDevices.getUserMedia`
- Leverage Node.js capabilities for file system operations

**Web Deployment:**
- Use WebRTC `getUserMedia` API for camera access
- Implement browser-based image capture and processing
- Use Web APIs for file handling and storage

## Components and Interfaces

### 1. Camera UI Component (`CameraCapture.vue`)

**Purpose:** Provides the user interface for camera access and image capture

**Key Features:**
- Camera permission handling
- Live camera preview
- Image capture functionality
- Cross-platform responsive design

**Interface:**
```typescript
interface CameraUIProps {
  isVisible: boolean;
  isProcessing: boolean;
}

interface CameraUIEmits {
  capture: (imageData: string) => void;
  close: () => void;
  error: (error: CameraError) => void;
}
```

### 2. Camera Service (Main Process)

**Purpose:** Handles camera operations and coordinates with external services

**Key Responsibilities:**
- Platform detection and appropriate API selection
- Camera permission management
- Image preprocessing and optimization
- LLM service integration
- Error handling and recovery

**Interface:**
```typescript
interface CameraService {
  requestCameraPermission(): Promise<boolean>;
  captureImage(): Promise<string>;
  processImageWithLLM(imageData: string): Promise<string>;
  validateMathExpression(expression: string): boolean;
}
```

### 3. LLM Integration Service

**Purpose:** Manages communication with external LLM services (Gemini)

**Key Features:**
- API key management and security
- Request/response handling
- Rate limiting and error recovery
- Response validation and parsing

**Interface:**
```typescript
interface LLMService {
  analyzeImage(imageData: string, prompt: string): Promise<LLMResponse>;
  validateResponse(response: LLMResponse): boolean;
  extractMathExpression(response: LLMResponse): string;
}

interface LLMResponse {
  success: boolean;
  expression?: string;
  confidence?: number;
  error?: string;
}
```

### 4. Expression Parser and Validator

**Purpose:** Processes LLM output and integrates with existing calculator logic

**Key Features:**
- Mathematical expression validation
- Syntax normalization
- Integration with existing calculator engine
- Error handling for invalid expressions

**Interface:**
```typescript
interface ExpressionParser {
  parseExpression(rawExpression: string): ParsedExpression;
  validateSyntax(expression: string): boolean;
  normalizeExpression(expression: string): string;
  convertToCalculatorFormat(expression: string): CalculatorInput;
}

interface ParsedExpression {
  isValid: boolean;
  normalizedExpression: string;
  operands: number[];
  operators: Operation[];
  error?: string;
}
```

## Data Models

### Camera State Management

```typescript
interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  isProcessing: boolean;
  lastCapturedImage?: string;
  error?: CameraError;
}

interface CameraError {
  type: 'permission' | 'hardware' | 'processing' | 'network';
  message: string;
  recoverable: boolean;
}
```

### OCR Processing Pipeline

```typescript
interface OCRProcessingState {
  stage: 'capturing' | 'uploading' | 'processing' | 'parsing' | 'complete' | 'error';
  progress: number;
  currentOperation: string;
  result?: ProcessingResult;
  error?: ProcessingError;
}

interface ProcessingResult {
  originalImage: string;
  recognizedExpression: string;
  confidence: number;
  calculationResult?: string;
  timestamp: number;
}
```

### Configuration Management

```typescript
interface CameraOCRConfig {
  llmProvider: 'gemini' | 'openai' | 'claude';
  apiKey: string;
  maxImageSize: number;
  imageQuality: number;
  processingTimeout: number;
  retryAttempts: number;
}
```

## Error Handling

### Error Categories and Recovery Strategies

**1. Camera Access Errors**
- Permission denied: Guide user to enable camera permissions
- Hardware unavailable: Fallback to file upload option
- Platform incompatibility: Graceful degradation

**2. Image Processing Errors**
- Poor image quality: Provide capture guidance and retry
- No mathematical content detected: Clear user feedback and retry option
- Image too large: Automatic compression and retry

**3. LLM Service Errors**
- API rate limits: Implement exponential backoff
- Network connectivity: Offline mode with queue for later processing
- Invalid API response: Fallback to manual input option

**4. Expression Parsing Errors**
- Invalid mathematical syntax: Allow manual correction
- Unsupported operations: Clear error messaging
- Calculation errors: Standard calculator error handling

### Error Recovery Flow

```
Image Capture Error
        ↓
Check Error Type
        ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   Permission    │    Hardware     │   Processing    │
│     Error       │     Error       │     Error       │
└─────────────────┴─────────────────┴─────────────────┘
        ↓                 ↓                 ↓
Guide to Settings    File Upload      Retry with
                     Fallback        Guidance
```

## Testing Strategy

### Unit Testing Focus Areas

**1. Expression Parser Testing**
- Valid mathematical expression recognition
- Invalid input handling
- Edge cases (complex expressions, special characters)
- Integration with existing calculator logic

**2. LLM Service Integration Testing**
- Mock API responses for consistent testing
- Error response handling
- Rate limiting behavior
- Response validation logic

**3. Camera Service Testing**
- Permission handling across platforms
- Image capture and processing
- Error scenarios and recovery

### Integration Testing

**1. End-to-End OCR Flow**
- Complete image capture to calculation pipeline
- Cross-platform compatibility testing
- Performance under various conditions

**2. Calculator Integration**
- Seamless integration with existing calculator state
- History management for OCR-derived calculations
- UI state management during OCR operations

### Platform-Specific Testing

**Desktop Testing:**
- Electron API integration
- Native camera access
- File system operations
- Window management during camera operations

**Web Testing:**
- WebRTC compatibility across browsers
- Progressive Web App functionality
- Responsive design on various screen sizes
- Browser permission handling

## Security Considerations

### API Key Management
- Secure storage of LLM service API keys
- Environment-based configuration
- Key rotation capabilities

### Image Data Handling
- Temporary image storage with automatic cleanup
- No persistent storage of captured images
- Secure transmission to LLM services

### Privacy Protection
- Clear user consent for camera access
- Transparent data usage policies
- Option to process images locally when possible

## Performance Optimization

### Image Processing
- Client-side image compression before LLM submission
- Optimal image resolution for OCR accuracy vs. processing speed
- Caching of processed results to avoid redundant API calls

### LLM Service Integration
- Request batching when possible
- Response caching for identical expressions
- Fallback to simpler processing for basic expressions

### UI Responsiveness
- Asynchronous processing with progress indicators
- Non-blocking camera operations
- Smooth transitions between states

## Cross-Platform Implementation Details

### Electron Desktop Implementation
```typescript
// Main process camera service
class ElectronCameraService implements CameraService {
  async requestCameraPermission(): Promise<boolean> {
    // Use Electron's systemPreferences API
    return systemPreferences.getMediaAccessStatus('camera') === 'granted';
  }
  
  async captureImage(): Promise<string> {
    // Use desktopCapturer or getUserMedia through renderer
  }
}
```

### Web Implementation
```typescript
// Browser-based camera service
class WebCameraService implements CameraService {
  async requestCameraPermission(): Promise<boolean> {
    // Use navigator.permissions API
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission.state === 'granted';
  }
  
  async captureImage(): Promise<string> {
    // Use getUserMedia and canvas for image capture
  }
}
```

### Platform Detection and Service Factory
```typescript
class CameraServiceFactory {
  static createService(): CameraService {
    if (window.electronAPI) {
      return new ElectronCameraService();
    } else {
      return new WebCameraService();
    }
  }
}
```

## Integration with Existing Calculator

### UI Integration Points
- Add camera button to calculator interface
- Integrate camera modal/overlay
- Show processing states in calculator display
- Maintain existing calculator state during OCR operations

### State Management Integration
- Extend existing calculator state to include camera operations
- Integrate OCR results with calculation history
- Maintain undo/redo functionality for OCR-derived calculations

### Calculator Logic Extension
```typescript
// Extended calculator state
interface EnhancedCalculatorState extends CalculatorState {
  camera: CameraState;
  ocrProcessing: OCRProcessingState;
}

// New calculator methods
interface CalculatorMethods {
  handleCameraCapture(): Promise<void>;
  processOCRResult(expression: string): Promise<void>;
  cancelOCROperation(): void;
}
```

This design provides a comprehensive foundation for implementing the camera-based OCR mathematical expression recognition feature while maintaining the existing calculator's functionality and ensuring cross-platform compatibility.