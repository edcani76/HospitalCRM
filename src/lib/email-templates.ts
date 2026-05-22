const BRAND = 'MediPaws Veterinary Clinic';
const BRAND_EMERALD = '#059669';
const BRAND_AMBER = '#d97706';

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;padding:24px 16px">
    <tr><td style="background:${BRAND_EMERALD};border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">🐾 ${BRAND}</h1>
      <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">Your Trusted Veterinary Partner</p>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border-left:1px solid #e7e5e4;border-right:1px solid #e7e5e4">
      ${content}
    </td></tr>
    <tr><td style="background:#fafaf9;border-radius:0 0 16px 16px;border:1px solid #e7e5e4;border-top:none;padding:20px 32px;text-align:center">
      <p style="margin:0 0 4px;font-size:12px;color:#a8a29e">${BRAND} &bull; Serving pets &amp; their families with care</p>
      <p style="margin:0;font-size:11px;color:#d6d3d1">This is an automated message. Please do not reply to this email.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<table role="presentation" style="margin:20px 0"><tr><td style="background:${BRAND_EMERALD};border-radius:12px;padding:0"><a href="${href}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px">${label}</a></td></tr></table>`;
}

export function bookingConfirmation(
  ownerName: string, petName: string, date: string, time: string, doctorName?: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">Booking Confirmed! 🎉</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, your appointment request has been received.</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${date}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Time</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${time}</td></tr>
      ${doctorName ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Doctor</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">Your booking is pending confirmation from our team. We'll notify you once it's confirmed. If you have any questions, please call us.</p>
  `);
}

export function appointmentConfirmed(
  ownerName: string, petName: string, date: string, time: string, doctorName?: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">Appointment Confirmed ✅</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, your appointment has been confirmed!</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${date}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Time</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${time}</td></tr>
      ${doctorName ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Doctor</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">Please arrive 10 minutes early. Kindly bring any relevant medical records. See you soon!</p>
  `);
}

export function appointmentCancelled(
  ownerName: string, petName: string, date: string, time: string, reason?: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#dc2626;margin:0 0 16px">Appointment Cancelled</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, the following appointment has been cancelled.</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${date}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Time</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${time}</td></tr>
      ${reason ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Reason</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#dc2626;text-align:right">${reason}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">If you'd like to reschedule, please book a new appointment through our portal or call us.</p>
  `);
}

export function appointmentReminder(
  ownerName: string, petName: string, date: string, time: string, doctorName?: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">Upcoming Appointment Reminder ⏰</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, this is a friendly reminder about your pet's appointment.</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${date}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Time</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${time}</td></tr>
      ${doctorName ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Doctor</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">Dr. ${doctorName.replace(/^Dr\.\s*/i, '')}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">Please arrive 10 minutes early. If you need to reschedule, please let us know at least 2 hours in advance.</p>
  `);
}

export function newBookingAlert(
  ownerName: string, petName: string, species: string, date: string, time: string, phone: string, doctorName?: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">New Booking Received 📋</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">A new appointment has been booked via the portal.</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Owner</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${ownerName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Phone</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${phone}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName} (${species})</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${date}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Time</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${time}</td></tr>
      ${doctorName ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Preferred Dr.</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${doctorName}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">Please review and confirm this appointment in the CRM.</p>
  `);
}

export function invoiceReceipt(
  ownerName: string, petName: string, invoiceNo: string, amount: number, status: string, paidAmount?: number
): string {
  const isPaid = status === 'paid';
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">${isPaid ? 'Payment Receipt ✅' : 'Invoice Ready 📄'}</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, ${isPaid ? 'thank you for your payment!' : 'an invoice has been generated for your pet\'s visit.'}</p>
    <table role="presentation" style="width:100%;background:#f5f5f4;border-radius:12px;padding:16px;margin:0 0 20px">
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Invoice</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${invoiceNo}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Pet</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1c1917;text-align:right">${petName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Total</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:#1c1917;text-align:right">₱${(amount || 0).toLocaleString()}</td></tr>
      ${paidAmount ? `<tr><td style="padding:4px 0;font-size:13px;color:#78716c">Amount Paid</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#059669;text-align:right">₱${paidAmount.toLocaleString()}</td></tr>` : ''}
      <tr><td style="padding:4px 0;font-size:13px;color:#78716c">Status</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:${isPaid ? '#059669' : '#d97706'};text-align:right">${status.toUpperCase()}</td></tr>
    </table>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">${isPaid ? 'A copy of your receipt is available in the portal.' : 'Please settle the balance at your earliest convenience. You can pay at the clinic or through the portal.'}</p>
  `);
}

export function passwordReset(
  ownerName: string,
  resetLink: string
): string {
  return wrap(`
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 16px">Password Reset Request</h2>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">Hi <strong>${ownerName}</strong>, we received a request to reset your password for your EdvirontVet account.</p>
    <p style="font-size:14px;color:#44403c;line-height:1.6;margin:0 0 20px">If you did not request this, please ignore this email. Your password will not be changed.</p>
    ${btn(resetLink, 'Reset Password')}
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">This link will expire in 1 hour for security reasons.</p>
    <p style="font-size:13px;color:#78716c;line-height:1.5;margin:0">If you did not request a password reset, please contact our support team immediately.</p>
  `);
}
