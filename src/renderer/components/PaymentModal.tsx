import React, { useState, useEffect } from 'react';
// Import images conditionally to avoid TypeScript errors
// Import Rappi logo and backspace icon
import qr from '../assets/images/dummyQR.png';
import card from '../assets/images/dummyCard.png';
import { X, ArrowRight, QrCode, CreditCard, AlertTriangle } from 'lucide-react';
import SuccessModal from './SuccessModal';
import FeedbackDetailModal from './FeedbackDetailModal';
import { useHardware } from '../hooks/useHardware';
import FeedbackThankYouModal from './FeedbackThankYouModal';

const MACHINE_ID = '1'; // Define the machine ID constant

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
  onFeedbackSubmitted?: (feedback: 'happy' | 'neutral' | 'sad') => void;
  onRetryPayment?: () => void;
  simulateFailure?: boolean; // For testing payment failure
  onComplete?: () => void; // New prop for when the entire payment flow is complete
  onResetToSplashScreen?: () => void; // New prop to reset to splash screen
  cartTotal: number; // New prop for the total amount from the cart
  cartItems: CartItem[]; // New prop for the items in the cart
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentMethodSelected,
  onPaymentProcessed,
  onFeedbackSubmitted,
  onRetryPayment,
  simulateFailure = false,
  onComplete,
  onResetToSplashScreen,
  cartTotal,
  cartItems
}) => {
  const { status, error, izipayService, resetError } = useHardware();
  const [currentStep, setCurrentStep] = useState<'method-selection' | 'qr-scan' | 'card-payment' | 'payment-success' | 'payment-failure' | 'feedback-detail' | 'feedback-thankyou'>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'card' | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [selectedFeedback, setSelectedFeedback] = useState<'happy' | 'neutral' | 'sad' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [completedTransactionId, setCompletedTransactionId] = useState<number | null>(null);
  
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
    }
  }, [isOpen]);
  
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
  
  const handlePaymentMethodSelected = async (method: 'qr' | 'card') => {
    console.log('Payment method selected:', method);
    setSelectedMethod(method);

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
          const clientId = userData?.FS_ID ? Number(userData.FS_ID) : null;
          
          if (!clientId) {
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
            setCompletedTransactionId(dbTransactionId);
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
      if (completedTransactionId !== null) {
        submitFeedbackToDb(feedback, null, completedTransactionId).then(() => {
          setCurrentStep('feedback-thankyou');
        }).catch(err => {
          console.error("Failed to submit happy feedback:", err);
          setCurrentStep('feedback-thankyou'); // Show thank you even on DB error
        });
      } else {
        console.error("Cannot submit happy feedback, transactionId is null");
        setCurrentStep('feedback-thankyou'); // Fallback
      }
    } else {
      // Neutral/Sad path: Show detail modal
      setCurrentStep('feedback-detail');
    }
  };

  // Helper function to submit feedback (used for happy path directly)
  const submitFeedbackToDb = async (feedbackValue: 'happy' | 'neutral' | 'sad', reason: string | null, txId: number) => {
    console.log(`Submitting feedback via DB helper: ${feedbackValue}, Reason: ${reason}, TxID: ${txId}`);
    try {
      await window.electron.ipcRenderer.invoke('purchase:submitFeedback', {
        transactionId: txId,
        feedbackValue: feedbackValue,
        feedbackReason: reason
      });
      console.log('Feedback submitted successfully via DB helper');
    } catch (error) {
      console.error('Error submitting feedback via DB helper:', error);
      throw error; // Re-throw to be handled by caller
    }
  };

  // Original function passed to FeedbackDetailModal 
  // Handles submitting the detailed feedback reason along with the previously selected feedback type
  const handleDetailedFeedback = (reason: string) => {
    console.log('Detailed feedback reason received:', reason);
    console.log('Current state values:', { selectedFeedback, completedTransactionId });
    
    if (selectedFeedback && selectedFeedback !== 'happy' && completedTransactionId !== null) {
      // Submit the detailed feedback
      submitFeedbackToDb(selectedFeedback, reason, completedTransactionId)
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
      console.error("Cannot submit detailed feedback, missing data", {selectedFeedback, completedTransactionId});
      // Emergency fallback - still try to close and show thank you even if data is missing
      setCurrentStep('feedback-thankyou');
    }
  };

  const handleRetryPayment = () => {
    setCurrentStep('method-selection');
    setTimeLeft(120);
    if (onRetryPayment) {
      onRetryPayment();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex flex-col items-center">
        {currentStep === 'method-selection' ? (
          <div 
            className="bg-white rounded-[16px] overflow-hidden"
            style={{ width: '540px', padding: '10px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginTop: '40px', marginBottom: '40px' }}>
              <h2 
                className="text-center uppercase text-black"
                style={{ 
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '24px'
                }}
              >
                Escoge tu método de pago
              </h2>
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
                    className="text-white uppercase"
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
                className="flex flex-col items-center justify-center p-[10px] bg-[#006837] rounded-[6px] hover:bg-[#005a2f] transition-colors relative"
                style={{ height: '305px' }}
              >
                <div className="w-full flex-1 flex items-center justify-center">
                  <img 
                    src={card} 
                    alt="Card Terminal"
                    className="max-w-full max-h-full object-contain h-[150px] mb-[40px]"
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
              if (onComplete) onComplete();
              if (onResetToSplashScreen) onResetToSplashScreen();
            }}
          />
        ) : currentStep === 'payment-failure' ? (
          <div 
            className="bg-red-600 rounded-[16px] overflow-hidden relative"
            style={{ width: '545px', height: '350px', padding: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Failure message in the center */}
            <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 text-white text-center px-8">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="border-4 border-white p-4 rounded-full">
                  <AlertTriangle size={40} strokeWidth={2} className="text-white" />
                </div>
              </div>
              
              <h2 
                className="uppercase mb-8"
                style={{ 
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '24px',
                  lineHeight: 1.2
                }}
              >
                Error en el pago
              </h2>
              <p 
                className="mb-12"
                style={{ 
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '18px'
                }}
              >
                Lo sentimos, ha ocurrido un error al procesar tu pago. Por favor, inténtalo de nuevo.
              </p>
              
              {/* Retry button */}
              <button 
                onClick={handleRetryPayment}
                className="bg-white text-red-600 px-6 py-3 rounded-lg transition-transform hover:scale-105"
              >
                <span 
                  className="uppercase"
                  style={{ 
                    fontFamily: '"Akira Expanded", sans-serif',
                    fontWeight: 800,
                    fontSize: '18px'
                  }}
                >
                  Reintentar
                </span>
              </button>
            </div>
          </div>
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