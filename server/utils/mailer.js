const nodemailer = require('nodemailer');

// Create an Ethereal transporter for development (auto-generates inbox + preview URL)
async function getEtherealTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  const t = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  if (!process.env.EMAIL_FROM) process.env.EMAIL_FROM = `TinyTots <${testAccount.user}>`;
  return t;
}

// Creates and caches a transporter using environment variables, with smart fallbacks
let transporter;
async function getTransporter() {
  if (transporter) return transporter;

  // Force Ethereal via env flag
  if ((process.env.EMAIL_USE_ETHEREAL || '').toLowerCase() === 'true') {
    console.warn('EMAIL_USE_ETHEREAL=true -> Using Ethereal test SMTP');
    transporter = await getEtherealTransporter();
    return transporter;
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  const missing = !EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS;
  const looksPlaceholder = /example\.com|placeholder|test_|demo/i.test(`${EMAIL_USER || ''}${EMAIL_PASS || ''}`);

  if (missing || looksPlaceholder) {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new Error('Email SMTP env not configured for production. ' + getProductionSetupInstructions());
    }
    console.warn('Email env not fully configured or using placeholders. Using Ethereal test SMTP for development.');
    transporter = await getEtherealTransporter();
    return transporter;
  }

  console.log(`📧 Using configured email service: ${EMAIL_HOST}:${EMAIL_PORT}`);
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465, // true for 465, false for others
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const sendWith = async (t) => {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@tinytots.local';
    const info = await t.sendMail({ from, to, subject, text, html });

    // Only show preview URLs for Ethereal (development), not for real email services
    const isEthereal = t.options.host === 'smtp.ethereal.email';
    const preview = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    if (preview) {
      console.log(`📧 Email preview URL: ${preview}`);
    } else {
      console.log(`📧 Email sent successfully to: ${to}`);
    }

    // Attach previewUrl for callers to surface in dev responses (only for Ethereal)
    return { ...info, previewUrl: preview };
  };

  try {
    const t = await getTransporter();
    return await sendWith(t);
  } catch (err) {
    // In dev, auto-fallback to Ethereal and retry once
    console.warn(`Primary email send failed: ${err?.message || err}. Falling back to Ethereal.`);
    if ((process.env.NODE_ENV || 'development') === 'production') throw err;
    const et = await getEtherealTransporter();
    return await sendWith(et);
  }
}

function vendorApprovedEmail(vendor, loginInfo) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
  const loginBlockHtml = loginInfo ? `
    <p>You can now log in to your vendor portal:</p>
    <p><a href="${loginUrl}">Vendor Login</a></p>
    <p><b>Username/Email:</b> ${loginInfo.email}<br/>
    <b>Temporary Password:</b> ${loginInfo.password}</p>
    <p>Please change your password after first login.</p>
  ` : '';
  const loginBlockText = loginInfo ? `\n\nLogin: ${loginUrl}\nEmail: ${loginInfo.email}\nTemporary Password: ${loginInfo.password}\n(Please change it after first login)` : '';

  return {
    subject: 'TinyTots Vendor Approval',
    html: `
      <p>Dear ${vendor.vendorName},</p>
      <p>Congratulations! Your vendor registration for <b>${vendor.companyName}</b> has been <b>approved</b>.</p>
      ${loginBlockHtml}
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${vendor.vendorName},\n\nYour vendor registration for ${vendor.companyName} has been approved.${loginBlockText}\n\nRegards,\nTinyTots Team`
  };
}

function vendorRejectedEmail(vendor, reason) {
  return {
    subject: 'TinyTots Vendor Application Update',
    html: `
      <p>Dear ${vendor.vendorName},</p>
      <p>Thank you for applying as a vendor for <b>${vendor.companyName}</b>. After review, your application was <b>not approved</b> at this time.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>You may re-apply in the future if applications reopen.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${vendor.vendorName},\n\nYour vendor application for ${vendor.companyName} was not approved at this time.${reason ? ` Reason: ${reason}.` : ''}\n\nRegards,\nTinyTots Team`
  };
}

