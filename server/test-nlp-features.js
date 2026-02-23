/**
 * Test Script for NLP Features
 * 
 * This script tests all NLP endpoints to verify the implementation
 * Run with: node test-nlp-features.js
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your_test_jwt_token_here';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Test functions
const testChatbotQuery = async () => {
  log.test('Testing chatbot query...');
  const result = await apiCall('POST', '/chatbot/query', {
    query: 'What are your operating hours?'
  });

  if (result.success && result.data.answer) {
    log.success('Chatbot query test passed');
    log.info(`Response: ${result.data.answer.substring(0, 100)}...`);
    return true;
  } else {
    log.error(`Chatbot query test failed: ${result.error}`);
    return false;
  }
};

const testQuickAsk = async () => {
  log.test('Testing quick ask...');
  const result = await apiCall('POST', '/chatbot/quick-ask', {
    query: 'Do you provide meals?'
  });

  if (result.success && result.data.answer) {
    log.success('Quick ask test passed');
    return true;
  } else {
    log.error(`Quick ask test failed: ${result.error}`);
    return false;
  }
};

const testChatSession = async () => {
  log.test('Testing chat session retrieval...');
  const result = await apiCall('GET', '/chatbot/session');

  if (result.success && result.data.sessionId) {
    log.success('Chat session test passed');
    log.info(`Session ID: ${result.data.sessionId}`);
    return true;
  } else {
    log.error(`Chat session test failed: ${result.error}`);
    return false;
  }
};

const testSentimentAnalysis = async () => {
  log.test('Testing sentiment analysis...');
  const result = await apiCall('POST', '/sentiment/analyze', {
    text: 'The staff are wonderful and my child loves going to daycare!',
    rating: 5
  });

  if (result.success && result.data.analysis) {
    log.success('Sentiment analysis test passed');
    log.info(`Sentiment: ${result.data.analysis.sentiment} (${(result.data.analysis.confidence * 100).toFixed(0)}% confidence)`);
    return true;
  } else {
    log.error(`Sentiment analysis test failed: ${result.error}`);
    return false;
  }
};

const testSubmitFeedback = async () => {
  log.test('Testing feedback submission...');
  const result = await apiCall('POST', '/sentiment/feedback', {
    category: 'general',
    subject: 'Test Feedback',
    text: 'This is a test feedback with positive sentiment. Great service!',
    rating: 5
  });

  if (result.success) {
    log.success('Feedback submission test passed');
    log.info(`Feedback ID: ${result.data.feedback.id}`);
    log.info(`Detected sentiment: ${result.data.feedback.sentiment}`);
    return true;
  } else {
    log.error(`Feedback submission test failed: ${result.error}`);
    return false;
  }
};

const testSentimentSummary = async () => {
  log.test('Testing sentiment summary...');
  const result = await apiCall('GET', '/sentiment/summary?period=30');

  if (result.success && result.data.summary) {
    log.success('Sentiment summary test passed');
    log.info(`Total feedback: ${result.data.summary.total}`);
    log.info(`Positive: ${result.data.summary.positivePercentage}%`);
    return true;
  } else {
    log.error(`Sentiment summary test failed: ${result.error}`);
    return false;
  }
};

const testReportGeneration = async () => {
  log.test('Testing report generation (this may take 10-15 seconds)...');
  const result = await apiCall('POST', '/automated-reports/generate', {
    reportType: 'daily',
    date: new Date().toISOString()
  });

  if (result.success && result.data.report) {
    log.success('Report generation test passed');
    log.info(`Report ID: ${result.data.report.id}`);
    log.info(`Report type: ${result.data.report.type}`);
    log.info(`Tokens used: ${result.data.metadata.tokensUsed}`);
    log.info(`Generation time: ${result.data.metadata.generationTime}ms`);
    return true;
  } else {
    log.error(`Report generation test failed: ${result.error}`);
    return false;
  }
};

const testReportsList = async () => {
  log.test('Testing reports list...');
  const result = await apiCall('GET', '/automated-reports?limit=5');

  if (result.success && result.data.reports) {
    log.success('Reports list test passed');
    log.info(`Total reports: ${result.data.pagination.total}`);
    return true;
  } else {
    log.error(`Reports list test failed: ${result.error}`);
    return false;
  }
};

const testReportPreview = async () => {
  log.test('Testing report preview...');
  const result = await apiCall('GET', '/automated-reports/preview/daily');

  if (result.success && result.data.data) {
    log.success('Report preview test passed');
    log.info(`Children present: ${result.data.data.childrenPresent}`);
    return true;
  } else {
    log.error(`Report preview test failed: ${result.error}`);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('NLP FEATURES TEST SUITE');
  console.log('='.repeat(60) + '\n');

  log.info(`API URL: ${API_URL}`);
  
  if (TEST_TOKEN === 'your_test_jwt_token_here') {
    log.warn('Using default test token. Set TEST_TOKEN environment variable for actual testing.');
    log.warn('Tests will likely fail without a valid token.\n');
  }

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Chatbot Tests
  console.log('\n' + '-'.repeat(60));
  console.log('CHATBOT TESTS');
  console.log('-'.repeat(60) + '\n');

  results.tests.push({ name: 'Chatbot Query', passed: await testChatbotQuery() });
  results.tests.push({ name: 'Quick Ask', passed: await testQuickAsk() });
  results.tests.push({ name: 'Chat Session', passed: await testChatSession() });

  // Sentiment Analysis Tests
  console.log('\n' + '-'.repeat(60));
  console.log('SENTIMENT ANALYSIS TESTS');
  console.log('-'.repeat(60) + '\n');

  results.tests.push({ name: 'Sentiment Analysis', passed: await testSentimentAnalysis() });
  results.tests.push({ name: 'Submit Feedback', passed: await testSubmitFeedback() });
  results.tests.push({ name: 'Sentiment Summary', passed: await testSentimentSummary() });

  // Report Generation Tests
  console.log('\n' + '-'.repeat(60));
  console.log('AUTOMATED REPORTS TESTS');
  console.log('-'.repeat(60) + '\n');

  results.tests.push({ name: 'Report Generation', passed: await testReportGeneration() });
  results.tests.push({ name: 'Reports List', passed: await testReportsList() });
  results.tests.push({ name: 'Report Preview', passed: await testReportPreview() });

  // Calculate results
  results.tests.forEach(test => {
    if (test.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  results.tests.forEach(test => {
    const status = test.passed ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    console.log(`  ${test.name}: ${status}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.tests.length} tests`);
  log.success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}`);
  }
  console.log('-'.repeat(60) + '\n');

  if (results.passed === results.tests.length) {
    log.success('All tests passed! NLP features are working correctly. 🎉');
  } else {
    log.warn('Some tests failed. Check the output above for details.');
    log.info('\nCommon issues:');
    log.info('  1. Invalid or missing JWT token');
    log.info('  2. OpenAI API key not configured');
    log.info('  3. Server not running');
    log.info('  4. Database connection issues');
    log.info('  5. User role permissions');
  }

  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(error => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});
