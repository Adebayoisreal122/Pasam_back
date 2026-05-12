const nodemailer = require('nodemailer');

// Create transporter with better error handling
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // helps with some Gmail issues
    }
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  // Verify connection first in development
  if (process.env.NODE_ENV === 'development') {
    try {
      await transporter.verify();
      console.log('📧 SMTP connection verified');
    } catch (err) {
      console.error('📧 SMTP verify failed:', err.message);
      throw err;
    }
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"PASAM Store" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`📧 Email sent: ${info.messageId}`);
  return info;
};

exports.sendOTPEmail = async (email, otp, name) => {
  await sendEmail({
    to: email,
    subject: 'Verify Your PASAM Store Account — OTP Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#16a34a,#f97316);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:26px;font-weight:800;">PASAM Store</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Fresh Food Packages Delivered</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;margin:0 0 8px;">Hello ${name}!</h2>
          <p style="color:#6b7280;margin:0 0 24px;">Enter this code to verify your email address:</p>
          <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:44px;font-weight:800;color:#16a34a;letter-spacing:10px;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">If you didn't create an account, please ignore this email.</p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} PASAM Store. All rights reserved.</p>
        </div>
      </div>
    `
  });
};

exports.sendPasswordResetEmail = async (email, resetUrl, name) => {
  await sendEmail({
    to: email,
    subject: 'Reset Your PASAM Store Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#16a34a,#f97316);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:26px;font-weight:800;">PASAM Store</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;margin:0 0 8px;">Hello ${name}!</h2>
          <p style="color:#6b7280;margin:0 0 24px;">You requested a password reset. Click the button below:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;">This link expires in <strong>30 minutes</strong>.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">If you didn't request a reset, ignore this email — your password is unchanged.</p>
        </div>
      </div>
    `
  });
};

exports.sendOrderConfirmationEmail = async (email, order, name) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#16a34a;">
        ₦${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  await sendEmail({
    to: email,
    subject: `Order Confirmed — ${order.orderNumber} | PASAM Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#16a34a,#f97316);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:26px;font-weight:800;">PASAM Store</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;">Order Confirmed!</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1f2937;margin:0 0 4px;">Thank you, ${name}!</h2>
          <p style="color:#6b7280;margin:0 0 20px;">Your order <strong style="color:#16a34a;">${order.orderNumber}</strong> has been placed.</p>

          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;color:#166534;font-weight:700;">Payment Instructions</p>
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#166534;padding:2px 0;">Bank:</td><td style="font-weight:600;color:#166534;">First Bank Nigeria</td></tr>
              <tr><td style="color:#166534;padding:2px 0;">Account:</td><td style="font-weight:600;color:#166534;font-family:monospace;">1234567890</td></tr>
              <tr><td style="color:#166534;padding:2px 0;">Name:</td><td style="font-weight:600;color:#166534;">PASAM Store Ltd</td></tr>
              <tr><td style="color:#166534;padding:2px 0;">Reference:</td><td style="font-weight:700;color:#16a34a;font-family:monospace;">${order.orderNumber}</td></tr>
            </table>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;">Item</th>
                <th style="padding:10px 12px;text-align:center;color:#6b7280;font-size:12px;text-transform:uppercase;">Qty</th>
                <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px;font-weight:700;color:#1f2937;">Total</td>
                <td style="padding:12px;text-align:right;font-weight:800;color:#16a34a;font-size:18px;">₦${order.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} PASAM Store</p>
        </div>
      </div>
    `
  });
};