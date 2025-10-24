#!/usr/bin/env node

/**
 * Gmail Configuration Validator
 * Helps validate Gmail SMTP configuration for TinyTots
 */

require('dotenv').config();

function validateGmailConfig() {
  console.log('🔍 Validating Gmail Configuration...\n');

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;

  const checks = [
    {
      name: 'EMAIL_HOST',
      value: EMAIL_HOST,
      expected: 'smtp.gmail.com',
      valid: EMAIL_HOST === 'smtp.gmail.com'
    },
    {
      name: 'EMAIL_PORT',
      value: EMAIL_PORT,
      expected: '587',
      valid: EMAIL_PORT === '587'
    },
    {
      name: 'EMAIL_USER',
      value: EMAIL_USER,
      expected: 'Valid Gmail address (not placeholder)',
      valid: EMAIL_USER && !EMAIL_USER.includes('your_') && EMAIL_USER.includes('@gmail.com')
    },
    {
      name: 'EMAIL_PASS',
      value: EMAIL_PASS ? 'Set (hidden)' : 'Not set',
      expected: 'Gmail app password (16 characters)',
      valid: EMAIL_PASS && !EMAIL_PASS.includes('your_') && EMAIL_PASS.length >= 16
    },
    {
      name: 'EMAIL_FROM',
      value: EMAIL_FROM,
      expected: 'Should match EMAIL_USER',
      valid: EMAIL_FROM && EMAIL_FROM.includes(EMAIL_USER || '')
    }
  ];

  let allValid = true;

  checks.forEach(check => {
    const status = check.valid ? '✅' : '❌';
    const value = check.value || 'Not set';
    console.log(`${status} ${check.name.padEnd(12)}: ${value}`);
    if (!check.valid) allValid = false;
  });

  console.log(`\n📊 Overall Status: ${allValid ? '✅ All checks passed!' : '❌ Configuration issues found'}`);

  if (!allValid) {
    console.log('\n🔧 Fix the following issues:');
    checks.filter(c => !c.valid).forEach(check => {
      console.log(`   ❌ ${check.name}: Expected ${check.expected}`);
    });

    console.log('\n📝 Required Steps for Gmail:');
    console.log('   1. Enable 2FA on your Gmail account');
    console.log('   2. Generate app password: Google Account > Security > App passwords');
    console.log('   3. Use the app password (16 chars) as EMAIL_PASS');
    console.log('   4. Replace all "your_" values with real credentials');
    console.log('   5. Set EMAIL_FROM to match your Gmail address');
  } else {
    console.log('\n🎉 Gmail configuration looks good!');
    console.log('💡 Next: Test your email with: npm run test:email-sms');
  }

  return allValid;
}

function showGmailSetupGuide() {
  console.log('\n📚 GMAIL SETUP GUIDE:');
  console.log('====================');
  console.log('');
  console.log('1️⃣  Enable 2-Factor Authentication:');
  console.log('   • Go to: https://myaccount.google.com/security');
  console.log('   • Enable "2-Step Verification"');
  console.log('');
  console.log('2️⃣  Generate App Password:');
  console.log('   • Go to: https://myaccount.google.com/apppasswords');
  console.log('   • Select "Mail" and your device');
  console.log('   • Copy the 16-character password');
  console.log('');
  console.log('3️⃣  Update .env file:');
  console.log('   EMAIL_HOST=smtp.gmail.com');
  console.log('   EMAIL_PORT=587');
  console.log('   EMAIL_USER=your_gmail@gmail.com');
  console.log('   EMAIL_PASS=abcd-efgh-ijkl-mnop  # 16-char app password');
  console.log('   EMAIL_FROM=TinyTots <your_gmail@gmail.com>');
  console.log('');
  console.log('4️⃣  Test Configuration:');
  console.log('   npm run test:email-sms');
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('   • Use app password, NOT your regular Gmail password');
  console.log('   • App passwords are 16 characters with dashes');
  console.log('   • Never share your app password');
  console.log('   • Gmail may initially mark emails as spam - check spam folder');
}

if (require.main === module) {
  const isValid = validateGmailConfig();
  if (!isValid) {
    showGmailSetupGuide();
  }
}
