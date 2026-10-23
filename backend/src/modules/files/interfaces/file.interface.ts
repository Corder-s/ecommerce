import { FilePurpose, FileStatus, FileVisibility } from '@prisma/client';

export { FilePurpose, FileStatus, FileVisibility };

export interface UploadIntentResponse {
  fileId: string;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  maxSizeBytes: number;
  purpose: FilePurpose;
  visibility: FileVisibility;
}

export interface FileResponse {
  id: string;
  tenantId: string | null;
  uploadedByUserId: string;
  purpose: FilePurpose;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  checksum: string | null;
  width: number | null;
  height: number | null;
  publicUrl: string | null;
  downloadUrl?: string | null;
  status: FileStatus;
  visibility: FileVisibility;
  errorMessage: string | null;
  verifiedAt: Date | null;
  attachedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedFilesResponse {
  files: FileResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
  error?: string;
}
