import React from 'react';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (method: 'qr' | 'card') => void;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSelectPaymentMethod,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
        style={{ 
          width: '1645px',
          height: '1763px',
        }}
      >
        {/* Header */}
        <div className="bg-white p-8 text-center">
          <h2 className="text-[48px] font-[600] uppercase text-black">
            Escoge tu método de pago
          </h2>
        </div>

        {/* Payment Methods */}
        <div className="flex-1 flex items-center justify-center gap-16 p-8">
          {/* QR Code Option */}
          <button
            onClick={() => onSelectPaymentMethod('qr')}
            className="flex-1 h-full max-w-[700px] bg-black rounded-3xl p-8 flex flex-col items-center justify-center transition-transform hover:scale-105"
          >
            <div className="w-[500px] h-[500px] bg-white rounded-2xl flex items-center justify-center mb-8">
              {/* Replace with actual QR code */}
              <div className="w-[400px] h-[400px] bg-black" />
            </div>
            <p className="text-white text-[36px] font-[600] uppercase">
              Escanea QR
            </p>
          </button>

          {/* Card Option */}
          <button
            onClick={() => onSelectPaymentMethod('card')}
            className="flex-1 h-full max-w-[700px] bg-[#006B3F] rounded-3xl p-8 flex flex-col items-center justify-center transition-transform hover:scale-105"
          >
            <div className="w-[500px] h-[500px] bg-white rounded-2xl flex items-center justify-center mb-8">
              {/* Replace with actual card terminal image */}
              <div className="w-[400px] h-[400px] flex items-center justify-center">
                <div className="w-[300px] h-[200px] bg-[#006B3F] rounded-xl transform rotate-12" />
              </div>
            </div>
            <p className="text-white text-[36px] font-[600] uppercase">
              Débito o Crédito
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}; 