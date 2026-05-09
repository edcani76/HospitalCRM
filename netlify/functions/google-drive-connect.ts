import type { Handler, HandlerEvent } from '@netlify/functions';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';

const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  // Determine the callback URL based on the request
  const host = event.headers.host || '';
  const referer = event.headers.referer || '';
  
  // Extract origin from referer or construct from host
  let origin = '';
  if (referer) {
    const url = new URL(referer);
    origin = `${url.protocol}//${url.host}`;
  } else {
    origin = `https://${host}`;
  }
  
  const callbackUrl = `${origin}/.netlify/functions/google-drive-callback`;
  
  console.log('[GDrive Connect] Origin:', origin);
  console.log('[GDrive Connect] Callback URL:', callbackUrl);

  // Build the Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('[GDrive Connect] Redirecting to:', authUrl.toString());

  return {
    statusCode: 302,
    headers: {
      'Location': authUrl.toString(),
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
};

export { handler };