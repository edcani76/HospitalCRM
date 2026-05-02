import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadResult {
  fileUrl: string;
  storagePath: string;
  fileName: string;
  fileType: string;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - Storage path (e.g., `encounters/{encounterId}/files/{fileName}`)
 * @returns Upload result with download URL
 */
export async function uploadFile(
  file: File,
  path: string
): Promise<UploadResult> {
  try {
    const storageRef = ref(storage, path);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    
    return {
      fileUrl: downloadUrl,
      storagePath: path,
      fileName: file.name,
      fileType: getFileType(file.name)
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 * @param path - Storage path to delete
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get file type from file name
 */
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
