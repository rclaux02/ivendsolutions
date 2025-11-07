const axios = require('axios');

async function testIzipayAPI() {
  console.log('🔍 Testing Izipay API connection...');
  
  const apiUrl = 'http://localhost:9090/API_PPAD';
  
  try {
    // Test 1: Check if API is running
    console.log('\n📊 Test 1: Checking if Izipay API is running...');
    console.log(`Connecting to: ${apiUrl}`);
    
    const response = await axios.get(`${apiUrl}/ping`, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Accept any status less than 500 as success
      }
    });
    
    console.log('✅ Izipay API is responding');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    // Test 2: Test authentication
    console.log('\n📊 Test 2: Testing authentication...');
    
    const authResponse = await axios.post(`${apiUrl}/auth`, {
      username: 'izipay',
      password: 'izipay'
    }, {
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    console.log('✅ Authentication test completed');
    console.log('Status:', authResponse.status);
    console.log('Response:', authResponse.data);
    
  } catch (error) {
    console.error('❌ Izipay API test failed');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solution: Start the Izipay API service');
      console.error('   - Check if the API is running on localhost:9090');
      console.error('   - Verify firewall settings');
      console.error('   - Ensure API service is installed and configured');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Solution: API timeout');
      console.error('   - Check network connectivity');
      console.error('   - Verify API service is responding');
    } else {
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
    }
  }
}

// Test COM port availability
async function testCOMPorts() {
  console.log('\n🔌 Testing COM ports...');
  
  try {
    const { SerialPort } = require('serialport');
    
    const ports = await SerialPort.list();
    console.log('Available COM ports:');
    
    if (ports.length === 0) {
      console.log('❌ No COM ports found');
      console.log('💡 Solution: Check USB connections and drivers');
    } else {
      ports.forEach((port, index) => {
        console.log(`${index + 1}. ${port.path} - ${port.manufacturer || 'Unknown'}`);
      });
      
      // Check if COM9 is available
      const com9Available = ports.some(port => port.path === 'COM9');
      if (com9Available) {
        console.log('✅ COM9 is available (configured port)');
      } else {
        console.log('⚠️  COM9 is not available (configured port)');
        console.log('💡 Solution: Update port configuration or check device connection');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing COM ports:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testIzipayAPI();
  await testCOMPorts();
  
  console.log('\n📝 Summary:');
  console.log('- If Izipay API fails: Start the API service');
  console.log('- If COM ports issue: Check USB connections');
  console.log('- Run this test in both dev and production environments');
}

runAllTests(); 