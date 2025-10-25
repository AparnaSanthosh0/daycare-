#!/usr/bin/env node
/**
 * API Test Script for Child Grouping Recommendation System
 * This script tests all the API endpoints to ensure they're working correctly
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';
const TEST_CHILD_ID = 'child_1';

// Mock authentication token (replace with real token in production)
const AUTH_TOKEN = 'your-test-token-here';

async function testAPI() {
  console.log('🧪 TESTING CHILD GROUPING RECOMMENDATION API');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Get available interests
    console.log('\n1️⃣ Testing: Get Available Interests');
    const interestsResponse = await fetch(`${BASE_URL}/api/recommendations/available-interests`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (interestsResponse.ok) {
      const interests = await interestsResponse.json();
      console.log('✅ Available interests:', interests.interests.length, 'categories');
      console.log('   Categories:', Object.keys(interests.categories).join(', '));
    } else {
      console.log('❌ Failed to get interests:', interestsResponse.status);
    }

    // Test 2: Get child recommendations
    console.log('\n2️⃣ Testing: Get Child Recommendations');
    const recommendationsResponse = await fetch(`${BASE_URL}/api/recommendations/child/${TEST_CHILD_ID}?k=3&minGroupSize=2&maxGroupSize=4`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (recommendationsResponse.ok) {
      const recommendations = await recommendationsResponse.json();
      console.log('✅ Recommendations generated successfully');
      console.log('   Target Child:', recommendations.targetChild.name);
      console.log('   Individual Partners:', recommendations.individualPartners.length);
      console.log('   Recommended Groups:', recommendations.recommendedGroups.length);
      console.log('   Algorithm:', recommendations.modelInfo.algorithm);
    } else {
      console.log('❌ Failed to get recommendations:', recommendationsResponse.status);
    }

    // Test 3: Get activity-specific recommendations
    console.log('\n3️⃣ Testing: Get Activity-Specific Recommendations');
    const activityResponse = await fetch(`${BASE_URL}/api/recommendations/activity/${TEST_CHILD_ID}?activityType=arts_crafts&k=3`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (activityResponse.ok) {
      const activityData = await activityResponse.json();
      console.log('✅ Activity recommendations generated');
      console.log('   Activity Type:', activityData.activityType);
      console.log('   Activity Partners:', activityData.activityPartners.length);
      console.log('   Total Matches:', activityData.totalMatches);
    } else {
      console.log('❌ Failed to get activity recommendations:', activityResponse.status);
    }

    // Test 4: Update child interests
    console.log('\n4️⃣ Testing: Update Child Interests');
    const updateResponse = await fetch(`${BASE_URL}/api/recommendations/update-interests/${TEST_CHILD_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        interests: ['arts_crafts', 'music', 'reading'],
        activityPreferences: [
          {
            activityType: 'arts_crafts',
            preferenceLevel: 5,
            lastEngaged: new Date().toISOString()
          }
        ],
        socialPreferences: {
          groupSize: 'medium',
          interactionStyle: 'mixed',
          leadershipTendency: 'neutral'
        }
      })
    });
    
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('✅ Child interests updated successfully');
      console.log('   Updated Child:', updateData.child.name);
      console.log('   Interests:', updateData.child.interests.length);
    } else {
      console.log('❌ Failed to update interests:', updateResponse.status);
    }

    // Test 5: Get system statistics
    console.log('\n5️⃣ Testing: Get System Statistics');
    const statsResponse = await fetch(`${BASE_URL}/api/recommendations/stats`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ System statistics retrieved');
      console.log('   Total Children:', stats.totalChildren);
      console.log('   Children with Interests:', stats.childrenWithInterests);
      console.log('   Interest Coverage:', stats.interestCoverage + '%');
      console.log('   Model Status:', stats.modelStatus.loaded ? 'Loaded' : 'Not Loaded');
    } else {
      console.log('❌ Failed to get statistics:', statsResponse.status);
    }

    console.log('\n🎉 API TESTING COMPLETED!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    console.log('\n💡 Make sure your server is running: npm start');
    console.log('💡 Check if the server is accessible at:', BASE_URL);
  }
}

// Run the test
testAPI();
