#!/usr/bin/env node

/**
 * TinyTots Setup Status Checker
 *
 * Shows current configuration status and next steps for email/SMS setup.
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function checkEnvironmentVariables() {
  require('dotenv').config();

  const required = {
    'EMAIL_HOST': 'Email service host',
    'EMAIL_USER': 'Email service username',
    'EMAIL_PASS': 'Email service password',
    'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
    'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
    'TWILIO_SMS_FROM': 'Twilio phone number'
  };

  const optional = {
    'FRONTEND_URL': 'Frontend URL for email links',
    'JWT_SECRET': 'JWT signing secret'
  };

  console.log('\n📋 ENVIRONMENT VARIABLES:');
  console.log('=========================');

  let configured = 0;
  let total = Object.keys(required).length + Object.keys(optional).length;

  // Check required variables
  Object.entries(required).forEach(([key, description]) => {
    const value = process.env[key];
    const isSet = value && !value.includes('your_') && !value.includes('example');
    const status = isSet ? '✅' : '❌';
    console.log(`${status} ${key.padEnd(20)}: ${isSet ? 'Configured' : 'Not configured'} ${isSet ? '' : `(${description})`}`);
    if (isSet) configured++;
  });

  // Check optional variables
  console.log('\n📋 OPTIONAL VARIABLES:');
  console.log('======================');
  Object.entries(optional).forEach(([key, description]) => {
    const value = process.env[key];
    const isSet = value && !value.includes('your_') && !value.includes('example');
    const status = isSet ? '✅' : '⚠️';
    console.log(`${status} ${key.padEnd(20)}: ${isSet ? 'Configured' : 'Optional'} ${isSet ? '' : `(${description})`}`);
    if (isSet) configured++;
  });

  console.log(`\n📊 Configuration Score: ${configured}/${total} variables configured`);

  if (configured === total) {
    console.log('🎉 All configuration variables are set!');
  } else if (configured >= total * 0.7) {
    console.log('👍 Most configuration is complete. Just a few more steps!');
  } else {
    console.log('🔧 Some configuration still needed.');
  }
}

function showFileStructure() {
  console.log('\n📁 CREATED FILES:');
  console.log('=================');

  const files = [
    '.env.example',
    '.env.template',
    'EMAIL_SMS_SETUP.md',
    'README_EMAIL_SMS.md',
    'scripts/setupEmailSms.js',
    'scripts/testEmailSms.js'
  ];

  files.forEach(file => {
    const exists = checkFileExists(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });
}

function showNextSteps() {
  console.log('\n🚀 NEXT STEPS:');
  console.log('===============');

  const steps = [
    '1. 📝 Copy .env.template to .env',
    '2. 🔑 Add your email service credentials',
    '3. 📱 Add your Twilio SMS credentials',
    '4. 🧪 Run: npm run test:email-sms',
    '5. 🚀 Run: npm run dev',
    '6. ✨ Test customer registration flow'
  ];

  steps.forEach(step => console.log(`   ${step}`));

  console.log('\n💡 QUICK COMMANDS:');
  console.log('   npm run setup          # Interactive setup wizard');
  console.log('   npm run test:email-sms # Test your configuration');
  console.log('   npm run dev            # Start development server');
}

function showServiceStatus() {
  require('dotenv').config();

  console.log('\n🔧 SERVICE STATUS:');
  console.log('==================');

  // Email service status
  const emailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
  const emailProduction = emailConfigured && !process.env.EMAIL_USE_ETHEREAL;
  const emailStatus = emailProduction ? 'Production Ready' : emailConfigured ? 'Development Mode' : 'Not Configured';

  console.log(`📧 Email Service      : ${emailStatus}`);

  // SMS service status
  const smsConfigured = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
  const smsStatus = smsConfigured ? 'Production Ready' : 'Development Mode (Console Logging)';

  console.log(`📱 SMS Service        : ${smsStatus}`);

  // Overall status
  const allConfigured = emailConfigured && smsConfigured;
  console.log(`🎯 Overall Status     : ${allConfigured ? '✅ Fully Configured!' : '⚠️  Needs Configuration'}`);
}

function main() {
  console.log('🔍 TinyTots Email & SMS Setup Status');
  console.log('=====================================\n');

  showFileStructure();
  checkEnvironmentVariables();
  showServiceStatus();
  showNextSteps();

  console.log('\n📚 DOCUMENTATION:');
  console.log('   📖 EMAIL_SMS_SETUP.md    - Detailed setup instructions');
  console.log('   📖 README_EMAIL_SMS.md   - Complete feature overview');
  console.log('   📖 .env.example          - Configuration template');
}

if (require.main === module) {
  main();
}
