import React from 'react';

// Import the VapeBox logo
import vapeBoxLogo from '../assets/images/vapeBoxSquareLogo.png';

interface FeedbackThankYouModalProps {
  onClose: () => void;
  onResetToSplashScreen?: () => void; // Add this prop
  paymentTransactionId?: string | null; //
  feedbackType?: 'happy' | 'neutral' | 'sad' | null; // 
  feedbackReason?: string | null; // 
}

const FeedbackThankYouModal: React.FC<FeedbackThankYouModalProps> = ({
  onClose,
  onResetToSplashScreen,
  paymentTransactionId,
  feedbackType,
  feedbackReason
}) => {
  // Auto-close after 5 seconds - NO DEPENDENCIAS EXTERNAS
  React.useEffect(() => {
    console.log('[FeedbackThankYouModal] Starting 5-second timer');
    
    const timer = setTimeout(() => {
      console.log('[FeedbackThankYouModal] Timer expired, calling onClose and resetToSplashScreen');
      
      // First call onClose to close the modal
      onClose();
      
      // Then call onResetToSplashScreen if provided
      if (onResetToSplashScreen) {
        onResetToSplashScreen();
      }
    }, 5000);
    
    return () => {
      console.log('[FeedbackThankYouModal] Cleaning up timer');
      clearTimeout(timer);
    };
  }, []); // ✅ SIN DEPENDENCIAS - Solo se ejecuta una vez al montar

  // 🔍 AGREGAR: Enviar feedback a la base de datos
  React.useEffect(() => {
    if (paymentTransactionId && feedbackType) {
      console.log('[FeedbackThankYouModal] Sending feedback to database:', {
        paymentTransactionId,
        feedbackType,
        feedbackReason
      });
      
      // Enviar feedback a la base de datos usando el handler existente
      window.electron.ipcRenderer.invoke('purchase:submitFeedback', {
        paymentTransactionId,
        feedbackValue: feedbackType,
        feedbackReason: feedbackReason || undefined
      }).then((result) => {
        console.log('[FeedbackThankYouModal] Feedback submitted successfully:', result);
      }).catch((error) => {
        console.error('[FeedbackThankYouModal] Error submitting feedback:', error);
      });
    }
  }, [paymentTransactionId, feedbackType, feedbackReason]);

  return (
    <div 
      className="rounded-[16px] overflow-hidden relative flex flex-col"
      style={{ 
        backgroundColor: '#000000', // Black background
        padding: '10px',
        width: '545px'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col h-full justify-center items-center py-10">
        {/* VapeBox Logo - Bigger size */}
        <div className="mb-6">
          <img 
            src={vapeBoxLogo} 
            alt="VapeBox" 
            className="object-contain"
            style={{ height: '120px' }}
          />
        </div>
        
        <h2 
          className="uppercase mb-8 text-white text-center"
          style={{ 
            fontFamily: '"Akira Expanded", sans-serif',
            fontWeight: 800,
            fontSize: '30px'
          }}
        >
          Gracias
        </h2>
        
        <p className="text-white text-[18px] font-semibold text-center max-w-4xl">
          Tu opinión es valorada por el equipo de Vendimedia, que tengas un muy buen día.
        </p>
        
        {/* Manual close button as backup */}
        {/* 
        <button 
          onClick={() => {
            console.log('[FeedbackThankYouModal] Manual close button clicked');
            onClose();
          }}
          className="mt-6 px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Continuar
        </button>
        */}
      </div>
    </div>
  );
};

export default FeedbackThankYouModal; 