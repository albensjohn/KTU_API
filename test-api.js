// test-api.js - Test your KTU API
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing KTU API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${health.data.status}`);
    console.log(`   Cached items: ${health.data.cache.keys}\n`);

    // Test 2: Announcements
    console.log('2️⃣ Testing Announcements...');
    const announcements = await axios.get(`${API_BASE}/api/announcements`);
    console.log('✅ Announcements fetched');
    console.log(`   Count: ${announcements.data.count}`);
    if (announcements.data.announcements.length > 0) {
      console.log(`   Latest: ${announcements.data.announcements[0].title}\n`);
    }

    // Test 3: Public Results (replace with valid register number)
    console.log('3️⃣ Testing Public Results...');
    console.log('   Enter a valid register number to test:');
    console.log('   Example: curl http://localhost:3000/api/results/ABC20CS001\n');

    // Test 4: Student Profile (requires credentials)
    console.log('4️⃣ Testing Student Profile (Login Required)...');
    console.log('   Example:');
    console.log('   curl -X POST http://localhost:3000/api/profile \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"registerNo":"ABC20CS001","password":"your_password"}\'\n');

    console.log('✅ All basic tests passed!');
    console.log('\n📚 API is ready to use. Check README.md for full documentation.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run tests
testAPI();
