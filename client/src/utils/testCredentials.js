// Test utility for TinyTots login credentials
// This can be run in browser console or as a script

const testCredentials = {
  vendor: {
    email: 'gmail-dreamtoys0023@gmail.com',
    password: 'Lucajohn14@',
    role: 'vendor'
  },
  parent: {
    email: 'gmail-shijinthomas2022@mac.ajce.in',
    password: 'Shijin14@',
    role: 'parent'
  },
  staff: {
    email: 'gmail-aparnasanthosh@gmail.com',
    password: 'Aparna14@',
    role: 'staff'
  }
};

// Test login function (requires axios or fetch)
async function testLoginInBrowser(userType) {
  const creds = testCredentials[userType];
  if (!creds) {
    console.error(`Unknown user type: ${userType}`);
    return;
  }

  console.log(`Testing ${userType} login...`);
  console.log(`Email: ${creds.email}`);

  try {
    // Using fetch (works in modern browsers)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: creds.email,
        password: creds.password
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      console.log(`✅ ${userType} login successful!`);
      console.log(`User: ${data.user?.firstName} ${data.user?.lastName}`);
      console.log(`Role: ${data.user?.role}`);

      // Store token for further testing
      localStorage.setItem('token', data.token);
      localStorage.setItem('token_payload', JSON.stringify({ role: data.user?.role }));

      return { success: true, data };
    } else {
      console.log(`❌ ${userType} login failed:`);
      console.log(data.message || 'Unknown error');
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error(`❌ ${userType} login error:`, error);
    return { success: false, error: error.message };
  }
}

// Test all credentials
async function testAllCredentialsInBrowser() {
  console.log('🚀 Testing all TinyTots credentials...');

  const results = [];

  for (const userType of ['vendor', 'parent', 'staff']) {
    const result = await testLoginInBrowser(userType);
    results.push({ userType, ...result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Results:');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.userType}`);
  });

  const passed = results.filter(r => r.success).length;
  console.log(`\n🎯 ${passed}/3 tests passed`);
}

// Helper function to quickly fill login form
function fillLoginForm(userType) {
  const creds = testCredentials[userType];
  if (!creds) {
    console.error(`Unknown user type: ${userType}`);
    return;
  }

  // Find login form elements
  const emailInput = document.querySelector('input[name="email"]') || document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');
  const roleSelect = document.querySelector('select[name="role"]');

  if (emailInput) emailInput.value = creds.email;
  if (passwordInput) passwordInput.value = creds.password;
  if (roleSelect) roleSelect.value = creds.role;

  console.log(`📝 Filled login form for ${userType}`);
  console.log(`Email: ${creds.email}`);
  console.log(`Role: ${creds.role}`);
}

// Usage examples:
// testAllCredentialsInBrowser() - Test all credentials
// testLoginInBrowser('vendor') - Test specific user
// fillLoginForm('vendor') - Fill login form for specific user

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCredentials, testLoginInBrowser, testAllCredentialsInBrowser, fillLoginForm };
}
