import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { historyService } from './services/HistoryService'
import { CameraServiceFactory } from './services/CameraServiceFactory'
import { PermissionManager } from './services/PermissionManager'
import { ImageUploadHandler } from './services/ImageUploadHandler'
import { createDebugLogger } from './services/DebugLoggerService'
import type { CalculationRecord } from './types/calculator'

function createWindow(): void {
  // Create the browser window with calculator-optimized dimensions
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Set zoom level to 100% to prevent scaling issues
    mainWindow.webContents.setZoomFactor(1.0)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Initialize history service and ensure MockDB is ready before creating windows
  try {
    console.log('Initializing history service...')
    await initializeHistoryService()
    console.log('History service initialized successfully')
  } catch (error) {
    console.error('Failed to initialize history service:', error)
    // Continue with app startup even if history service fails
    // The service will attempt to initialize on first use
  }

  // Setup IPC handlers after service initialization
  setupHistoryIPC()
  setupCameraIPC()
  setupCalculatorOCRIPC()
  setupPermissionIPC()
  setupImageUploadIPC()
  setupDebugLoggerIPC()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle application shutdown cleanup
app.on('before-quit', async (event) => {
  console.log('Application shutting down, performing cleanup...')
  
  try {
    // Prevent immediate quit to allow cleanup
    event.preventDefault()
    
    // Perform cleanup operations
    await cleanupHistoryService()
    
    // Cleanup camera service if it exists
    try {
      const cameraServiceFactory = CameraServiceFactory.getInstance();
      cameraServiceFactory.clearCache();
    } catch (error) {
      console.warn('Error cleaning up camera service:', error);
    }
    
    // Now allow the app to quit
    app.exit(0)
  } catch (error) {
    console.error('Error during cleanup:', error)
    // Force quit even if cleanup fails
    app.exit(1)
  }
})

/**
 * Initialize history service during application startup
 * Ensures MockDB is ready before renderer process loads
 */
async function initializeHistoryService(): Promise<void> {
  await historyService.initialize()
}

/**
 * Cleanup history service during application shutdown
 * Ensures proper cleanup and data safety
 */
async function cleanupHistoryService(): Promise<void> {
  try {
    // Create a final backup before shutdown
    console.log('Creating final backup before shutdown...')
    await historyService.createBackup()
    console.log('Final backup created successfully')
  } catch (error) {
    console.warn('Failed to create final backup:', error)
    // Don't throw - allow shutdown to continue
  }
}

// History IPC handlers
function setupHistoryIPC(): void {

  // Handle history:save - Save a calculation to history
  ipcMain.handle('history:save', async (_event, record: Omit<CalculationRecord, 'id' | 'timestamp'>) => {
    try {
      const savedRecord = await historyService.saveCalculation(record)
      return { success: true, data: savedRecord }
    } catch (error) {
      console.error('IPC history:save error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save calculation'
      }
    }
  })

  // Handle history:load - Load all calculations from history
  ipcMain.handle('history:load', async (_event) => {
    try {
      const records = await historyService.loadHistory()
      return { success: true, data: records }
    } catch (error) {
      console.error('IPC history:load error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load history'
      }
    }
  })

  // Handle history:clear - Clear all calculation history
  ipcMain.handle('history:clear', async (_event) => {
    try {
      await historyService.clearHistory()
      return { success: true }
    } catch (error) {
      console.error('IPC history:clear error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear history'
      }
    }
  })

  // Handle history:backup - Create a backup of current history
  ipcMain.handle('history:backup', async (_event) => {
    try {
      const backupPath = await historyService.createBackup()
      return { success: true, data: backupPath }
    } catch (error) {
      console.error('IPC history:backup error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create backup'
      }
    }
  })

  // Handle history:stats - Get history statistics
  ipcMain.handle('history:stats', async (_event) => {
    try {
      const stats = await historyService.getHistoryStats()
      return { success: true, data: stats }
    } catch (error) {
      console.error('IPC history:stats error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get history stats'
      }
    }
  })
}

// Camera OCR IPC handlers
function setupCameraIPC(): void {
  const cameraServiceFactory = CameraServiceFactory.getInstance();
  let cameraService: any = null;

  // Initialize camera service lazily
  const getCameraService = () => {
    if (!cameraService) {
      cameraService = cameraServiceFactory.createService();
    }
    return cameraService;
  };

  // Handle camera:request-permission - Request camera permissions
  ipcMain.handle('camera:request-permission', async (_event) => {
    try {
      const service = getCameraService();
      const granted = await service.requestCameraPermission();
      return { success: true, data: granted };
    } catch (error) {
      console.error('IPC camera:request-permission error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to request camera permission'
      };
    }
  });

  // Handle camera:capture-image - Capture image from camera
  ipcMain.handle('camera:capture-image', async (_event) => {
    try {
      const service = getCameraService();
      const imageData = await service.captureImage();
      return { success: true, data: imageData };
    } catch (error) {
      console.error('IPC camera:capture-image error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to capture image'
      };
    }
  });

  // Handle camera:process-ocr - Process image with LLM for OCR
  ipcMain.handle('camera:process-ocr', async (_event, imageData: string) => {
    try {
      const service = getCameraService();
      const expression = await service.processImageWithLLM(imageData);
      return { success: true, data: expression };
    } catch (error) {
      console.error('IPC camera:process-ocr error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process image with OCR'
      };
    }
  });

  // Handle camera:validate-expression - Validate mathematical expression
  ipcMain.handle('camera:validate-expression', async (_event, expression: string) => {
    try {
      const service = getCameraService();
      const isValid = service.validateMathExpression(expression);
      return { success: true, data: isValid };
    } catch (error) {
      console.error('IPC camera:validate-expression error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate expression'
      };
    }
  });

  // Handle camera:get-capabilities - Get camera capabilities
  ipcMain.handle('camera:get-capabilities', async (_event) => {
    try {
      const service = getCameraService();
      const capabilities = await service.getCapabilities();
      return { success: true, data: capabilities };
    } catch (error) {
      console.error('IPC camera:get-capabilities error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get camera capabilities'
      };
    }
  });

  // Handle camera:is-available - Check if camera service is available
  ipcMain.handle('camera:is-available', async (_event) => {
    try {
      const service = getCameraService();
      const isAvailable = await service.isAvailable();
      return { success: true, data: isAvailable };
    } catch (error) {
      console.error('IPC camera:is-available error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check camera availability'
      };
    }
  });

  // Handle camera:cleanup - Cleanup camera resources
  ipcMain.handle('camera:cleanup', async (_event) => {
    try {
      if (cameraService) {
        await cameraService.cleanup();
        cameraService = null;
      }
      return { success: true };
    } catch (error) {
      console.error('IPC camera:cleanup error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cleanup camera service'
      };
    }
  });

  // Handle camera:check-permission-status - Check permission status before requesting
  ipcMain.handle('camera:check-permission-status', async (_event) => {
    try {
      const service = getCameraService();
      const status = await service.checkPermissionStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('IPC camera:check-permission-status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check permission status'
      };
    }
  });

  // Handle camera:check-permission - Alias for camera:check-permission-status
  ipcMain.handle('camera:check-permission', async (_event) => {
    try {
      const service = getCameraService();
      const status = await service.checkPermissionStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('IPC camera:check-permission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check permission'
      };
    }
  });

  // Handle camera:retry-permission - Retry permission after user grants it
  ipcMain.handle('camera:retry-permission', async (_event) => {
    try {
      const service = getCameraService();
      const granted = await service.retryPermissionAfterGrant();
      return { success: true, data: granted };
    } catch (error) {
      console.error('IPC camera:retry-permission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry permission'
      };
    }
  });

  // Handle camera:open-system-settings - Open system settings for camera permissions
  ipcMain.handle('camera:open-system-settings', async (_event) => {
    try {
      const service = getCameraService();
      service.openSystemSettings();
      return { success: true };
    } catch (error) {
      console.error('IPC camera:open-system-settings error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open system settings'
      };
    }
  });

  // Handle camera:initialize-live-stream - Initialize live video stream
  ipcMain.handle('camera:initialize-live-stream', async (_event) => {
    try {
      const service = getCameraService();
      const result = await service.initializeLiveStream();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC camera:initialize-live-stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize live stream'
      };
    }
  });

  // Handle camera:get-video-constraints - Get video constraints for live feed
  ipcMain.handle('camera:get-video-constraints', async (_event) => {
    try {
      const service = getCameraService();
      const constraints = service.getVideoConstraints();
      return { success: true, data: constraints };
    } catch (error) {
      console.error('IPC camera:get-video-constraints error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get video constraints'
      };
    }
  });

  // Handle camera:capture-frame - Capture frame from live video stream
  ipcMain.handle('camera:capture-frame', async (_event, imageData: string) => {
    try {
      const service = getCameraService();
      const capturedImage = await service.captureFrameFromStream(imageData);
      return { success: true, data: capturedImage };
    } catch (error) {
      console.error('IPC camera:capture-frame error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture frame'
      };
    }
  });

  // Handle camera:stop-video-stream - Stop video stream
  ipcMain.handle('camera:stop-video-stream', async (_event) => {
    try {
      const service = getCameraService();
      await service.stopVideoStream();
      return { success: true };
    } catch (error) {
      console.error('IPC camera:stop-video-stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop video stream'
      };
    }
  });

  // Handle camera:get-platform-info - Get platform detection information
  ipcMain.handle('camera:get-platform-info', async (_event) => {
    try {
      const platform = cameraServiceFactory.detectPlatform();
      const capabilities = cameraServiceFactory.getPlatformCapabilities();
      const supportedPlatforms = cameraServiceFactory.getSupportedPlatforms();
      const validation = cameraServiceFactory.validateConfiguration();
      
      return { 
        success: true, 
        data: {
          platform,
          capabilities,
          supportedPlatforms,
          validation
        }
      };
    } catch (error) {
      console.error('IPC camera:get-platform-info error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get platform information'
      };
    }
  });
}

