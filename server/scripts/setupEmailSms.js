#!/usr/bin/env node

/**
 * TinyTots Email & SMS Setup Script
 *
 * This script helps configure email and SMS services for production use.
 * It will guide you through setting up the required environment variables.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function setupEmailService() {
  console.log('\n📧 EMAIL SERVICE SETUP');
  console.log('Choose your email service provider:');
  console.log('1. SendGrid (Recommended)');
  console.log('2. AWS SES');
  console.log('3. Gmail (Development only)');
  console.log('4. Custom SMTP');

  const choice = await question('Enter your choice (1-4): ');

  let emailConfig = {};

  switch (choice) {
    case '1':
      emailConfig = {
        EMAIL_HOST: 'smtp.sendgrid.net',
        EMAIL_PORT: '587',
        EMAIL_USER: 'apikey',
        EMAIL_FROM: 'TinyTots <noreply@yourdomain.com>'
      };
      console.log('\n📝 SendGrid Configuration:');
      emailConfig.EMAIL_PASS = await question('Enter your SendGrid API Key: ');
      console.log('\n⚠️  IMPORTANT: Verify your sender identity in SendGrid dashboard');
      console.log('   Go to Settings > Sender Authentication');
      break;

    case '2':
      const region = await question('Enter AWS region (e.g., us-east-1): ');
      emailConfig = {
        EMAIL_HOST: `email-smtp.${region}.amazonaws.com`,
        EMAIL_PORT: '587',
        EMAIL_FROM: 'TinyTots <noreply@yourdomain.com>'
      };
      emailConfig.EMAIL_USER = await question('Enter AWS Access Key ID: ');
      emailConfig.EMAIL_PASS = await question('Enter AWS Secret Access Key: ');
      console.log('\n⚠️  IMPORTANT: Verify your domain/email in AWS SES Console');
      break;

    case '3':
      emailConfig = {
        EMAIL_HOST: 'smtp.gmail.com',
        EMAIL_PORT: '587',
        EMAIL_FROM: 'TinyTots <noreply@yourdomain.com>'
      };
      emailConfig.EMAIL_USER = await question('Enter Gmail address: ');
      emailConfig.EMAIL_PASS = await question('Enter Gmail app password: ');
      console.log('\n⚠️  WARNING: Gmail is not recommended for production');
      break;

    case '4':
      emailConfig.EMAIL_HOST = await question('Enter SMTP host: ');
      emailConfig.EMAIL_PORT = await question('Enter SMTP port: ');
      emailConfig.EMAIL_USER = await question('Enter SMTP username: ');
      emailConfig.EMAIL_PASS = await question('Enter SMTP password: ');
      emailConfig.EMAIL_FROM = await question('Enter FROM email address: ');
      break;

    default:
      console.log('Invalid choice. Using SendGrid as default.');
      emailConfig = {
        EMAIL_HOST: 'smtp.sendgrid.net',
        EMAIL_PORT: '587',
        EMAIL_USER: 'apikey',
        EMAIL_PASS: await question('Enter your SendGrid API Key: '),
        EMAIL_FROM: 'TinyTots <noreply@yourdomain.com>'
      };
  }

  return emailConfig;
}

async function setupSMSService() {
  console.log('\n📱 SMS SERVICE SETUP');
  console.log('Setting up Twilio for SMS...');

  const smsConfig = {};

  smsConfig.TWILIO_ACCOUNT_SID = await question('Enter Twilio Account SID: ');
  smsConfig.TWILIO_AUTH_TOKEN = await question('Enter Twilio Auth Token: ');
  smsConfig.TWILIO_SMS_FROM = await question('Enter Twilio phone number (e.g., +1234567890): ');

  console.log('\n💡 TIP: You can find these credentials in your Twilio Console Dashboard');
  console.log('   Phone Numbers > Manage > Select your number');

  return smsConfig;
}

async function setupOtherServices() {
  console.log('\n⚙️  OTHER SERVICES');

  const config = {};

  config.FRONTEND_URL = await question('Enter your frontend URL (e.g., https://yourdomain.com): ') || 'http://localhost:3000';
  config.JWT_SECRET = await question('Enter JWT secret (or press Enter for auto-generated): ') || require('crypto').randomBytes(64).toString('hex');

  return config;
}

async function main() {
  console.log('🚀 TinyTots Email & SMS Setup');
  console.log('================================\n');

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Your existing .env file is unchanged.');
      rl.close();
      return;
    }
  }

  try {
    // Gather configurations
    const emailConfig = await setupEmailService();
    const smsConfig = await setupSMSService();
    const otherConfig = await setupOtherServices();

    // Combine all configurations
    const finalConfig = {
      ...emailConfig,
      ...smsConfig,
      ...otherConfig,
      NODE_ENV: 'production',
      PORT: '5000',
      MONGODB_URI: 'mongodb://localhost:27017/tinytots',
      RATE_LIMIT_MAX: '100',
      RATE_LIMIT_WINDOW_MIN: '15',
      RATE_LIMIT_ENABLED: 'true'
    };

    // Generate .env content
    let envContent = '# TinyTots Environment Configuration\n';
    envContent += '# Generated by setup script\n\n';

    Object.entries(finalConfig).forEach(([key, value]) => {
      envContent += `${key}=${value}\n`;
    });

    // Write .env file
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ SUCCESS!');
    console.log('Your .env file has been created successfully!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review the generated .env file');
    console.log('2. Verify your email service credentials');
    console.log('3. Verify your Twilio credentials');
    console.log('4. Test the configuration: npm run dev');
    console.log('5. For email verification, check your service dashboard');
    console.log('\n📚 For detailed setup instructions, see: EMAIL_SMS_SETUP.md');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  }

  rl.close();
}

// Run the setup
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupEmailService, setupSMSService, setupOtherServices };
