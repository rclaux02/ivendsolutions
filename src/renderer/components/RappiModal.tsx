import React, { useState, useEffect } from 'react';
import { X, ArrowDown, ThumbsUp, Meh, Frown, SmilePlus } from 'lucide-react';
import SuccessModal from './SuccessModal';
import FeedbackDetailModal from './FeedbackDetailModal';
import { useRappi } from '../hooks/useRappi';

// Import Rappi logo and backspace icon
import rappiMoustacheLogo from '../assets/images/rappiMoustacheLogo.png';
import rappiBackspace from '../assets/images/rappiBackspace.png';

// Modal states
type ModalState = 'CODE_ENTRY' | 'HANDSHAKE_VERIFICATION' | 'SUCCESS' | 'FEEDBACK_DETAIL' | 'ERROR';

interface RappiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RappiModal: React.FC<RappiModalProps> = ({ isOpen, onClose }) => {
  const [orderCode, setOrderCode] = useState<string>('');
  // State for modal animation
  const [modalVisible, setModalVisible] = useState(false);
  // State for confirm button animation
  const [confirmAnimate, setConfirmAnimate] = useState(false);
  // State for error message
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Código inválido, por favor intente nuevamente');
  // State for modal flow
  const [modalState, setModalState] = useState<ModalState>('CODE_ENTRY');
  // State for handshake options (will be randomized)
  const [handshakeOptions, setHandshakeOptions] = useState<string[]>([]);
  // State to track selected feedback
  const [selectedFeedback, setSelectedFeedback] = useState<'happy' | 'neutral' | 'sad' | null>(null);
  // State for the Rappi order ID
  const [orderId, setOrderId] = useState<string>('');
  // State for managing local loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // State for expires_at timestamp
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  
  // Use the Rappi hook
  const {
    isLoading: isRappiLoading,
    error,
    handshakeData,
    initiateHandshake,
    verifyHandshake,
    verifyAndDispense,
    resetError,
    resetHandshakeData,
    authenticate
  } = useRappi();

  // Handle modal open/close with animation
  useEffect(() => {
    if (isOpen) {
      // First make the backdrop visible immediately
      setModalVisible(true);
      // Reset error state when opening modal
      setShowError(false);
      setErrorMessage('Código inválido, por favor intente nuevamente');
      // Reset to initial state
      setModalState('CODE_ENTRY');
      setOrderCode('');
      // Reset feedback state
      setSelectedFeedback(null);
      // Reset Rappi-specific state
      setOrderId('');
      resetError();
      resetHandshakeData();
    } else {
      // Delay hiding the modal to allow for animation
      const timer = setTimeout(() => {
        setModalVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, resetError, resetHandshakeData]);
  
  // Effect to trigger animation when 10 digits are entered
  useEffect(() => {
    if (orderCode.length > 0 && modalState === 'CODE_ENTRY') {
      // Trigger the animation
      setConfirmAnimate(true);
      
      // Keep the animation active for a while
      const timer = setTimeout(() => {
        setConfirmAnimate(false);
      }, 200); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [orderCode, modalState]);

  // Effect to hide error message after a delay
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => {
        setShowError(false);
      }, 3000); // Show error for 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showError]);
  
  // Effect to handle Rappi API errors
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setShowError(true);
    }
  }, [error]);
  
  if (!modalVisible) return null;
  
  const handleNumberClick = (number: string) => {
    if (orderCode.length < 10 && modalState === 'CODE_ENTRY') {
      setOrderCode(prev => prev + number);
    }
  };
  
  // Helper function to format the order code with X-X-X-X-X-X-X-X-X-X pattern
  const formatOrderCode = () => {
    // Instead of returning a simple string, we'll return JSX with different styling for entered digits vs placeholders
    const formattedElements = [];
    
    for (let i = 0; i < 10; i++) {
      // Add the digit or placeholder
      if (i < orderCode.length) {
        // Entered digit - white color and bold
        formattedElements.push(
          <span key={`digit-${i}`} style={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif'
          }}>
            {orderCode[i]}
          </span>
        );
      } else {
        // Empty space instead of placeholder
        formattedElements.push(
          <span key={`placeholder-${i}`} style={{
            fontFamily: 'Inter, sans-serif',
            visibility: 'hidden'
          }}>
            0
          </span>
        );
      }
      
      // Add the separator except after the last digit
      if (i < 9) {
        // Only show hyphen if there's a digit after it (not after the last entered digit)
        const showHyphen = i < orderCode.length - 1;
        
        formattedElements.push(
          <span key={`separator-${i}`} style={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            visibility: showHyphen ? 'visible' : 'hidden'
          }}>
            -
          </span>
        );
      }
    }
    
