export async function uploadToGoogleDrive(
  file: File,
  options: { ownerName: string; petName: string; fileType?: string }
): Promise<{ fileId: string; webViewLink: string; downloadUrl: string }> {
  console.log('[GDrive] Uploading via server proxy:', file.name, file.size, 'bytes', options);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerName', options.ownerName);
  formData.append('petName', options.petName);
  if (options.fileType) {
    formData.append('fileType', options.fileType);
  }

  const response = await fetch('/api/upload-to-drive', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GDrive] Server upload failed:', error);
    throw new Error(error.message || 'Upload failed');
  }

  const result = await response.json();
  console.log('[GDrive] Server upload successful:', result.data);

  return {
    fileId: result.data.fileId,
    webViewLink: result.data.webViewLink,
    downloadUrl: result.data.downloadUrl,
  };
}

export async function getGoogleDriveLink(fileId: string): Promise<string> {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  console.log('[GDrive] Delete not yet supported via server proxy for file:', fileId);
}

export async function listGoogleDriveFiles(folderId?: string): Promise<any[]> {
  console.log('[GDrive] List not yet supported via server proxy');
  return [];
}

export default {
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  listGoogleDriveFiles,
  getGoogleDriveLink,
};
