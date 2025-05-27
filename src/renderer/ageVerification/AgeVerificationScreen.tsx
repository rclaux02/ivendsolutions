import React, { useEffect, useState } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { DocumentVerification } from './DocumentVerification';

interface AgeVerificationScreenProps {
  onSuccess: (userData: any) => void;
  onFailure: (reason: string) => void;
  onCancel: () => void;
}

const AgeVerificationScreen: React.FC<AgeVerificationScreenProps> = ({
  onSuccess,
  onFailure,
  onCancel
}) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'success' | 'failure'>('idle');
  const [statusMessage, setStatusMessage] = useState('Please scan your ID document');
  
  // Initialize document verification
  useEffect(() => {
    // Set up IPC listeners for verification results
    const handleVerificationSuccess = (_event: any, userData: any) => {
      setVerificationStatus('success');
      setStatusMessage('Verification successful!');
      setTimeout(() => onSuccess(userData), 2000);
    };
    
    const handleVerificationFailure = (_event: any, data: { reason: string }) => {
      setVerificationStatus('failure');
      setStatusMessage(`Verification failed: ${data.reason}`);
      setTimeout(() => onFailure(data.reason), 5000);
    };
    
    // Add event listeners
    window.electron.ipcRenderer.on('verification-success', handleVerificationSuccess);
    window.electron.ipcRenderer.on('verification-failure', handleVerificationFailure);
    
    // Initialize document verification
    const documentVerification = new DocumentVerification();
    documentVerification.startWatchingForDocuments();
    
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          onCancel();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    // Cleanup
    return () => {
      clearInterval(timer);
      window.electron.ipcRenderer.removeAllListeners('verification-success');
      window.electron.ipcRenderer.removeAllListeners('verification-failure');
    };
  }, [onSuccess, onFailure, onCancel]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Age Verification</h1>
      
      <div className="w-64 h-64 mb-8">
        <CircularProgressbar
          value={timeLeft}
          maxValue={60}
          text={`${timeLeft}s`}
          styles={buildStyles({
            textSize: '16px',
            pathColor: timeLeft > 30 ? '#4ade80' : timeLeft > 10 ? '#facc15' : '#ef4444',
            textColor: '#ffffff',
            trailColor: '#374151',
          })}
        />
      </div>
      
      <div className="text-center mb-8">
        <p className="text-xl mb-4">{statusMessage}</p>
        {verificationStatus === 'processing' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        {verificationStatus === 'success' && (
          <div className="text-green-500 text-2xl">✓</div>
        )}
        {verificationStatus === 'failure' && (
          <div className="text-red-500 text-2xl">✗</div>
        )}
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AgeVerificationScreen; 