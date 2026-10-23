export interface HeadObjectResult {
  exists: boolean;
  contentLength?: number;
  contentType?: string;
  checksum?: string;
  metadata?: Record<string, string>;
}

export interface IObjectStorageProvider {
  /**
   * Generates a server-controlled, short-lived presigned PUT URL for direct client upload.
   */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string>;

  /**
   * Generates a short-lived presigned GET URL for authorized private file retrieval.
   */
  getPresignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Queries object metadata and existence in storage without retrieving the full body.
   */
  headObject(key: string): Promise<HeadObjectResult>;

  /**
   * Downloads the raw buffer of an uploaded object for server-side verification and inspection.
   */
  getObjectBuffer(key: string): Promise<Buffer>;

  /**
   * Safely deletes an object from storage.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Formats the public CDN URL for approved, publicly visible assets.
   */
  getPublicUrl(key: string): string;

  /**
   * Indicates whether this provider is connected to live storage infrastructure.
   */
  isLiveVerified(): boolean;
}

export const OBJECT_STORAGE_PROVIDER_TOKEN = Symbol('OBJECT_STORAGE_PROVIDER');
export const OBJECT_STORAGE_PROVIDER = 'OBJECT_STORAGE_PROVIDER';
