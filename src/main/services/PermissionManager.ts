/**
 * Permission Manager Service
 * Handles camera permission requests and provides platform-specific instructions
 */

import { shell } from 'electron';
import type {
  PermissionManager as IPermissionManager,
  OSPlatform,
  PermissionStatus,
  PlatformInstructions,
  PermissionResult
} from '../types/camera-ocr';

export class PermissionManager implements IPermissionManager {
  private static instance: PermissionManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Detect current operating system
   * @returns Platform type (windows, macos, or linux)
   */
  detectOS(): OSPlatform {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        // Default to linux for unknown platforms
        return 'linux';
    }
  }

  /**
   * Get platform-specific configuration
   * @returns Object with platform info and capabilities
   */
  getPlatformConfiguration() {
    const os = this.detectOS();
    
    return {
      platform: os,
      hasNativePermissionAPI: os === 'macos',
      canAutoOpenSettings: os === 'windows' || os === 'macos',
      requiresManualConfiguration: os === 'linux',
      supportedAPIs: this.getSupportedAPIs(os)
    };
  }

  /**
   * Get supported APIs for the platform
   */
  private getSupportedAPIs(platform: OSPlatform): string[] {
    const apis: string[] = ['getUserMedia'];
    
    if (platform === 'macos') {
      apis.push('systemPreferences.getMediaAccessStatus');
      apis.push('systemPreferences.askForMediaAccess');
    }
    
    if (platform === 'windows' || platform === 'macos') {
      apis.push('shell.openExternal');
    }
    
    return apis;
  }

  /**
   * Request camera permission
   * @param platform The operating system platform
   * @returns Promise resolving to true if permission granted
   */
  async requestPermission(platform: OSPlatform): Promise<boolean> {
    try {
      // For macOS, use native permission API
      if (platform === 'macos') {
        const { systemPreferences } = await import('electron');
        const status = systemPreferences.getMediaAccessStatus('camera');
        
        if (status === 'granted') {
          return true;
        }
        
        if (status === 'not-determined') {
          return await systemPreferences.askForMediaAccess('camera');
        }
        
        return false;
      }
      
      // For Windows and Linux, permissions are handled by the browser's getUserMedia
      // Return true to indicate the app can proceed with getUserMedia request
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   * @param platform The operating system platform
   * @returns Promise resolving to permission status
   */
  async getPermissionStatus(platform: OSPlatform): Promise<PermissionStatus> {
    try {
      // For macOS, check native permission status
      if (platform === 'macos') {
        const { systemPreferences } = await import('electron');
        const status = systemPreferences.getMediaAccessStatus('camera');
        
        switch (status) {
          case 'granted':
            return 'granted';
          case 'denied':
          case 'restricted':
            return 'denied';
          case 'not-determined':
            return 'not-determined';
          default:
            return 'unavailable';
        }
      }
      
      // For Windows and Linux, we can't check permission status directly
      // Return 'not-determined' to indicate getUserMedia should be attempted
      return 'not-determined';
    } catch (error) {
      console.error('Error checking permission status:', error);
      return 'unavailable';
    }
  }

  /**
   * Get platform-specific instructions for enabling camera access
   * @param platform The operating system platform
   * @returns Platform-specific instruction object
   */
  getPlatformInstructions(platform: OSPlatform): PlatformInstructions {
    const instructions = PLATFORM_INSTRUCTIONS[platform];
    
    if (!instructions) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    return instructions;
  }

  /**
   * Open system settings for camera permissions
   * @param platform The operating system platform
   */
  openSystemSettings(platform: OSPlatform): void {
    const instructions = this.getPlatformInstructions(platform);
    
    if (!instructions.canAutoOpen || !instructions.settingsPath) {
      console.warn(`Cannot auto-open settings for platform: ${platform}`);
      return;
    }
    
    try {
      shell.openExternal(instructions.settingsPath);
    } catch (error) {
      console.error('Error opening system settings:', error);
    }
  }

  /**
   * Get complete permission result with instructions
   * @param platform The operating system platform
   * @returns Promise resolving to permission result with instructions
   */
  async getPermissionResult(platform: OSPlatform): Promise<PermissionResult> {
    const status = await this.getPermissionStatus(platform);
    const granted = status === 'granted';
    
    const result: PermissionResult = {
      granted,
      status
    };
    
    // Include instructions if permission is denied or not determined
    if (status === 'denied' || status === 'not-determined') {
      result.platformInstructions = this.getPlatformInstructions(platform);
    }
    
    if (status === 'unavailable') {
      result.error = 'Camera permissions are not available on this platform';
    }
    
    return result;
  }
}

/**
 * Platform-specific instruction templates
 */
const PLATFORM_INSTRUCTIONS: Record<OSPlatform, PlatformInstructions> = {
  macos: {
    platform: 'macos',
    title: 'Enable Camera Access on macOS',
    steps: [
      'Open System Preferences (or System Settings on macOS 13+)',
      'Click on "Security & Privacy" (or "Privacy & Security")',
      'Select the "Camera" tab from the left sidebar',
      'Find this application in the list and check the box next to it',
      'If the app is not listed, try restarting the application',
      'Click the lock icon and enter your password if changes are locked'
    ],
    settingsPath: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
    canAutoOpen: true
  },
  
  windows: {
    platform: 'windows',
    title: 'Enable Camera Access on Windows',
    steps: [
      'Open Windows Settings (press Windows + I)',
      'Go to Privacy & Security > Camera',
      'Turn on "Camera access" at the top',
      'Turn on "Let apps access your camera"',
      'Scroll down and find this application in the list',
      'Toggle the switch to "On" for this application',
      'Restart the application if needed'
    ],
    settingsPath: 'ms-settings:privacy-webcam',
    canAutoOpen: true
  },
  
  linux: {
    platform: 'linux',
    title: 'Enable Camera Access on Linux',
    steps: [
      'Check if your camera is detected: run "ls /dev/video*" in terminal',
      'Ensure your user is in the "video" group: run "groups" to check',
      'If not in video group, add yourself: "sudo usermod -a -G video $USER"',
      'Log out and log back in for group changes to take effect',
      'Check camera permissions: "ls -l /dev/video0"',
      'If using Flatpak/Snap, grant camera permissions through the app store',
      'For Flatpak: "flatpak permission-set devices camera:access yes"',
      'Restart the application after making changes'
    ],
    canAutoOpen: false
  }
};
