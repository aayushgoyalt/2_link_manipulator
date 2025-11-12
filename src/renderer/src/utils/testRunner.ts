/**
 * Test Runner Utility
 * Provides convenient functions to run camera OCR tests from the renderer process
 */

export interface TestRunnerOptions {
  verbose?: boolean;
  saveReport?: boolean;
}

export class TestRunner {
  private verbose: boolean;
  private saveReport: boolean;

  constructor(options: TestRunnerOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.saveReport = options.saveReport ?? true;
  }

  /**
   * Run camera access test
   */
  async runCameraAccessTest(): Promise<void> {
    this.log('Running camera access test...');
    
    try {
      const result = await window.api.test.cameraAccess();
      
      if (result.success && result.data) {
        this.log(`✓ Camera access test ${result.data.success ? 'PASSED' : 'FAILED'}`);
        this.log(`  Duration: ${result.data.duration}ms`);
        this.log(`  Device count: ${result.data.deviceCount || 0}`);
        
        if (result.data.errors && result.data.errors.length > 0) {
          this.log(`  Errors: ${result.data.errors.join(', ')}`);
        }
        
        if (this.verbose) {
          console.log('Camera access test details:', result.data);
        }
      } else {
        this.log(`✗ Camera access test failed: ${result.error}`);
      }
    } catch (error) {
      this.log(`✗ Camera access test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run OCR pipeline test
   */
  async runOCRPipelineTest(testImages?: string[]): Promise<void> {
    this.log('Running OCR pipeline test...');
    
    try {
      const result = await window.api.test.ocrPipeline(testImages);
      
      if (result.success && result.data) {
        this.log(`✓ OCR pipeline test ${result.data.success ? 'PASSED' : 'FAILED'}`);
        this.log(`  Duration: ${result.data.duration}ms`);
        
        if (result.data.processingStages) {
          this.log(`  Processing stages: ${result.data.processingStages.length}`);
        }
        
        if (result.data.errors && result.data.errors.length > 0) {
          this.log(`  Errors: ${result.data.errors.join(', ')}`);
        }
        
        if (this.verbose) {
          console.log('OCR pipeline test details:', result.data);
        }
      } else {
        this.log(`✗ OCR pipeline test failed: ${result.error}`);
      }
    } catch (error) {
      this.log(`✗ OCR pipeline test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run calculator integration test
   */
  async runCalculatorIntegrationTest(expression: string = '2+3*4'): Promise<void> {
    this.log(`Running calculator integration test with expression: ${expression}`);
    
    try {
      const result = await window.api.test.calculatorIntegration(expression);
      
      if (result.success && result.data) {
        this.log(`✓ Calculator integration test ${result.data.success ? 'PASSED' : 'FAILED'}`);
        this.log(`  Duration: ${result.data.duration}ms`);
        this.log(`  Expression inserted: ${result.data.expressionInserted ? 'Yes' : 'No'}`);
        this.log(`  Calculator focused: ${result.data.calculatorFocused ? 'Yes' : 'No'}`);
        this.log(`  User can solve: ${result.data.userCanSolve ? 'Yes' : 'No'}`);
        
        if (result.data.errors && result.data.errors.length > 0) {
          this.log(`  Errors: ${result.data.errors.join(', ')}`);
        }
        
        if (this.verbose) {
          console.log('Calculator integration test details:', result.data);
        }
      } else {
        this.log(`✗ Calculator integration test failed: ${result.error}`);
      }
    } catch (error) {
      this.log(`✗ Calculator integration test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run error handling test
   */
  async runErrorHandlingTest(): Promise<void> {
    this.log('Running error handling test...');
    
    try {
      const result = await window.api.test.errorHandling();
      
      if (result.success && result.data) {
        this.log(`✓ Error handling test ${result.data.success ? 'PASSED' : 'FAILED'}`);
        this.log(`  Duration: ${result.data.duration}ms`);
        this.log(`  Error handled: ${result.data.errorHandled ? 'Yes' : 'No'}`);
        this.log(`  Recovery attempted: ${result.data.recoveryAttempted ? 'Yes' : 'No'}`);
        this.log(`  User feedback provided: ${result.data.userFeedbackProvided ? 'Yes' : 'No'}`);
        
        if (result.data.errors && result.data.errors.length > 0) {
          this.log(`  Errors: ${result.data.errors.join(', ')}`);
        }
        
        if (this.verbose) {
          console.log('Error handling test details:', result.data);
        }
      } else {
        this.log(`✗ Error handling test failed: ${result.error}`);
      }
    } catch (error) {
      this.log(`✗ Error handling test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(testImages?: string[]): Promise<void> {
    this.log('='.repeat(80));
    this.log('Running all camera OCR tests...');
    this.log('='.repeat(80));
    
    try {
      const result = await window.api.test.runAll(testImages);
      
      if (result.success && result.data) {
        const { cameraAccess, ocrPipeline, calculatorIntegration, errorHandling, overallSuccess } = result.data;
        
        this.log('');
        this.log(`Overall Status: ${overallSuccess ? 'PASS ✓' : 'FAIL ✗'}`);
        this.log('');
        this.log('-'.repeat(80));
        this.log('Test Results:');
        this.log('-'.repeat(80));
        this.log(`1. Camera Access: ${cameraAccess.success ? 'PASS ✓' : 'FAIL ✗'} (${cameraAccess.duration}ms)`);
        this.log(`2. OCR Pipeline: ${ocrPipeline.success ? 'PASS ✓' : 'FAIL ✗'} (${ocrPipeline.duration}ms)`);
        this.log(`3. Calculator Integration: ${calculatorIntegration.success ? 'PASS ✓' : 'FAIL ✗'} (${calculatorIntegration.duration}ms)`);
        this.log(`4. Error Handling: ${errorHandling.success ? 'PASS ✓' : 'FAIL ✗'} (${errorHandling.duration}ms)`);
        this.log('-'.repeat(80));
        
        if (this.saveReport) {
          const reportResult = await window.api.test.generateReport(result.data);
          if (reportResult.success && reportResult.data) {
            this.log('');
            this.log('Full Test Report:');
            this.log(reportResult.data);
          }
        }
        
        if (this.verbose) {
          console.log('All tests details:', result.data);
        }
      } else {
        this.log(`✗ Run all tests failed: ${result.error}`);
      }
    } catch (error) {
      this.log(`✗ Run all tests error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.log('='.repeat(80));
  }

  /**
   * Log message to console
   */
  private log(message: string): void {
    console.log(message);
  }
}

/**
 * Create a test runner instance
 */
export function createTestRunner(options?: TestRunnerOptions): TestRunner {
  return new TestRunner(options);
}

/**
 * Quick test functions for console usage
 */
export const quickTest = {
  camera: async () => {
    const runner = createTestRunner({ verbose: true });
    await runner.runCameraAccessTest();
  },
  
  ocr: async (testImages?: string[]) => {
    const runner = createTestRunner({ verbose: true });
    await runner.runOCRPipelineTest(testImages);
  },
  
  calculator: async (expression?: string) => {
    const runner = createTestRunner({ verbose: true });
    await runner.runCalculatorIntegrationTest(expression);
  },
  
  errors: async () => {
    const runner = createTestRunner({ verbose: true });
    await runner.runErrorHandlingTest();
  },
  
  all: async (testImages?: string[]) => {
    const runner = createTestRunner({ verbose: true, saveReport: true });
    await runner.runAllTests(testImages);
  }
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).quickTest = quickTest;
}