function registrationSubmittedEmail(user, role) {
  const subject = role === 'staff'
    ? 'TinyTots Staff Registration Received'
    : role === 'customer'
    ? 'TinyTots Customer Registration Received'
    : 'TinyTots Admission Request Received';
  const roleLine = role === 'staff'
    ? 'Your staff registration has been received and is pending admin approval.'
    : role === 'customer'
    ? 'Your customer registration has been received and is pending admin approval.'
    : 'Your admission request has been received and is pending admin review.';
  const html = `
    <p>Hi ${user.firstName} ${user.lastName},</p>
    <p>${roleLine}</p>
    <p>We will notify you once it is reviewed.</p>
    <p>Regards,<br/>TinyTots Team</p>
  `;
  const text = `Hi ${user.firstName} ${user.lastName},\n\n${roleLine}\n\nRegards,\nTinyTots Team`;
  return { subject, html, text };
}

function emailVerificationEmail(user, verifyUrl) {
  return {
    subject: 'Verify your TinyTots email',
    html: `
      <p>Hi ${user.firstName} ${user.lastName},</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Hi ${user.firstName} ${user.lastName},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nRegards,\nTinyTots Team`
  };
}

function resetPasswordEmail(user, resetUrl) {
  return {
    subject: 'Reset your TinyTots password',
    html: `
      <p>Hi ${user.firstName} ${user.lastName},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you did not request this, ignore this email. The link expires in 1 hour.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Hi ${user.firstName} ${user.lastName},\n\nReset your password: ${resetUrl}\n\nIf you did not request this, ignore this email. The link expires in 1 hour.\n\nRegards,\nTinyTots Team`
  };
}

function passwordResetDirectEmail(user, tempPassword) {
  return {
    subject: 'Your new TinyTots password',
    html: `
      <p>Hi ${user.firstName} ${user.lastName},</p>
      <p>Your password has been reset. Use the temporary password below to sign in:</p>
      <p><strong>${tempPassword}</strong></p>
      <p>Please change it immediately after logging in from your account settings.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Hi ${user.firstName} ${user.lastName},\n\nYour password has been reset. Temporary password: ${tempPassword}\n\nPlease change it immediately after logging in from your account settings.\n\nRegards,\nTinyTots Team`
  };
}

function parentApprovedEmail(user) {
  return {
    subject: 'TinyTots Parent Account Approved',
    html: `
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <p>Congratulations! Your parent account has been <b>approved</b>.</p>
      <p>You can now log in to your parent dashboard to view your child's information and manage their daycare experience.</p>
      <p>Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">TinyTots Parent Portal</a></p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${user.firstName} ${user.lastName},\n\nYour parent account has been approved. You can now log in to your parent dashboard.\n\nRegards,\nTinyTots Team`
  };
}

function childCreatedEmail(parent, child) {
  return {
    subject: 'New Child Profile Created - TinyTots',
    html: `
      <p>Dear ${parent.firstName} ${parent.lastName},</p>
      <p>A new child profile has been created for <b>${child.firstName} ${child.lastName}</b>.</p>
      <p>Child Details:</p>
      <ul>
        <li>Name: ${child.firstName} ${child.lastName}</li>
        <li>Program: ${child.program}</li>
        <li>Tuition Rate: $${child.tuitionRate}/month</li>
        <li>Enrollment Date: ${new Date(child.enrollmentDate).toLocaleDateString()}</li>
      </ul>
      <p>You can view and manage your child's profile in your parent dashboard.</p>
      <p>Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">TinyTots Parent Portal</a></p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${parent.firstName} ${parent.lastName},\n\nA new child profile has been created for ${child.firstName} ${child.lastName}.\n\nRegards,\nTinyTots Team`
  };
}

function parentRejectedEmail(user, reason) {
  return {
    subject: 'TinyTots Parent Account Update',
    html: `
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <p>We appreciate your interest in TinyTots. After review, your parent account could not be approved at this time.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>You may re-apply in the future or contact support for more information.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${user.firstName} ${user.lastName},\n\nYour parent account could not be approved at this time.${reason ? ` Reason: ${reason}.` : ''}\n\nRegards,\nTinyTots Team`
  };
}