// Permission Manager IPC handlers
function setupPermissionIPC(): void {
  const permissionManager = PermissionManager.getInstance();

  // Handle permission:get-status - Get current permission status
  ipcMain.handle('permission:get-status', async (_event) => {
    try {
      const platform = permissionManager.detectOS();
      const status = await permissionManager.getPermissionStatus(platform);
      return { success: true, data: status };
    } catch (error) {
      console.error('IPC permission:get-status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get permission status'
      };
    }
  });

  // Handle permission:get-platform - Get current platform
  ipcMain.handle('permission:get-platform', async (_event) => {
    try {
      const platform = permissionManager.detectOS();
      return { success: true, data: platform };
    } catch (error) {
      console.error('IPC permission:get-platform error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get platform'
      };
    }
  });

  // Handle permission:get-instructions - Get platform-specific instructions
  ipcMain.handle('permission:get-instructions', async (_event, platform: string) => {
    try {
      const instructions = permissionManager.getPlatformInstructions(platform as any);
      return { success: true, data: instructions };
    } catch (error) {
      console.error('IPC permission:get-instructions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get platform instructions'
      };
    }
  });

  // Handle permission:open-settings - Open system settings
  ipcMain.handle('permission:open-settings', async (_event, platform: string) => {
    try {
      permissionManager.openSystemSettings(platform as any);
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC permission:open-settings error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open system settings'
      };
    }
  });
}

