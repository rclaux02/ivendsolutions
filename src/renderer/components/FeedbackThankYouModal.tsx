import React from 'react';

// Import the VapeBox logo
import vapeBoxLogo from '../assets/images/vapeBoxSquareLogo.png';

interface FeedbackThankYouModalProps {
  onClose: () => void;
}

const FeedbackThankYouModal: React.FC<FeedbackThankYouModalProps> = ({
  onClose
}) => {
  // Auto-close after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

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
          Tu opinión es valorada por el equipo de VapeBox, que tengas un muy buen día.
        </p>
      </div>
    </div>
  );
};

export default FeedbackThankYouModal; 