function staffApprovedEmail(user) {
  return {
    subject: 'TinyTots Staff Account Approved',
    html: `
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <p>Your staff account has been <b>approved</b>. You can now log in and access the staff portal.</p>
      <p>Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">TinyTots Staff Portal</a></p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${user.firstName} ${user.lastName},\n\nYour staff account has been approved. You can now log in.\n\nRegards,\nTinyTots Team`
  };
}

function staffRejectedEmail(user, reason) {
  return {
    subject: 'TinyTots Staff Application Update',
    html: `
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <p>Thank you for applying to TinyTots. After review, your staff application was not approved at this time.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>We appreciate your interest and encourage you to apply again in the future.</p>
      <p>Regards,<br/>TinyTots Team</p>
    `,
    text: `Dear ${user.firstName} ${user.lastName},\n\nYour staff application was not approved at this time.${reason ? ` Reason: ${reason}.` : ''}\n\nRegards,\nTinyTots Team`
  };
}

function customerWelcomeEmail(customer) {
  const body = `Dear ${customer.firstName || 'Customer'},`;
  return {
    subject: 'Welcome to TinyTots - Your OTP login is ready',
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222">
        <div style="text-align:center;margin-bottom:16px">
          <img alt="TinyTots" src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tinytots-logo.svg" height="40"/>
        </div>
        <p>${body}</p>
        <p>Welcome to TinyTots! You can now access your account using OTP based login with your registered email <b>${customer.email}</b>${customer.phone ? ` or mobile <b>${customer.phone}</b>` : ''}.</p>
        <p style="margin:16px 0;padding:12px;background:#f8f9fa;border:1px solid #eee;border-radius:8px">
          For security, never share your OTP with anyone. Our team will never ask for it.
        </p>
        <p>Thank you for choosing TinyTots.</p>
        <p style="margin-top:24px">Best Regards,<br/>Team TinyTots</p>
      </div>
    `,
    text: `${body}\n\nWelcome to TinyTots! You can now log in with OTP using your registered email ${customer.email}${customer.phone ? ` or mobile ${customer.phone}` : ''}.\n\nNever share your OTP.\n\nBest Regards,\nTeam TinyTots`
  };
}

// Production setup guidance
function getProductionSetupInstructions() {
  return `
📧 PRODUCTION EMAIL SETUP REQUIRED

Your application is currently using Ethereal test SMTP for development.
For production, please configure one of the following email services:

1. SendGrid (Recommended):
   - Sign up at: https://sendgrid.com
   - Get API key from: Settings > API Keys
   - Verify your sender identity in: Settings > Sender Authentication
   - Set environment variables:
     EMAIL_HOST=smtp.sendgrid.net
     EMAIL_PORT=587
     EMAIL_USER=apikey
     EMAIL_PASS=your_sendgrid_api_key
     EMAIL_FROM=TinyTots <noreply@yourdomain.com>

2. AWS SES:
   - Go to: https://console.aws.amazon.com/ses
   - Verify your domain/email
   - Generate SMTP credentials
   - Set environment variables:
     EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
     EMAIL_PORT=587
     EMAIL_USER=your_access_key_id
     EMAIL_PASS=your_secret_access_key
     EMAIL_FROM=TinyTots <noreply@yourdomain.com>

3. Gmail (Not recommended for production):
   - Enable 2FA on your Google account
   - Generate app password: Google Account > Security > App passwords
   - Set environment variables:
     EMAIL_HOST=smtp.gmail.com
     EMAIL_PORT=587
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_app_password

See EMAIL_SMS_SETUP.md for detailed instructions.
`;
}

module.exports = {
  sendMail,
  vendorApprovedEmail,
  vendorRejectedEmail,
  registrationSubmittedEmail,
  emailVerificationEmail,
  resetPasswordEmail,
  passwordResetDirectEmail,
  parentApprovedEmail,
  parentRejectedEmail,
  staffApprovedEmail,
  staffRejectedEmail,
  childCreatedEmail,
  customerWelcomeEmail,
  getProductionSetupInstructions,
};
