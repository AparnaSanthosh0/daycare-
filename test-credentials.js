const https = require('https');
const http = require('http');

// Test credentials - Updated to match actual database users
const testCredentials = [
  {
    name: 'Vendor',
    email: 'gmail-dreamtoys0023@gmail.com',
    password: 'Lucajohn14@',
    role: 'vendor'
  },
  {
    name: 'Parent',
    email: 'gmail-shijinthomas2022@mac.ajce.in',
    password: 'Shijin14@',
    role: 'parent'
  },
  {
    name: 'Staff',
    email: 'gmail-aparnasanthosh@gmail.com',
    password: 'Aparna14@',
    role: 'staff'
  },
  {
    name: 'Existing Parent (Fathima)',
    email: 'fathimashibu15@gmail.com',
    password: 'Fathima123@', // You'll need to provide the correct password
    role: 'parent'
  }
];

// Base URL for the API (adjust if your server runs on different port)
const BASE_URL = 'http://localhost:5000/api/auth';

// Simple HTTP request function (no external dependencies)
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = (isHttps ? https : http).request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testLogin(credentials) {
  try {
    console.log(`\n🧪 Testing ${credentials.name} login...`);
    console.log(`Email: ${credentials.email}`);
    console.log(`Role: ${credentials.role}`);

    const response = await makeRequest(`${BASE_URL}/login`, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password
      }
    });

    if (response.status === 200 && response.data && response.data.token) {
      console.log(`✅ ${credentials.name} login successful!`);
      console.log(`Token: ${response.data.token.substring(0, 50)}...`);
      console.log(`User Role: ${response.data.user?.role}`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ ${credentials.name} login failed - HTTP ${response.status}`);
      console.log(`Message: ${response.data?.message || 'Unknown error'}`);
      return { success: false, error: response.data?.message || 'HTTP error' };
    }
  } catch (error) {
    console.log(`❌ ${credentials.name} login failed:`);
    console.log(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllCredentials() {
  console.log('🚀 Starting TinyTots Authentication Tests');
  console.log('=' .repeat(50));

  // First check if server is running
  try {
    console.log('🔍 Checking if server is running...');
    const healthCheck = await makeRequest(`${BASE_URL.replace('/api/auth', '')}/`);
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('Please start the server first with: npm run dev');
    return;
  }

  const results = [];

  for (const creds of testCredentials) {
    const result = await testLogin(creds);
    results.push({ name: creds.name, ...result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
  });

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All credentials are working correctly!');
  } else {
    console.log('⚠️  Some credentials failed. Check the errors above.');
    console.log('Make sure:');
    console.log('1. Server is running (npm run dev)');
    console.log('2. Users exist in the database');
    console.log('3. Credentials are correct');
  }
}

// Run the tests
testAllCredentials().catch(console.error);
