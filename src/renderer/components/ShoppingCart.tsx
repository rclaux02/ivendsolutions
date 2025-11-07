import React from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { CartItem } from '@/renderer/types/cart';
import { Button } from './ui/button';

interface ShoppingCartProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  cartErrors?: Record<string, string>;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  items,
  isOpen,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  cartErrors = {}
}) => {
  console.log('ShoppingCart render - isOpen:', isOpen);
  console.log('ShoppingCart items:', items);

  if (!isOpen) return null;

  const totalPrice = items.reduce((total, item) => {
    return total + (item.product.price || 0) * item.quantity;
  }, 0);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pt-20">
      <div className="bg-black border-4 border-white rounded-[30px] w-full max-w-md mx-auto mb-4 shadow-lg overflow-hidden">
        {/* Cart Header */}
        <div className="flex justify-between items-center border-b border-gray-800">
          <h2 className="text-white text-xl font-bold p-4">Carrito</h2>
          <button 
            onClick={onClearCart}
            className="text-white hover:text-gray-300 pr-4"
          >
            Limpiar
          </button>
        </div>

        {/* Cart Items */}
        <div className="max-h-[300px] overflow-y-auto">
          {items.map((item, index) => (
            <div key={`cart-item-${item.product.id}-${index}`} className="relative flex items-center p-4 border-b border-gray-800">
              <div className="h-[92px] w-[92px] bg-white rounded-md flex-shrink-0 mr-3">
                <img 
                  src={item.product.image} 
                  alt={item.product.name} 
                  className="h-full w-full object-contain p-1" 
                />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 uppercase">{item.product.FS_SABOR || 'Sin sabor'}</div>
                <div className="text-sm text-white font-medium">{item.product.name}</div>
                <div className="text-xs text-gray-400">{item.product.puffs ? `${item.product.puffs.toLocaleString()} Puffs` : ''}</div>
                
                {/* Stock limit message */}
                {item.quantity >= item.product.slot_quantity && (
                  <div className="text-red-500 text-xs font-semibold mt-1">
                    Solo contamos con {item.product.slot_quantity} unidades en stock
                  </div>
                )}
                
                {/* Cart error message */}
                {cartErrors[item.product.id] && (
                  <div className="text-red-500 text-xs font-semibold mt-1">
                    {cartErrors[item.product.id]}
                  </div>
                )}
              </div>
              <div className="text-white font-medium">
                s/{item.product.price?.toFixed(2)}
              </div>
              <div className="flex items-center ml-4">
                <button 
                  onClick={() => onUpdateQuantity(String(item.product.id), Math.max(1, item.quantity - 1))}
                  className="text-white bg-gray-800 rounded-full h-6 w-6 flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <span className="mx-2 text-white">({item.quantity})</span>
                <button 
                  onClick={() => onUpdateQuantity(String(item.product.id), item.quantity + 1)}
                  className={`text-white ${
                    item.quantity < item.product.slot_quantity 
                      ? "bg-gray-800" 
                      : "bg-gray-600 cursor-not-allowed"
                  } rounded-full h-6 w-6 flex items-center justify-center`}
                  disabled={item.quantity >= item.product.slot_quantity}
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={() => onRemoveItem(String(item.product.id))}
                  className="ml-3 text-white bg-gray-800 rounded-full h-6 w-6 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Button */}
        <div className="p-4">
          <Button 
            variant="buy" 
            className="w-full h-[60px] text-xl font-semibold rounded-[15px] flex items-center justify-between px-6"
            onClick={onCheckout}
          >
            <span>Comprar</span>
            <span>s/{totalPrice.toFixed(2)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart; 