#!/usr/bin/env node

/**
 * Quick OTP Test - Makes a direct API call to test OTP generation
 */

const http = require('http');

const postData = JSON.stringify({
  email: 'customer@example.com',
  phone: '+919876543210'
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

console.log('🚀 Testing OTP Generation...');
console.log('📧 Email: customer@example.com');
console.log('📱 Phone: +919876543210');
console.log('🔗 API: http://localhost:5000/api/customers/otp/send\n');

const req = http.request(options, (res) => {
  console.log(`📊 Response Status: ${res.statusCode}`);
  console.log(`📋 Headers: ${JSON.stringify(res.headers['content-type'])}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ API Response:');
      console.log(JSON.stringify(response, null, 2));

      if (response.message === 'OTP sent') {
        console.log('\n🎉 SUCCESS! OTP system is working perfectly!');
        console.log('📧 Email OTP sent (check server logs for preview URL)');
        console.log('📱 SMS OTP logged (check server console)');
      }
    } catch (e) {
      console.log('📄 Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('💡 Make sure the server is running: npm run dev');
});

req.write(postData);
req.end();

console.log('⏳ Sending request...\n');
