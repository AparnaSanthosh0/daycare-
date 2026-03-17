// Test script to verify AI endpoints are working
const axios = require('axios');

async function testEndpoints() {
  const baseURL = 'http://localhost:5000/api/delivery-assignments';
  
  try {
    console.log('🧪 Testing AI endpoints...');
    
    // Test risk analysis
    console.log('\n📊 Testing risk analysis...');
    const riskResponse = await axios.get(`${baseURL}/risk-analysis`);
    console.log('✅ Risk analysis:', riskResponse.data);
    
    // Test anomaly detection  
    console.log('\n🔍 Testing anomaly detection...');
    const anomalyResponse = await axios.get(`${baseURL}/anomaly-detection`);
    console.log('✅ Anomaly detection:', anomalyResponse.data);
    
    // Test earnings forecast
    console.log('\n💰 Testing earnings forecast...');
    const earningsResponse = await axios.get(`${baseURL}/earnings-forecast`);
    console.log('✅ Earnings forecast:', earningsResponse.data);
    
    console.log('\n🎉 All endpoints working!');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testEndpoints();
