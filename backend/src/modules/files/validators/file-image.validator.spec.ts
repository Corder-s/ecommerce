import { FileImageValidator, MAX_FILE_SIZE_BYTES, createSharp } from './file-image.validator';
import { FilePurpose } from '../interfaces/file.interface';

describe('FileImageValidator', () => {
  let validator: FileImageValidator;
  let validPngBuffer: Buffer;
  let validJpegBuffer: Buffer;
  let validWebpBuffer: Buffer;

  beforeAll(async () => {
    validator = new FileImageValidator();

    [validPngBuffer, validJpegBuffer, validWebpBuffer] = await Promise.all([
      createSharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 120, b: 0 },
        },
      })
        .png()
        .toBuffer(),
      createSharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 0, g: 120, b: 255 },
        },
      })
        .jpeg()
        .toBuffer(),
      createSharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 50, g: 200, b: 50 },
        },
      })
        .webp()
        .toBuffer(),
    ]);
  });

  describe('hasValidImageMagicBytes', () => {
    it('should detect valid JPEG magic bytes', () => {
      const res = validator.hasValidImageMagicBytes(validJpegBuffer);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('jpeg');
    });

    it('should detect valid PNG magic bytes', () => {
      const res = validator.hasValidImageMagicBytes(validPngBuffer);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('png');
    });

    it('should detect valid WebP magic bytes', () => {
      const res = validator.hasValidImageMagicBytes(validWebpBuffer);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('webp');
    });

    it('should reject Windows PE/DOS executable binary header (MZ)', () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00', 'binary');
      const res = validator.hasValidImageMagicBytes(exeBuffer);
      expect(res.isValid).toBe(false);
    });

    it('should reject Linux ELF binary header', () => {
      const elfBuffer = Buffer.from('\x7FELF\x02\x01\x01\x00\x00\x00\x00\x00', 'binary');
      const res = validator.hasValidImageMagicBytes(elfBuffer);
      expect(res.isValid).toBe(false);
    });

    it('should reject HTML / script files disguised as images', () => {
      const htmlBuffer = Buffer.from('<html><script>alert("hack")</script></html>');
      const res = validator.hasValidImageMagicBytes(htmlBuffer);
      expect(res.isValid).toBe(false);
    });
  });

  describe('validateImageContent', () => {
    it('should validate valid PNG binary and return dimensions', async () => {
      const res = await validator.validateImageContent(validPngBuffer, 'image/png');
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('png');
      expect(res.width).toBe(200);
      expect(res.height).toBe(200);
    });

    it('should validate valid JPEG binary', async () => {
      const res = await validator.validateImageContent(validJpegBuffer, 'image/jpeg');
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('jpeg');
      expect(res.width).toBe(200);
    });

    it('should validate valid WebP binary', async () => {
      const res = await validator.validateImageContent(validWebpBuffer, 'image/webp');
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('webp');
    });

    it('should reject Content-Type mismatch (declared png, but buffer is jpeg)', async () => {
      const res = await validator.validateImageContent(validJpegBuffer, 'image/png');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Content-Type mismatch');
    });

    it('should reject images with dimensions below minimum threshold (<10px)', async () => {
      const tinyBuffer = await createSharp({
        create: {
          width: 5,
          height: 5,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const res = await validator.validateImageContent(tinyBuffer, 'image/png');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Image dimensions too small');
    });

    it('should reject corrupted / malformed image buffers', async () => {
      // Start with valid PNG magic bytes but corrupt the rest
      const corrupted = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
        0xff,
      ]);
      const res = await validator.validateImageContent(corrupted);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Malformed or corrupted image');
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid sizes within purpose limits', () => {
      const resLogo = validator.validateFileSize(FilePurpose.STORE_LOGO, 1024 * 1024);
      expect(resLogo.isValid).toBe(true);

      const resProd = validator.validateFileSize(FilePurpose.PRODUCT_IMAGE, 5 * 1024 * 1024);
      expect(resProd.isValid).toBe(true);
    });

    it('should reject files exceeding purpose limits', () => {
      // Logo max is 2MB, test 3MB
      const resLogo = validator.validateFileSize(FilePurpose.STORE_LOGO, 3 * 1024 * 1024);
      expect(resLogo.isValid).toBe(false);
      expect(resLogo.maxAllowed).toBe(MAX_FILE_SIZE_BYTES[FilePurpose.STORE_LOGO]);

      // Product image max is 10MB, test 11MB
      const resProd = validator.validateFileSize(FilePurpose.PRODUCT_IMAGE, 11 * 1024 * 1024);
      expect(resProd.isValid).toBe(false);
    });

    it('should reject empty files (0 bytes)', () => {
      const res = validator.validateFileSize(FilePurpose.PRODUCT_IMAGE, 0);
      expect(res.isValid).toBe(false);
    });
  });
});
