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
    <div className="fixed inset0 flex items-center justify-center">
      <div 
        className="bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
        style={{ 
          width: '1645px',
          height: '1763px',
        }}
      >
        {/* Header */}
        <div className="bg-white p-8 text-center">
          <h2 className="text-[48px] font-[600] text-black">
            Escoge tu metodo de pago
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
              <div className="w-[500px] h-[500px] bg-black" />
            </div>
            <p className="text-white text-[36px] font-[600]">
              Escanea QR
            </p>
          </button>

          {/* Card Option */}
          <button
            onClick={() => onSelectPaymentMethod('card')}
            className="flex-1 h-full max-w-[700px] bg-[#111e2e] rounded-3xl p-8 flex flex-col items-center justify-center transition-transform hover:scale-105"
          >
            <div className="w-[500px] h-[500px] bg-white rounded-2xl flex items-center justify-center mb-8">
              {/* Card design like in image 2 */}
              <div className="w-[400px] h-[400px] flex items-center justify-center relative">
                {/* First card */}
                <div className="w-[300px] h-[200px] bg-gray-300 rounded-xl transform rotate-6 absolute z-10 shadow-lg">
                  <div className="p-4">
                    <div className="text-gray-600 text-sm font-semibold">VindiMedia</div>
                    <div className="text-gray-500 text-xs mt-2">4758683</div>
                  </div>
                </div>
                {/* Second card (blurred) */}
                <div className="w-[300px] h-[200px] bg-gray-400 rounded-xl transform rotate-3 absolute z-0 opacity-70">
                  <div className="p-4">
                    <div className="text-gray-500 text-sm font-semibold">VindiMedia</div>
                    <div className="text-gray-400 text-xs mt-2">*** **** **** ****</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-white text-[36px] font-[600]">
              Debito o Credito
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}; 