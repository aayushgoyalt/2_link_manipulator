/**
 * Test Utilities Usage Examples
 * 
 * This file demonstrates how to use the test utilities for the Camera OCR feature.
 * These examples can be run from the browser console or integrated into your application.
 */

import { createTestRunner } from '../utils/testRunner';

/**
 * Example 1: Run a single camera access test
 */
export async function exampleCameraAccessTest() {
  console.log('Example 1: Camera Access Test');
  console.log('='.repeat(50));
  
  const runner = createTestRunner({ verbose: true });
  await runner.runCameraAccessTest();
}

/**
 * Example 2: Run OCR pipeline test with sample images
 */
export async function exampleOCRPipelineTest() {
  console.log('Example 2: OCR Pipeline Test');
  console.log('='.repeat(50));
  
  // You can provide test images as base64 data URLs
  const testImages = [
    // 'data:image/png;base64,...',
    // 'data:image/jpeg;base64,...'
  ];
  
  const runner = createTestRunner({ verbose: true });
  await runner.runOCRPipelineTest(testImages);
}

/**
 * Example 3: Run calculator integration test
 */
export async function exampleCalculatorIntegrationTest() {
  console.log('Example 3: Calculator Integration Test');
  console.log('='.repeat(50));
  
  const runner = createTestRunner({ verbose: true });
  
  // Test with different expressions
  await runner.runCalculatorIntegrationTest('2+3*4');
  await runner.runCalculatorIntegrationTest('x+5');
  await runner.runCalculatorIntegrationTest('(10-5)*2');
}

/**
 * Example 4: Run error handling test
 */
export async function exampleErrorHandlingTest() {
  console.log('Example 4: Error Handling Test');
  console.log('='.repeat(50));
  
  const runner = createTestRunner({ verbose: true });
  await runner.runErrorHandlingTest();
}

/**
 * Example 5: Run all tests with report generation
 */
export async function exampleRunAllTests() {
  console.log('Example 5: Run All Tests');
  console.log('='.repeat(50));
  
  const runner = createTestRunner({ 
    verbose: true, 
    saveReport: true 
  });
  
  await runner.runAllTests();
}

/**
 * Example 6: Use quick test functions from console
 */
export function exampleQuickTests() {
  console.log('Example 6: Quick Test Functions');
  console.log('='.repeat(50));
  console.log('You can run these commands from the browser console:');
  console.log('');
  console.log('  quickTest.camera()           - Test camera access');
  console.log('  quickTest.ocr()              - Test OCR pipeline');
  console.log('  quickTest.calculator("2+3")  - Test calculator integration');
  console.log('  quickTest.errors()           - Test error handling');
  console.log('  quickTest.all()              - Run all tests');
  console.log('');
}

/**
 * Example 7: Direct IPC API usage
 */