// Image Upload IPC handlers
function setupImageUploadIPC(): void {
  const imageUploadHandler = ImageUploadHandler.getInstance();

  // Handle image:open-dialog - Open file picker dialog
  ipcMain.handle('image:open-dialog', async (_event) => {
    try {
      const filePath = await imageUploadHandler.openFileDialog();
      return { success: true, data: filePath };
    } catch (error) {
      console.error('IPC image:open-dialog error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open file dialog'
      };
    }
  });

  // Handle image:validate - Validate image file
  ipcMain.handle('image:validate', async (_event, filePath: string) => {
    try {
      const validationResult = await imageUploadHandler.validateImageFile(filePath);
      return { success: true, data: validationResult };
    } catch (error) {
      console.error('IPC image:validate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate image file'
      };
    }
  });

  // Handle image:read-base64 - Read image as base64
  ipcMain.handle('image:read-base64', async (_event, filePath: string) => {
    try {
      const base64Data = await imageUploadHandler.readImageAsBase64(filePath);
      return { success: true, data: base64Data };
    } catch (error) {
      console.error('IPC image:read-base64 error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read image file'
      };
    }
  });

  // Handle image:get-supported-formats - Get supported image formats
  ipcMain.handle('image:get-supported-formats', async (_event) => {
    try {
      const formats = imageUploadHandler.getSupportedFormats();
      return { success: true, data: formats };
    } catch (error) {
      console.error('IPC image:get-supported-formats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get supported formats'
      };
    }
  });
}

