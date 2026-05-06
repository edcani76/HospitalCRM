import { uploadToGoogleDrive } from './google-drive';

export interface UploadResult {
  fileUrl: string;
  fileId: string;
  fileName: string;
  fileType: string;
}

export async function uploadFile(
  file: File,
  path: string
): Promise<UploadResult> {
  const paths = path.split('/').filter(Boolean);
  const ownerName = paths[0] || 'Unknown';
  const petName = paths[1] || 'files';
  const fileType = paths[2] || 'files';

  const result = await uploadToGoogleDrive(file, { ownerName, petName, fileType });

  return {
    fileUrl: result.downloadUrl || result.webViewLink,
    fileId: result.fileId,
    fileName: file.name,
    fileType: getFileType(file.name),
  };
}

export async function deleteFile(fileId: string): Promise<void> {
  console.log('[File Upload] Delete not yet supported for Google Drive files:', fileId);
}

export function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: { [key: string]: string } = {
    'pdf': 'pdf',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'doc': 'document',
    'docx': 'document',
    'xls': 'document',
    'xlsx': 'document'
  };
  return typeMap[ext || ''] || 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