    return formattedElements;
  };

  const handleClear = () => {
    setOrderCode('');
  };

  const handleBackspace = () => {
    if (orderCode.length > 0) {
      setOrderCode(prev => prev.slice(0, -1));
    }
  };
  
  const handleConfirm = async () => {
    console.log('Order code confirmed:', orderCode);
    
    try {
      // First authenticate with Rappi API
      console.log('Authenticating with Rappi API before initiating handshake...');
      setIsSubmitting(true);
      
      const authenticated = await authenticate();
      
      if (!authenticated) {
        console.error('Authentication with Rappi API failed');
        setShowError(true);
        setErrorMessage('Código inválido, por favor intente nuevamente');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Successfully authenticated with Rappi API, proceeding with handshake...');
      
      // In a real implementation, we would initiate the handshake with the Rappi API
      // For now, we'll use the code as the order ID (this would be different in a real app)
      const currentOrderId = orderCode;
      setOrderId(currentOrderId);
      
      // Initiate handshake with this order ID
      const handshakeResult = await initiateHandshake(currentOrderId);
      console.log('handshakeResult: ', handshakeResult);
      if (handshakeResult) {
        // Successful handshake initiation - move to handshake verification
        setModalState('HANDSHAKE_VERIFICATION');
        
        // Use the codes from the API response
        if (handshakeResult.codes && handshakeResult.codes.length > 0) {
          // Display the codes from the response - these are already randomized by the API
          setHandshakeOptions(handshakeResult.codes);
          
          // Store the expiration time if needed for future UI feedback
          console.log(`Handshake codes expire at: ${handshakeResult.expires_at}`);
          setExpiresAt(handshakeResult.expires_at);
        } else {
          // Handle case where no codes are returned
          setShowError(true);
          setErrorMessage('Código inválido, por favor intente nuevamente');
          setModalState('CODE_ENTRY');
        }
        
        setOrderCode(''); // Reset order code for clean state
      } else {
        // Failed to initiate handshake
        setShowError(true);
        setErrorMessage('Código inválido, por favor intente nuevamente');
      }
    } catch (error) {
      // API error or other issue
      setShowError(true);
      setErrorMessage('Código inválido, por favor intente nuevamente');
      console.error('Error initiating handshake:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleHandshakeSelection = async (selectedCode: string) => {
    if (!orderId) {
      console.error('No order ID available for handshake verification');
      setShowError(true);
      setErrorMessage('Código inválido, por favor intente nuevamente');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Verify the handshake code with the API
      const verificationResult = await verifyHandshake({
        order_id: orderId,
        handshake_code: selectedCode
      });
      
      if (verificationResult.success) {
        // Correct handshake - proceed to dispensing the product
        console.log('Handshake verified, dispensing product from slot:', verificationResult.slot_id);
        
        // If we have a slot ID, dispense the product
        if (verificationResult.slot_id) {
          try {
            // Use the hardware service to dispense the product
            const dispensingResult = await verifyAndDispense(orderId, selectedCode);
            
            if (dispensingResult.success) {
              // Product dispensed successfully - proceed to success
              setModalState('SUCCESS');
            } else {
              // Failed to dispense product
              setShowError(true);
              setErrorMessage('Código inválido, por favor intente nuevamente');
              console.error('Error dispensing product:', dispensingResult.message);
            }
          } catch (dispensingError) {
            setShowError(true);
            setErrorMessage('Código inválido, por favor intente nuevamente');
            console.error('Error dispensing product:', dispensingError);
          }
        } else {
          // No slot ID available
          setShowError(true);
          setErrorMessage('Código inválido, por favor intente nuevamente');
        }
      } else {
        // Wrong handshake - show error
        setShowError(true);
        
        // Check if there's error details from the API
        if (verificationResult.details) {
          // If there are new codes in the details, update the options
          if (verificationResult.details.codes && Array.isArray(verificationResult.details.codes) && 
              verificationResult.details.codes.length > 0) {
            setHandshakeOptions(verificationResult.details.codes);
            console.log('New codes provided - updating options');
          }
          
          // Check for retry information
          if (verificationResult.details.retries_left !== undefined) {
            setErrorMessage('Código inválido, por favor intente nuevamente');
          } else {
            setErrorMessage('Código inválido, por favor intente nuevamente');
          }
          
          // Check if codes have expired
          if (verificationResult.details.expires_at) {
            console.log(`New expiration time: ${verificationResult.details.expires_at}`);
            setExpiresAt(verificationResult.details.expires_at);
          }
        } else {
          setErrorMessage('Código inválido, por favor intente nuevamente');
        }
      }
    } catch (error) {
      // API error or other issue
      setShowError(true);
      setErrorMessage('Código inválido, por favor intente nuevamente');
      console.error('Error verifying handshake:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBack = () => {
    // Go back to code entry
    setModalState('CODE_ENTRY');
    setOrderCode('');
  };
  
  const handleFeedbackSubmitted = (feedback: 'happy' | 'neutral' | 'sad') => {
    console.log('Feedback submitted:', feedback);
    setSelectedFeedback(feedback);
    
    if (feedback === 'happy') {
      // For happy feedback, just close the modal
      onClose();
    } else {
      // For neutral or sad feedback, show the detailed feedback step
      setModalState('FEEDBACK_DETAIL');
    }
  };
  
  const handleDetailedFeedback = (reason: string) => {
    console.log('Detailed feedback:', { initialFeedback: selectedFeedback, reason });
    // In a real app, you would send this feedback to your backend
    // The modal will now show a thank you screen and then close automatically
  };
  
  // CSS for the confirm button animation
  const confirmButtonStyle = {
    color: '#FF441F',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    transition: 'transform 0.4s ease-out',
    transform: confirmAnimate ? 'scale(1.1)' : 'scale(1)'
  };
  
  // Show loading state
  if (isSubmitting) {
    return (
      <div 
        className={`fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      >
        <div 
          className="rounded-[16px] overflow-hidden relative transition-transform duration-300 ease-in-out"
          style={{ 
            width: '340px',
            backgroundColor: '#FF441F',
            padding: '16px 10px 10px 10px'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Rappi logo */}
          <div className="flex justify-center mb-3 mt-2">
            <img 
              src={rappiMoustacheLogo} 
              alt="Rappi" 
              className="object-contain"
              style={{ width: '166px' }}
            />
          </div>
          
          <div className="text-center mb-3">
            <h2 
              className="text-white uppercase"
              style={{ 
                fontFamily: '"Akira Expanded", sans-serif',
                fontWeight: 800,
                fontSize: '24px'
              }}
            >
              Cargando...
            </h2>
          </div>
          
          {/* Spinner/loading animation */}
          <div className="flex justify-center mb-5">
            <div className="w-10 h-10 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {modalState !== 'SUCCESS' && modalState !== 'FEEDBACK_DETAIL' ? (
        <div className="relative flex flex-col items-center">
          {/* Error message */}
          {showError && (
            <div 
              className="absolute top-[-50px] left-0 right-0 py-2 px-3 text-center transition-all duration-300 ease-in-out"
              style={{ 
                backgroundColor: '#FF441F',
                transform: showError ? 'translateY(0)' : 'translateY(-10px)',
                opacity: showError ? 1 : 0,
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            >
              <p 
                className="text-white uppercase"
                style={{ 
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '12px',
                  lineHeight: 1.1
                }}
              >
                {errorMessage}
              </p>
            </div>
          )}
          
          <div 
            className={`rounded-[16px] overflow-hidden relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
            style={{ 
              width: '340px',
              backgroundColor: '#FF441F',
              padding: '16px 10px 10px 10px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Rappi logo */}
            <div className="flex justify-center mb-3 mt-2">
              <img 
                src={rappiMoustacheLogo} 
                alt="Rappi" 
                className="object-contain"
                style={{ width: '166px' }}
              />
            </div>
            
            {modalState === 'CODE_ENTRY' && (
              <>
                {/* Title */}
                <div className="text-center mb-3">
                  <h2 
                    className="text-white uppercase"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '24px'
                    }}
                  >
                    Código de la orden
                  </h2>
                </div>
                
                {/* Order code input */}
                <div 
                  className="rounded-[6px] mb-3 text-center mx-auto relative"
                  style={{ 
                    backgroundColor: '#D22300',
                    maxWidth: '95%',
                    height: '54px',
                    marginTop: '21px',
                    marginBottom: '21px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 3px'
                  }}
                >
                  <p 
                    className="tracking-widest flex-grow text-center"
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#851600'
                    }}
                  >
                    {formatOrderCode()}
                  </p>
                  
                  {/* Backspace button */}
                  <button 
                    onClick={handleBackspace}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-[80%] flex items-center"
                  >
                    <img 
                      src={rappiBackspace} 
                      alt="Backspace" 
                      className="h-full object-contain"
                    />
                  </button>
                </div>
                
                {/* Number pad */}
                <div 
                  className="rounded-[16px] p-2 mb-3"
                  style={{ backgroundColor: '#D22300' }}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button 
                        key={num}
                        onClick={() => handleNumberClick(num.toString())}
                        className="bg-white rounded-[6px] hover:bg-gray-100 aspect-square flex items-center justify-center"
                      >
                        <span 
                          style={{ 
                            fontFamily: '"Akira Expanded", sans-serif',
                            fontWeight: 800,
                            fontSize: '48px',
                            color: '#D22300',
                            lineHeight: '1'
                          }}
                        >
                          {num}
                        </span>
                      </button>
                    ))}
                    {/* Add 0 button */}
                    <div className="col-span-3 flex justify-center">
                      <button 
                        onClick={() => handleNumberClick('0')}
                        className="bg-white rounded-[6px] hover:bg-gray-100 aspect-square flex items-center justify-center w-1/3"
                      >
                        <span 
                          style={{ 
                            fontFamily: '"Akira Expanded", sans-serif',
                            fontWeight: 800,
                            fontSize: '48px',
                            color: '#D22300',
                            lineHeight: '1'
                          }}
                        >
                          0
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={handleClear}
                    className="text-white rounded-lg hover:opacity-90 py-4"
                    style={{ 
                      backgroundColor: '#400B00',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    Borrar
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className={`bg-white rounded-lg hover:bg-gray-100 py-4 ${confirmAnimate ? 'confirm-button-animate' : ''}`}
                    style={confirmButtonStyle}
                    disabled={orderCode.length === 0}
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}
            
            {modalState === 'HANDSHAKE_VERIFICATION' && (
              <>
                {/* Handshake Title */}
                <div className="text-center mb-8">
                  <h2 
                    className="text-white uppercase"
                    style={{ 
                      fontFamily: '"Akira Expanded", sans-serif',
                      fontWeight: 800,
                      fontSize: '24px'
                    }}
                  >
                    HANDSHAKE
                  </h2>
                </div>
                
                {/* Handshake Options */}
                <div className="flex flex-col space-y-2 mb-3">
                  {handshakeOptions.map((code, index) => (
                    <button 
                      key={index}
                      onClick={() => handleHandshakeSelection(code)}
                      className="bg-white rounded-lg hover:bg-gray-100 py-2 px-3"
                    >
                      <span 
                        style={{ 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          color: '#FF441F',
                          letterSpacing: '2px'
                        }}
                      >
                        {code}
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Expiration info */}
                {expiresAt && (
                  <div className="text-center mb-4 text-white opacity-80">
                    <p>Códigos válidos hasta: {new Date(expiresAt).toLocaleString()}</p>
                  </div>
                )}
                
                {/* Back Button */}
                <div className="mt-auto">
                  <button 
                    onClick={handleBack}
                    className="w-full text-white rounded-lg hover:opacity-90 py-3"
                    style={{ 
                      backgroundColor: '#D22300',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    Atrás
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Close Button - Floating below the modal */}
          <button 
            onClick={onClose}
            className="absolute top-full mt-[30px] bg-white rounded-full h-[62px] w-[62px] flex items-center justify-center transition-transform hover:scale-110"
            aria-label="Close Rappi modal"
          >
            <X size={30} className="text-black" />
          </button>
        </div>
      ) : modalState === 'SUCCESS' ? (
        // SUCCESS STATE - Using the reusable SuccessModal component
        <SuccessModal onFeedbackSubmitted={handleFeedbackSubmitted} />
      ) : (
        // FEEDBACK_DETAIL STATE - Using the reusable FeedbackDetailModal component
        <FeedbackDetailModal 
          onDetailedFeedback={handleDetailedFeedback}
          onClose={onClose}
          variant="rappi"
        />
      )}
    </div>
  );
};

export default RappiModal; 