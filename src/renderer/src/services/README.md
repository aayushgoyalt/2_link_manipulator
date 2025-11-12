# Web Camera Service Implementation

This directory contains the web-based camera service implementation for browser environments, providing cross-platform camera access using WebRTC APIs.

## Overview

The Web Camera Service enables camera functionality in web browsers using the WebRTC `getUserMedia` API. It provides comprehensive browser compatibility handling, fallback mechanisms, and error recovery for Chrome, Firefox, Safari, and Edge browsers.

## Key Components

### 1. WebCameraService (`WebCameraService.ts`)

The main camera service implementation for web browsers.

**Features:**
- WebRTC-based camera access using `getUserMedia`
- Browser permission handling with detailed error messages
- Canvas-based image capture and processing
- Cross-browser compatibility optimizations
- Comprehensive error handling and recovery
- Mathematical expression validation
- Event-driven architecture with listeners

**Key Methods:**
- `requestCameraPermission()` - Requests camera access with browser-specific handling
- `captureImage()` - Captures high-quality images using canvas processing
- `getCapabilities()` - Detects available cameras and supported resolutions
- `validateMathExpression()` - Validates mathematical expressions for OCR
- `isAvailable()` - Checks if camera service is available in current environment
- `cleanup()` - Properly releases camera resources and streams

### 2. RendererCameraServiceFactory (`RendererCameraServiceFactory.ts`)

Factory for creating and managing camera service instances in the renderer process.

**Features:**
- Singleton pattern for efficient resource management
- Platform detection and validation
- Service caching and lifecycle management
- Comprehensive capability checking
- Camera functionality testing
- Requirements validation

**Key Methods:**
- `createService()` - Creates WebCameraService instances
- `validateCameraRequirements()` - Validates browser and API support
- `testCameraFunctionality()` - Comprehensive camera testing
- `getRecommendedSettings()` - Browser-optimized camera settings

### 3. BrowserCompatibilityManager (`../utils/browserCompatibility.ts`)

Utility for handling browser-specific differences and compatibility issues.

**Features:**
- Browser detection (Chrome, Firefox, Safari, Edge)
- Version-specific optimizations and constraints
- Browser-specific error messages and solutions
- Fallback constraint generation
- Setup instruction generation
- Compatibility testing and validation

**Key Methods:**
- `getCompatibility()` - Detects browser capabilities and limitations
- `getOptimalConstraints()` - Generates browser-optimized camera constraints
- `getFallbackConstraints()` - Provides fallback options for failed constraints
- `getBrowserSpecificErrorMessage()` - Contextual error messages
- `getSetupInstructions()` - Step-by-step setup guidance

## Browser Support

### Chrome (53+)
- Full WebRTC support with advanced constraints
- 4K resolution support
- Optimal performance and compatibility
- Advanced error handling

### Firefox (60+)
- Good WebRTC support with some frame rate limitations
- 2K resolution support
- Session-based permission prompts
- Requires frame rate optimization

### Safari (11+)
- WebRTC support with constraint limitations
- Full HD resolution support
- Requires user interaction before camera access
- Built-in compression optimization
- Stricter security policies

### Edge (Chromium-based 79+)
- Full WebRTC support similar to Chrome
- 4K resolution support
- Legacy Edge has limited support

## Security Requirements

### HTTPS Requirement
Camera access requires a secure context:
- HTTPS protocol (except localhost)
- `window.isSecureContext` must be true
- Automatic detection and error handling

### Permission Model
- Browser-managed permissions
- Per-session or persistent permissions (browser-dependent)
- Graceful permission denial handling
- Clear user guidance for permission issues

## Usage Examples

### Basic Usage

```typescript
import { WebCameraService } from './services/WebCameraService';

const cameraService = new WebCameraService();

// Check availability
const isAvailable = await cameraService.isAvailable();

// Request permission
const hasPermission = await cameraService.requestCameraPermission();

// Capture image
const imageData = await cameraService.captureImage();

// Cleanup
await cameraService.cleanup();
```

### Using the Factory

```typescript
import { RendererCameraServiceFactory } from './services/RendererCameraServiceFactory';

const factory = RendererCameraServiceFactory.getInstance();
const cameraService = factory.createService();

// Validate requirements
const validation = factory.validateCameraRequirements();
if (!validation.isValid) {
  console.error('Camera requirements not met:', validation.issues);
}
```

