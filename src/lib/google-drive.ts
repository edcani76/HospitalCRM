// Google Drive API integration using personal account (OAuth2)
// This uses the browser-based OAuth2 flow with your Google account

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/documents?version=v3';

// Scopes needed for file upload and sharing
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Create/upload files
  'https://www.googleapis.com/auth/drive.readonly' // Read files
];

// Your OAuth2 client ID (from Google Cloud Console)
// You need to create OAuth2 credentials in Google Cloud Console
// and add your domain to authorized JavaScript origins
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.GOOGLE_API_KEY || '';

interface GoogleDriveHelper {
  uploadFile: (file: File, folderPath?: string) => Promise<{ fileId: string; webViewLink: string; downloadUrl: string }>;
  deleteFile: (fileId: string) => Promise<void>;
  listFiles: (folderId?: string) => Promise<any[]>;
  getFileLink: (fileId: string) => Promise<string>;
}

let gapiInited = false;
let gapiIniting = false;
let auth2Inited = false;

// Initialize Google API client
async function initGoogleApi(): Promise<void> {
  if (gapiInited) return;
  if (gapiIniting) return new Promise(resolve => {
    const check = setInterval(() => {
      if (gapiInited) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  gapiIniting = true;

  return new Promise((resolve, reject) => {
    // Load Google API client library
    if (!(window as any).gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => initializeGapi(resolve, reject);
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      initializeGapi(resolve, reject);
    }
  });
}

function initializeGapi(resolve: () => void, reject: (error: any) => void) {
  const gapi = (window as any).gapi;
  
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      gapiInited = true;
      gapiIniting = false;
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Initialize Google Auth2
async function initGoogleAuth(): Promise<void> {
  if (auth2Inited) return;
  
  return new Promise((resolve, reject) => {
    const gapi = (window as any).gapi;
    
    gapi.load('auth2', () => {
      gapi.auth2.init({
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
      }).then(
        () => {
          auth2Inited = true;
          resolve();
        },
        (error: any) => reject(error)
      );
    });
  });
}

// Check if user is signed in
async function ensureSignedIn(): Promise<boolean> {
  const gapi = (window as any).gapi;
  
  await initGoogleApi();
  await initGoogleAuth();
  
  const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
  if (!isSignedIn) {
    await gapi.auth2.getAuthInstance().signIn();
  }
  return true;
}

// Upload file to Google Drive
export async function uploadToGoogleDrive(
  file: File,
  folderPath: string = 'VetCRM_Uploads'
): Promise<{ fileId: string; webViewLink: string; downloadUrl: string }> {
  await ensureSignedIn();
  
  const gapi = (window as any).gapi;
  
  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:*;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  
  // Upload file metadata
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [] // Add folder ID if you create a folder
  };
  
  // Upload using multipart upload
  const boundary = '-------3141592653589793238462643383279502884197169399375105820974944592';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const close_delim = '\r\n--' + boundary + '--';
  
  const multipartRequestBody =
    delimiter +
    '\r\nContent-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    '\r\nContent-Type: ' + file.type + '\r\n' +
    '\r\n' +
    atob(base64Data) + // This is simplified - in reality you'd use the binary data
    close_delim;
  
  // Use the Drive API to upload
  // Note: This is a simplified version. For production, use proper multipart upload
  // For simplicity, we'll use the REST API directly with fetch
  
  const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
  
  // Create form data for upload
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);
  
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error?.message || response.statusText}`);
  }
  
  const result = await response.json();
  const fileId = result.id;
  
  // Make file shareable (anyone with link can view)
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      })
    }
  );
  
  // Get file metadata with web view link
  const fileData = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );
  
  const fileInfo = await fileData.json();
  
  return {
    fileId: fileInfo.id,
    webViewLink: fileInfo.webViewLink || '',
    downloadUrl: fileInfo.webContentLink || ''
  };
}

// Delete file from Google Drive
export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  await ensureSignedIn();
  
  const gapi = (window as any).gapi;
  const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

// List files from Google Drive
export async function listGoogleDriveFiles(folderId?: string): Promise<any[]> {
  await ensureSignedIn();
  
  const gapi = (window as any).gapi;
  const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
  
  let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,createdTime)';
  if (folderId) {
    url += `&q='${folderId}' in parents`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to list files');
  }
  
  const data = await response.json();
  return data.files || [];
}

// Get shareable link for a file
export async function getGoogleDriveLink(fileId: string): Promise<string> {
  await ensureSignedIn();
  
  const gapi = (window as any).gapi;
  const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );
  
  const data = await response.json();
  return data.webViewLink || data.webContentLink || '';
}

export default {
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  listGoogleDriveFiles,
  getGoogleDriveLink
};