export async function exampleDirectIPCUsage() {
  console.log('Example 7: Direct IPC API Usage');
  console.log('='.repeat(50));
  
  try {
    // Run camera access test
    const cameraResult = await window.api.test.cameraAccess();
    console.log('Camera test result:', cameraResult);
    
    // Run OCR pipeline test
    const ocrResult = await window.api.test.ocrPipeline();
    console.log('OCR test result:', ocrResult);
    
    // Run calculator integration test
    const calcResult = await window.api.test.calculatorIntegration('2+3*4');
    console.log('Calculator test result:', calcResult);
    
    // Run error handling test
    const errorResult = await window.api.test.errorHandling();
    console.log('Error handling test result:', errorResult);
    
    // Run all tests
    const allResults = await window.api.test.runAll();
    console.log('All tests result:', allResults);
    
    // Generate report
    if (allResults.success && allResults.data) {
      const reportResult = await window.api.test.generateReport(allResults.data);
      if (reportResult.success) {
        console.log('Test Report:');
        console.log(reportResult.data);
      }
    }
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

/**
 * Example 8: Enable debug mode before testing
 */
export async function exampleWithDebugMode() {
  console.log('Example 8: Testing with Debug Mode');
  console.log('='.repeat(50));
  
  try {
    // Enable debug mode
    await window.api.debug.enable();
    console.log('Debug mode enabled');
    
    // Run tests
    const runner = createTestRunner({ verbose: true });
    await runner.runAllTests();
    
    // Export debug logs
    const exportResult = await window.api.debug.exportLogs();
    if (exportResult.success) {
      console.log('Debug logs exported to:', exportResult.data);
    }
    
    // Disable debug mode
    await window.api.debug.disable();
    console.log('Debug mode disabled');
  } catch (error) {
    console.error('Debug mode test error:', error);
  }
}

/**
 * Example 9: Custom test result handling
 */
export async function exampleCustomResultHandling() {
  console.log('Example 9: Custom Test Result Handling');
  console.log('='.repeat(50));
  
  try {
    const result = await window.api.test.cameraAccess();
    
    if (result.success && result.data) {
      const testData = result.data;
      
      // Check if test passed
      if (testData.success) {
        console.log('✓ Test PASSED');
        console.log(`  Duration: ${testData.duration}ms`);
        console.log(`  Devices found: ${testData.deviceCount || 0}`);
        
        // Access device details
        if (testData.deviceDetails) {
          console.log('  Device details:');
          testData.deviceDetails.forEach((device: any, index: number) => {
            console.log(`    ${index + 1}. ${device.label} (${device.deviceId})`);
          });
        }
      } else {
        console.log('✗ Test FAILED');
        if (testData.errors) {
          console.log('  Errors:');
          testData.errors.forEach((error: string) => {
            console.log(`    - ${error}`);
          });
        }
      }
      
      // Access detailed information
      if (testData.details) {
        console.log('  Additional details:', testData.details);
      }
    } else {
      console.error('Test execution failed:', result.error);
    }
  } catch (error) {
    console.error('Custom result handling error:', error);
  }
}

/**
 * Example 10: Automated test suite
 */
export async function exampleAutomatedTestSuite() {
  console.log('Example 10: Automated Test Suite');
  console.log('='.repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  try {
    // Test 1: Camera Access
    console.log('\n[1/4] Testing camera access...');
    const cameraResult = await window.api.test.cameraAccess();
    results.total++;
    if (cameraResult.success && cameraResult.data?.success) {
      results.passed++;
      console.log('✓ Camera access test passed');
    } else {
      results.failed++;
      console.log('✗ Camera access test failed');
    }
    
    // Test 2: OCR Pipeline
    console.log('\n[2/4] Testing OCR pipeline...');
    const ocrResult = await window.api.test.ocrPipeline();
    results.total++;
    if (ocrResult.success && ocrResult.data?.success) {
      results.passed++;
      console.log('✓ OCR pipeline test passed');
    } else {
      results.failed++;
      console.log('✗ OCR pipeline test failed');
    }
    
    // Test 3: Calculator Integration
    console.log('\n[3/4] Testing calculator integration...');
    const calcResult = await window.api.test.calculatorIntegration('2+3*4');
    results.total++;
    if (calcResult.success && calcResult.data?.success) {
      results.passed++;
      console.log('✓ Calculator integration test passed');
    } else {
      results.failed++;
      console.log('✗ Calculator integration test failed');
    }
    
    // Test 4: Error Handling
    console.log('\n[4/4] Testing error handling...');
    const errorResult = await window.api.test.errorHandling();
    results.total++;
    if (errorResult.success && errorResult.data?.success) {
      results.passed++;
      console.log('✓ Error handling test passed');
    } else {
      results.failed++;
      console.log('✗ Error handling test failed');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Suite Summary:');
    console.log(`  Total: ${results.total}`);
    console.log(`  Passed: ${results.passed}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Automated test suite error:', error);
  }
}

// Export all examples for easy access
export const examples = {
  cameraAccess: exampleCameraAccessTest,
  ocrPipeline: exampleOCRPipelineTest,
  calculatorIntegration: exampleCalculatorIntegrationTest,
  errorHandling: exampleErrorHandlingTest,
  runAll: exampleRunAllTests,
  quickTests: exampleQuickTests,
  directIPC: exampleDirectIPCUsage,
  withDebugMode: exampleWithDebugMode,
  customHandling: exampleCustomResultHandling,
  automatedSuite: exampleAutomatedTestSuite
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).testExamples = examples;
}
