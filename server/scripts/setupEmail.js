const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
async function testEmailConfig() {
  console.log('🔧 Testing Email Configuration...\n');
  
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
  
  console.log('Email Configuration:');
  console.log(`Host: ${EMAIL_HOST || 'Not set'}`);
  console.log(`Port: ${EMAIL_PORT || 'Not set'}`);
  console.log(`User: ${EMAIL_USER || 'Not set'}`);
  console.log(`From: ${EMAIL_FROM || EMAIL_USER || 'Not set'}`);
  console.log(`Password: ${EMAIL_PASS ? '***' : 'Not set'}\n`);
  
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.log('❌ Email configuration incomplete!');
    console.log('\nTo enable email functionality, add these to your .env file:');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASS=your-app-password');
    console.log('EMAIL_FROM=TinyTots <your-email@gmail.com>');
    console.log('FRONTEND_URL=http://localhost:3000');
    console.log('\nFor Gmail, you need to:');
    console.log('1. Enable 2-factor authentication');
    console.log('2. Generate an App Password');
    console.log('3. Use the App Password as EMAIL_PASS');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
    
    // Test connection
    await transporter.verify();
    console.log('✅ Email configuration is valid!');
    console.log('📧 Emails will be sent when parents are approved and children are created.');
    
  } catch (error) {
    console.log('❌ Email configuration error:', error.message);
    console.log('\nPlease check your email settings and try again.');
  }
}

testEmailConfig();
