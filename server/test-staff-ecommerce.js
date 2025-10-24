#!/usr/bin/env node

/**
 * Test Staff/Parent Ecommerce Access
 */

const http = require('http');

// Test data for staff/parent login
const testEmail = 'staff@example.com';
const testPassword = 'password123';

function testStaffLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: testEmail,
      password: testPassword
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🔐 Testing Staff/Parent Login...');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}\n`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 Login Response Status: ${res.statusCode}`);
          console.log('✅ Login Response:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Login failed: ${response.message}`));
          }
        } catch (e) {
          console.log('📄 Raw Login Response:', data);
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

function testEcommerceAccess(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/products',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('🛍️ Testing Ecommerce Access...');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`📊 Products Response Status: ${res.statusCode}`);
          console.log('✅ Products Response:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Products access failed: ${response.message}`));
          }
        } catch (e) {
          console.log('📄 Raw Products Response:', data);
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });

    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log('🧪 Testing Staff/Parent Ecommerce Access...\n');
    
    // Step 1: Login as staff/parent
    const loginResponse = await testStaffLogin();
    const token = loginResponse.token;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    console.log(`\n🔑 Received token: ${token.substring(0, 20)}...`);
    console.log('👤 User role:', loginResponse.user?.role);
    
    // Step 2: Test ecommerce access
    await testEcommerceAccess(token);
    
    console.log('\n🎉 SUCCESS! Staff/Parent users can access ecommerce!');
    console.log('✅ Staff/Parent login works');
    console.log('✅ Ecommerce product access works');
    console.log('✅ Staff/Parent users can now shop!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 This might be because:');
    console.log('1. No staff/parent user exists with these credentials');
    console.log('2. Server is not running');
    console.log('3. Database connection issue');
    console.log('\n🔧 To test properly:');
    console.log('1. Create a staff or parent user first');
    console.log('2. Then test login with those credentials');
  }
}

runTest();