// Calculator OCR integration IPC handlers
function setupCalculatorOCRIPC(): void {
  // Handle calculator:process-ocr-expression - Process OCR expression with expression parser
  ipcMain.handle('calculator:process-ocr-expression', async (_event, expression: string) => {
    try {
      // Import the expression parser
      const { MathExpressionParser } = await import('./services/ExpressionParser');
      const parser = new MathExpressionParser();
      
      // Parse the expression
      const parsed = parser.parseExpression(expression);
      
      let calculationResult: number | undefined;
      
      // If the expression is valid, try to evaluate it
      if (parsed.isValid) {
        const evaluation = parser.evaluateExpression(parsed.normalizedExpression);
        if (evaluation.isValid && evaluation.result !== undefined) {
          calculationResult = evaluation.result;
        }
      }
      
      return {
        success: true,
        data: {
          isValid: parsed.isValid,
          normalizedExpression: parsed.normalizedExpression,
          calculationResult,
          error: parsed.error,
          complexity: parsed.complexity,
          operands: parsed.operands,
          operators: parsed.operators
        }
      };
    } catch (error) {
      console.error('IPC calculator:process-ocr-expression error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OCR expression'
      };
    }
  });

  // Handle calculator:validate-expression - Validate mathematical expression
  ipcMain.handle('calculator:validate-expression', async (_event, expression: string) => {
    try {
      const { MathExpressionParser } = await import('./services/ExpressionParser');
      const parser = new MathExpressionParser();
      
      const isValid = parser.validateSyntax(expression);
      const suggestions = parser.getSuggestions(expression);
      
      return {
        success: true,
        data: {
          isValid,
          suggestions
        }
      };
    } catch (error) {
      console.error('IPC calculator:validate-expression error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate expression'
      };
    }
  });

  // Handle calculator:normalize-expression - Normalize mathematical expression
  ipcMain.handle('calculator:normalize-expression', async (_event, expression: string) => {
    try {
      const { MathExpressionParser } = await import('./services/ExpressionParser');
      const parser = new MathExpressionParser();
      
      const normalized = parser.normalizeExpression(expression);
      const isValid = parser.validateSyntax(normalized);
      
      return {
        success: true,
        data: {
          normalizedExpression: normalized,
          isValid
        }
      };
    } catch (error) {
      console.error('IPC calculator:normalize-expression error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to normalize expression'
      };
    }
  });

  // Handle calculator:evaluate-expression - Evaluate mathematical expression
  ipcMain.handle('calculator:evaluate-expression', async (_event, expression: string) => {
    try {
      const { MathExpressionParser } = await import('./services/ExpressionParser');
      const parser = new MathExpressionParser();
      
      const evaluation = parser.evaluateExpression(expression);
      
      return {
        success: true,
        data: evaluation
      };
    } catch (error) {
      console.error('IPC calculator:evaluate-expression error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate expression'
      };
    }
  });
}



