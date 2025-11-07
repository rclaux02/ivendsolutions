const { ipcRenderer } = require('electron');

async function diagnoseDispenseIssue() {
  console.log('🔍 Diagnosing dispense issue after POS payment...');
  
  try {
    // Test 1: Check if we're in Electron environment
    console.log('\n📊 Test 1: Checking Electron environment...');
    if (typeof window !== 'undefined' && window.electron) {
      console.log('✅ Electron environment detected');
    } else {
      console.error('❌ Not in Electron environment');
      return;
    }
    
    // Test 2: Check hardware status
    console.log('\n📊 Test 2: Checking hardware status...');
    const status = await window.electron.ipcRenderer.invoke('hardware:get-status');
    console.log('Hardware status:', status);
    
    if (!status.success) {
      console.error('❌ Hardware not available:', status.error);
      console.log('💡 Solution: Check Arduino connection and COM port');
      return;
    }
    
    // Test 3: Initialize hardware
    console.log('\n📊 Test 3: Initializing hardware...');
    const initResult = await window.electron.ipcRenderer.invoke('hardware:initialize');
    console.log('Hardware initialization:', initResult);
    
    if (!initResult) {
      console.error('❌ Hardware initialization failed');
      console.log('💡 Solution: Check Arduino firmware and serial connection');
      return;
    }
    
    // Test 4: Check database connection
    console.log('\n📊 Test 4: Checking database connection...');
    try {
      const dbTest = await window.electron.ipcRenderer.invoke('test-db-connection');
      console.log('Database connection:', dbTest);
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
    }
    
    // Test 5: Test dispense with slot 1
    console.log('\n📊 Test 5: Testing dispense from slot 1...');
    const dispenseResult = await window.electron.ipcRenderer.invoke('hardware:dispense-product', '1');
    console.log('Dispense result:', dispenseResult);
    
    if (dispenseResult.success) {
      console.log('✅ Hardware dispense test successful');
      console.log('Message:', dispenseResult.message);
      console.log('Sensor activated:', dispenseResult.sensorActivated);
      console.log('Hardware connected:', dispenseResult.hardwareConnected);
      
      if (!dispenseResult.sensorActivated) {
        console.warn('⚠️  Product dispensed but sensor not activated');
        console.log('💡 Solution: Check sensor wiring and positioning');
      }
    } else {
      console.error('❌ Hardware dispense test failed:', dispenseResult.message);
      
      if (dispenseResult.message.includes('Arduino not connected')) {
        console.log('💡 Solution: Check Arduino USB connection and COM port');
      } else if (dispenseResult.message.includes('sensor')) {
        console.log('💡 Solution: Check sensor wiring and positioning');
      } else {
        console.log('💡 Solution: Check motor wiring and Arduino firmware');
      }
    }
    
    // Test 6: Check product inventory
    console.log('\n📊 Test 6: Checking product inventory...');
    try {
      const products = await window.electron.ipcRenderer.invoke('get-products');
      console.log('Available products:', products.length);
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('First product:', {
          id: firstProduct.id,
          name: firstProduct.name,
          slot_id: firstProduct.slot_id,
          slot_quantity: firstProduct.slot_quantity
        });
      }
    } catch (productError) {
      console.error('❌ Product inventory check failed:', productError);
    }
    
    // Test 7: Test database dispense operation
    console.log('\n📊 Test 7: Testing database dispense operation...');
    try {
      const dbDispenseResult = await window.electron.ipcRenderer.invoke('dispense-product-db', '1', '1', 1);
      console.log('Database dispense result:', dbDispenseResult);
      
      if (dbDispenseResult.success) {
        console.log('✅ Database dispense operation successful');
        console.log('Slot ID:', dbDispenseResult.slotId);
        console.log('Quantity dispensed:', dbDispenseResult.quantityDispensed);
      } else {
        console.error('❌ Database dispense operation failed:', dbDispenseResult.message);
      }
    } catch (dbDispenseError) {
      console.error('❌ Database dispense test failed:', dbDispenseError);
    }
    
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error.message);
  }
}

// Run the diagnostic
diagnoseDispenseIssue(); 