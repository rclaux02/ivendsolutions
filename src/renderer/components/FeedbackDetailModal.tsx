import React, { useState, useEffect } from 'react';
import FeedbackThankYouModal from './FeedbackThankYouModal';

interface FeedbackDetailModalProps {
  onDetailedFeedback: (reason: string) => void;
  onClose: () => void;
  variant?: 'payment' | 'rappi'; // Only for analytics purposes
  onComplete?: () => void; // Add onComplete prop
  onResetToSplashScreen?: () => void; // Add onResetToSplashScreen prop
}

const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  onDetailedFeedback,
  onClose,
  variant = 'payment', // Default value, only for analytics
  onComplete,
  onResetToSplashScreen
}) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(20); // 20 second timer

  // Auto-close after 20 seconds of inactivity - NO DEPENDENCIAS EXTERNAS
  useEffect(() => {
    if (!showThankYou) { // Only run timer when not showing thank you modal
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            console.log('[FeedbackDetailModal] 20-second timer expired, closing modal and going to splash');
            
            // Call onResetToSplashScreen if provided
            if (onResetToSplashScreen) {
              onResetToSplashScreen();
            }
            
            // Close the modal
            onClose();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showThankYou]); // ✅ SOLO showThankYou como dependencia

  // Standard feedback options based on variant (for analytics only)
  const feedbackOptions = variant === 'rappi' 
    ? [
        'No encontré mi producto',
        'El código no funcionó',
        'La máquina se trababa mucho',
        'Problemas con la app de Rappi',
        'Simplemente no me gustó',
        'Otros'
      ]
    : [
        'No tenia mi producto',
        'Producto sin refrigeración',
        'No funcionaba mi método de pago',
        'La máquina se trababa mucho',
        'Simplemente no me gustó',
        'Otros'
      ];

  const handleFeedbackSelection = (reason: string) => {
    // Store the reason
    setSelectedReason(reason);
    
    // Show the thank you screen instead of calling callback immediately
    setShowThankYou(true);
  };
  
  const handleThankYouClose = () => {
    // Now that the thank you screen is closing, call the parent's callback with the stored reason
    if (selectedReason) {
      onDetailedFeedback(selectedReason);
    }
    
    // Call onComplete if it exists
    if (onComplete) {
      onComplete();
    }
    
    // Call onResetToSplashScreen if it exists
    if (onResetToSplashScreen) {
      onResetToSplashScreen();
    }
    
    // Then close this modal
    onClose();
  };

  if (showThankYou) {
    return <FeedbackThankYouModal onClose={handleThankYouClose} />;
  }

  return (
    <div 
      className="rounded-[16px] overflow-hidden relative flex flex-col"
      style={{ 
        backgroundColor: '#000000',
        padding: '10px',
        width: '545px'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="text-center mb-">
          <h2 
            className="uppercase mb-2 mt-4 text-white"
            style={{ 
              fontFamily: '"Akira Expanded", sans-serif',
              fontWeight: 800,
              fontSize: '24px'
            }}
          >
            Cuéntanos por qué
          </h2>
          <p className="text-white text-[18px] font-semibold mb-4 px-4">
          Si nos dices que salio mal en esta experiencia, de esa
          manera podremos mejorar para la proxima vez.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          {feedbackOptions.map((option, index) => (
            <button 
              key={index}
              onClick={() => handleFeedbackSelection(option)}
              className="w-full bg-white py-4 rounded-[8px] text-[18px] font-bold hover:bg-gray-100 text-black"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailModal; 