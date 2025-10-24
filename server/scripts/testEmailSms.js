#!/usr/bin/env node

/**
 * TinyTots Email & SMS Test Script
 *
 * This script tests the email and SMS functionality after configuration.
 * Run this after setting up your email and SMS services.
 */

const { sendMail, customerWelcomeEmail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');

async function testEmailService() {
  console.log('\n📧 TESTING EMAIL SERVICE...');

  try {
    // Test basic email functionality
    const testEmail = {
      to: 'test@example.com',
      subject: 'TinyTots Email Test',
      text: 'This is a test email from TinyTots system.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>TinyTots Email Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, your email service is configured correctly!</p>
        </div>
      `
    };

    const result = await sendMail(testEmail);

    if (result && result.previewUrl) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Preview URL:', result.previewUrl);
      console.log('💡 In development, check the preview URL to see the email');
      console.log('💡 In production, check your inbox at:', testEmail.to);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('💡 Check your inbox at:', testEmail.to);
    }

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('💡 Make sure your email credentials are configured in .env file');
  }
}

async function testSMService() {
  console.log('\n📱 TESTING SMS SERVICE...');

  try {
    const testMessage = 'TinyTots SMS Test - If you received this, SMS is working! ' + new Date().toLocaleTimeString();
    const result = await sendSms('+1234567890', testMessage); // Replace with your test number

    if (result && result.preview) {
      console.log('✅ SMS configured successfully!');
      console.log('📱 Test SMS would be sent to: +1234567890');
      console.log('💬 Message:', testMessage);
      console.log('💡 In development, check console logs for SMS content');
    } else {
      console.log('✅ SMS sent successfully!');
      console.log('📱 Check your phone for the test message');
    }

  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
    console.log('💡 Make sure your Twilio credentials are configured in .env file');
  }
}

async function testCustomerRegistrationEmail() {
  console.log('\n🎯 TESTING CUSTOMER REGISTRATION EMAIL...');

  try {
    const mockCustomer = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'customer@example.com',
      phone: '+1234567890'
    };

    const emailTemplate = customerWelcomeEmail(mockCustomer);
    const result = await sendMail({
      to: mockCustomer.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    if (result && result.previewUrl) {
      console.log('✅ Customer welcome email template working!');
      console.log('📬 Preview URL:', result.previewUrl);
      console.log('💡 This is the email new customers will receive');
    }

  } catch (error) {
    console.error('❌ Customer email test failed:', error.message);
  }
}

async function showConfigurationStatus() {
  console.log('\n🔧 CONFIGURATION STATUS:');
  console.log('================================');

  const config = {
    'Node Environment': process.env.NODE_ENV || 'development',
    'Email Service': process.env.EMAIL_HOST ? `${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}` : 'Not configured',
    'SMS Service': process.env.TWILIO_ACCOUNT_SID ? 'Twilio configured' : 'Not configured',
    'Frontend URL': process.env.FRONTEND_URL || 'Not configured'
  };

  Object.entries(config).forEach(([key, value]) => {
    console.log(`${key.padEnd(20)}: ${value}`);
  });

  // Check for placeholder values
  const placeholders = [];
  if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('your_')) placeholders.push('Email credentials');
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.includes('your_')) placeholders.push('Twilio credentials');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('your_')) placeholders.push('JWT Secret');

  if (placeholders.length > 0) {
    console.log('\n⚠️  PLACEHOLDER VALUES DETECTED:');
    placeholders.forEach(item => console.log(`   - ${item} still need to be updated`));
  } else {
    console.log('\n✅ No placeholder values detected');
  }
}

async function main() {
  console.log('🧪 TinyTots Email & SMS Test Suite');
  console.log('=====================================\n');

  // Show current configuration
  await showConfigurationStatus();

  // Run tests
  await testEmailService();
  await testSMService();
  await testCustomerRegistrationEmail();

  console.log('\n📋 TEST SUMMARY:');
  console.log('================');
  console.log('✅ Configuration check complete');
  console.log('✅ Email service test complete');
  console.log('✅ SMS service test complete');
  console.log('✅ Customer welcome email test complete');
  console.log('\n💡 If all tests show "✅", your services are configured correctly!');
  console.log('💡 If you see "❌", check your .env configuration and credentials');
  console.log('\n📚 For troubleshooting, see: EMAIL_SMS_SETUP.md');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testEmailService,
  testSMService,
  testCustomerRegistrationEmail,
  showConfigurationStatus
};