// Debug Logger IPC handlers
function setupDebugLoggerIPC(): void {
  let debugLogger: any = null;

  // Initialize debug logger lazily
  const getDebugLogger = () => {
    if (!debugLogger) {
      debugLogger = createDebugLogger();
    }
    return debugLogger;
  };

  // Handle debug:enable - Enable debug mode
  ipcMain.handle('debug:enable', async (_event) => {
    try {
      const logger = getDebugLogger();
      logger.enableDebugMode();
      return { success: true };
    } catch (error) {
      console.error('IPC debug:enable error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable debug mode'
      };
    }
  });

  // Handle debug:disable - Disable debug mode
  ipcMain.handle('debug:disable', async (_event) => {
    try {
      const logger = getDebugLogger();
      logger.disableDebugMode();
      return { success: true };
    } catch (error) {
      console.error('IPC debug:disable error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable debug mode'
      };
    }
  });

  // Handle debug:is-enabled - Check if debug mode is enabled
  ipcMain.handle('debug:is-enabled', async (_event) => {
    try {
      const logger = getDebugLogger();
      const isEnabled = logger.isDebugMode();
      return { success: true, data: isEnabled };
    } catch (error) {
      console.error('IPC debug:is-enabled error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check debug mode'
      };
    }
  });

  // Handle debug:test-camera - Test camera access
  ipcMain.handle('debug:test-camera', async (_event) => {
    try {
      const logger = getDebugLogger();
      const result = await logger.testCameraAccess();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC debug:test-camera error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test camera access'
      };
    }
  });

  // Handle debug:test-image-capture - Test image capture
  ipcMain.handle('debug:test-image-capture', async (_event) => {
    try {
      const logger = getDebugLogger();
      const result = await logger.testImageCapture();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC debug:test-image-capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test image capture'
      };
    }
  });

  // Handle debug:test-ocr - Test OCR processing
  ipcMain.handle('debug:test-ocr', async (_event, imageData: string) => {
    try {
      const logger = getDebugLogger();
      const result = await logger.testOCRProcessing(imageData);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC debug:test-ocr error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test OCR processing'
      };
    }
  });

  // Handle debug:test-calculator - Test calculator integration
  ipcMain.handle('debug:test-calculator', async (_event, expression: string) => {
    try {
      const logger = getDebugLogger();
      const result = await logger.testCalculatorIntegration(expression);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC debug:test-calculator error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test calculator integration'
      };
    }
  });

  // Handle debug:export-logs - Export debug logs
  ipcMain.handle('debug:export-logs', async (_event) => {
    try {
      const logger = getDebugLogger();
      const filepath = await logger.exportDebugLogs();
      return { success: true, data: filepath };
    } catch (error) {
      console.error('IPC debug:export-logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export debug logs'
      };
    }
  });

  // Handle debug:get-logs - Get all logs
  ipcMain.handle('debug:get-logs', async (_event) => {
    try {
      const logger = getDebugLogger();
      const logs = logger.getLogs();
      return { success: true, data: logs };
    } catch (error) {
      console.error('IPC debug:get-logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get logs'
      };
    }
  });

  // Handle debug:clear-logs - Clear all logs
  ipcMain.handle('debug:clear-logs', async (_event) => {
    try {
      const logger = getDebugLogger();
      logger.clearLogs();
      return { success: true };
    } catch (error) {
      console.error('IPC debug:clear-logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear logs'
      };
    }
  });

  // Handle debug:save-session - Save debug session
  ipcMain.handle('debug:save-session', async (_event, sessionId: string) => {
    try {
      const logger = getDebugLogger();
      await logger.saveDebugSession(sessionId);
      return { success: true };
    } catch (error) {
      console.error('IPC debug:save-session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save debug session'
      };
    }
  });

  // Handle debug:load-session - Load debug session
  ipcMain.handle('debug:load-session', async (_event, sessionId: string) => {
    try {
      const logger = getDebugLogger();
      const session = await logger.loadDebugSession(sessionId);
      return { success: true, data: session };
    } catch (error) {
      console.error('IPC debug:load-session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load debug session'
      };
    }
  });

  // Handle debug:get-config - Get debug configuration
  ipcMain.handle('debug:get-config', async (_event) => {
    try {
      const logger = getDebugLogger();
      const config = logger.getConfig();
      return { success: true, data: config };
    } catch (error) {
      console.error('IPC debug:get-config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get debug config'
      };
    }
  });

  // Handle debug:update-config - Update debug configuration
  ipcMain.handle('debug:update-config', async (_event, config: any) => {
    try {
      const logger = getDebugLogger();
      logger.updateConfig(config);
      return { success: true };
    } catch (error) {
      console.error('IPC debug:update-config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update debug config'
      };
    }
  });

  // ============================================================================
  // Comprehensive Test Utility Handlers (Task 10)
  // ============================================================================

  // Handle test:camera-access - Comprehensive camera access test
  ipcMain.handle('test:camera-access', async (_event) => {
    try {
      const logger = getDebugLogger();
      const result = await logger.testCameraAccess();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC test:camera-access error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Camera access test failed'
      };
    }
  });

  // Handle test:ocr-pipeline - Comprehensive OCR pipeline test
  ipcMain.handle('test:ocr-pipeline', async (_event, testImages?: string[]) => {
    try {
      const logger = getDebugLogger();
      // Create test utilities instance
      const { createTestUtilities } = await import('./services/TestUtilities');
      const testUtils = createTestUtilities(logger);
      const result = await testUtils.testOCRPipeline(testImages);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC test:ocr-pipeline error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR pipeline test failed'
      };
    }
  });

  // Handle test:calculator-integration - Comprehensive calculator integration test
  ipcMain.handle('test:calculator-integration', async (_event, expression: string) => {
    try {
      const logger = getDebugLogger();
      const { createTestUtilities } = await import('./services/TestUtilities');
      const testUtils = createTestUtilities(logger);
      const result = await testUtils.testCalculatorIntegration(expression);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC test:calculator-integration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculator integration test failed'
      };
    }
  });

  // Handle test:error-handling - Comprehensive error handling test
  ipcMain.handle('test:error-handling', async (_event) => {
    try {
      const logger = getDebugLogger();
      const { createTestUtilities } = await import('./services/TestUtilities');
      const testUtils = createTestUtilities(logger);
      const result = await testUtils.testErrorHandling();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC test:error-handling error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error handling test failed'
      };
    }
  });

  // Handle test:run-all - Run all tests in sequence
  ipcMain.handle('test:run-all', async (_event, testImages?: string[]) => {
    try {
      const logger = getDebugLogger();
      const { createTestUtilities } = await import('./services/TestUtilities');
      const testUtils = createTestUtilities(logger);
      const results = await testUtils.runAllTests(testImages);
      return { success: true, data: results };
    } catch (error) {
      console.error('IPC test:run-all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Run all tests failed'
      };
    }
  });

  // Handle test:generate-report - Generate test report
  ipcMain.handle('test:generate-report', async (_event, results: any) => {
    try {
      const logger = getDebugLogger();
      const { createTestUtilities } = await import('./services/TestUtilities');
      const testUtils = createTestUtilities(logger);
      const report = testUtils.generateTestReport(results);
      return { success: true, data: report };
    } catch (error) {
      console.error('IPC test:generate-report error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generate test report failed'
      };
    }
  });
}

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
