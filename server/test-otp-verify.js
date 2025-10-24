#!/usr/bin/env node

/**
 * Test OTP Verification - Tests the complete OTP flow
 */

const http = require('http');

// Test data
const testEmail = 'test@example.com';
const testPhone = '+919876543210';

// Step 1: Send OTP
function sendOTP() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: testEmail,
      phone: testPhone
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customers/otp/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🚀 Step 1: Sending OTP...');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`📱 Phone: ${testPhone}\n`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 Send Response Status: ${res.statusCode}`);
          console.log('✅ Send Response:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Send failed: ${response.message}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Step 2: Verify OTP (with a test code)
function verifyOTP(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: testEmail,
      code: code
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customers/otp/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`🔍 Step 2: Verifying OTP with code: ${code}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 Verify Response Status: ${res.statusCode}`);
          console.log('✅ Verify Response:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Verify failed: ${response.message}`));
          }
        } catch (e) {
          console.log('📄 Raw Verify Response:', data);
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log('🧪 Starting OTP Flow Test...\n');
    
    // Step 1: Send OTP
    await sendOTP();
    console.log('\n⏳ Waiting 2 seconds before verification...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Try verification with a test code
    await verifyOTP('123456');
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

runTest();








