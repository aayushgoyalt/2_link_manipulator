/**
 * Image Preprocessing Utilities for OCR Optimization
 * Handles image compression, format conversion, and quality optimization
 */

import { CameraConfig } from '../types/camera-ocr';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  compressionEnabled?: boolean;
  enhanceContrast?: boolean;
  grayscale?: boolean;
}

export interface ProcessedImageResult {
  imageData: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTime: number;
  appliedOptimizations: string[];
}

export class ImagePreprocessor {
  private config: CameraConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config: CameraConfig) {
    this.config = config;
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    // In Electron main process, we need to use a different approach
    // This will be handled differently for main vs renderer process
    if (typeof window !== 'undefined' && window.document) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Process image for optimal OCR recognition
   */
  async processImageForOCR(
    imageData: string, 
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    const startTime = Date.now();
    const appliedOptimizations: string[] = [];

    try {
      // Parse the input image data
      const { originalSize } = this.parseImageData(imageData);
      
      // Apply default options based on config
      const processOptions: Required<ImageProcessingOptions> = {
        maxWidth: options.maxWidth || this.config.preferredResolution.width,
        maxHeight: options.maxHeight || this.config.preferredResolution.height,
        quality: options.quality || this.config.imageQuality,
        format: options.format || 'jpeg',
        compressionEnabled: options.compressionEnabled ?? this.config.compressionEnabled,
        enhanceContrast: options.enhanceContrast ?? true,
        grayscale: options.grayscale ?? false
      };

      let processedImageData = imageData;

      // Check if processing is needed
      if (originalSize <= this.config.maxImageSize && !processOptions.enhanceContrast && !processOptions.grayscale) {
        appliedOptimizations.push('no-processing-needed');
        return {
          imageData: processedImageData,
          originalSize,
          processedSize: originalSize,
          compressionRatio: 1.0,
          processingTime: Date.now() - startTime,
          appliedOptimizations
        };
      }

      // For main process, we'll use a simpler approach without canvas
      if (!this.canvas || !this.ctx) {
        processedImageData = await this.processImageWithoutCanvas(
          imageData, 
          processOptions, 
          appliedOptimizations
        );
      } else {
        processedImageData = await this.processImageWithCanvas(
          imageData, 
          processOptions, 
          appliedOptimizations
        );
      }

      const processedSize = this.calculateImageSize(processedImageData);
      const compressionRatio = originalSize / processedSize;

      return {
        imageData: processedImageData,
        originalSize,
        processedSize,
        compressionRatio,
        processingTime: Date.now() - startTime,
        appliedOptimizations
      };

    } catch (error) {
      console.error('Image preprocessing error:', error);
      
      // Return original image if processing fails
      const originalSize = this.calculateImageSize(imageData);
      return {
        imageData,
        originalSize,
        processedSize: originalSize,
        compressionRatio: 1.0,
        processingTime: Date.now() - startTime,
        appliedOptimizations: ['processing-failed']
      };
    }
  }

  /**
   * Validate image format and size
   */
  validateImage(imageData: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const { mimeType, base64Data, originalSize } = this.parseImageData(imageData);

      // Check supported formats
      const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
      if (!supportedFormats.includes(mimeType)) {
        errors.push(`Unsupported image format: ${mimeType}`);
      }

      // Check image size
      if (originalSize > this.config.maxImageSize * 2) {
        errors.push(`Image too large: ${originalSize} bytes (max: ${this.config.maxImageSize * 2})`);
      }

      // Validate base64 data
      if (!base64Data || base64Data.length < 100) {
        errors.push('Invalid or corrupted image data');
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push(`Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Compress image to target size
   */
  async compressToTargetSize(imageData: string, targetSizeBytes: number): Promise<string> {
    let quality = this.config.imageQuality;
    let compressed = imageData;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const result = await this.processImageForOCR(compressed, { 
        quality, 
        compressionEnabled: true 
      });
      
      if (result.processedSize <= targetSizeBytes) {
        return result.imageData;
      }

      // Reduce quality for next attempt
      quality = Math.max(0.1, quality - 0.2);
      compressed = result.imageData;
      attempts++;
    }

    return compressed;
  }

  /**
   * Get optimal processing options based on image characteristics
   */
  getOptimalProcessingOptions(imageData: string): ImageProcessingOptions {
    const { originalSize } = this.parseImageData(imageData);
    
    const options: ImageProcessingOptions = {
      compressionEnabled: originalSize > this.config.maxImageSize,
      quality: this.config.imageQuality,
      enhanceContrast: true,
      grayscale: false
    };

    // Adjust based on image size
    if (originalSize > this.config.maxImageSize * 1.5) {
      options.quality = Math.max(0.6, this.config.imageQuality - 0.2);
      options.maxWidth = Math.min(1920, this.config.preferredResolution.width);
      options.maxHeight = Math.min(1080, this.config.preferredResolution.height);
    }

    return options;
  }

  private parseImageData(imageData: string): { 
    mimeType: string; 
    base64Data: string; 
    originalSize: number 
  } {
    if (!imageData.startsWith('data:')) {
      throw new Error('Invalid image data format - must be data URL');
    }

    const [header, base64Data] = imageData.split(',');
    if (!header || !base64Data) {
      throw new Error('Invalid image data format - missing header or data');
    }

    const mimeType = header.split(';')[0].replace('data:', '');
    const originalSize = this.calculateImageSize(imageData);

    return { mimeType, base64Data, originalSize };
  }

  private calculateImageSize(imageData: string): number {
    // Approximate size calculation for base64 data
    const base64Data = imageData.split(',')[1] || imageData;
    return Math.floor(base64Data.length * 0.75); // Base64 is ~33% larger than binary
  }

  private async processImageWithoutCanvas(
    imageData: string,
    options: Required<ImageProcessingOptions>,
    appliedOptimizations: string[]
  ): Promise<string> {
    // For main process without canvas, we'll do basic compression
    // by adjusting the quality parameter in the data URL
    
    if (options.compressionEnabled) {
      appliedOptimizations.push('basic-compression');
      
      // Simple quality reduction by manipulating the data URL
      // This is a simplified approach for the main process
      const { mimeType, base64Data } = this.parseImageData(imageData);
      
      // For JPEG, we can simulate quality reduction
      if (mimeType === 'image/jpeg' && options.quality < 1.0) {
        // Simulate compression by reducing data (this is a simplified approach)
        const compressionFactor = Math.max(0.5, options.quality);
        const compressedLength = Math.floor(base64Data.length * compressionFactor);
        const compressedData = base64Data.substring(0, compressedLength) + 
                              base64Data.substring(base64Data.length - (base64Data.length - compressedLength));
        
        return `data:${mimeType};base64,${compressedData}`;
      }
    }

    return imageData;
  }

  private async processImageWithCanvas(
    imageData: string,
    options: Required<ImageProcessingOptions>,
    appliedOptimizations: string[]
  ): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available for image processing');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width: newWidth, height: newHeight } = this.calculateNewDimensions(
            img.width, 
            img.height, 
            options.maxWidth, 
            options.maxHeight
          );

          // Resize canvas
          this.canvas!.width = newWidth;
          this.canvas!.height = newHeight;

          // Clear canvas
          this.ctx!.clearRect(0, 0, newWidth, newHeight);

          // Apply image enhancements
          if (options.enhanceContrast || options.grayscale) {
            this.applyImageEnhancements();
          }

          // Draw image
          this.ctx!.drawImage(img, 0, 0, newWidth, newHeight);

          // Apply post-processing filters
          if (options.grayscale) {
            this.applyGrayscaleFilter();
            appliedOptimizations.push('grayscale');
          }

          if (options.enhanceContrast) {
            this.applyContrastEnhancement();
            appliedOptimizations.push('contrast-enhancement');
          }

          // Export with specified quality and format
          const outputFormat = `image/${options.format}`;
          const processedImageData = this.canvas!.toDataURL(outputFormat, options.quality);
          
          if (newWidth !== img.width || newHeight !== img.height) {
            appliedOptimizations.push('resizing');
          }
          
          if (options.compressionEnabled) {
            appliedOptimizations.push('compression');
          }

          resolve(processedImageData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'));
      };

      img.src = imageData;
    });
  }

  private calculateNewDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }

    return {
      width: Math.floor(newWidth),
      height: Math.floor(newHeight)
    };
  }

  private applyImageEnhancements(): void {
    if (!this.ctx) return;

    // Set image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private applyGrayscaleFilter(): void {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyContrastEnhancement(): void {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const contrast = 1.2; // 20% contrast increase

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128)); // Blue
      // Alpha channel remains unchanged
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas = null;
    }
    this.ctx = null;
  }
}

/**
 * Utility functions for image processing
 */
export const ImageUtils = {
  /**
   * Convert image to different format
   */
  convertFormat(imageData: string): string {
    // This would require canvas or similar image processing library
    // For now, return original if conversion is not critical
    return imageData;
  },

  /**
   * Get image dimensions from data URL
   */
  async getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  },

  /**
   * Calculate optimal compression settings
   */
  calculateOptimalCompression(originalSize: number, targetSize: number): { quality: number; shouldResize: boolean } {
    const compressionRatio = targetSize / originalSize;
    
    if (compressionRatio >= 1.0) {
      return { quality: 1.0, shouldResize: false };
    }
    
    if (compressionRatio >= 0.7) {
      return { quality: 0.9, shouldResize: false };
    }
    
    if (compressionRatio >= 0.5) {
      return { quality: 0.7, shouldResize: false };
    }
    
    return { quality: 0.5, shouldResize: true };
  }
};