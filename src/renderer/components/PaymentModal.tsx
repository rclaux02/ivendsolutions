import React, { useState, useEffect } from 'react';
// Import images conditionally to avoid TypeScript errors
// Import Rappi logo and backspace icon
import qr from '../assets/images/dummyQR.png';
import card from '../assets/images/dummyCard.png';
import { X, ArrowRight, QrCode, CreditCard, AlertTriangle, AlertCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';
import FeedbackDetailModal from './FeedbackDetailModal';
import { useHardware } from '../hooks/useHardware';
import FeedbackThankYouModal from './FeedbackThankYouModal';

const MACHINE_ID = '00003'; // Define the machine ID constant

interface CartItem {
  productId: number | string;
  quantity: number;
  unitPrice: number;
  slotId: string;
  discountPercent?: number; // Add discount percentage for calculating discounted price
  // Add any other relevant item details if needed
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentMethodSelected: (method: 'qr' | 'card') => void;
  onPaymentProcessed?: (transactionId: number) => void; // Pass transactionId back
  onPaymentTransactionIdReceived?: (paymentTransactionId: string) => void; // New prop for payment transaction ID
  onFeedbackSubmitted?: (feedback: 'happy' | 'neutral' | 'sad') => void;
  onRetryPayment?: () => void;
  simulateFailure?: boolean; // For testing payment failure
  onComplete?: () => void; // New prop for when the entire payment flow is complete
  onResetToSplashScreen?: () => void; // New prop to reset to splash screen
  onPauseTimer?: (paused: boolean) => void; // New prop to pause main timer
  cartTotal: number; // New prop for the total amount from the cart
  cartItems: CartItem[]; // New prop for the items in the cart
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentMethodSelected,
  onPaymentProcessed,
  onPaymentTransactionIdReceived, // New prop
  onFeedbackSubmitted,
  onRetryPayment,
  simulateFailure = false,
  onComplete,
  onResetToSplashScreen,
  onPauseTimer,
  cartTotal,
  cartItems
}) => {
  const { status, error, izipayService, resetError } = useHardware();
  const [currentStep, setCurrentStep] = useState<'method-selection' | 'qr-scan' | 'card-payment' | 'payment-success' | 'payment-failure' | 'feedback-detail' | 'feedback-thankyou'>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'card' | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [inactivityTimer, setInactivityTimer] = useState(30); // Timer de inactividad de 30s para method-selection
  const [selectedFeedback, setSelectedFeedback] = useState<'happy' | 'neutral' | 'sad' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string | null>(null); // Add this line
  
  // Format time for display (minutes:seconds)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('method-selection');
      setSelectedMethod(null);
      setTimeLeft(120);
      setInactivityTimer(30); // Reset inactivity timer to 30s
      
      // Pause the main inactivity timer when payment modal opens
      if (onPauseTimer) {
        onPauseTimer(true);
        console.log('[PaymentModal] Main timer paused');
      }
    } else {
      // Resume the main inactivity timer when payment modal closes
      if (onPauseTimer) {
        onPauseTimer(false);
        console.log('[PaymentModal] Main timer resumed');
      }
    }
  }, [isOpen, onPauseTimer]);
  
  // Show timer countdown for QR scan and card payment
  useEffect(() => {
    if ((currentStep !== 'qr-scan' && currentStep !== 'card-payment') || timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft => {
        const newTimeLeft = timeLeft - 1;
        if (newTimeLeft <= 0) {
          setCurrentStep('payment-failure');
          // console.log('aqui')
        }
        return newTimeLeft;
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentStep, timeLeft]);

      // Timer de inactividad de 30s para method-selection
  useEffect(() => {
    // Only run timer when modal is open and on method-selection step
    if (!isOpen || currentStep !== 'method-selection') {
      if (currentStep !== 'method-selection') {
        console.log('[PaymentModal] 🚫 Timer de inactividad desactivado - no en method-selection');
      }
      return;
    }
    
    console.log('[PaymentModal] ✅ Timer de inactividad activado para method-selection');
    
    const timer = setInterval(() => {
      setInactivityTimer(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          console.log('[PaymentModal] ⏰ Timer de inactividad expirado, regresando a splash screen');
          if (onResetToSplashScreen) {
            onResetToSplashScreen();
          }
          onClose();
          return 30; // Reset timer
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, currentStep, onResetToSplashScreen, onClose]);
  
  // Reset PaymentModal inactivity timer when user interacts with main screen
  useEffect(() => {
    // Only set up listeners when modal is open and on method-selection step
    if (!isOpen || currentStep !== 'method-selection') return;
    
    const handleMainScreenInteraction = () => {
      setInactivityTimer(30);
      console.log('[PaymentModal] 🕐 Timer reseteado por interacción con pantalla principal');
    };
    
    // Listen for custom events from main screen
    window.addEventListener('main-screen-interaction', handleMainScreenInteraction);
    
    // Also listen for touch events directly on the modal
    const handleTouchActivity = () => {
      setInactivityTimer(30);
      console.log('[PaymentModal] 🕐 Timer reseteado por interacción táctil directa');
    };
    
    // Add touch event listeners to the modal
    const modalElement = document.querySelector('[data-payment-modal]');
    if (modalElement) {
      modalElement.addEventListener('touchstart', handleTouchActivity, { passive: true });
      modalElement.addEventListener('click', handleTouchActivity);
    }
    
    return () => {
      window.removeEventListener('main-screen-interaction', handleMainScreenInteraction);
      if (modalElement) {
        modalElement.removeEventListener('touchstart', handleTouchActivity);
        modalElement.removeEventListener('click', handleTouchActivity);
      }
    };
  }, [isOpen, currentStep]);
  
  const handlePaymentMethodSelected = async (method: 'qr' | 'card') => {
    console.log('Payment method selected:', method);
    setSelectedMethod(method);
    
    // Reset inactivity timer when user interacts with payment method
    setInactivityTimer(30);
    console.log('[PaymentModal] Timer de inactividad reseteado a 30s');

    // For card payments (and now QR payments), proceed with Izipay flow
    setCurrentStep('card-payment');
    
    try {
      console.log('=== TRANSACTION FLOW [1] ===');
      console.log('Starting transaction in PaymentModal.handlePaymentMethodSelected');
      console.log('Transaction parameters:', { cartTotal, cartItems });
      
      setIsLoading(true);

      if (!izipayService) {
        console.error('=== TRANSACTION FLOW [ERROR] === IziPay service not available');
        throw new Error('IziPay service not available');
      }

      // First, ensure we're logged in
      console.log('Starting IziPay login...');
      const loginResult = await izipayService.login('izipay', 'izipay');
      console.log('Login completed with result:', loginResult);
      
      if (!loginResult) {
        console.error('=== TRANSACTION FLOW [ERROR] === Login failed');
        throw new Error('Failed to login to IziPay service');
      }

      // Convert amount to cents (multiply by 100 and remove decimals)
      const amountInCents = Math.round(cartTotal * 100);
      console.log('Amount converted to cents for pinpad:', amountInCents);

      const transaction = {
        ecr_transaccion: "01",
        ecr_amount: amountInCents.toString(),
        ecr_aplicacion: 'POS',
        ecr_currency_code: '604'
      };

      console.log('=== TRANSACTION FLOW [2] ===');
      console.log('Sending transaction to izipayService.processTransaction:', transaction);
      const result = await izipayService.processTransaction(transaction);
      console.log('=== TRANSACTION FLOW [7] ===');
      console.log('Transaction result received in PaymentModal:', result);
      console.log('response_code:', result.response_code);

      // Check response_code for transaction success
      if (result.response_code === "00") {
        console.log('Transaction successful with response code:', result.response_code);
        // Log the trace_unique field
        console.log('trace_unique (paymentTransactionId):', result.trace_unique);

        // --- DB OPERATIONS START ---
        try {
          console.log('=== DB OPERATIONS [1] ===');
          console.log('Attempting to create purchase transaction header in DB...');
          
          // Retrieve clientId from sessionStorage
          const currentUser = window.sessionStorage.getItem('currentUser');
          console.log('currentUser:', currentUser);
          
          // Get client ID directly
          const userData = currentUser ? JSON.parse(currentUser) : null;
          const clientId = userData && typeof userData.FS_ID !== 'undefined' ? Number(userData.FS_ID) : null;
          
          if (clientId === null || isNaN(clientId)) {
            console.error('Client ID not found in session storage');
            setCurrentStep('payment-failure');
            throw new Error('Client ID not found');
          }

          const transactionData = {
            clientId: clientId, // Use the retrieved clientId
            machineId: MACHINE_ID, // Get from env or use default
            paymentMethod: 'card',
            paymentTransactionId: result.trace_unique || null, // Use trace_unique from izipay response
            totalAmount: cartTotal,
            currency: '604' // PEN
          };
          console.log('Transaction Header Data:', transactionData);

          // Call main process function to create transaction header
          const dbTransactionId: number | null = await window.electron.ipcRenderer.invoke(
            'purchase:createTransaction',
            transactionData
          );

          if (dbTransactionId) {
            console.log(`=== DB OPERATIONS [2] === Transaction header created with ID: ${dbTransactionId}`);
            setPaymentTransactionId(result.trace_unique); // Store the actual payment transaction ID
            console.log('Attempting to create purchase item records in DB...');

            for (const item of cartItems) {
              const itemData = {
                transactionId: dbTransactionId,
                productId: item.productId,
                quantity: item.quantity,
                unitPriceAtPurchase: item.unitPrice,
                discountPercentApplied: item.discountPercent || null,
                discountedPrice: item.discountPercent 
                  ? item.unitPrice - (item.unitPrice * (item.discountPercent / 100)) 
                  : item.unitPrice,
                slotIdDispensedFrom: item.slotId
              };
              console.log(`Creating Item Record for Product ${item.productId}:`, itemData);

              // Call main process function to create purchase item
              const itemId: number | null = await window.electron.ipcRenderer.invoke(
                'purchase:createItem',
                itemData
              );

              if (itemId) {
                console.log(`--- DB Item created with ID: ${itemId} for Transaction ${dbTransactionId}`);
              } else {
                console.error(`--- FAILED to create DB Item for Product ${item.productId}, Transaction ${dbTransactionId}`);
                // Decide how to handle partial failure - maybe log and continue?
              }
            }
             console.log('=== DB OPERATIONS [3] === Finished creating purchase item records.');

            // Proceed with UI update and notify parent about success
            setCurrentStep('payment-success');
            if (onPaymentProcessed) {
              onPaymentProcessed(dbTransactionId); // Pass the DB transaction ID back
            }
            if (onPaymentTransactionIdReceived && result.trace_unique) {
              onPaymentTransactionIdReceived(result.trace_unique);
            }

          } else {
            console.error('=== DB OPERATIONS [ERROR] === Failed to create purchase transaction header in DB.');
            // Critical failure - payment succeeded but couldn't record it.
            setCurrentStep('payment-failure');
            // Potentially log this error more robustly for investigation
          }
        } catch (dbError) {
          console.error('=== DB OPERATIONS [ERROR] === Error during database operations:', dbError);
          // Handle potential errors during DB calls - show failure screen
          setCurrentStep('payment-failure');
          // Log this error robustly
        }
        // --- DB OPERATIONS END ---

      } else {
        console.error('Transaction failed with response:', result);
        setCurrentStep('payment-failure');
      }
    } catch (error) {
      console.error('=== TRANSACTION FLOW [ERROR] ===');
      console.error('Transaction error in PaymentModal.handlePaymentMethodSelected:', error);
      setCurrentStep('payment-failure');
    } finally {
      console.log('=== TRANSACTION FLOW [8] ===');
      console.log('Transaction process completed in PaymentModal');
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmitted = (feedback: 'happy' | 'neutral' | 'sad') => {
    console.log('Feedback submitted from SuccessModal:', feedback);
    setSelectedFeedback(feedback); // Store the feedback
    
    if (feedback === 'happy') {
      // Happy path: submit to DB, then show thank you
      if (paymentTransactionId !== null) {
        submitFeedbackToDb(feedback, null, paymentTransactionId).then(() => {
          setCurrentStep('feedback-thankyou');
        }).catch(err => {
          console.error("Failed to submit happy feedback:", err);
          setCurrentStep('feedback-thankyou'); // Show thank you even on DB error
        });
      } else {
        console.error("Cannot submit happy feedback, paymentTransactionId is null");
        setCurrentStep('feedback-thankyou'); // Fallback
      }
    } else {
      // Neutral/Sad path: Show detail modal
      setCurrentStep('feedback-detail');
    }
  };

  // Helper function to submit feedback (used for happy path directly)
  const submitFeedbackToDb = async (feedbackValue: 'happy' | 'neutral' | 'sad', reason: string | null, paymentTransactionId: string) => {
    console.log(`[PaymentModal] DEBUG: Submitting feedback via DB helper:`, {
      feedbackValue,
      reason,
      paymentTransactionId,
      paymentTransactionIdType: typeof paymentTransactionId,
      paymentTransactionIdLength: paymentTransactionId?.length
    });
    
    try {
      const result = await window.electron.ipcRenderer.invoke('purchase:submitFeedback', {
        paymentTransactionId: paymentTransactionId,
        feedbackValue: feedbackValue,
        feedbackReason: reason
      });
      console.log('[PaymentModal] DEBUG: Feedback submission result:', result);
      console.log('Feedback submitted successfully via DB helper');
    } catch (error) {
      console.error('[PaymentModal] DEBUG: Error submitting feedback via DB helper:', error);
      throw error; // Re-throw to be handled by caller
    }
  };

  // Original function passed to FeedbackDetailModal 
  // Handles submitting the detailed feedback reason along with the previously selected feedback type
  const handleDetailedFeedback = (reason: string) => {
    console.log('Detailed feedback reason received:', reason);
    console.log('Current state values:', { selectedFeedback, paymentTransactionId });
    
    // Store the feedback reason
    setFeedbackReason(reason);
    
    if (selectedFeedback && selectedFeedback !== 'happy' && paymentTransactionId !== null) {
      // Submit the detailed feedback
      submitFeedbackToDb(selectedFeedback, reason, paymentTransactionId)
        .then(() => {
          console.log("Detailed feedback submitted successfully.");
          
          // IMPORTANT: Explicitly transition to thank you modal after submission
          setCurrentStep('feedback-thankyou');
          
          // Optional: if parent component needs to know about feedback submission
          if (onFeedbackSubmitted && selectedFeedback) {
            onFeedbackSubmitted(selectedFeedback);
          }
        })
        .catch(err => {
          console.error("Failed to submit detailed feedback:", err);
          // Even on error, still show thank you
          setCurrentStep('feedback-thankyou');
        });
    } else {
      console.error("Cannot submit detailed feedback, missing data", {selectedFeedback, paymentTransactionId});
      // Emergency fallback - still try to close and show thank you even if data is missing
      setCurrentStep('feedback-thankyou');
    }
  };

  const handleRetryPayment = () => {
    setCurrentStep('method-selection');
    setTimeLeft(40);
    if (onRetryPayment) {
      onRetryPayment();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onClick={currentStep === 'card-payment' ? undefined : onClose}
      data-payment-modal="true"
    >
      <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {currentStep === 'method-selection' ? (
          <div 
            className="bg-white rounded-[16px] overflow-hidden"
            style={{ width: '540px', padding: '10px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginTop: '40px', marginBottom: '40px' }}>
              <h2 
                className="text-center text-black"
                style={{ 
                  fontFamily: '"Akira Expanded", sans-serif',  
                  fontWeight: 'bold',
                  fontSize: '30px'
                }}
              >
                Escoge tu método de pago
              </h2>
              
              {/* Timer de inactividad - HIDDEN */}
              {/* 
              <div className="mt-3 text-center">
                <span className="text-sm text-gray-500 font-medium">
                  ⏰ Tiempo restante: {inactivityTimer}s
                </span>
              </div>
              */}
            </div>
            
            <div className="grid grid-cols-2 gap-[9px]">
              {/* QR Code Option */}
              <button
                onClick={() => handlePaymentMethodSelected('qr')}
                className="flex flex-col items-stretch p-0 bg-black rounded-[6px] hover:bg-gray-900 transition-colors overflow-hidden"
                style={{ height: '305px' }}
              >
                {/* QR Image Section */}
                <div className="flex-1 bg-black flex items-center justify-center p-[10px]">
                  <img 
                    src={qr} 
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Text Section */}
                <div className="h-[50px] bg-black flex items-center justify-center">
                  <span 
                    className="text-white"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '16px'
                    }}
                  >
                    Escanea QR
                  </span>
                </div>
              </button>

              {/* Card Option */}
              <button
                onClick={() => handlePaymentMethodSelected('card')}
                className="flex flex-col items-center justify-center p-[10px] bg-[#111e2e] rounded-[6px] hover:bg-[#12212e] transition-colors relative"
                style={{ height: '305px' }}
              >
                <div className="w-full flex-1 flex items-center justify-center">
                  <img 
                    src={card} 
                    alt="Card Terminal"
                    className="max-w-full max-h-full object-contain h-[250px] mb-[50px]"
                  />
                </div>
                <div 
                  className="absolute bottom-[19px] left-0 right-0 text-center"
                >
                  <span 
                    className="text-white uppercase"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '16px'
                    }}
                  >
                    Débito o Crédito
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : currentStep === 'qr-scan' ? (
          <div className="relative">
            <div 
              className="bg-black rounded-[30px] overflow-hidden relative"
              style={{ width: '545px', height: '350px', padding: '10px' }}
              onClick={e => e.stopPropagation()}
            >
              {/* QR scan text and icon in the center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
                {/* QR Code Icon */}
                <div className="flex justify-center mb-6">
                  <div className="border-2 border-white p-2 rounded-lg">
                    <QrCode size={40} strokeWidth={2} className="text-white" />
                  </div>
                </div>
                
                <h2 
                  className="uppercase mb-6"
                  style={{ 
                    fontFamily: '"Akira Expanded", sans-serif',
                    fontWeight: 800,
                    fontSize: '24px'
                  }}
                >
                  Escanea tu QR
                </h2>
                <p 
                  className="mt-4"
                  style={{ 
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: '18px'
                  }}
                >
                  Porfavor escanea tu QR en el POS a la derecha.
                </p>
              </div>
              
              {/* Timer at the bottom */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <div className="inline-block bg-white px-4 py-2 rounded-lg">
                  <span 
                    className="text-black"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '18px'
                    }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Big animated arrow pointing right - floating outside the modal */}
            <div 
              className="absolute right-[-100px] top-1/2 transform -translate-y-1/2 animate-pulse-horizontal"
              style={{
                animation: 'moveHorizontal 1.5s infinite ease-in-out'
              }}
            >
              <ArrowRight size={110} strokeWidth={3} className="text-white" />
            </div>
            
            {/* Add the animation keyframes via style tag */}
            <style>{`
              @keyframes moveHorizontal {
                0%, 100% {
                  transform: translateX(0) translateY(-50%);
                }
                50% {
                  transform: translateX(30px) translateY(-50%);
                }
              }
            `}</style>
          </div>
        ) : currentStep === 'card-payment' ? (
          <div className="relative">
            <div 
              className="bg-black rounded-[16px] overflow-hidden relative"
              style={{ width: '545px', height: '350px', padding: '10px' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Card payment text and icon in the center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center" style={{ width: '80%' }}>
                {/* Card Icon */}
                <div className="flex justify-center mb-6">
                  <div className="border-2 border-white p-1 rounded-md">
                    {selectedMethod === 'qr' ? (
                      <QrCode size={40} strokeWidth={2} className="text-white" />
                    ) : (
                      <CreditCard size={40} strokeWidth={2} className="text-white" />
                    )}
                  </div>
                </div>
                
                <h2 
                  className="uppercase mb-3"
                  style={{ 
                    fontFamily: '"Akira Expanded", sans-serif',
                    fontWeight: 800,
                    fontSize: '24px'
                  }}
                >
                  {selectedMethod === 'qr' ? 'Seleccione "Pago con QR" en el POS' : 'Ingrese o acerque tarjeta'}
                </h2>
                <p 
                  className="mt-2"
                  style={{ 
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginBottom: '36px'
                  }}
                >
                  Porfavor use el terminal de pago a la derecha.
                </p>
              </div>
              
              {/* Timer at the bottom */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <div className="inline-block bg-white px-4 py-2 rounded-lg">
                  <span 
                    className="text-black"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '18px'
                    }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Big animated arrow pointing right - floating outside the modal */}
            <div 
              className="absolute right-[-100px] top-1/2 transform -translate-y-1/2 animate-pulse-horizontal"
              style={{
                animation: 'moveHorizontal 1.5s infinite ease-in-out'
              }}
            >
              <ArrowRight size={110} strokeWidth={3} className="text-white" />
            </div>
            
            {/* Add the animation keyframes via style tag */}
            <style>{`
              @keyframes moveHorizontal {
                0%, 100% {
                  transform: translateX(0) translateY(-50%);
                }
                50% {
                  transform: translateX(30px) translateY(-50%);
                }
              }
            `}</style>
          </div>
        ) : currentStep === 'payment-success' ? (
          <SuccessModal 
            onFeedbackSubmitted={handleFeedbackSubmitted} 
            onTimeout={() => {
              console.log('[PaymentModal] SuccessModal timeout, closing payment modal and going to splash');
              
              // Close the payment modal
              onClose();
              
              // Call onComplete if provided
              if (onComplete) {
                onComplete();
              }
              
              // Call onResetToSplashScreen if provided
              if (onResetToSplashScreen) {
                onResetToSplashScreen();
              }
            }}
            onPauseTimer={onPauseTimer}
          />
        ) : currentStep === 'payment-failure' ? (
          <PaymentFailureModal 
            onRetry={handleRetryPayment}
          />
        ) : currentStep === 'feedback-detail' ? (
          <FeedbackDetailModal 
            onDetailedFeedback={handleDetailedFeedback}
            onClose={onClose}
            variant="payment"
            onComplete={onComplete}
            onResetToSplashScreen={onResetToSplashScreen}
          />
        ) : currentStep === 'feedback-thankyou' ? (
          <FeedbackThankYouModal 
            onClose={() => {
              if (onComplete) onComplete();
              if (onResetToSplashScreen) onResetToSplashScreen();
              onClose();
            }} 
            onResetToSplashScreen={onResetToSplashScreen}
            paymentTransactionId={paymentTransactionId}
            feedbackType={selectedFeedback}
            feedbackReason={feedbackReason}
          />
        ) : null}
        
        {/* Close Button - Only show on method selection */}
        {currentStep === 'method-selection' && (
          <button 
            onClick={onClose}
            className="mt-[30px] bg-white rounded-full h-[62px] w-[62px] flex items-center justify-center transition-transform hover:scale-110"
            aria-label="Close payment modal"
          >
            <X size={30} className="text-black" />
          </button>
        )}
      </div>
    </div>
  );
};

// Payment Failure Modal Component with 10-second auto-retry timer
const PaymentFailureModal: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const [timeLeft, setTimeLeft] = useState(10);

  // Auto-retry after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          // Automatically click retry after 10 seconds
          onRetry();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRetry]);

  return (
    <div 
      className="bg-[#FF3B3B] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center shadow-lg w-[545px] h-[350px] p-8"
      onClick={e => e.stopPropagation()}
    >
      <AlertCircle size={64} className="text-white mb-4" strokeWidth={2.5} />
      <h2 
        className="text-2xl font-extrabold mb-4 text-center text-white uppercase tracking-wide"
        style={{ fontFamily: 'Akira Expanded, sans-serif', letterSpacing: '0.05em' }}
      >
        ERROR EN EL PAGO
      </h2>
      <p 
        className="text-center mb-8 leading-relaxed text-white text-base font-medium"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        Lo sentimos, ha ocurrido un error al procesar tu pago. Por favor, inténtalo de nuevo.
      </p>
      
      <button 
        onClick={onRetry}
        className="w-full bg-white text-[#FF3B3B] border-2 border-[#FF3B3B] py-3 rounded-lg font-bold hover:bg-red-50 transition-colors uppercase tracking-wide"
        style={{ fontFamily: 'Akira Expanded, sans-serif', fontWeight: 800, fontSize: '18px' }}
      >
        REINTENTAR
      </button>
    </div>
  );
}; 