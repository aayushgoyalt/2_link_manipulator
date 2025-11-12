/**
 * Image Upload Handler Service
 * Handles file selection, validation, and reading for image upload functionality
 */

import { dialog } from 'electron';
import { promises as fs } from 'fs';
import { extname } from 'path';
import imageSizeLib from 'image-size';

// Handle both ESM and CommonJS exports
const imageSize = typeof imageSizeLib === 'function' ? imageSizeLib : imageSizeLib.default;
import type {
  ImageUploadHandler as IImageUploadHandler,
  ImageValidationResult,
  ImageFileInfo
} from '../types/camera-ocr';

export class ImageUploadHandler implements IImageUploadHandler {
  private static instance: ImageUploadHandler;
  
  // Configuration constants
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_WIDTH = 100;
  private readonly MIN_HEIGHT = 100;
  private readonly MAX_WIDTH = 4096;
  private readonly MAX_HEIGHT = 4096;
  
  private readonly SUPPORTED_FORMATS: readonly string[] = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ];
  
  private readonly EXTENSION_TO_MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ImageUploadHandler {
    if (!ImageUploadHandler.instance) {
      ImageUploadHandler.instance = new ImageUploadHandler();
    }
    return ImageUploadHandler.instance;
  }

  /**
   * Open native file picker dialog
   * @returns Promise resolving to selected file path or null if cancelled
   */
  async openFileDialog(): Promise<string | null> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Image with Math Expression',
        buttonLabel: 'Select Image',
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ],
        properties: ['openFile']
      });

      // Return null if user cancelled
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Error opening file dialog:', error);
      throw new Error(`Failed to open file dialog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate image file format, size, and dimensions
   * @param filePath Path to the image file
   * @returns Promise resolving to validation result
   */
  async validateImageFile(filePath: string): Promise<ImageValidationResult> {
    const errors: string[] = [];
    
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        errors.push('File does not exist or is not accessible');
        return { isValid: false, errors };
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Validate file size
      if (stats.size === 0) {
        errors.push('File is empty');
      } else if (stats.size > this.MAX_FILE_SIZE) {
        errors.push(`File size (${this.formatFileSize(stats.size)}) exceeds maximum allowed size (${this.formatFileSize(this.MAX_FILE_SIZE)})`);
      }

      // Validate file format by extension
      const extension = extname(filePath).toLowerCase();
      const mimeType = this.EXTENSION_TO_MIME[extension];
      
      if (!mimeType) {
        errors.push(`Unsupported file format: ${extension}. Supported formats: PNG, JPEG, JPG, WEBP`);
      } else if (!this.SUPPORTED_FORMATS.includes(mimeType)) {
        errors.push(`File format ${extension} is not supported`);
      }

      // If there are errors so far, return early
      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      // Validate image dimensions
      let dimensions: { width: number; height: number } | undefined;
      try {
        const buffer = await fs.readFile(filePath);
        const size = imageSize(buffer);
        
        if (!size.width || !size.height) {
          errors.push('Could not determine image dimensions');
        } else {
          dimensions = {
            width: size.width,
            height: size.height
          };

          // Check minimum dimensions
          if (size.width < this.MIN_WIDTH || size.height < this.MIN_HEIGHT) {
            errors.push(`Image dimensions (${size.width}x${size.height}) are too small. Minimum: ${this.MIN_WIDTH}x${this.MIN_HEIGHT}`);
          }

          // Check maximum dimensions
          if (size.width > this.MAX_WIDTH || size.height > this.MAX_HEIGHT) {
            errors.push(`Image dimensions (${size.width}x${size.height}) are too large. Maximum: ${this.MAX_WIDTH}x${this.MAX_HEIGHT}`);
          }
        }
      } catch (error) {
        errors.push(`Failed to read image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Build file info if validation passed
      const fileInfo: ImageFileInfo | undefined = errors.length === 0 && dimensions ? {
        size: stats.size,
        format: mimeType!,
        dimensions,
        path: filePath
      } : undefined;

      return {
        isValid: errors.length === 0,
        errors,
        fileInfo
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Read image file and convert to base64 data URL
   * @param filePath Path to the image file
   * @returns Promise resolving to base64 data URL
   */
  async readImageAsBase64(filePath: string): Promise<string> {
    try {
      // Read file as buffer
      const buffer = await fs.readFile(filePath);
      
      // Get MIME type from extension
      const extension = extname(filePath).toLowerCase();
      const mimeType = this.EXTENSION_TO_MIME[extension];
      
      if (!mimeType) {
        throw new Error(`Unsupported file format: ${extension}`);
      }

      // Convert buffer to base64
      const base64 = buffer.toString('base64');
      
      // Create data URL
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return dataUrl;
    } catch (error) {
      console.error('Error reading image file:', error);
      throw new Error(`Failed to read image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of supported image formats
   * @returns Array of supported MIME types
   */
  getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * Format file size for display
   * @param bytes File size in bytes
   * @returns Formatted string (e.g., "2.5 MB")
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
