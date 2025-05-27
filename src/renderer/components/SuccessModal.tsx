import React, { useState, useEffect } from 'react';
import { ThumbsUp, Meh, Frown, SmilePlus, ArrowDown } from 'lucide-react';
import vapeIcon from '../assets/images/vapeIcon.png';

interface SuccessModalProps {
  onFeedbackSubmitted: (feedback: 'happy' | 'neutral' | 'sad') => void;
  onTimeout?: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ onFeedbackSubmitted, onTimeout }) => {
  const [currentStatus, setCurrentStatus] = useState<'dispensing' | 'dispensed'>('dispensing');
  const [timeLeft, setTimeLeft] = useState(20);
  
  // Format time for display (mm:ss)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (currentStatus === 'dispensing') {
      const timer = setTimeout(() => {
        setCurrentStatus('dispensed');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus]);

  // 20-second countdown timer for feedback screen
  useEffect(() => {
    if (currentStatus === 'dispensed') {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            if (onTimeout) {
              onTimeout();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStatus, onTimeout]);

  // Handle feedback submission and clear timer
  const handleFeedbackSubmitted = (feedback: 'happy' | 'neutral' | 'sad') => {
    onFeedbackSubmitted(feedback);
  };

  return (
    <>
      <div 
        className={`rounded-[30px] overflow-hidden relative flex flex-col ${currentStatus === 'dispensing' ? 'bg-white' : 'bg-[#40AD53]'}`}
        style={{ width: '545px', padding: '10px', minHeight: '400px', justifyContent: 'center', alignItems: 'center' }}
      >
        <div className="flex flex-col h-full w-full justify-center">
          {currentStatus === 'dispensing' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-black text-center px-4">
              <h2
                className="uppercase mb-6"
                style={{
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '24px',
                  lineHeight: 1.2
                }}
              >
                Dispensando...
              </h2>
              <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col items-center justify-center text-black text-center px-4 pt-4">
                <div className="mb-4">
                  <ThumbsUp size={60} className="text-white" />
                </div>
                
                <h2 
                  className="uppercase mb-[30px]"
                  style={{ 
                    fontFamily: '"Akira Expanded", sans-serif',
                    fontWeight: 800,
                    fontSize: '24px',
                    lineHeight: 1.2
                  }}
                >
                  Muchas gracias<br />vuelva pronto
                </h2>
                <p 
                  className="mb-6"
                  style={{ 
                    fontFamily: '"Akira Expanded", sans-serif',
                    fontWeight: 800,
                    fontSize: '24px'
                  }}
                >
                  ¿Qué tal te atendimos?
                </p>
              </div>
              
              <div className="mt-auto">
                <div className="bg-[#1DA034] py-[15px] px-[10px] rounded-[10px]">
                  <div className="flex justify-center items-center space-x-8">
                    <button 
                      onClick={() => handleFeedbackSubmitted('sad')}
                      className="transition-transform hover:scale-110"
                      style={{ width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Frown size={180} className="text-white" />
                    </button>
                    
                    <button 
                      onClick={() => handleFeedbackSubmitted('neutral')}
                      className="transition-transform hover:scale-110"
                      style={{ width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Meh size={180} className="text-white" />
                    </button>
                    
                    <button 
                      onClick={() => handleFeedbackSubmitted('happy')}
                      className="transition-transform hover:scale-110"
                      style={{ width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <SmilePlus size={180} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className={`fixed bottom-10 left-0 right-0 text-center z-50 ${currentStatus === 'dispensed' ? 'animate-bounce-vertical' : ''}`}>
        <div 
          className="bg-white rounded-lg p-6 mx-auto inline-block" 
          style={{ width: '300px', minHeight: '180px' }}
        >
          {currentStatus === 'dispensing' ? (
            <div className="text-center flex flex-col justify-center items-center h-full">
              <p
                className="text-black uppercase mb-4"
                style={{
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '18px'
                }}
              >
                Dispensando...
              </p>
              <div className="progress-bar-container" style={{ height: '15px' }}>
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p 
                className="text-black uppercase mb-4"
                style={{ 
                  fontFamily: '"Akira Expanded", sans-serif',
                  fontWeight: 800,
                  fontSize: '18px'
                }}
              >
                Recoge tu vape
              </p>
              <div className="flex justify-center mb-3">
                <img src={vapeIcon} alt="Vape" className="h-10" />
              </div>
              <div className="mt-2">
                <ArrowDown size={30} strokeWidth={3} className="text-black mx-auto" />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes bounceVertical {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-60px);
          }
        }
        
        .animate-bounce-vertical {
          animation: bounceVertical 2s infinite ease-in-out;
        }

        .progress-bar-container {
          width: 80%;
          height: 20px;
          background-color: #e0e0e0;
          border-radius: 10px;
          margin-top: 10px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: #1DA034;
          border-radius: 10px;
          animation: fillUp 5s linear forwards;
        }

        @keyframes fillUp {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
};

export default SuccessModal; 