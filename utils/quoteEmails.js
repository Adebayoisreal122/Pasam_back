// Quote-related emails. Uses the same Resend setup as utils/email.js
// (RESEND_API_KEY + EMAIL_FROM) but is self-contained so email.js stays untouched.
const { Resend } = require('resend');

let client;
const getClient = () => {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminTo   = () => process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;

const send = async ({ to, subject, html }) => {
  const { data, error } = await getClient().emails.send({
    from: process.env.EMAIL_FROM || 'PASAM Store <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Email delivery request failed: ${error.message}`);
  console.log(`Quote email accepted by Resend for ${to}: ${data.id}`);
  return data;
};

const layout = (inner) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#16a34a,#f97316);padding:28px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">PASAM Store</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Bulk Orders</p>
    </div>
    <div style="padding:28px;">${inner}</div>
    <div style="background:#f9fafb;padding:14px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} PASAM Store</p>
    </div>
  </div>`;

const button = (href, label) => `
  <div style="text-align:center;margin:26px 0;">
    <a href="${esc(href)}" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:white;padding:14px 30px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${esc(label)}</a>
  </div>`;

const itemsTable = (items = []) => `
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;">Item</th>
        <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${esc(i.productName)}${i.notes ? `<br><span style="color:#9ca3af;font-size:12px;">${esc(i.notes)}</span>` : ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;font-weight:600;">${esc(i.quantity)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

// 1. Customer: request received
exports.sendQuoteReceivedEmail = (quote, viewUrl) => send({
  to: quote.email,
  subject: `We received your bulk quote request ${quote.quoteNumber}`,
  html: layout(`
    <h2 style="color:#1f2937;margin:0 0 8px;">Hello ${esc(quote.contactName)},</h2>
    <p style="color:#6b7280;margin:0 0 16px;">Thank you for your bulk order request for <strong>${esc(quote.organizationName)}</strong>. Our team will review it and send you a price within 24 hours.</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px;text-align:center;">
      <p style="margin:0;color:#166534;font-size:12px;text-transform:uppercase;">Your quote reference</p>
      <p style="margin:4px 0 0;color:#16a34a;font-size:22px;font-weight:800;font-family:monospace;">${esc(quote.quoteNumber)}</p>
    </div>
    ${itemsTable(quote.items)}
    ${button(viewUrl, 'Track your quote')}
    <p style="color:#9ca3af;font-size:12px;">You will get another email as soon as your quote is ready.</p>
  `),
});

// 2. Customer: quote ready
exports.sendQuoteReadyEmail = (quote, viewUrl) => send({
  to: quote.email,
  subject: `Your quote is ready: ${quote.quoteNumber} (${money(quote.adminQuote?.totalAmount)})`,
  html: layout(`
    <h2 style="color:#1f2937;margin:0 0 8px;">Your quote is ready, ${esc(quote.contactName)}</h2>
    <p style="color:#6b7280;margin:0 0 16px;">Here is our price for <strong>${esc(quote.organizationName)}</strong> (${esc(quote.quoteNumber)}).</p>
    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:18px;text-align:center;margin-bottom:16px;">
      <p style="margin:0;color:#166534;font-size:12px;text-transform:uppercase;">Quoted total</p>
      <p style="margin:4px 0 0;color:#16a34a;font-size:30px;font-weight:800;">${money(quote.adminQuote?.totalAmount)}</p>
      ${quote.adminQuote?.validUntil ? `<p style="margin:6px 0 0;color:#166534;font-size:13px;">Valid until ${esc(fmtDate(quote.adminQuote.validUntil))}</p>` : ''}
    </div>
    ${quote.adminQuote?.breakdown ? `
      <p style="color:#374151;font-weight:700;margin:16px 0 4px;">Price breakdown</p>
      <div style="background:#f9fafb;border-radius:10px;padding:12px;color:#4b5563;font-size:14px;white-space:pre-wrap;">${esc(quote.adminQuote.breakdown)}</div>` : ''}
    ${quote.adminQuote?.notes ? `
      <p style="color:#374151;font-weight:700;margin:16px 0 4px;">Notes from our team</p>
      <div style="background:#f9fafb;border-radius:10px;padding:12px;color:#4b5563;font-size:14px;white-space:pre-wrap;">${esc(quote.adminQuote.notes)}</div>` : ''}
    ${itemsTable(quote.items)}
    ${button(viewUrl, 'View quote and respond')}
    <p style="color:#9ca3af;font-size:12px;">Use the button to accept or decline. If you have questions, reply on WhatsApp and quote your reference number.</p>
  `),
});

// 3. Admin: new request
exports.sendNewQuoteAdminEmail = (quote) => {
  const to = adminTo();
  if (!to) { console.warn('No ADMIN_NOTIFY_EMAIL or ADMIN_EMAIL set. Skipping admin quote notification.'); return Promise.resolve(); }
  return send({
    to,
    subject: `New bulk quote request ${quote.quoteNumber}: ${quote.organizationName}`,
    html: layout(`
      <h2 style="color:#1f2937;margin:0 0 8px;">New bulk quote request</h2>
      <table style="font-size:14px;color:#374151;margin-bottom:8px;">
        <tr><td style="padding:2px 12px 2px 0;color:#9ca3af;">Reference</td><td><strong>${esc(quote.quoteNumber)}</strong></td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#9ca3af;">Organization</td><td>${esc(quote.organizationName)} (${esc(quote.organizationType || 'n/a')})</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#9ca3af;">Contact</td><td>${esc(quote.contactName)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#9ca3af;">Phone</td><td>${esc(quote.phone)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#9ca3af;">Email</td><td>${esc(quote.email)}</td></tr>
      </table>
      ${itemsTable(quote.items)}
      ${button(`${clientUrl()}/admin/quotes`, 'Open Bulk Quotes')}
    `),
  });
};

// 4. Admin: customer accepted or declined
exports.sendQuoteResponseAdminEmail = (quote) => {
  const to = adminTo();
  if (!to) { console.warn('No ADMIN_NOTIFY_EMAIL or ADMIN_EMAIL set. Skipping admin response notification.'); return Promise.resolve(); }
  const accepted = quote.customerResponse?.decision === 'accepted';
  return send({
    to,
    subject: `Quote ${quote.quoteNumber} ${accepted ? 'ACCEPTED' : 'declined'} by ${quote.organizationName}`,
    html: layout(`
      <h2 style="color:#1f2937;margin:0 0 8px;">Quote ${accepted ? 'accepted' : 'declined'}</h2>
      <p style="color:#6b7280;margin:0 0 12px;">${esc(quote.organizationName)} ${accepted ? 'accepted' : 'declined'} quote <strong>${esc(quote.quoteNumber)}</strong> (${money(quote.adminQuote?.totalAmount)}).</p>
      ${quote.customerResponse?.message ? `
        <p style="color:#374151;font-weight:700;margin:12px 0 4px;">Their message</p>
        <div style="background:#f9fafb;border-radius:10px;padding:12px;color:#4b5563;font-size:14px;white-space:pre-wrap;">${esc(quote.customerResponse.message)}</div>` : ''}
      <p style="color:#6b7280;font-size:14px;margin-top:16px;">Contact: ${esc(quote.contactName)}, ${esc(quote.phone)}, ${esc(quote.email)}</p>
      ${button(`${clientUrl()}/admin/quotes`, 'Open Bulk Quotes')}
    `),
  });
};
