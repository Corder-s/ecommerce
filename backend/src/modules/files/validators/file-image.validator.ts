import { Injectable, Logger } from '@nestjs/common';
import { FilePurpose, ImageValidationResult } from '../interfaces/file.interface';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export function createSharp(input?: unknown, options?: unknown): any {
  return sharp(input, options);
}

export const MAX_FILE_SIZE_BYTES: Record<FilePurpose, number> = {
  [FilePurpose.STORE_LOGO]: 2 * 1024 * 1024, // 2MB
  [FilePurpose.STORE_BANNER]: 5 * 1024 * 1024, // 5MB
  [FilePurpose.PRODUCT_IMAGE]: 10 * 1024 * 1024, // 10MB
  [FilePurpose.PRIVATE_DOCUMENT]: 20 * 1024 * 1024, // 20MB
};

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class FileImageValidator {
  private readonly logger = new Logger(FileImageValidator.name);

  /**
   * Verifies magic bytes to prevent file extension spoofing and executable uploads.
   */
  hasValidImageMagicBytes(buffer: Buffer): { isValid: boolean; detectedFormat?: string } {
    if (!buffer || buffer.length < 12) {
      return { isValid: false };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, detectedFormat: 'jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, detectedFormat: 'png' };
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { isValid: true, detectedFormat: 'webp' };
    }

    return { isValid: false };
  }

  /**
   * Validates image binary integrity, format, and dimensions using Sharp.
   */
  async validateImageContent(
    buffer: Buffer,
    expectedMimeType?: string,
  ): Promise<ImageValidationResult> {
    // 1. Magic bytes check
    const magicCheck = this.hasValidImageMagicBytes(buffer);
    if (!magicCheck.isValid) {
      return {
        isValid: false,
        error:
          'Security rejection: Uploaded file does not contain valid image binary signatures (magic bytes mismatch). Arbitrary or executable files are prohibited.',
      };
    }

    // 2. Parse using Sharp
    try {
      const metadata = await createSharp(buffer).metadata();

      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
        return {
          isValid: false,
          error: `Unsupported image format detected: "${metadata.format}". Only JPEG, PNG, and WebP are allowed.`,
        };
      }

      // Check format matches expected MIME if provided
      if (expectedMimeType) {
        const mimeFormat = expectedMimeType.replace('image/', '').replace('jpg', 'jpeg');
        if (metadata.format !== mimeFormat) {
          return {
            isValid: false,
            error: `Content-Type mismatch: Declared "${expectedMimeType}" but actual binary content is "${metadata.format}".`,
          };
        }
      }

      // Dimension checks
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width < 10 || height < 10) {
        return {
          isValid: false,
          error: `Image dimensions too small: ${width}x${height}px. Minimum required is 10x10px.`,
        };
      }

      if (width > 8000 || height > 8000) {
        return {
          isValid: false,
          error: `Image dimensions exceed allowed limit: ${width}x${height}px. Maximum allowed is 8000x8000px.`,
        };
      }

      return {
        isValid: true,
        format: metadata.format as 'jpeg' | 'png' | 'webp',
        width,
        height,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Sharp validation failed for image buffer: ${message}`);
      return {
        isValid: false,
        error: `Malformed or corrupted image binary: ${message}`,
      };
    }
  }

  /**
   * Validates file size for a given purpose.
   */
  validateFileSize(
    purpose: FilePurpose,
    sizeBytes: number,
  ): { isValid: boolean; maxAllowed: number } {
    const maxAllowed = MAX_FILE_SIZE_BYTES[purpose] || 10 * 1024 * 1024;
    return {
      isValid: sizeBytes > 0 && sizeBytes <= maxAllowed,
      maxAllowed,
    };
  }
}
