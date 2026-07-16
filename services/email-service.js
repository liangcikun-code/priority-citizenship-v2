/**
 * Email Notification Service
 * Infrastructure ready for SendGrid / Resend / SMTP.
 * Set EMAIL_PROVIDER env var to 'sendgrid', 'resend', or 'smtp'.
 */
const https = require('https');
const store = require('./data-store');

const PROVIDER = process.env.EMAIL_PROVIDER || 'none';

/**
 * Send email using configured provider.
 */
async function sendEmail({ to, subject, html }) {
  const settings = store.getSettings();

  switch (PROVIDER) {
    case 'sendgrid':
      return sendViaSendGrid({ to, subject, html }, settings);
    case 'resend':
      return sendViaResend({ to, subject, html }, settings);
    case 'smtp':
      return sendViaSMTP({ to, subject, html }, settings);
    default:
      console.log(`[email] Would send to ${to}: "${subject}" (provider not configured)`);
      return { sent: false, reason: 'No email provider configured. Set EMAIL_PROVIDER env var.' };
  }
}

function sendViaSendGrid({ to, subject, html }, settings) {
  const apiKey = process.env.SENDGRID_API_KEY || settings.smtp?.pass;
  if (!apiKey) return Promise.resolve({ sent: false, reason: 'SENDGRID_API_KEY not set' });

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: settings.smtp?.fromEmail || 'noreply@prioritycitizenship.vu', name: 'Priority Citizenship' },
      subject, content: [{ type: 'text/html', value: html }]
    });
    const req = https.request({
      hostname: 'api.sendgrid.com', path: '/v3/mail/send', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ sent: res.statusCode === 202, status: res.statusCode, body: d }));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function sendViaResend({ to, subject, html }, settings) {
  const apiKey = process.env.RESEND_API_KEY || settings.smtp?.pass;
  if (!apiKey) return Promise.resolve({ sent: false, reason: 'RESEND_API_KEY not set' });

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: `${settings.site?.name || 'Priority Citizenship'} <${settings.smtp?.fromEmail || 'noreply@prioritycitizenship.vu'}>`,
      to: [to], subject, html
    });
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ sent: res.statusCode === 200, status: res.statusCode, body: d }));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function sendViaSMTP({ to, subject, html }, settings) {
  // SMTP requires a TCP library (nodemailer); placeholder for dedicated server setup
  return Promise.resolve({ sent: false, reason: 'SMTP not available on serverless. Use SendGrid or Resend.' });
}

/**
 * Send lead notification to admin.
 */
async function notifyNewLead(lead) {
  const settings = store.getSettings();
  if (!settings.notifications?.newLeadEmail) return;
  const adminEmail = settings.notifications?.adminEmail || settings.contact?.email || 'prioritycitizenship@gmail.com';
  await sendEmail({
    to: adminEmail,
    subject: `New Lead: ${lead.name}`,
    html: `<h3>New Lead from Website</h3>
<p><strong>Name:</strong> ${lead.name}</p>
<p><strong>Email:</strong> ${lead.email}</p>
<p><strong>Phone:</strong> ${lead.phone || '—'}</p>
<p><strong>Service:</strong> ${lead.service || '—'}</p>
<p><strong>Country:</strong> ${lead.country || '—'}</p>
<p><strong>Message:</strong> ${lead.message || '—'}</p>
<hr><p><a href="https://priority-citizenship-v2.vercel.app/admin">View in Admin Panel</a></p>`
  });
}

/**
 * Send appointment confirmation to client.
 */
async function sendAppointmentConfirmation(appointment) {
  await sendEmail({
    to: appointment.email,
    subject: 'Your Consultation is Confirmed — Priority Citizenship',
    html: `<h3>Consultation Confirmed</h3>
<p>Dear ${appointment.name},</p>
<p>Your consultation has been booked. Our team will contact you shortly.</p>
<p>If you have any questions, please reply to this email or WhatsApp us at ${store.getSettings().contact?.whatsapp || '+678 7773595'}.</p>
<p>— Priority Citizenship Limited</p>`
  });
}

module.exports = { sendEmail, notifyNewLead, sendAppointmentConfirmation };
