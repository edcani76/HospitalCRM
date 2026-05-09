import type { Handler, HandlerEvent } from '@netlify/functions';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

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

  const queryParams = event.queryStringParameters || {};
  const code = queryParams.code;
  const error = queryParams.error;

  // Extract origin from the request
  const host = event.headers.host || '';
  const referer = event.headers.referer || '';
  
  let origin = '';
  if (referer) {
    const url = new URL(referer);
    origin = `${url.protocol}//${url.host}`;
  } else {
    origin = `https://${host}`;
  }

  const frontendUrl = `${origin}/crm/settings`;

  console.log('[GDrive Callback] Origin:', origin);
  console.log('[GDrive Callback] Frontend URL:', frontendUrl);
  console.log('[GDrive Callback] Error:', error);
  console.log('[GDrive Callback] Has code:', !!code);

  if (error) {
    const errorMessages: Record<string, string> = {
      access_denied: 'access_denied',
      invalid_request: 'invalid_request',
    };
    return {
      statusCode: 302,
      headers: {
        'Location': `${frontendUrl}?drive_error=${errorMessages[error] || error}`,
      },
      body: '',
    };
  }

  if (!code) {
    return {
      statusCode: 302,
      headers: {
        'Location': `${frontendUrl}?drive_error=no_code`,
      },
      body: '',
    };
  }

  // Construct the callback URL that was used in the connect step
  const callbackUrl = `${origin}/.netlify/functions/google-drive-callback`;

  console.log('[GDrive Callback] Exchanging code with redirect_uri:', callbackUrl);

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[GDrive Callback] Token exchange failed:', errText);
      return {
        statusCode: 302,
        headers: {
          'Location': `${frontendUrl}?drive_error=token_failed`,
        },
        body: '',
      };
    }

    const tokenData = await tokenResponse.json();
    console.log('[GDrive Callback] Refresh token received');

    return {
      statusCode: 302,
      headers: {
        'Location': `${frontendUrl}?drive_success=true&refresh_token=${tokenData.refresh_token}`,
      },
      body: '',
    };
  } catch (err) {
    console.error('[GDrive Callback] Token exchange error:', err);
    return {
      statusCode: 302,
      headers: {
        'Location': `${frontendUrl}?drive_error=exchange_failed`,
      },
      body: '',
    };
  }
};

export { handler };