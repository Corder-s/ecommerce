import { CloudflareR2Provider } from './cloudflare-r2.provider';
import { S3Client } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://mocked-signed-url.r2.cloudflarestorage.com/test'),
}));

describe('CloudflareR2Provider', () => {
  let provider: CloudflareR2Provider;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (S3Client as unknown as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    provider = new CloudflareR2Provider({
      endpoint: 'https://test-account.r2.cloudflarestorage.com',
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      publicAssetsBaseUrl: 'https://media.gaushilp.com',
    });
  });

  it('should initialize S3Client and report live verified', () => {
    expect(provider.isLiveVerified()).toBe(true);
  });

  it('should format public CDN URLs correctly', () => {
    const url = provider.getPublicUrl('tenants/store-1/product_image/diya.png');
    expect(url).toBe('https://media.gaushilp.com/tenants/store-1/product_image/diya.png');
  });

  it('should generate presigned upload and download URLs', async () => {
    const uploadUrl = await provider.getPresignedUploadUrl('key.png', 'image/png', 900);
    expect(uploadUrl).toBe('https://mocked-signed-url.r2.cloudflarestorage.com/test');

    const downloadUrl = await provider.getPresignedDownloadUrl('key.png', 300);
    expect(downloadUrl).toBe('https://mocked-signed-url.r2.cloudflarestorage.com/test');
  });

  it('should return exists: true on successful headObject', async () => {
    mockSend.mockResolvedValueOnce({
      ContentLength: 5000,
      ContentType: 'image/png',
      ETag: '"test-etag"',
    });

    const res = await provider.headObject('test.png');
    expect(res.exists).toBe(true);
    expect(res.contentLength).toBe(5000);
    expect(res.contentType).toBe('image/png');
    expect(res.checksum).toBe('test-etag');
  });

  it('should return exists: false on 404 NotFound error in headObject', async () => {
    const err = new Error('NotFound');
    err.name = 'NotFound';
    (err as any).$metadata = { httpStatusCode: 404 };
    mockSend.mockRejectedValueOnce(err);

    const res = await provider.headObject('nonexistent.png');
    expect(res.exists).toBe(false);
  });

  it('should execute deleteObject command successfully', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(provider.deleteObject('test.png')).resolves.not.toThrow();
    expect(mockSend).toHaveBeenCalled();
  });
});
