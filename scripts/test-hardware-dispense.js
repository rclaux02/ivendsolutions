const { ipcRenderer } = require('electron');

async function testHardwareDispense() {
  console.log('🔍 Testing hardware dispense functionality...');
  
  try {
    // Test 1: Check hardware status
    console.log('\n📊 Test 1: Checking hardware status...');
    const status = await ipcRenderer.invoke('hardware:get-status');
    console.log('Hardware status:', status);
    
    if (!status.success) {
      console.error('❌ Hardware not available:', status.error);
      return;
    }
    
    // Test 2: Initialize hardware
    console.log('\n📊 Test 2: Initializing hardware...');
    const initResult = await ipcRenderer.invoke('hardware:initialize');
    console.log('Hardware initialization:', initResult);
    
    if (!initResult) {
      console.error('❌ Hardware initialization failed');
      return;
    }
    
    // Test 3: Test dispense with a specific slot
    console.log('\n📊 Test 3: Testing dispense from slot 1...');
    const dispenseResult = await ipcRenderer.invoke('hardware:dispense-product', '1');
    console.log('Dispense result:', dispenseResult);
    
    if (dispenseResult.success) {
      console.log('✅ Hardware dispense test successful');
      console.log('Message:', dispenseResult.message);
      console.log('Sensor activated:', dispenseResult.sensorActivated);
      console.log('Hardware connected:', dispenseResult.hardwareConnected);
    } else {
      console.error('❌ Hardware dispense test failed:', dispenseResult.message);
    }
    
  } catch (error) {
    console.error('❌ Hardware test failed:', error.message);
  }
}

// Run the test
testHardwareDispense(); 