// Debug authentication issues
export const debugAuth = () => {
  console.log('🔍 Debugging Authentication...');
  
  // Check if token exists in localStorage
  const token = localStorage.getItem('token');
  console.log('Token in localStorage:', token ? `${token.substring(0, 50)}...` : 'No token found');
  
  // Check if token payload exists
  const tokenPayload = localStorage.getItem('token_payload');
  console.log('Token payload:', tokenPayload);
  
  // Check API base URL
  console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000');
  
  // Test API call
  if (token) {
    console.log('🧪 Testing API call with token...');
    fetch('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('API Response Status:', response.status);
      if (response.ok) {
        return response.json();
      } else {
        return response.text();
      }
    })
    .then(data => {
      console.log('API Response Data:', data);
    })
    .catch(error => {
      console.error('API Call Error:', error);
    });
  } else {
    console.log('❌ No token available for testing');
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
}






