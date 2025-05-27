import React, { useState, useEffect } from 'react';
import { Product } from '@/renderer/types/product';
import { Minus, Plus, CircleAlert, AlertTriangle, RotateCcw, Play, AlertCircle, X } from 'lucide-react';
import vapeBoxLogo from '@/renderer/assets/images/vapeBoxSquareLogo.png';

// Simple Dialog component
const Dialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ open, children }) => {
  if (!open) return null;
  return <>{children}</>;
};

interface TestDispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  dispenseProductDb: (productId: string, slotId?: string, quantity?: number) => Promise<any>;
  dispenseProduct: (slotId: string, quantity?: number) => Promise<{success: boolean; message?: string}>;
}

interface DispenseResult {
  product: string;
  slot: string;
  quantityDispensed: number;
  motorSuccess: boolean;
  motorError?: string;
}

interface SimulationLog {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success' | 'command' | 'hardware';
}

const TestDispenseModal: React.FC<TestDispenseModalProps> = ({ 
  isOpen, 
  onClose, 
  products, 
  dispenseProductDb,
  dispenseProduct 
}) => {
  const [testDispenseItems, setTestDispenseItems] = useState<{productId: string; quantity: number; product: Product}[]>([]);
  const [testDispenseStatus, setTestDispenseStatus] = useState<string | null>(null);
  const [testDispenseResults, setTestDispenseResults] = useState<DispenseResult[]>([]);
  const [isTestDispensing, setIsTestDispensing] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([]);
  
  // New state for hardware/simulation selection
  const [useRealHardware, setUseRealHardware] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'fixed' | 'buggy'>('fixed');
  const [showCommandDetails, setShowCommandDetails] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // Helper function to add simulation logs
  const addSimulationLog = (message: string, type: 'info' | 'error' | 'success' | 'command' | 'hardware' = 'info') => {
    setSimulationLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  // Clear logs when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSimulationLogs([]);
    }
  }, [isOpen]);

  // Predefined test scenarios
  const testScenarios = [
    {
      name: "Producto Único - Una Unidad",
      description: "Probar dispensar 1 unidad de un solo producto",
      setup: () => {
        if (products.length > 0) {
          const product = products.find(p => p.slot_id && p.slot_quantity > 0) || products[0];
          setTestDispenseItems([{ productId: String(product.id), quantity: 1, product }]);
        }
      }
    },
    {
      name: "Producto Único - Múltiples Unidades",
      description: "Probar dispensar 3 unidades de un solo producto",
      setup: () => {
        if (products.length > 0) {
          const product = products.find(p => p.slot_id && p.slot_quantity > 2) || products[0];
          setTestDispenseItems([{ productId: String(product.id), quantity: 3, product }]);
        }
      }
    },
    {
      name: "Múltiples Productos - Una Unidad Cada Uno",
      description: "Probar dispensar 1 unidad de 2 productos diferentes",
      setup: () => {
        if (products.length >= 2) {
          const product1 = products.find(p => p.slot_id && p.slot_quantity > 0) || products[0];
          const product2 = products.find(p => p.id !== product1.id && p.slot_id && p.slot_quantity > 0) || products[1];
          setTestDispenseItems([
            { productId: String(product1.id), quantity: 1, product: product1 },
            { productId: String(product2.id), quantity: 1, product: product2 }
          ]);
        }
      }
    },
    {
      name: "Múltiples Unidades - Mismo Slot",
      description: "Probar dispensar 2 unidades del mismo slot (prueba específica del bug)",
      setup: () => {
        if (products.length > 0) {
          const product = products.find(p => p.slot_id && p.slot_quantity > 1) || products[0];
          setTestDispenseItems([{ productId: String(product.id), quantity: 2, product }]);
        }
      }
    }
  ];

  // Clear test dispense list
  const clearTestDispense = () => {
    setTestDispenseItems([]);
    setTestDispenseStatus(null);
    setTestDispenseResults([]);
    setSimulationLogs([]);
  };

  // Simulate hardware behavior without actually calling hardware
  const simulateDispenseHardware = async (slotId: string, quantity: number): Promise<{success: boolean; message?: string}> => {
    // Add initial log for simulation
    addSimulationLog(`Iniciando simulación de dispensado para slot ${slotId}, cantidad ${quantity}`, 'info');
    
    return new Promise((resolve) => {
      setIsSimulating(true);
      
      if (simulationMode === 'fixed') {
        // Simulate the FIXED behavior - motor turns once per unit
        addSimulationLog(`[SIMULACIÓN - MODO CORREGIDO] Dispensando ${quantity} unidades usando múltiples ciclos de motor`, 'hardware');
        
        // Log Arduino commands in sequence
        setTimeout(() => {
          // First command - Initialize sequence
          addSimulationLog(`[ARDUINO 64] Enviando "I42S" (comando de inicialización de dispensado)`, 'command');
        }, 500);
        
        let unitCount = 0;
        const processUnit = () => {
          unitCount++;
          const currentUnit = unitCount;
          
          setTimeout(() => {
            // Ready for motor command response
            addSimulationLog(`[ARDUINO 40] Recibido "MTROK" (listo para comando de motor)`, 'command');
          }, 200);
          
          setTimeout(() => {
            // Send motor command
            addSimulationLog(`[ARDUINO 60] Enviando "M${slotId}F" para la unidad ${currentUnit}/${quantity}`, 'command');
          }, 600);
          
          setTimeout(() => {
            // Motor command received
            addSimulationLog(`[ARDUINO 40] Recibido "MMOK" (comando de motor recibido)`, 'command');
          }, 1000);
          
          setTimeout(() => {
            // Sensor activation
            addSimulationLog(`[ARDUINO 41] Recibido "SNOK" (sensor activado - producto dispensado)`, 'command');
          }, 1500);
          
          setTimeout(() => {
            // Process complete for this unit
            addSimulationLog(`[ARDUINO 43] Recibido "STPOK" (proceso completado para unidad ${currentUnit})`, 'command');
            
            // If more units to process, continue
            if (currentUnit < quantity) {
              addSimulationLog(`[ARDUINO] Esperando antes de dispensar la siguiente unidad (${quantity - currentUnit} restantes)`, 'info');
              setTimeout(processUnit, 1500);
            } else {
              // All units processed
              addSimulationLog(`[SIMULACIÓN] Completado el dispensado de ${quantity} unidades del slot ${slotId}`, 'success');
              setIsSimulating(false);
              resolve({ success: true });
            }
          }, 2000);
        };
        
        // Start processing the first unit after a delay
        setTimeout(processUnit, 1000);
      } else {
        // Simulate the BUGGY behavior - motor only turns once regardless of quantity
        addSimulationLog(`[SIMULACIÓN - MODO BUG] Dispensando ${quantity} unidades con un ÚNICO ciclo de motor (bug)`, 'hardware');
        
        // Log Arduino commands for buggy behavior
        setTimeout(() => {
          // First command - Initialize sequence (only once)
          addSimulationLog(`[ARDUINO 64] Enviando "I42S" (comando de inicialización de dispensado)`, 'command');
        }, 500);
        
        setTimeout(() => {
          // Ready for motor command response
          addSimulationLog(`[ARDUINO 40] Recibido "MTROK" (listo para comando de motor)`, 'command');
        }, 1000);
        
        setTimeout(() => {
          // Send motor command (only once regardless of quantity)
          addSimulationLog(`[ARDUINO 60] Enviando "M${slotId}F" (UN SOLO comando para ${quantity} unidades)`, 'command');
        }, 1500);
        
        setTimeout(() => {
          // Motor command received
          addSimulationLog(`[ARDUINO 40] Recibido "MMOK" (comando de motor recibido)`, 'command');
        }, 2000);
        
        setTimeout(() => {
          // Sensor activation
          addSimulationLog(`[ARDUINO 41] Recibido "SNOK" (sensor activado - UN SOLO producto dispensado)`, 'command');
        }, 2500);
        
        setTimeout(() => {
          // Process complete - but only for one unit!
          addSimulationLog(`[ARDUINO 43] Recibido "STPOK" (proceso completado PERO SOLO PARA 1 UNIDAD)`, 'command');
          addSimulationLog(`[SIMULACIÓN] Completado el dispensado PARCIAL de ${quantity} unidades del slot ${slotId} (solo dispensó 1 unidad debido al bug)`, 'error');
          setIsSimulating(false);
          resolve({ success: true }); // The hardware reports success even though it only dispensed 1 unit!
        }, 3000);
      }
    });
  };

  // Run the actual dispense test
  const runDispenseTest = async () => {
    if (testDispenseItems.length === 0) {
      setTestDispenseStatus('Por favor seleccione un escenario de prueba primero');
      return;
    }

    setIsTestDispensing(true);
    setTestDispenseStatus('Iniciando prueba de dispensado...');
    setTestDispenseResults([]);
    setSimulationLogs([]);
    
    try {
      const results: DispenseResult[] = [];
      
      for (const item of testDispenseItems) {
        setTestDispenseStatus(`Procesando ${item.quantity} unidades de ${item.product.name}...`);
        addSimulationLog(`Procesando ${item.quantity} unidades de ${item.product.name}...`, 'info');
        
        // Get slot information from database
        const productSlotId = item.product.slot_id;
        addSimulationLog(`Usando slot asignado del producto: ${productSlotId}`, 'info');
        const dbResult = await dispenseProductDb(String(item.productId), productSlotId, item.quantity);
        
        if (!dbResult.success) {
          throw new Error(dbResult.message || `Error al encontrar slot disponible para el producto ${item.productId}`);
        }
        
        const { slotId, quantityDispensed = 0 } = dbResult;
        addSimulationLog(`Usando slot ${slotId} para dispensar ${quantityDispensed} unidades`, 'success');
        
        // Use actual hardware instead of simulation
        let motorResult;
        if (!useRealHardware) {
          motorResult = await simulateDispenseHardware(slotId, quantityDispensed);
        } else {
          // Call the actual hardware one unit at a time
          addSimulationLog(`[HARDWARE] Conectando con Arduino real para dispensar ${quantityDispensed} unidades del slot ${slotId} (una por una)`, 'hardware');
          
          let allSuccess = true;
          let lastError = '';
          let successfulDispenses = 0;
          
          // Loop through each unit and dispense one at a time
          for (let i = 0; i < quantityDispensed; i++) {
            addSimulationLog(`[HARDWARE] Dispensando unidad ${i+1}/${quantityDispensed} del slot ${slotId}`, 'command');
            
            // Dispense one unit at a time
            const singleResult = await dispenseProduct(slotId, 1);
            
            if (singleResult.success) {
              successfulDispenses++;
              addSimulationLog(`[HARDWARE] Unidad ${i+1}/${quantityDispensed} dispensada exitosamente`, 'success');
            } else {
              allSuccess = false;
              lastError = singleResult.message || `Error al dispensar unidad ${i+1}/${quantityDispensed}`;
              addSimulationLog(`[HARDWARE] Error al dispensar unidad ${i+1}/${quantityDispensed}: ${lastError}`, 'error');
              break; // Stop on first error
            }
          }
          
          // Create a final result
          motorResult = {
            success: allSuccess,
            message: allSuccess ? `${successfulDispenses} unidades dispensadas exitosamente` : lastError
          };
          
          addSimulationLog(
            `[HARDWARE] Resultado final: ${motorResult.success ? 'Éxito' : 'Error'} - ${motorResult.message}`, 
            motorResult.success ? 'success' : 'error'
          );
        }
        
        results.push({
          product: item.product.name,
          slot: slotId,
          quantityDispensed: quantityDispensed,
          motorSuccess: motorResult.success,
          motorError: motorResult.message
        });
        
        if (!motorResult.success) {
          throw new Error(`Error al dispensar desde el slot ${slotId}: ${motorResult.message}`);
        }
      }
      
      setTestDispenseResults(results);
      
      if (!useRealHardware && simulationMode === 'buggy') {
        setTestDispenseStatus('¡Prueba completada! Nota: En modo "Bug", solo se dispensó 1 unidad por slot aunque se solicitaron más.');
      } else {
        setTestDispenseStatus('¡Prueba completada con éxito!');
      }
      
    } catch (error) {
      console.error('Error durante la prueba de dispensado:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setTestDispenseStatus(`Error: ${errorMsg}`);
      addSimulationLog(`La prueba falló con error: ${errorMsg}`, 'error');
    } finally {
      setIsTestDispensing(false);
    }
  };

  // Format the timestamp for logs
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get the appropriate color for log type
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600';
      case 'success': return 'text-green-600';
      case 'command': return 'text-blue-600';
      case 'hardware': return 'text-purple-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
        <div className="bg-white p-6 rounded-lg text-black w-[95%] max-w-[900px] max-h-[90vh] overflow-y-auto relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold mb-4">Entorno de Prueba de Múltiples Unidades</h2>
          
          {/* Hardware/Simulation Mode Controls */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <AlertCircle size={20} className="mr-2 text-yellow-600" />
              Modo de Operación
            </h3>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-green-600"
                    name="hardwareMode"
                    checked={useRealHardware}
                    onChange={() => setUseRealHardware(true)}
                    disabled={isTestDispensing || isSimulating}
                  />
                  <span className="ml-2">Hardware Real (Arduino)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="hardwareMode"
                    checked={!useRealHardware}
                    onChange={() => setUseRealHardware(false)}
                    disabled={isTestDispensing || isSimulating}
                  />
                  <span className="ml-2">Simulación</span>
                </label>
              </div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox text-purple-600"
                  checked={showCommandDetails}
                  onChange={() => setShowCommandDetails(!showCommandDetails)}
                />
                <span className="ml-2">Mostrar detalles de comandos</span>
              </label>
            </div>
            
            {/* Simulation mode options (only shown when simulation is selected) */}
            {!useRealHardware && (
              <div className="pl-6 mt-2 border-t pt-2">
                <div className="text-sm font-semibold text-gray-700 mb-1">Opciones de Simulación:</div>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      name="simulationMode"
                      checked={simulationMode === 'fixed'}
                      onChange={() => setSimulationMode('fixed')}
                      disabled={isTestDispensing || isSimulating}
                    />
                    <span className="ml-2">Corregido (motor gira una vez por unidad)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-red-600"
                      name="simulationMode"
                      checked={simulationMode === 'buggy'}
                      onChange={() => setSimulationMode('buggy')}
                      disabled={isTestDispensing || isSimulating}
                    />
                    <span className="ml-2">Bug (motor gira solo una vez independientemente de la cantidad)</span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-sm text-gray-600">
              {useRealHardware ? 
                '🔌 Conectando con el hardware real. Las operaciones se ejecutarán en el Arduino.' :
                simulationMode === 'buggy' ? 
                  '⚠️ El modo "Bug" simula el comportamiento defectuoso donde el motor solo gira una vez, independientemente de cuántas unidades se soliciten.' :
                  '✓ El modo "Corregido" simula el comportamiento correcto donde el motor gira una vez por cada unidad solicitada.'}
            </div>
          </div>

          {/* Test Scenarios */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Escenarios de Prueba</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testScenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={scenario.setup}
                  className="p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                  disabled={isTestDispensing || isSimulating}
                >
                  <h4 className="font-semibold text-blue-600">{scenario.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Productos Seleccionados para Prueba</h3>
            <div className="border rounded-lg p-4">
              {testDispenseItems.length === 0 ? (
                <p className="text-gray-500">No hay productos seleccionados. Elija un escenario de prueba arriba.</p>
              ) : (
                <div className="space-y-3">
                  {testDispenseItems.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-[46px] w-[46px] bg-white rounded-md flex-shrink-0 mr-3">
                          <img 
                            src={item.product.image || vapeBoxLogo}
                            alt={item.product.name} 
                            className="h-full w-full object-contain p-1" 
                          />
                        </div>
                        <div>
                          <div className="font-semibold">{item.product.name}</div>
                          <div className="text-sm text-gray-600">Slot: {item.product.slot_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => {
                            const newItems = [...testDispenseItems];
                            const index = newItems.findIndex(i => i.productId === item.productId);
                            if (index !== -1 && newItems[index].quantity > 1) {
                              newItems[index].quantity--;
                              setTestDispenseItems(newItems);
                            }
                          }}
                          className="text-gray-600 bg-gray-200 rounded-full h-[32px] w-[32px] flex items-center justify-center mr-[12px]"
                          disabled={item.quantity <= 1 || isTestDispensing || isSimulating}
                        >
                          <Minus size={18} />
                        </button>
                        <span className="text-lg font-bold text-blue-600 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => {
                            const newItems = [...testDispenseItems];
                            const index = newItems.findIndex(i => i.productId === item.productId);
                            if (index !== -1) {
                              newItems[index].quantity++;
                              setTestDispenseItems(newItems);
                            }
                          }}
                          className="text-gray-600 bg-gray-200 rounded-full h-[32px] w-[32px] flex items-center justify-center"
                          disabled={isTestDispensing || isSimulating}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Simulation Logs */}
          {simulationLogs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Registro de Simulación</h3>
              <div className="border rounded-lg p-2 max-h-[300px] overflow-y-auto bg-gray-50 font-mono text-sm">
                {simulationLogs.filter(log => {
                  // Filter out command logs if details are hidden
                  if (!showCommandDetails && log.type === 'command') {
                    return false;
                  }
                  return true;
                }).map((log, index) => (
                  <div key={index} className={`py-1 px-2 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <span className="text-gray-500">{formatTime(log.timestamp)}</span>
                    <span className={`ml-2 ${getLogColor(log.type)}`}>{log.message}</span>
                  </div>
                ))}
                {isSimulating && (
                  <div className="py-1 px-2 bg-blue-50 animate-pulse">
                    <span className="text-blue-500">Simulación en progreso...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Status */}
          {testDispenseStatus && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Estado de la Prueba</h3>
              <div className={`p-4 rounded-lg ${
                testDispenseStatus.includes('Error') 
                  ? 'bg-red-50 text-red-800' 
                  : testDispenseStatus.includes('éxito') 
                    ? 'bg-green-50 text-green-800'
                    : 'bg-blue-50 text-blue-800'
              }`}>
                <p className="whitespace-pre-wrap">{testDispenseStatus}</p>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testDispenseResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Resultados de la Prueba</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-left">Slot</th>
                      <th className="px-4 py-2 text-left">Cantidad Solicitada</th>
                      <th className="px-4 py-2 text-left">Cantidad Real Dispensada</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testDispenseResults.map((result, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2">{result.product}</td>
                        <td className="px-4 py-2">{result.slot}</td>
                        <td className="px-4 py-2">{result.quantityDispensed}</td>
                        <td className="px-4 py-2">
                          {simulationMode === 'buggy' ? (
                            <span className="text-red-600 font-medium">1 (¡Bug!)</span>
                          ) : (
                            result.quantityDispensed
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.motorSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {result.motorSuccess ? 'Éxito' : 'Fallido'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={clearTestDispense}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg flex items-center"
              disabled={isTestDispensing || isSimulating}
            >
              <RotateCcw size={16} className="mr-2" />
              Limpiar Todo
            </button>
            <div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-black rounded-lg mr-2"
                disabled={isTestDispensing || isSimulating}
              >
                Cerrar
              </button>
              <button
                onClick={runDispenseTest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
                disabled={isTestDispensing || isSimulating || testDispenseItems.length === 0}
              >
                <Play size={16} className="mr-2" />
                {isTestDispensing || isSimulating ? 'Ejecutando...' : 'Ejecutar Prueba'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default TestDispenseModal; 