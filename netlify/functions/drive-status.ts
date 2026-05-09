import type { Handler, HandlerEvent } from '@netlify/functions';

const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
const GOOGLE_DRIVE_FOLDER_ID = process.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '';

const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const hasRefreshToken = !!GOOGLE_DRIVE_REFRESH_TOKEN;
    const hasFolder = !!GOOGLE_DRIVE_FOLDER_ID;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        connected: hasRefreshToken,
        hasFolder,
        folderId: GOOGLE_DRIVE_FOLDER_ID || null,
      }),
    };
  } catch (error) {
    console.error('[Drive Status] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get drive status' }),
    };
  }
};

export { handler };