### Browser Compatibility Checking

```typescript
import { BrowserCompatibilityManager } from './utils/browserCompatibility';

// Get compatibility info
const compatibility = BrowserCompatibilityManager.getCompatibility();
console.log('Browser:', compatibility.browser);
console.log('Supports getUserMedia:', compatibility.supportsGetUserMedia);

// Get setup instructions
const instructions = BrowserCompatibilityManager.getSetupInstructions();
console.log('Setup steps:', instructions);

// Test compatibility
const testResults = await BrowserCompatibilityManager.testCompatibility();
console.log('Compatibility test:', testResults);
```

### Complete Workflow

```typescript
import { WebCameraServiceExample } from './examples/WebCameraServiceExample';

const example = new WebCameraServiceExample();

// Run complete workflow
await example.performCompleteWorkflow();

// Or run individual steps
await example.checkCompatibility();
await example.checkAvailability();
await example.requestPermission();
const imageData = await example.captureImage();
```

## Error Handling

### Common Error Types

1. **Permission Denied (`NotAllowedError`)**
   - User denied camera access
   - Browser-specific guidance provided
   - Recoverable with user action

2. **Camera Not Found (`NotFoundError`)**
   - No camera hardware detected
   - Hardware connection guidance
   - May require page refresh

3. **Camera Busy (`NotReadableError`)**
   - Camera in use by another application
   - Application conflict resolution
   - Retry mechanisms available

4. **Unsupported Configuration (`OverconstrainedError`)**
   - Camera doesn't support requested settings
   - Automatic fallback to simpler constraints
   - Browser-specific constraint optimization

5. **Security Error (`SecurityError`)**
   - HTTPS requirement not met
   - Browser security policy issues
   - Clear security guidance provided

### Error Recovery

The service provides automatic error recovery:
- Fallback constraint attempts
- Browser-specific error messages
- User-friendly suggested actions
- Retry mechanisms with exponential backoff

## Performance Optimizations

### Image Quality
- Browser-specific quality settings
- Automatic compression optimization
- Canvas-based processing for efficiency

### Constraint Optimization
- Browser-specific constraint generation
- Fallback constraint chains
- Resolution and frame rate optimization

### Resource Management
- Automatic stream cleanup
- Memory leak prevention
- Proper event listener management

## Integration Notes

### Main Process Integration
- LLM processing delegated to main process for security
- IPC communication for secure API key handling
- Renderer process handles only camera operations

### Vue.js Integration
- Compatible with Vue 3 composition API
- Reactive state management support
- Event-driven architecture for UI updates

### TypeScript Support
- Full TypeScript definitions
- Comprehensive type safety
- Generic interfaces for extensibility

## Testing

The implementation includes comprehensive examples and validation:
- Browser compatibility testing
- Camera functionality validation
- Error scenario handling
- Performance monitoring
- Requirements validation

Run examples:
```typescript
import { runCameraExample, runFactoryExample, runCameraTest } from './examples/WebCameraServiceExample';

// Test complete workflow
await runCameraExample();

// Test factory functionality
runFactoryExample();

// Test camera capabilities
await runCameraTest();
```

## Troubleshooting

### Common Issues

1. **Camera not working in Safari**
   - Ensure user interaction before camera access
   - Check Safari version (11+ required)
   - Verify HTTPS or localhost usage

2. **Permission prompts in Firefox**
   - Firefox may prompt for each session
   - Consider permanent permission setup
   - Check browser security settings

3. **HTTPS requirement**
   - Camera requires secure context
   - Use HTTPS or localhost for development
   - Check `window.isSecureContext`

4. **High resolution not supported**
   - Browser/hardware limitations
   - Automatic fallback to supported resolutions
   - Check camera capabilities

### Debug Information

Enable debug mode for detailed logging:
```typescript
const cameraService = new WebCameraService();
const diagnostics = await cameraService.testBrowserCompatibility();
console.log('Debug info:', diagnostics);
```

## Future Enhancements

Potential improvements for future versions:
- WebAssembly-based image processing
- Progressive Web App (PWA) support
- Advanced camera controls (zoom, focus, exposure)
- Multiple camera support
- Real-time video processing
- WebCodecs API integration for better performance