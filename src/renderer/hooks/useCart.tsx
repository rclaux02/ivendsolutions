import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/renderer/types/product';
import { CartItem, CartState } from '@/renderer/types/cart';

interface CartContextType {
  cart: CartState;
  addToCart: (product: Product) => { success: boolean; message?: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => { success: boolean; message?: string };
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  checkout: () => void;
  getCartItemQuantity: (productId: string | number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartState>({
    items: [],
    isOpen: false
  });

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(prevCart => ({
          ...prevCart,
          items: parsedCart.items || []
        }));
      } catch (error) {
        console.error('Failed to parse cart from localStorage', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify({ items: cart.items }));
  }, [cart.items]);

  // Helper to get current quantity of an item in the cart
  const getCartItemQuantity = (productId: string | number): number => {
    const stringId = String(productId);
    const existingItem = cart.items.find(item => String(item.product.id) === stringId);
    return existingItem ? existingItem.quantity : 0;
  };

  const addToCart = (product: Product) => {
    console.log('Adding to cart:', product);
    
    // Check if we have enough stock
    const currentQuantity = getCartItemQuantity(product.id);
    const availableStock = product.slot_quantity;
    
    if (currentQuantity >= availableStock) {
      return {
        success: false,
        message: `Solo contamos con ${availableStock} unidades en stock, pero puedes elegir otros productos`
      };
    }
    
    // Calculate total items in cart (sum of all quantities)
    const totalItemsInCart = cart.items.reduce((total, item) => total + item.quantity, 0);
    
    // Check if adding this product would exceed the 5 item limit
    if (totalItemsInCart >= 5) {
      return {
        success: false
      };
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.items.find(item => item.product.id === product.id);
      
      const newCart = {
        ...prevCart,
        isOpen: true, // Always open the cart when adding items
        items: existingItem
          ? prevCart.items.map(item => 
              item.product.id === product.id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            )
          : [...prevCart.items, { product, quantity: 1 }]
      };
      
      return newCart;
    });
    
    return { success: true };
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.product.id !== productId)
    }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    // Find the product in the cart
    const cartItem = cart.items.find(item => item.product.id === productId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Item not found in cart'
      };
    }
    
    // Check stock limitations
    const availableStock = cartItem.product.slot_quantity;
    
    if (quantity > availableStock) {
      return {
        success: false,
        message: `Solo contamos con ${availableStock} unidades en stock, pero puedes elegir otros productos`
      };
    }
    
    // Calculate total items in cart if we update this item's quantity
    const currentTotal = cart.items.reduce((total, item) => total + item.quantity, 0);
    const currentItemQuantity = cartItem.quantity;
    const newTotal = currentTotal - currentItemQuantity + quantity;
    
    // Check if the new total would exceed the 5 item limit
    if (newTotal > 5) {
      return {
        success: false
      };
    }
    
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      )
    }));
    
    return { success: true };
  };

  const clearCart = () => {
    setCart(prevCart => ({
      ...prevCart,
      items: []
    }));
    // Also clear cart from localStorage
    localStorage.removeItem('cart');
  };

  const openCart = () => {
    setCart(prevCart => ({
      ...prevCart,
      isOpen: true
    }));
  };

  const closeCart = () => {
    setCart(prevCart => ({
      ...prevCart,
      isOpen: false
    }));
  };

  const checkout = () => {
    // Implement checkout logic here
    alert('Proceeding to checkout!');
    // You could navigate to a checkout page or open a payment modal
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      openCart,
      closeCart,
      checkout,
      getCartItemQuantity
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 