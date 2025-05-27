import React, { useState, useEffect } from 'react';
import { useHardware } from '../hooks/useHardware';

// Helper function to test testAPI
const testBridge = async () => {
  console.log('======= TESTING BRIDGES =======');
  
  // Test testAPI
  try {
    console.log('Window object exists:', !!window);
    
    // Check testAPI
    const testAPI = (window as any).testAPI;
    console.log('testAPI exists:', !!testAPI);
    
    if (testAPI) {
      console.log('testAPI.hello():', testAPI.hello());
      console.log('testAPI.ping():', testAPI.ping());
    }
    
    // Check electron
    const electron = (window as any).electron;
    console.log('electron exists:', !!electron);
    
    if (electron) {
      console.log('electron.ipcRenderer exists:', !!electron.ipcRenderer);
      
      if (electron.ipcRenderer) {
        // Try a test IPC call
        try {
          console.log('Testing IPC with test:ping...');
          const pingResult = await electron.ipcRenderer.invoke('test:ping');
          console.log('test:ping result:', pingResult);
        } catch (error) {
          console.error('Error with test IPC call:', error);
        }
      }
    }
  } catch (e) {
    console.error('Error testing bridges:', e);
  }
  
  console.log('======= TEST COMPLETE =======');
};

export const IzipayTestModal: React.FC = () => {
  const { status, error, izipayService, resetError } = useHardware();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [ipcStatus, setIpcStatus] = useState<string>('Checking...');
  const [bridgeTest, setBridgeTest] = useState<string>('Not tested');
  
  // New state for COM port testing
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('COM9'); // Default to COM9
  const [portTestResult, setPortTestResult] = useState<string>('');
  const [isTestingPort, setIsTestingPort] = useState(false);

  // Test the bridges on mount
  useEffect(() => {
    const runTest = async () => {
      try {
        setBridgeTest('Testing...');
        await testBridge();
        
        // Check results
        const testAPI = (window as any).testAPI;
        const electron = (window as any).electron;
        
        if (testAPI && electron?.ipcRenderer) {
          setBridgeTest('Both bridges available');
          setIpcStatus('IPC bridge available');
        } else if (testAPI) {
          setBridgeTest('Only testAPI available');
          setIpcStatus('electron bridge not found');
        } else if (electron?.ipcRenderer) {
          setBridgeTest('Only electron available');
          setIpcStatus('IPC bridge available');
        } else {
          setBridgeTest('No bridges available');
          setIpcStatus('IPC bridge not found');
        }
      } catch (e) {
        console.error('Error in bridge test:', e);
        setBridgeTest(`Error: ${e}`);
        setIpcStatus(`Error checking IPC: ${e}`);
      }
    };
    
    runTest();
  }, []);

  // Load available COM ports
  useEffect(() => {
    let isMounted = true;
    
    const loadPorts = async () => {
      if (izipayService && isMounted) {
        try {
          console.log('Loading available COM ports once...');
          const ports = await izipayService.listPorts();
          
          if (isMounted) {
            setAvailablePorts(ports);
            if (ports.length > 0 && !selectedPort) {
              setSelectedPort(ports[0]);
            }
          }
        } catch (error) {
          console.error('Error loading COM ports:', error);
        }
      }
    };
    
    // Only load ports once on component mount
    loadPorts();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array means this runs once on mount

  // Clear errors when component mounts/unmounts
  useEffect(() => {
    resetError();
    return () => resetError();
  }, [resetError]);

  const handleTestLogin = async () => {
    try {
      setIsLoading(true);
      setTestResult('');
      setLoginError(null);
      
      console.log('Starting IziPay login test...');
      
      if (!izipayService) {
        throw new Error('IziPay service not available');
      }
      
      const result = await izipayService.login('izipay', 'izipay');
      console.log('Login completed with result:', result);
      
      setIsConnected(result);
      setTestResult(result ? 'Login successful!' : 'Login failed.');
    } catch (error) {
      console.error('Login test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLoginError(errorMessage);
      setTestResult(`Error: ${errorMessage}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestTransaction = async () => {
    try {
      console.log('=== TRANSACTION FLOW [1] ===');
      console.log('Starting transaction in IzipayTestModal.handleTestTransaction');
      console.log('Transaction parameters:', { amount });
      
      setIsLoading(true);
      setTestResult('');
      setLoginError(null);

      if (!izipayService) {
        console.error('=== TRANSACTION FLOW [ERROR] === IziPay service not available');
        throw new Error('IziPay service not available');
      }

      if (!isConnected) {
        console.log('=== TRANSACTION FLOW [ERROR] === Not logged in, stopping transaction');
        setTestResult('Error: Not logged in. Please login first.');
        return;
      }

      if (!amount || isNaN(Number(amount))) {
        console.log('=== TRANSACTION FLOW [ERROR] === Invalid amount:', amount);
        setTestResult('Error: Please enter a valid amount.');
        return;
      }

      const transaction = {
        ecr_transaccion: "01",
        ecr_amount: '110',
        ecr_aplicacion: 'POS',
        ecr_currency_code: '604'
      };
      

      console.log('=== TRANSACTION FLOW [2] ===');
      console.log('Sending transaction to izipayService.processTransaction:', transaction);
      const result = await izipayService.processTransaction(transaction);
      console.log('=== TRANSACTION FLOW [7] ===');
      console.log('Transaction result received in IzipayTestModal:', result);
      
      setTestResult(`Transaction processed successfully!\nResponse: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('=== TRANSACTION FLOW [ERROR] ===');
      console.error('Transaction error in IzipayTestModal.handleTestTransaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLoginError(errorMessage);
      setTestResult(`Error: ${errorMessage}`);
    } finally {
      console.log('=== TRANSACTION FLOW [8] ===');
      console.log('Transaction process completed in IzipayTestModal');
      setIsLoading(false);
    }
  };

  const handleTestPort = async () => {
    if (!selectedPort) {
      setPortTestResult('Please select a COM port');
      return;
    }
    
    try {
      setIsTestingPort(true);
      setPortTestResult('');
      
      const result = await izipayService.testPort(selectedPort);
      
      if (result.success) {
        setPortTestResult(`✅ ${result.message}`);
      } else {
        setPortTestResult(`❌ ${result.error || 'Failed to connect to port'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPortTestResult(`❌ Error: ${errorMessage}`);
    } finally {
      setIsTestingPort(false);
    }
  };

  const handleRefreshPorts = async () => {
    try {
      setIsTestingPort(true);
      const ports = await izipayService.listPorts();
      setAvailablePorts(ports);
      if (ports.length > 0 && !selectedPort) {
        setSelectedPort(ports[0]);
      }
      setPortTestResult(`Found ${ports.length} ports`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPortTestResult(`❌ Error refreshing ports: ${errorMessage}`);
    } finally {
      setIsTestingPort(false);
    }
  };

  const renderStatus = () => {
    // Safely access nested properties
    const isIzipayConnected = status?.izipay?.connected || false;
    const portPath = status?.izipay?.portPath || 'unknown';
    
    return (
      <div className="space-y-2">
        <p className="text-sm">
          Bridge Test: <span className={bridgeTest.includes('Both') ? 'text-green-500' : 'text-red-500'}>{bridgeTest}</span>
        </p>
        <p className="text-sm">
          IPC Status: <span className={ipcStatus.includes('available') ? 'text-green-500' : 'text-red-500'}>{ipcStatus}</span>
        </p>
        <p className="text-sm">
          IziPay Status: {isIzipayConnected ? 'Connected' : 'Disconnected'}
          {portPath !== 'unknown' && ` (${portPath})`}
        </p>
        <p className="text-sm">
          Login Status: {isConnected ? 'Logged In' : 'Not Logged In'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Test IziPay</h2>
      
      {renderStatus()}

      {/* COM Port Testing Section */}
      <div className="space-y-4 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold">COM Port Testing</h3>
        
        <div className="flex space-x-2">
          <select
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            className="flex-1 px-3 py-2 bg-black/30 border border-white/30 rounded text-white"
            disabled={isTestingPort}
          >
            {availablePorts.length === 0 && <option value="">No ports found</option>}
            {availablePorts.map(port => (
              <option key={port} value={port}>{port}</option>
            ))}
          </select>
          
          <button
            onClick={handleRefreshPorts}
            disabled={isTestingPort}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
        
        <button
          onClick={handleTestPort}
          disabled={isTestingPort || !selectedPort}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isTestingPort ? 'Testing...' : 'Test Connection'}
        </button>
        
        {portTestResult && (
          <div className={`p-3 rounded ${portTestResult.includes('✅') ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
            {portTestResult}
          </div>
        )}
      </div>

      {/* Login & Transaction Section */}
      <div className="space-y-4">
        <button
          onClick={handleTestLogin}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Login'}
        </button>

        <div>
          <label className="block text-sm font-medium mb-1">
            Test Amount (PEN)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 bg-black/30 border border-white/30 rounded text-white"
          />
        </div>

        <button
          onClick={handleTestTransaction}
          disabled={isLoading || !isConnected}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Test Transaction'}
        </button>

        {error && (
          <div className="p-3 bg-red-500/30 border border-red-400 rounded">
            {error}
          </div>
        )}
        
        {loginError && (
          <div className="p-3 bg-red-500/30 border border-red-400 rounded">
            {loginError}
          </div>
        )}

        {testResult && (
          <div className="p-3 bg-black/30 rounded">
            <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
};