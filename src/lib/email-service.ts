const API = '/api/send-email';
const PASSWORD_RESET_API = '/api/send-password-reset';

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  try {
    const res = await fetch(PASSWORD_RESET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
