import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { historyService } from './services/HistoryService'
import { CameraServiceFactory } from './services/CameraServiceFactory'
import type { CalculationRecord } from './types/calculator'

function createWindow(): void {
  // Create the browser window with calculator-optimized dimensions
  const mainWindow = new BrowserWindow({
    width: 700,
    height: 650,
    minWidth: 700,
    minHeight: 550,
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



// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
