/**
 * Camera Test Runner (Renderer Process)
 * Tests camera functionality from the renderer process where navigator is available
 */

export interface CameraTestResult {
  component: string;
  success: boolean;
  duration: number;
  details: any;
  errors?: string[];
  timestamp: number;
}

export class CameraTestRunner {
  /**
   * Test camera permission and access
   */
  static async testCameraAccess(): Promise<CameraTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    const details: any = {};

    try {
      // Check if navigator and mediaDevices are available
      if (typeof navigator === 'undefined') {
        errors.push('Navigator not available');
        return this.createResult('CameraAccess', false, startTime, details, errors);
      }

      if (!navigator.mediaDevices) {
        errors.push('MediaDevices API not available');
        return this.createResult('CameraAccess', false, startTime, details, errors);
      }

      details.navigatorAvailable = true;
      details.mediaDevicesAvailable = true;

      // Test permission API if available
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          details.permissionStatus = permission.state;
          details.permissionAPIAvailable = true;
        } catch (err) {
          details.permissionAPIAvailable = false;
          details.permissionNote = 'Permission API not fully supported';
        }
      }

      // Enumerate devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        details.deviceCount = videoDevices.length;
        details.devices = videoDevices.map(d => ({
          deviceId: d.deviceId,
          label: d.label || 'Unknown Camera',
          groupId: d.groupId
        }));

        if (videoDevices.length === 0) {
          errors.push('No video input devices found');
          return this.createResult('CameraAccess', false, startTime, details, errors);
        }
      } catch (err) {
        errors.push(`Failed to enumerate devices: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return this.createResult('CameraAccess', false, startTime, details, errors);
      }

      // Try to get user media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { min: 15 }
          }
        });

        details.streamActive = stream.active;
        details.trackCount = stream.getTracks().length;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          details.videoSettings = {
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode
          };
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());

        success = true;
      } catch (err) {
        errors.push(`Failed to get user media: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return this.createResult('CameraAccess', false, startTime, details, errors);
      }

      return this.createResult('CameraAccess', success, startTime, details, errors);

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return this.createResult('CameraAccess', false, startTime, details, errors);
    }
  }

  /**
   * Test frame capture from video stream
   */
  static async testFrameCapture(): Promise<CameraTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let success = false;
    const details: any = {};

    try {
      // Get a stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(reject);
        };
        video.onerror = () => reject(new Error('Video failed to load'));
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });

      // Wait a bit for the video to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        errors.push('Failed to get canvas context');
      } else {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        details.capturedImageSize = imageData.length;
        details.resolution = {
          width: canvas.width,
          height: canvas.height
        };
        details.imageFormat = 'image/jpeg';
        details.imageSizeKB = Math.round(imageData.length / 1024);
        success = true;
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      video.remove();
      canvas.remove();

      return this.createResult('FrameCapture', success, startTime, details, errors);

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return this.createResult('FrameCapture', false, startTime, details, errors);
    }
  }

  /**
   * Test complete camera workflow
   */
  static async testCompleteWorkflow(): Promise<{
    cameraAccess: CameraTestResult;
    frameCapture: CameraTestResult;
    overall: boolean;
  }> {
    const cameraAccess = await this.testCameraAccess();
    let frameCapture: CameraTestResult;

    if (cameraAccess.success) {
      frameCapture = await this.testFrameCapture();
    } else {
      frameCapture = this.createResult(
        'FrameCapture',
        false,
        Date.now(),
        {},
        ['Skipped due to camera access failure']
      );
    }

    return {
      cameraAccess,
      frameCapture,
      overall: cameraAccess.success && frameCapture.success
    };
  }

  /**
   * Helper to create test result
   */
  private static createResult(
    component: string,
    success: boolean,
    startTime: number,
    details: any,
    errors: string[]
  ): CameraTestResult {
    return {
      component,
      success,
      duration: Date.now() - startTime,
      details,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    };
  }
}

// Export a function to run tests from console
export async function runCameraTests() {
  console.log('🎥 Running Camera Tests...\n');

  const results = await CameraTestRunner.testCompleteWorkflow();

  console.log('📊 Test Results:');
  console.log('================');
  console.log('\n1. Camera Access Test:');
  console.log(`   Status: ${results.cameraAccess.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Duration: ${results.cameraAccess.duration}ms`);
  if (results.cameraAccess.errors) {
    console.log(`   Errors: ${results.cameraAccess.errors.join(', ')}`);
  }
  console.log(`   Details:`, results.cameraAccess.details);

  console.log('\n2. Frame Capture Test:');
  console.log(`   Status: ${results.frameCapture.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Duration: ${results.frameCapture.duration}ms`);
  if (results.frameCapture.errors) {
    console.log(`   Errors: ${results.frameCapture.errors.join(', ')}`);
  }
  console.log(`   Details:`, results.frameCapture.details);

  console.log('\n================');
  console.log(`Overall: ${results.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return results;
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).runCameraTests = runCameraTests;
  (window as any).CameraTestRunner = CameraTestRunner;
}
