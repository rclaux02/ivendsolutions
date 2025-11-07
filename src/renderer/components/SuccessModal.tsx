import React, { useState, useEffect } from 'react';
import handImg from '../assets/images/hand.png';

interface SuccessModalProps {
  onFeedbackSubmitted: (feedback: 'happy' | 'neutral' | 'sad') => void;
  onTimeout?: () => void;
  totalProducts?: number;
  currentProductIndex?: number;
  currentProductName?: string;
  onPauseTimer?: (paused: boolean) => void; // New prop to pause main timer
  arduinoStatus?: 'idle' | 'motor-on' | 'sensor-on' | 'dispensed'; // Arduino status
  onArduinoStatusChange?: (status: 'idle' | 'motor-on' | 'sensor-on' | 'dispensed') => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  onFeedbackSubmitted, 
  onTimeout, 
  totalProducts = 1, 
  currentProductIndex = 1, 
  currentProductName,
  onPauseTimer,
  arduinoStatus = 'idle',
  onArduinoStatusChange
}) => {
  const [currentStatus, setCurrentStatus] = useState<'dispensing' | 'dispensed' | 'thanks'>('dispensing');
  const [timeLeft, setTimeLeft] = useState(20);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Preparando producto');
  // 🚀 ARDUINO INTEGRATION: Usar directamente el prop currentProductIndex
  // const [currentProductIndexLocal, setCurrentProductIndexLocal] = useState(1);
  const [thanksCountdown, setThanksCountdown] = useState(5);
  
  // 🔍 DIAGNÓSTICO: Log cuando se monta el componente (solo una vez)
  useEffect(() => {
    console.log('[SuccessModal] 🚀 Componente montado con valores:', {
      totalProducts,
      currentProductIndex,
      currentProductName,
      arduinoStatus
    });
  }, []); // ✅ Array vacío = solo al montar

  // Listener para evento personalizado de cambio a 'dispensed'
  useEffect(() => {
    const handleForceDispensed = () => {
      console.log('[SuccessModal] 🚀 Evento force-dispensed recibido, cambiando a caritas');
      setCurrentStatus('dispensed');
    };

    window.addEventListener('force-dispensed', handleForceDispensed);
    
    return () => {
      window.removeEventListener('force-dispensed', handleForceDispensed);
    };
  }, []);

  // 🚀 INTEGRACIÓN ARDUINO: Barra azul mientras gira, verde cuando cae (STPOK)
  useEffect(() => {
    if (currentStatus === 'dispensing') {
      if (arduinoStatus === 'motor-on') {
        console.log('[SuccessModal] 🔵 Motor girando - iniciando barra azul para producto actual');
        setCurrentMessage('Dispensando');
        
        // Resetear barra a 0% cuando inicia el motor
        setProgress(0);
        
        // Iniciar barra azul que se llena gradualmente mientras gira
        const progressInterval = setInterval(() => {
          setProgress(prevProgress => {
            const newProgress = prevProgress + 2; // 2% cada 100ms = 20% por segundo
            return Math.min(newProgress, 95); // Máximo 95% hasta que llegue STPOK
          });
        }, 100);
        
        // Cleanup cuando cambie el estado
        return () => clearInterval(progressInterval);
        
      } else if (arduinoStatus === 'dispensed') {
        console.log('[SuccessModal] 🎯 Arduino STPOK recibido - completando barra a 100% y verde');
        console.log(`[SuccessModal] 📊 Producto actual: ${currentProductIndex} de ${totalProducts}`);
        
        // Completar la barra a 100% y mostrar éxito
        setProgress(100);
        setCurrentMessage('¡Producto dispensado exitosamente!');
        
        // Si es el último producto, cambiar a caritas después de un delay
        if (currentProductIndex >= totalProducts) {
          console.log('[SuccessModal] 🎯 Último producto completado - cambiando a caritas');
          setTimeout(() => {
            setCurrentStatus('dispensed');
          }, 500); // 0.5 segundos para mostrar el éxito del último producto
        } else {
          // Si NO es el último producto, resetear estado del Arduino después de mostrar éxito
          console.log(`[SuccessModal] 🔄 Producto ${currentProductIndex} completado - preparando siguiente`);
          setTimeout(() => {
            console.log('[SuccessModal] 🔄 Reseteando Arduino para siguiente producto');
            if (onArduinoStatusChange) {
              onArduinoStatusChange('idle');
            }
          }, 300); // 0.3 segundos para mostrar el éxito antes de resetear
        }
      }
    }
  }, [arduinoStatus, currentProductIndex, totalProducts, currentStatus, onArduinoStatusChange]);
  
  // 🚀 ARDUINO INTEGRATION: Resetear progreso solo cuando cambia el currentProductIndex
  useEffect(() => {
    if (currentProductIndex !== undefined && currentProductIndex > 0) {
      console.log(`[SuccessModal] 🔄 Producto actual: ${currentProductIndex} de ${totalProducts}`);
      
      // Resetear progreso cuando cambia el producto (sin depender del arduinoStatus)
      if (currentProductIndex <= totalProducts && currentStatus === 'dispensing') {
        setProgress(0);
        setCurrentMessage('Preparando producto');
        console.log(`[SuccessModal] 🔄 Producto ${currentProductIndex} iniciado, reseteando progreso a 0%`);
      }
    }
  }, [currentProductIndex, totalProducts, currentStatus]);
  
  // 🔍 DIAGNÓSTICO: Log cuando cambia el estado
  useEffect(() => {
    console.log('[SuccessModal] 🔍 Estado cambiado a:', currentStatus);
  }, [currentStatus]);
  
  // 🔍 DIAGNÓSTICO: Log cuando cambia arduinoStatus (ya no se usa)
  // useEffect(() => {
  //   console.log('[SuccessModal] 🚀 Arduino status cambiado a:', arduinoStatus);
  // }, [arduinoStatus]);

  // Pause main timer when dispensing starts
  useEffect(() => {
    if (onPauseTimer) {
      onPauseTimer(true);
      console.log('[SuccessModal] Main timer paused during dispensing');
    }
    
    // Resume main timer when component unmounts
    return () => {
      if (onPauseTimer) {
        onPauseTimer(false);
        console.log('[SuccessModal] Main timer resumed after dispensing');
      }
    };
  }, [onPauseTimer]);
  
  // Format time for display (mm:ss)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

    // 🚀 ARDUINO INTEGRATION: Timer automático DESHABILITADO - solo Arduino controla la barra
  useEffect(() => {
    if (currentStatus === 'dispensing' && currentProductIndex <= totalProducts) {
      console.log('[SuccessModal] 🚀 Modo Arduino: Timer automático deshabilitado, esperando STPOK');
      
      // Solo timer de seguridad para casos extremos (30 segundos)
      const safetyTimer = setTimeout(() => {
        console.log('[SuccessModal] ⚠️ Timer de seguridad activado - forzando completado');
        setProgress(100);
        setCurrentStatus('dispensed');
      }, 30000); // 30s de seguridad
      
      // Cleanup
      return () => {
        clearTimeout(safetyTimer);
      };
    }
  }, [currentStatus, totalProducts, currentProductIndex]);

  // 🚀 ARDUINO INTEGRATION: Resetear mensaje y progreso cuando inicia dispensado
  useEffect(() => {
    if (currentStatus === 'dispensing') {
      setCurrentMessage('Preparando producto');
      setProgress(0); // Resetear barra a 0% cuando inicia "Preparando producto"
    }
  }, [currentStatus]); // ✅ SOLO currentStatus como dependencia

  // 🚀 ARDUINO INTEGRATION: Resetear estado cuando cambia producto
  useEffect(() => {
    if (currentStatus === 'dispensing' && currentProductIndex > 1) {
      console.log(`[SuccessModal] 🔄 Cambio de producto detectado, reseteando estado`);
      setCurrentMessage('Preparando producto');
      setProgress(0); // Resetear barra para el nuevo producto
      
      // Resetear estado del Arduino para el nuevo producto
      if (onArduinoStatusChange) {
        onArduinoStatusChange('idle');
      }
    }
  }, [currentProductIndex, currentStatus, onArduinoStatusChange]);

  // 🚀 ARDUINO INTEGRATION: Deshabilitado - Arduino controla mensajes y progreso
  // useEffect(() => {
  //   if (currentStatus === 'dispensing') {
  //     if (progress < 33) {
  //       setCurrentMessage('Preparando producto');
  //     } else if (progress < 80) {
  //       setCurrentMessage('Dispensando');
  //     } else if (progress >= 80) {
  //       setCurrentMessage('¡Producto dispensado exitosamente!');
  //     }
  //     
  //     // Debug: mostrar progreso en consola
  //     if (progress % 25 === 0) { // Cada 25%
  //       console.log(`[SuccessModal] 📊 Progreso: ${progress.toFixed(1)}% - Mensaje: ${currentMessage}`);
  //     }
  //   }
  // }, [progress, currentStatus]);
  


  // 20-second countdown timer for feedback screen - NO DEPENDENCIAS EXTERNAS
  useEffect(() => {
    console.log('[SuccessModal] 🔍 DIAGNÓSTICO - Timer useEffect triggered:', { currentStatus, timeLeft });
    
    if (currentStatus === 'dispensed') {
      console.log('[SuccessModal] ✅ Estado "dispensed" detectado, iniciando timer de 20s');
      
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          console.log('[SuccessModal] ⏰ Timer tick:', { prevTime, newTime: prevTime - 1 });
          
          if (prevTime <= 1) {
            console.log('[SuccessModal] ⏰ Timer expirado, llamando onTimeout');
            clearInterval(timer);
            if (onTimeout) {
              onTimeout();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => {
        console.log('[SuccessModal] 🧹 Limpiando timer');
        clearInterval(timer);
      };
    } else {
      console.log('[SuccessModal] ⚠️ Estado NO es "dispensed":', currentStatus);
    }
  }, [currentStatus]); // ✅ SOLO currentStatus como dependencia

  // Handle feedback submission and clear timer
  const handleFeedbackSubmitted = (feedback: 'happy' | 'neutral' | 'sad') => {
    onFeedbackSubmitted(feedback);
  };

  // 🚀 INTEGRACIÓN ARDUINO: Color de barra basado en estado del Arduino
  const getProgressColor = () => {
    if (arduinoStatus === 'dispensed') {
      return 'bg-green-500'; // Verde cuando Arduino confirma con STPOK
    } else if (arduinoStatus === 'motor-on') {
      return 'bg-blue-500'; // Azul mientras el motor está girando
    } else {
      return 'bg-gray-300'; // Gris cuando está "Preparando producto" (barra vacía)
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30" data-success-modal="true">
      {currentStatus === 'dispensing' ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center w-[420px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black text-center mb-4">Dispensando...</h2>
            
            {/* Indicador de productos múltiples */}
            {totalProducts > 1 && (
              <div className="text-center mb-3">
                <span className="text-lg font-semibold text-gray-600">
                  {currentProductIndex} de {totalProducts}
                </span>
                {currentProductName && (
                  <p className="text-sm text-gray-500 mt-1">
                    {currentProductName}
                  </p>
                )}
              </div>
            )}
            
            {/* Mensaje del estado actual */}
            <p className={`text-lg text-center mb-4 min-h-[24px] font-semibold ${
              currentMessage === '¡Producto dispensado exitosamente!' 
                ? 'text-green-600 text-xl' 
                : 'text-gray-700'
            }`}>
              {currentMessage}
            </p>
            

            
            {/* Barra de progreso animada */}
            <div className="w-80 h-4 bg-gray-200 rounded-full overflow-hidden mt-4">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor()}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            

            

          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center w-[400px]">
          {/* Imagen de la mano */}
          <div className="mb-4 flex justify-center">
            <img src={handImg} alt="hand" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>
          {/* Texto principal */}
          <h2 className="text-2xl font-bold text-black text-center mb-2">Muchas gracias!<br />vuelva pronto</h2>
          {/* Subtítulo */}
          <p className="text-lg text-black text-center mb-6 font-semibold">¿Que tal te atendimos?</p>
          {/* Caritas SVG outline */}
          <div className="flex flex-row justify-center items-center gap-8 bg-[#ededed] rounded-xl px-4 py-4 w-full">
            {/* Carita feliz */}
            <button onClick={() => handleFeedbackSubmitted('happy')} className="transition-transform hover:scale-110">
              <span className="inline-block">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="28" stroke="#111" strokeWidth="4" fill="none"/>
                  <circle cx="22" cy="28" r="3" fill="#111"/>
                  <circle cx="42" cy="28" r="3" fill="#111"/>
                  <path d="M24 40C26.5 44 37.5 44 40 40" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
            {/* Carita neutra */}
            <button onClick={() => handleFeedbackSubmitted('neutral')} className="transition-transform hover:scale-110">
              <span className="inline-block">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="28" stroke="#111" strokeWidth="4" fill="none"/>
                  <circle cx="22" cy="28" r="3" fill="#111"/>
                  <circle cx="42" cy="28" r="3" fill="#111"/>
                  <line x1="24" y1="42" x2="40" y2="42" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
            {/* Carita triste */}
            <button onClick={() => handleFeedbackSubmitted('sad')} className="transition-transform hover:scale-110">
              <span className="inline-block">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="28" stroke="#111" strokeWidth="4" fill="none"/>
                  <circle cx="22" cy="28" r="3" fill="#111"/>
                  <circle cx="42" cy="28" r="3" fill="#111"/>
                  <path d="M24 44C26.5 40 37.5 40 40 44" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessModal; 