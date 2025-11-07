import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Product } from '@/renderer/types/product';
// import { Product } from '@/renderer/dummyData/dummyProducts';
// import { useProducts } from '@/renderer/hooks/useProducts';
import { useProductsContext } from '@/renderer/hooks/useProductsContext';
import ProductDetail from '@/renderer/components/productDetail';
import ShoppingCart from '@/renderer/components/ShoppingCart';
import { useCart } from '@/renderer/hooks/useCart';
import { Minus, Plus, X, ArrowRight, ShoppingCartIcon } from 'lucide-react';
import FilterModal from '@/renderer/components/FilterModal';
import { Button } from '@/renderer/components/ui/button';
import CameraModal from '@/renderer/components/CameraModal';
import { PaymentModal } from '@/renderer/components/PaymentModal';
import { AppNavigationContext } from '@/renderer/App';
import RappiModal from '../../components/RappiModal';
import DocumentScanModal from '../../components/DocumentScanModal';
import { useHardware, HardwareStatus } from '@/renderer/hooks/useHardware';
import { IzipayTestModal } from '../../components/IzipayTestModal';
import { getAllAvailableSlotMappings, dispenseProductFromSlot } from '@/main/database/operations/productOperations';
import { useProductOperations } from '@/renderer/hooks/useProductOperations';
import TestDispenseModal from '../../components/TestDispenseModal';
import SuccessModal from '@/renderer/components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import FeedbackThankYouModal from '../../components/FeedbackThankYouModal';
import FeedbackDetailModal from '../../components/FeedbackDetailModal';
import { features } from '@/config/featureFlags';

// Import your banner images
import banner1 from '@/renderer/assets/banners/horizontalBanner_1.jpg';
import banner2 from '@/renderer/assets/banners/horizontalBanner_2.jpg';
import banner3 from '@/renderer/assets/banners/horizontalBanner_3.jpg';
// Import logos
import rappiLogo from '@/renderer/assets/images/rappiSquareLogo.png';
import vapeBoxLogo from '@/renderer/assets/images/vapeBoxSquareLogo.png';
import emptyStateNoFilters from '@/renderer/assets/images/emptyStateNoFilters.png';

// Helper function to extract puff count from product name
const extractPuffCount = (name: string): number => {
  const match = name.match(/(\d{1,3}(?:,\d{3})*)\s*(?:,\d{3})*\s*Puffs/i);
  if (match && match[1]) {
    // Remove commas and convert to number
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
};

// Define filter categories structure - categories are hardcoded, brands are dynamic
const filterCategoriesData = [
  {
    name: 'Categoria',
    options: [
      { id: 'Bebidas', label: 'Bebidas' },
      { id: 'Caramelos', label: 'Caramelos' },
      { id: 'Chocolates', label: 'Chocolates' },
      { id: 'Cigarros', label: 'Cigarros' },
      { id: 'Galletas', label: 'Galletas' },
      { id: 'Snacks', label: 'Snacks' },
    ]
  },
  {
    name: 'Marca',
    options: [] // Will be populated dynamically from database
  },
  {
    name: 'Precio',
    options: [
      { id: '0-2', label: '0 - 2 soles' },
      { id: '2-5', label: '2 - 5 soles' },
      { id: '5-10', label: '5 - 10 soles' },
      { id: '10+', label: '10+ soles' },
    ],
  },
];

const ProductSelection: React.FC = () => {
  // console.log('Renderizando ProductSelection'); // ❌ ELIMINADO: Causaba re-renders infinitos
  const { cart, clearCart, removeFromCart, updateQuantity, closeCart, checkout, addToCart, getCartItemQuantity } = useCart();
  const { 
    isInitialized, 
    status, 
    initialize, 
    dispenseProduct,
    productDispensed,
    sensorActivated,
    resetProductDispensed,
    resetSensorActivated,
    temperature,
    error: hardwareError,
    bridgeAvailable
  } = useHardware();
  const { getSlotMapping, dispenseProductDb } = useProductOperations();
  const [error, setError] = useState<string | null>(null);
  
  // Use the products context to get products that were pre-fetched during splash screen
  const { products: dbProducts, loading, error: dbError, filteredProducts, setFilteredProducts } = useProductsContext();
  
  const [currentBanner, setCurrentBanner] = useState(0);
  const banners = [banner1, banner2, banner3];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRappiModalOpen, setIsRappiModalOpen] = useState(false);
  const [isDocumentScanModalOpen, setIsDocumentScanModalOpen] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showFeedbackThankYou, setShowFeedbackThankYou] = useState(false);
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(false);
  
  // Estado para almacenar el payment transaction ID
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  
  // 🔍 AGREGAR: Estado para almacenar el feedback
  const [lastFeedbackType, setLastFeedbackType] = useState<'happy' | 'neutral' | 'sad' | null>(null);
  const [lastFeedbackReason, setLastFeedbackReason] = useState<string | null>(null);
  
  // Estado para sincronización con el modal de dispensado para múltiples productos
  const [dispensingState, setDispensingState] = useState({
    totalProducts: 1,
    currentProductIndex: 1,
    currentProductName: ''
  });
  
  // Estado para sincronización con el Arduino
  const [arduinoStatus, setArduinoStatus] = useState<'idle' | 'motor-on' | 'sensor-on' | 'dispensed'>('idle');
  
  // Estado para controlar el dispensado basado en Arduino
  const [isWaitingForArduino, setIsWaitingForArduino] = useState(false);
  const [currentDispensingProduct, setCurrentDispensingProduct] = useState<{
    item: any;
    slotId: string;
    slotQuantity: number;
    unitsDispensedSoFar: number;
  } | null>(null);
  
  // Listener para eventos del Arduino
  useEffect(() => {
    const handleArduinoStatusUpdate = (event: CustomEvent) => {
      console.log('[ProductSelection] 🚀 Arduino status update recibido:', event.detail);
      setArduinoStatus(event.detail);
      
      // 🚀 NUEVA INTEGRACIÓN: Responder a STPOK del Arduino con delay para mostrar éxito
      if (event.detail === 'dispensed' && isWaitingForArduino && currentDispensingProduct) {
        console.log('[ProductSelection] 🎯 Arduino confirmó producto dispensado - mostrando éxito primero');
        
        // Calcular nuevo índice
        const newUnitsDispensed = currentDispensingProduct.unitsDispensedSoFar + 1;
        
        // Si completamos todas las unidades de este producto
        if (newUnitsDispensed >= currentDispensingProduct.slotQuantity) {
          console.log('[ProductSelection] ✅ Producto completado - actualizando índice después de mostrar éxito');
          
          // Actualizar índice después de un delay para que se vea el mensaje de éxito
          setTimeout(() => {
            console.log(`[ProductSelection] 🔄 Actualizando índice a ${newUnitsDispensed} de ${totalProductUnits}`);
            setDispensingState(prev => ({
              ...prev,
              currentProductIndex: newUnitsDispensed,
              currentProductName: currentDispensingProduct.item.product.FS_SABOR || currentDispensingProduct.item.product.name
            }));
            
            // Resetear Arduino DESPUÉS de actualizar el índice
            setTimeout(() => {
              console.log('[ProductSelection] 🔄 Reseteando Arduino después de actualizar índice');
              setArduinoStatus('idle');
              setIsWaitingForArduino(false);
              setCurrentDispensingProduct(null);
            }, 100); // 100ms después de actualizar el índice
          }, 300); // 0.3 segundos para mostrar "¡Producto dispensado exitosamente!"
          
        } else {
          // Continuar con la siguiente unidad del mismo producto
          setCurrentDispensingProduct(prev => prev ? {
            ...prev,
            unitsDispensedSoFar: newUnitsDispensed
          } : null);
          
          // Actualizar índice inmediatamente para unidades del mismo producto
          setDispensingState(prev => ({
            ...prev,
            currentProductIndex: newUnitsDispensed,
            currentProductName: currentDispensingProduct.item.product.FS_SABOR || currentDispensingProduct.item.product.name
          }));
        }
      }
    };

    window.addEventListener('arduino-status-update', handleArduinoStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('arduino-status-update', handleArduinoStatusUpdate as EventListener);
    };
  }, [isWaitingForArduino, currentDispensingProduct]);
  
  // Reset Arduino status when starting dispensing or changing products
  useEffect(() => {
    if (showSuccessModal) {
      console.log('[ProductSelection] 🔍 DIAGNÓSTICO - SuccessModal abierto:', {
        currentProductIndex: dispensingState.currentProductIndex,
        totalProducts: dispensingState.totalProducts
      });
      
      // Reset Arduino status when starting dispensing
      if (dispensingState.currentProductIndex === 1) {
        setArduinoStatus('idle');
      }
      // Reset Arduino status when moving to next product
      else if (dispensingState.currentProductIndex > 1) {
        setArduinoStatus('idle');
      }
    }
  }, [showSuccessModal, dispensingState.currentProductIndex, dispensingState.totalProducts]);
  

  
  // Callback para cambiar el estado del Arduino (envuelto en useCallback para evitar re-renders)
  const handleArduinoStatusChange = useCallback((status: 'idle' | 'motor-on' | 'sensor-on' | 'dispensed') => {
    console.log('[ProductSelection] 🔄 Cambiando estado del Arduino a:', status);
    setArduinoStatus(status);
  }, []);
  
  // Use the filter categories data with state to support updates
  const [filterCategories, setFilterCategories] = useState(filterCategoriesData);
  
  // Debug log to see current filterCategories state
  console.log('[FILTER DEBUG] Current filterCategories state:', filterCategories);
  
  // Initialize active filters based on filter categories
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(() => {
    const initialFilters: Record<string, string[]> = {};
    filterCategoriesData.forEach(category => {
      initialFilters[category.name] = [];
    });
    return initialFilters;
  });

  // Clean invalid filters on component mount
  useEffect(() => {
    const cleanedFilters = cleanInvalidFilters(activeFilters, filterCategories);
    if (JSON.stringify(cleanedFilters) !== JSON.stringify(activeFilters)) {
      setActiveFilters(cleanedFilters);
    }
  }, [filterCategories]);



  // Effect to extract unique brands from products and update filter options
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      console.log('[FILTER DEBUG] Total products loaded:', dbProducts.length);
      
      // 🔍 DEBUG: Verificar valores de descuento (temporal)
      const productsWithDiscount = dbProducts.filter(p => {
        if (!p.discount) return false;
        const cleanDiscount = p.discount.toString().replace('%', '');
        return !isNaN(Number(cleanDiscount)) && Number(cleanDiscount) > 0;
      });
      console.log('[DISCOUNT DEBUG] Productos con descuento válido:', productsWithDiscount.length);
      
      // Extract unique brands from products using brand field (FS_MARCA)
      const uniqueBrands = Array.from(new Set(
        dbProducts
          .map(product => product.brand)
          .filter(brand => brand && brand !== 'Unknown') // Filter out null/undefined/Unknown
      )).sort(); // Sort alphabetically

      console.log('[FILTER DEBUG] Unique brands found:', uniqueBrands);

      // Create filter options for brands
      const brandOptions = uniqueBrands.map(brand => ({
        id: brand || '',
        label: brand || ''
      })).filter(option => option.id !== '');

      console.log('[FILTER DEBUG] Brand options created:', brandOptions);

      // Update only the brand filter options, keep categories hardcoded
      setFilterCategories(prevCategories => 
        prevCategories.map(category => 
          category.name === 'Marca' 
            ? { ...category, options: brandOptions }
            : category
        )
      );
    }
  }, [dbProducts]);

  // Function to clean invalid filters
  const cleanInvalidFilters = (filters: Record<string, string[]>, categories: any[]) => {
    const cleaned: Record<string, string[]> = {};
    categories.forEach(category => {
      const categoryFilters = filters[category.name] || [];
      const validOptions = category.options.map((opt: any) => opt.id);
      cleaned[category.name] = categoryFilters.filter(filter => validOptions.includes(filter));
    });
    
    return cleaned;
  };

  const handleProductSelect = (product: Product) => {
    // Clear any existing stock error message when a new product is selected
    setDetailStockError(null);
    setSelectedProduct(product);
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
    clearCart();
  };

  const toggleFilterModal = () => {
    setIsFilterModalOpen(!isFilterModalOpen);
  };

  // Function to apply filters to products
  const applyFiltersToProducts = (productsToFilter: Product[], selectedFilters: Record<string, string[]>) => {
    let filtered = [...productsToFilter];
    
    // Filtro por categoría usando FS_DES_PROD_CONT
    if (selectedFilters.Categoria && selectedFilters.Categoria.length > 0) {
      filtered = filtered.filter(product => 
        product.FS_DES_PROD_CONT && selectedFilters.Categoria.includes(product.FS_DES_PROD_CONT)
      );
    }

    // Filtro por marca usando FS_MARCA
    if (selectedFilters.Marca && selectedFilters.Marca.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && selectedFilters.Marca.includes(product.brand)
      );
    }
    
    // Filtro por precio usando FN_PREC_VTA (price field)
    if (selectedFilters.Precio && selectedFilters.Precio.length > 0) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price as any);
        const priceRanges = selectedFilters.Precio.map(filter => {
          if (filter === "0-2") return [0, 2];
          if (filter === "2-5") return [2, 5];
          if (filter === "5-10") return [5, 10];
          if (filter === "10+") return [10.01, Infinity];
          return [0, 0];
        });
        return priceRanges.some(([min, max]) => 
          price >= min && price <= max
        );
      });
    }
    
    // Update filtered products
    setFilteredProducts(filtered);
  };

  const handleApplyFilters = (selectedFilters: Record<string, string[]>) => {
    setActiveFilters(selectedFilters);
    // Apply filters to the current products from the database
    applyFiltersToProducts(dbProducts, selectedFilters);
  };

  // Add a helper function to calculate the discounted price
  const calculateDiscountedPrice = (price: number | string, discount?: number | string): number => {
    // If price is a string, convert it to a number
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // If no price is provided, return 0
    if (numericPrice === undefined || numericPrice === null || isNaN(numericPrice)) {
      return 0;
    }
    
    // If discount is undefined, null, empty string, or "0", return original price
    if (discount === undefined || discount === null || discount === '' || discount === '0' || discount === 0) {
      return numericPrice;
    }
    
    // Convert string discount to number if needed, removing % symbol if present
    let discountValue: number;
    if (typeof discount === 'string') {
      // Remove % symbol and convert to number
      const cleanDiscount = discount.replace('%', '');
      discountValue = parseFloat(cleanDiscount);
    } else {
      discountValue = discount;
    }
    
    // If discount is not a valid number or is zero/negative, return original price
    if (isNaN(discountValue) || discountValue <= 0) {
      return numericPrice;
    }
    
    // Calculate discounted price
    const finalPrice = numericPrice - (numericPrice * (discountValue / 100));
    return finalPrice;
  };

  // Helper function to safely format price with 2 decimal places
  const formatPrice = (price: number | string): string => {
    // If price is a string, convert it to a number first
    if (typeof price === 'string') {
      price = parseFloat(price);
    }
    
    // Check if it's a valid number after potential conversion
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    
    return price.toFixed(2);
  };

  // Helper function to calculate cart total
  const calculateCartTotal = (items: Array<{product: Product; quantity: number}>): number => {
    return items.reduce((total: number, item) => {
      const discountedPrice = calculateDiscountedPrice(item.product.price, item.product.discount);
      return total + (discountedPrice * item.quantity);
    }, 0);
  };

  // Calculate total price function used throughout the component
  const calculateTotalPrice = (product: Product) => {
    return calculateDiscountedPrice(product.price || 0, product.discount);
  };

  // Enhance the checkout function with console logging and camera modal
  const enhancedCheckout = () => {
    // Only proceed if there are items in the cart
    if (cart.items.length === 0) {
      return;
    }
    
    console.log('Checkout initiated');
    console.log('Products being purchased:', cart.items);
    console.log('Total items:', cart.items.length);
    console.log('Total price:', cart.items.reduce((total, item) => total + (item.product.price || 0) * item.quantity, 0).toFixed(2));
    
    // Detailed logging of each product
    cart.items.forEach((item, index) => {
      console.log(`Product ${index + 1}:`, {
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: (item.product.price || 0) * item.quantity
      });
    });
    
    // Open the camera modal for facial recognition
    if (features.facialRecognition) {
      setIsCameraModalOpen(true);
    } else {
      // Guardar usuario id 0 en sessionStorage con clave FS_ID
      window.sessionStorage.setItem('currentUser', JSON.stringify({ FS_ID: 0 }));
      setIsPaymentModalOpen(true);
    }
  };

  // Function to determine if we're in any part of the payment process
  const isInPaymentProcess = () => {
    return isPaymentModalOpen || showSuccessModal || showFeedbackDetail || showFeedbackThankYou || showErrorModal;
  };

  // Banner rotation effect - only when not in payment process
  useEffect(() => {
    // Only run banner rotation when not in payment process
    if (!isInPaymentProcess()) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 8000); // Change banner every 8 seconds
      
      return () => clearInterval(interval);
    }
  }, [isPaymentModalOpen, showSuccessModal, showFeedbackDetail, showFeedbackThankYou, showErrorModal]); // ✅ Dependencias directas del estado

  // --- Start Memoized Handlers for CameraModal ---
  // Define handleCameraModalClose and wrap in useCallback
  const handleCameraModalClose = useCallback(() => {
    setIsCameraModalOpen(false);
  }, []); // Empty dependency array as it only uses a setter

  // Wrap handleFacialRecognitionSuccess in useCallback
  const handleFacialRecognitionSuccess = useCallback(() => {
    console.log('Facial recognition successful');
    setIsCameraModalOpen(false);
    setIsPaymentModalOpen(true);
  }, [setIsCameraModalOpen, setIsPaymentModalOpen]); // Dependency on setters (stable)
  
  // Wrap handleNewUserDetected in useCallback
  const handleNewUserDetected = useCallback((faceImageURL: string) => {
    console.log('[ProductSelection] New user detected, received face image.');
    
    // Guard against multiple calls
    if (isDocumentScanModalOpen) {
      console.warn('[ProductSelection] DocumentScanModal already open, ignoring duplicate new user detection');
      return;
    }
    
    setCapturedFaceImage(faceImageURL); // Store the image URL
    setIsCameraModalOpen(false);       // Close camera modal (already done by CameraModal's onClose)
    setIsDocumentScanModalOpen(true);  // Open document scan modal
  }, [isDocumentScanModalOpen]); // Add isDocumentScanModalOpen as dependency
  
  // Wrap handleCreateAccount in useCallback (though might not be passed directly)
  const handleCreateAccount = useCallback(() => {
    console.log('Starting new user creation flow...');
    // The CameraModal is already closed by itself before calling this function
    // We'll add a small delay before opening the document scan modal to ensure smooth transition
    setTimeout(() => {
      console.log('Showing document scan modal');
      setIsDocumentScanModalOpen(true);
    }, 300);
  }, [setIsDocumentScanModalOpen]); // Dependency on setter (stable)
  // --- End Memoized Handlers for CameraModal ---


  const handlePaymentComplete = async () => {
    try {
      // Ensure hardware is initialized before dispensing
      if (!isInitialized) {
        console.log('Hardware not initialized, initializing now...');
        const initResult = await initialize();
        if (!initResult) {
          throw new Error('Failed to initialize hardware');
        }
      }
      
      const cartItems = cart.items;
      
      // Configurar estado inicial del modal de dispensado
      const totalProductUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      setDispensingState({
        totalProducts: totalProductUnits,
        currentProductIndex: 1,
        currentProductName: cartItems.length > 0 ? (cartItems[0].product.FS_SABOR || cartItems[0].product.name) : ''
      });
      
      // Cerrar modal de pago
      setIsPaymentModalOpen(false);
      
      // ✅ CORREGIDO: Abrir SuccessModal ANTES de empezar a dispensar para mostrar progreso
      console.log('[ProductSelection] 🚀 Abriendo SuccessModal para mostrar progreso de dispensado');
      setShowSuccessModal(true);
      
      // Process each type of product in the cart
      for (const item of cartItems) {
        // Make sure we're using a string product ID
        const productId = String(item.product.id);
        
        // Calculate how many units have been dispensed so far (from previous items)
        let unitsDispensedSoFar = 0;
        for (let j = 0; j < cartItems.indexOf(item); j++) {
          unitsDispensedSoFar += cartItems[j].quantity;
        }
        
        // ✅ CORREGIDO: Actualizar estado para mostrar el producto actual que se está dispensando
        setDispensingState({
          totalProducts: totalProductUnits,
          currentProductIndex: unitsDispensedSoFar + 1,
          currentProductName: item.product.FS_SABOR || item.product.name
        });

        // Pequeño delay para que el usuario vea el cambio de producto
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log(`------- Processing ${item.quantity} units of ${item.product.name} (ID: ${productId}) -------`);
        console.log('Product details:', {
          id: productId,
          type: typeof productId,
          name: item.product.name,
          brand: item.product.brand,
          price: item.product.price,
          // Multi-slot dispensing will automatically find the best slots
        });
        
        // Need to dispense the quantity of each product
        let remainingQuantity = item.quantity;
        
        console.log(`------- Processing ${item.quantity} units of ${item.product.name} (ID: ${productId}) -------`);
        console.log('Product details:', {
          id: productId,
          type: typeof productId,
          name: item.product.name,
          brand: item.product.brand,
          price: item.product.price,
          // Multi-slot dispensing will automatically find the best slots
        });
        
        // Use multi-slot dispensing from the first attempt
        // This will automatically find and use multiple slots if needed
        console.log(`Attempting multi-slot dispensing for ${remainingQuantity} units of product ${productId}`);
                    
        // Request to dispense product using multi-slot dispensing
        // Pass undefined as slotId to activate automatic multi-slot search
        const dbResult = await dispenseProductDb(productId, undefined, remainingQuantity);
          
        console.log('Database result for multi-slot dispensing:', dbResult);
          
          if (!dbResult.success) {
          console.error(`Failed to dispense product ${productId} using multi-slot:`, dbResult.message);
          throw new Error(dbResult.message || `Failed to find available slots for product ${productId}`);
          }
          
          // Get the results from the backend
        const { slotId, quantityDispensed = 0, usedSlots, isMultiSlot } = dbResult;
          
          if (!slotId) {
            console.error('No slot ID returned');
            throw new Error(`No slot ID returned for product ${productId}`);
          }
          
        // Log multi-slot information if applicable
        if (isMultiSlot && usedSlots) {
          console.log(`Multi-slot dispensing activated: ${usedSlots.map((s: {slotId: string, quantityDispensed: number}) => `${s.slotId}(${s.quantityDispensed})`).join(', ')}`);
        }
          
        console.log(`Successfully found ${quantityDispensed} units using ${isMultiSlot ? 'multi-slot' : 'single-slot'} dispensing`);
          
          // Dispense each unit individually
        console.log(`Dispensing ${quantityDispensed} units (one at a time)`);
          
          let successfulDispenses = 0;
          
        if (isMultiSlot && usedSlots) {
          // Multi-slot dispensing: dispense from each slot individually
          console.log(`Processing ${usedSlots.length} slots for multi-slot dispensing`);
          
          for (const slotInfo of usedSlots) {
            const { slotId: currentSlotId, quantityDispensed: slotQuantity } = slotInfo;
            console.log(`Processing slot ${currentSlotId}: ${slotQuantity} unidades`);
            
            // Dispense from this specific slot
            for (let i = 0; i < slotQuantity; i++) {
              console.log(`Dispensing unit ${i+1}/${slotQuantity} from slot ${currentSlotId}`);
              
              // Dispense one unit at a time, using the correct motor number
              const dispensingResult = await dispenseProduct(currentSlotId);
              
              if (!dispensingResult.success) {
                console.error(`Hardware dispense failed for unit ${i+1} from slot ${currentSlotId}:`, dispensingResult.message);
                // Try to reinitialize hardware and retry once
                if (i === 0) { // Only retry on first unit
                  console.log('Attempting to reinitialize hardware and retry...');
                  await initialize();
                  const retryResult = await dispenseProduct(currentSlotId);
                  if (!retryResult.success) {
                    throw new Error(retryResult.message || `Failed to dispense unit ${i+1}/${slotQuantity} from slot ${currentSlotId} after retry`);
                  }
                } else {
                  throw new Error(dispensingResult.message || `Failed to dispense unit ${i+1}/${slotQuantity} from slot ${currentSlotId}`);
                }
              }
              
              successfulDispenses++;
              
              // Update dispensing state to show progress through individual units
              setDispensingState({
                totalProducts: totalProductUnits,
                currentProductIndex: unitsDispensedSoFar + successfulDispenses,
                currentProductName: item.product.FS_SABOR || item.product.name
              });
              
              // 🚀 CONFIGURAR ESPERA DEL ARDUINO
              setIsWaitingForArduino(true);
              setCurrentDispensingProduct({
                item,
                slotId: currentSlotId,
                slotQuantity,
                unitsDispensedSoFar: unitsDispensedSoFar + successfulDispenses
              });
              
              // 🚀 ESPERAR RESPUESTA STPOK DEL ARDUINO (sin delay artificial)
              console.log(`Waiting for Arduino STPOK response for unit ${i+1}/${slotQuantity} from slot ${currentSlotId}`);
              
              // Esperar hasta que el Arduino confirme con STPOK
              await new Promise<void>((resolve) => {
                const checkArduinoResponse = () => {
                  if (!isWaitingForArduino) {
                    console.log(`Arduino confirmed unit ${i+1}/${slotQuantity} dispensed from slot ${currentSlotId}`);
                    resolve();
                  } else {
                    // Revisar cada 100ms si el Arduino ya respondió
                    setTimeout(checkArduinoResponse, 100);
                  }
                };
                checkArduinoResponse();
              });
              
              console.log(`Successfully dispensed unit ${i+1}/${slotQuantity} from slot ${currentSlotId}`);
            }
          }
        } else {
          // Single slot dispensing: dispense all units from one slot
          console.log(`Dispensing ${quantityDispensed} units from slot ${slotId} (one at a time)`);
          
          for (let i = 0; i < quantityDispensed; i++) {
            console.log(`Dispensing unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
            
            // Dispense one unit at a time, using the correct motor number
            const dispensingResult = await dispenseProduct(slotId);
            
            if (!dispensingResult.success) {
              console.error(`Hardware dispense failed for unit ${i+1} from slot ${slotId}:`, dispensingResult.message);
              // Try to reinitialize hardware and retry once
              if (i === 0) { // Only retry on first unit
                console.log('Attempting to reinitialize hardware and retry...');
                await initialize();
                const retryResult = await dispenseProduct(slotId);
                if (!retryResult.success) {
                  throw new Error(retryResult.message || `Failed to dispense unit ${i+1}/${quantityDispensed} from slot ${slotId} after retry`);
                }
              } else {
                throw new Error(dispensingResult.message || `Failed to dispense unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
              }
            }
            
            // 🚀 CONFIGURAR ESPERA DEL ARDUINO
            setIsWaitingForArduino(true);
            setCurrentDispensingProduct({
              item,
              slotId,
              slotQuantity: quantityDispensed,
              unitsDispensedSoFar: unitsDispensedSoFar + successfulDispenses
            });
            
            // 🚀 ESPERAR RESPUESTA STPOK DEL ARDUINO (sin delay artificial)
            console.log(`Waiting for Arduino STPOK response for unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
            
            // Esperar hasta que el Arduino confirme con STPOK
            await new Promise<void>((resolve) => {
              const checkArduinoResponse = () => {
                if (!isWaitingForArduino) {
                  console.log(`Arduino confirmed unit ${i+1}/${quantityDispensed} dispensed from slot ${slotId}`);
                  successfulDispenses++;
                  resolve();
                } else {
                  // Revisar cada 100ms si el Arduino ya respondió
                  setTimeout(checkArduinoResponse, 100);
                }
              };
              checkArduinoResponse();
            });
            
            console.log(`Successfully dispensed unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
          }
        }
          
        console.log(`Successfully dispensed all ${successfulDispenses} units using ${isMultiSlot ? 'multi-slot' : 'single-slot'} dispensing`);
          
        // Update units dispensed so far for next product
        unitsDispensedSoFar += successfulDispenses;
        
        // 🚀 ARDUINO INTEGRATION: No delay needed - Arduino handles timing
        if (cartItems.indexOf(item) < cartItems.length - 1) {
          console.log('Arduino integration: No artificial delay needed between products');
        }
      }

      // If we get here, all products were dispensed successfully
      console.log('All products dispensed successfully!');
      
      // Generate Rappi inventory file after successful dispensing
      try {
        console.log('[RAPPI INVENTORY] Generating inventory file after successful dispensing...');
        const inventoryResult = await window.electron.ipcRenderer.invoke('rappi-inventory:generate');
        
        if (inventoryResult.success) {
          console.log('[RAPPI INVENTORY] Inventory file generated successfully:', inventoryResult.filePath);
        } else {
          console.error('[RAPPI INVENTORY] Failed to generate inventory file:', inventoryResult.error);
          // Don't throw error here - inventory generation failure shouldn't affect the purchase flow
        }
      } catch (inventoryError) {
        console.error('[RAPPI INVENTORY] Error generating inventory file:', inventoryError);
        // Don't throw error here - inventory generation failure shouldn't affect the purchase flow
      }
      
      // Clear cart after successful dispensing
      clearCart();
      
      // ✅ CORREGIDO: Actualizar estado final para mostrar que todos los productos fueron dispensados
      console.log('[ProductSelection] ✅ Dispensing completed successfully. Updating final state.');
      
      // 🚀 ARDUINO INTEGRATION: Actualizar estado final inmediatamente (sin delay artificial)
      setDispensingState({
        totalProducts: totalProductUnits,
        currentProductIndex: totalProductUnits, // Todos los productos dispensados
        currentProductName: cartItems.length > 0 ? (cartItems[cartItems.length - 1].product.FS_SABOR || cartItems[cartItems.length - 1].product.name) : ''
      });
      console.log('[ProductSelection] ✅ Estado final actualizado inmediatamente (Arduino integration)');
      
      console.log('[ProductSelection] ✅ DispensingState updated to final state:', {
        totalProducts: totalProductUnits,
        currentProductIndex: totalProductUnits,
        currentProductName: cartItems.length > 0 ? (cartItems[cartItems.length - 1].product.FS_SABOR || cartItems[cartItems.length - 1].product.name) : ''
      });
      
      // 🔍 DIAGNÓSTICO: Verificar que el SuccessModal esté abierto y en estado correcto
      console.log('[ProductSelection] 🔍 DIAGNÓSTICO - Estado actual:', {
        showSuccessModal,
        dispensingState: {
          totalProducts: totalProductUnits,
          currentProductIndex: totalProductUnits,
          currentProductName: cartItems.length > 0 ? (cartItems[cartItems.length - 1].product.FS_SABOR || cartItems[cartItems.length - 1].product.name) : ''
        }
      });
    } catch (error) {
      console.error('Error dispensing products:', error);
      
      // Set specific error message based on the error type
      let errorMessage = 'Error desconocido al dispensar productos';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to initialize hardware')) {
          errorMessage = 'Error: Hardware no disponible. Verifique la conexión del Arduino.';
        } else if (error.message.includes('Arduino not connected')) {
          errorMessage = 'Error: Arduino no conectado. Verifique la conexión USB.';
        } else if (error.message.includes('Failed to find available slot')) {
          errorMessage = 'Error: No hay productos disponibles en los slots.';
        } else if (error.message.includes('sensor')) {
          errorMessage = 'Error: Problema con el sensor del dispensador.';
        } else {
          errorMessage = `Error al dispensar: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      setShowErrorModal(true);
    }
  };

  // Get the resetToSplashScreen function from context
  const { resetToSplashScreen, setIsTimerPaused } = useContext(AppNavigationContext);
  
  // Function to reset inactivity timer when user interacts with the product selection screen
  const handleScreenInteraction = useCallback((event: React.MouseEvent) => {
    // Prevent event bubbling to avoid conflicts with other click handlers
    event.stopPropagation();
    
    // Dispatch a custom event that will reset the inactivity timer
    // This ensures any click anywhere on the screen resets the timer
    window.dispatchEvent(new Event('click'));
    
    // Dispatch custom event to reset PaymentModal timer if it's active
    window.dispatchEvent(new Event('main-screen-interaction'));
    
    console.log('[ProductSelection] 🕐 Timer de inactividad reseteado por interacción con la pantalla');
  }, []);
  
  // Update the handleFeedbackSubmitted function to handle different feedback types
  // ✅ OPTIMIZADO: Envolver en useCallback para evitar re-renders infinitos
  const handleFeedbackSubmitted = useCallback((feedback: 'happy' | 'neutral' | 'sad') => {
    console.log(`Feedback submitted: ${feedback}`);
    setLastFeedbackType(feedback); //  AGREGAR: Guardar el tipo de feedback
    setShowSuccessModal(false);
    
    if (feedback === 'sad') {
      // Si es carita triste, mostrar modal de detalles
      setShowFeedbackDetail(true);
    } else {
      // Si es feliz o neutral, ir directo al modal de gracias
      setShowFeedbackThankYou(true);
    }
  }, []);

  // ✅ OPTIMIZADO: Envolver en useCallback para evitar re-renders infinitos
  const handleDetailedFeedback = useCallback((reason: string) => {
    console.log(`Detailed feedback submitted: ${reason}`);
    setLastFeedbackReason(reason); // 🔍 AGREGAR: Guardar la razón del feedback
    // Cerrar modal de detalles y mostrar modal de gracias
    setShowFeedbackDetail(false);
    setShowFeedbackThankYou(true);
  }, []);

  // Handle feedback detail modal close
  const handleFeedbackDetailClose = useCallback(() => {
    console.log('Feedback detail modal closed without selection');
    // Si se cierra sin seleccionar, ir directo al modal de gracias
    setShowFeedbackDetail(false);
    setShowFeedbackThankYou(true);
  }, []);

  // ✅ OPTIMIZADO: Envolver en useCallback para evitar re-renders infinitos
  const handleFeedbackComplete = useCallback(() => {
    console.log('Feedback process complete, resetting application state');
    
    // Clear the cart (this will also clear localStorage)
    clearCart();
    
    // Close the cart UI
    closeCart();
    
    // Close all modals
    setShowSuccessModal(false);
    setShowFeedbackThankYou(false);
    setShowFeedbackDetail(false);
    setShowErrorModal(false);
    setIsPaymentModalOpen(false);
    setIsCameraModalOpen(false);
    setIsRappiModalOpen(false);
    setIsDocumentScanModalOpen(false);
    
    // Reset product display
    setSelectedProduct(null);
    
    // Create empty filters object
    const emptyFilters: Record<string, string[]> = {};
    filterCategories.forEach(category => {
      emptyFilters[category.name] = [];
    });
    
    // Reset active filters
    setActiveFilters(emptyFilters);
    
    // Apply the reset filters to refresh the product display
    applyFiltersToProducts(dbProducts, emptyFilters);
    
    // Reset sensor and product dispensed states
    if (resetSensorActivated) {
      resetSensorActivated();
    }
    if (resetProductDispensed) {
      resetProductDispensed();
    }
    
    // Clear recognized user from session storage
    window.sessionStorage.removeItem('currentUser');
    console.log('[ProductSelection] Cleared currentUser from sessionStorage.');
    
    // Reset to splash screen
    resetToSplashScreen();
  }, [clearCart, closeCart, filterCategories, dbProducts, applyFiltersToProducts, resetSensorActivated, resetProductDispensed, resetToSplashScreen]);

  // Handler for opening the Rappi modal
  const handleRappiClick = () => {
    console.log('Rappi logo clicked, opening Rappi modal');
    setIsRappiModalOpen(true);
  };

  // Test handler for SuccessModal
  const handleTestSuccessModal = () => {
    console.log('Test button clicked, opening SuccessModal with product ID 75');
    
    // Buscar el producto con ID 75 en la base de datos
    const product75 = dbProducts.find(p => p.id === '75');
    
    if (product75) {
      console.log('Producto 75 encontrado:', product75);
      setDispensingState({
        totalProducts: 1,
        currentProductIndex: 1,
        currentProductName: product75.FS_SABOR || product75.name
      });
    } else {
      console.log('Producto 75 no encontrado, usando nombre genérico');
      setDispensingState({
        totalProducts: 1,
        currentProductIndex: 1,
        currentProductName: 'Producto ID 75'
      });
    }
    
    setShowSuccessModal(true);
  };

  // Test handler for multiple products
  const handleTestMultiProductModal = () => {
    console.log('Test Multi Products button clicked, simulating 3 products');
    setDispensingState({
      totalProducts: 3,
      currentProductIndex: 1,
      currentProductName: 'Vape Pod Mango 3000 Puffs'
    });
    setShowSuccessModal(true);
    
    // Simular cambio de productos cada 8 segundos
    setTimeout(() => {
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 2,
        currentProductName: 'Energy Drink Red Bull'
      });
    }, 8000);
    
    setTimeout(() => {
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 3,
        currentProductName: 'Chocolate Snickers Bar'
      });
    }, 16000);
  };
  
  // Test handler for single product simulation
  const handleTestSingleProduct = () => {
    console.log('Test Single Product clicked, simulating single product dispensing');
    setDispensingState({
      totalProducts: 1,
      currentProductIndex: 1,
      currentProductName: 'Producto Único Test'
    });
    setShowSuccessModal(true);
    
    // Simular flujo del Arduino para producto único (tiempos reales)
    setTimeout(() => {
      console.log('[TEST] Simulando MMOK (motor activado)');
      setArduinoStatus('motor-on');
    }, 800);
    
    setTimeout(() => {
      console.log('[TEST] Simulando SNOK (sensor activado)');
      setArduinoStatus('sensor-on');
    }, 1800);
    
    setTimeout(() => {
      console.log('[TEST] Simulando STPOK (producto dispensado)');
      setArduinoStatus('dispensed');
    }, 2800);
  };
  
  // Test handler for multiple products simulation (flujo real exacto)
  const handleTestMultipleProducts = () => {
    console.log('Test Multiple Products clicked, simulating multiple products dispensing');
    setDispensingState({
      totalProducts: 3,
      currentProductIndex: 1,
      currentProductName: 'Producto 1 de 3'
    });
    setShowSuccessModal(true);
    
    // Simular flujo del Arduino para producto 1 (tiempos reales)
    setTimeout(() => {
      console.log('[TEST] Producto 1 - MMOK (motor activado)');
      setArduinoStatus('motor-on');
    }, 800);
    
    setTimeout(() => {
      console.log('[TEST] Producto 1 - SNOK (sensor activado)');
      setArduinoStatus('sensor-on');
    }, 1800);
    
    setTimeout(() => {
      console.log('[TEST] Producto 1 - STPOK (producto dispensado)');
      setArduinoStatus('dispensed');
    }, 2800);
    
    // Simular cambio al producto 2 (máximo 3s entre productos)
    setTimeout(() => {
      console.log('[TEST] Cambiando a Producto 2');
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 2,
        currentProductName: 'Producto 2 de 3'
      });
      setArduinoStatus('idle');
      
      // Simular flujo del Arduino para producto 2 (tiempos reales)
      setTimeout(() => {
        console.log('[TEST] Producto 2 - MMOK (motor activado)');
        setArduinoStatus('motor-on');
      }, 800);
      
      setTimeout(() => {
        console.log('[TEST] Producto 2 - SNOK (sensor activado)');
        setArduinoStatus('sensor-on');
      }, 1800);
      
      setTimeout(() => {
        console.log('[TEST] Producto 2 - STPOK (producto dispensado)');
        setArduinoStatus('dispensed');
      }, 2800);
    }, 3000); // Solo 3s de delay entre productos
    
    // Simular cambio al producto 3 (máximo 3s entre productos)
    setTimeout(() => {
      console.log('[TEST] Cambiando a Producto 3');
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 3,
        currentProductName: 'Producto 3 de 3'
      });
      setArduinoStatus('idle');
      
      // Simular flujo del Arduino para producto 3 (tiempos reales)
      setTimeout(() => {
        console.log('[TEST] Producto 3 - MMOK (motor activado)');
        setArduinoStatus('motor-on');
      }, 800);
      
      setTimeout(() => {
        console.log('[TEST] Producto 3 - SNOK (sensor activado)');
        setArduinoStatus('sensor-on');
      }, 1800);
      
      setTimeout(() => {
        console.log('[TEST] Producto 3 - STPOK (producto dispensado)');
        setArduinoStatus('dispensed');
      }, 2800);
    }, 6000); // Solo 3s de delay entre productos
  };

  // 🧪 NUEVO: Test handler para validar dispensado múltiple corregido
  const handleTestMultipleDispense = () => {
    console.log('🧪 TEST: Validando dispensado múltiple corregido');
    
    // Simular carrito con 3 productos diferentes
    const testProducts = [
      { id: 'test1', name: 'Coca Cola', sabor: 'Coca Cola' },
      { id: 'test2', name: 'Chocohips', sabor: 'Chocohips' },
      { id: 'test3', name: 'Fanta', sabor: 'Fanta' }
    ];
    
    // Limpiar carrito y agregar productos de prueba
    clearCart();
    testProducts.forEach(product => {
      addToCart({
        id: product.id,
        name: product.name,
        FS_SABOR: product.sabor,
        price: 5.00,
        slot_quantity: 10,
        image: '/path/to/image.jpg',
        brand: 'Test Brand',
        puffs: 0,
        slot_id: 'test-slot',
        category: 'test-category'
      });
    });
    
    // Simular flujo de dispensado múltiple SIN hardware
    console.log('🧪 TEST: Iniciando simulación de dispensado múltiple');
    
    // Configurar estado inicial
    setDispensingState({
      totalProducts: 3,
      currentProductIndex: 1,
      currentProductName: 'Coca Cola'
    });
    
    // Abrir SuccessModal
    setShowSuccessModal(true);
    
    // Simular progreso del producto 1 (Coca Cola) - 3 segundos
    setTimeout(() => {
      console.log('🧪 TEST: Producto 1 - Coca Cola completado');
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 2,
        currentProductName: 'Chocohips'
      });
    }, 3000);
    
    // Simular progreso del producto 2 (Chocohips) - 6 segundos total
    setTimeout(() => {
      console.log('🧪 TEST: Producto 2 - Chocohips completado');
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 3,
        currentProductName: 'Fanta'
      });
    }, 6000);
    
    // Simular progreso del producto 3 (Fanta) - 9 segundos total
    setTimeout(() => {
      console.log('🧪 TEST: Producto 3 - Fanta completado');
      setDispensingState({
        totalProducts: 3,
        currentProductIndex: 3,
        currentProductName: 'Fanta'
      });
      console.log('🧪 TEST: Todos los productos dispensados, esperando 3 segundos más para mostrar caritas');
      
      // Esperar 1.5 segundos más para que se vea "3 de 3" antes de cambiar a caritas
      setTimeout(() => {
        console.log('🧪 TEST: Cambiando a caritas después de mostrar "3 de 3"');
        // Forzar el cambio a 'dispensed' manualmente
        const successModal = document.querySelector('[data-success-modal]');
        if (successModal) {
          // Disparar evento personalizado para cambiar a 'dispensed'
          window.dispatchEvent(new CustomEvent('force-dispensed'));
        }
      }, 1500);
    }, 9000);
  };

  // Test handler para probar integración con Arduino
  const handleTestArduinoIntegration = () => {
    console.log('[TEST] 🚀 Iniciando prueba de integración con Arduino');
    
    // Simular carrito con múltiples productos (ejemplo: 3 productos)
    const testItems = [
      { product: { name: 'Coca Cola', FS_SABOR: 'Coca Cola', price: 1.00, slot_id: 'test-slot-1', category: 'test-category' }, quantity: 1 },
      { product: { name: 'Fanta', FS_SABOR: 'Fanta', price: 1.50, slot_id: 'test-slot-2', category: 'test-category' }, quantity: 1 },
      { product: { name: 'Sprite', FS_SABOR: 'Sprite', price: 1.50, slot_id: 'test-slot-3', category: 'test-category' }, quantity: 1 }
    ];
    
    // Calcular total de productos
    const totalProductUnits = testItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Configurar estado de dispensado
    setDispensingState({
      totalProducts: totalProductUnits,
      currentProductIndex: 0,
      currentProductName: ''
    });
    
    // Abrir modal de éxito
    setShowSuccessModal(true);
    
    // Simular flujo de dispensado con Arduino
    let currentProductIndex = 0;
    let currentItemIndex = 0;
    let currentUnitIndex = 0;
    
    const simulateArduinoResponse = () => {
      if (currentItemIndex >= testItems.length) {
        console.log('[TEST] ✅ Simulación completada - todos los productos dispensados');
        return;
      }
      
      const currentItem = testItems[currentItemIndex];
      const currentProduct = currentItem.product;
      
      if (currentUnitIndex >= currentItem.quantity) {
        // Pasar al siguiente producto
        currentItemIndex++;
        currentUnitIndex = 0;
        simulateArduinoResponse();
        return;
      }
      
      currentProductIndex++;
      currentUnitIndex++;
      
      console.log(`[TEST] Arduino STPOK: ${currentProductIndex} de ${totalProductUnits} - ${currentProduct.FS_SABOR}`);
      
      // Simular respuesta STPOK del Arduino
      setDispensingState({
        totalProducts: totalProductUnits,
        currentProductIndex: currentProductIndex,
        currentProductName: currentProduct.FS_SABOR
      });
      
      // 🚀 SIMULAR FLUJO COMPLETO DEL ARDUINO: motor-on → dispensed
      console.log(`[TEST] Motor girando para: ${currentProduct.FS_SABOR}`);
      setArduinoStatus('motor-on');
      
      // Simular tiempo de giro del motor (1-2 segundos)
      const motorTime = Math.random() * 1000 + 1000; // 1-2 segundos
      setTimeout(() => {
        console.log(`[TEST] STPOK recibido para: ${currentProduct.FS_SABOR}`);
        setArduinoStatus('dispensed');
        
        // Simular delay antes del siguiente producto (0.5-1 segundo)
        const nextDelay = Math.random() * 500 + 500; // 0.5-1 segundo
        setTimeout(() => {
          // Resetear estado del Arduino para el siguiente producto
          setArduinoStatus('idle');
          simulateArduinoResponse();
        }, nextDelay);
      }, motorTime);
    };
    
    // Iniciar simulación después de 500ms
    setTimeout(simulateArduinoResponse, 500);
  };

  // Test handler para simular SuccessModal con uno y varios productos (SIN Arduino)
  const handleTestSuccessModalSimulation = () => {
    console.log('[TEST] 🚀 Iniciando simulación del SuccessModal (SIN Arduino)');
    
    // Abrir modal de selección
    setShowSimulationModal(true);
  };

  // Funciones para manejar las diferentes opciones de simulación
  const handleSimulationChoice = (choice: number) => {
    console.log(`[TEST] Seleccionada opción ${choice}`);
    
    switch (choice) {
      case 1:
        console.log('[TEST] Simulando UN SOLO PRODUCTO');
        setDispensingState({
          totalProducts: 1,
          currentProductIndex: 1,
          currentProductName: 'Vape Pod Mango 3000 Puffs'
        });
        setShowSuccessModal(true);
        break;

      case 2:
        console.log('[TEST] Simulando 2 PRODUCTOS');
        setDispensingState({
          totalProducts: 2,
          currentProductIndex: 1,
          currentProductName: 'Vape Pod Mango 3000 Puffs'
        });
        setShowSuccessModal(true);
        break;

      case 3:
        console.log('[TEST] Simulando 3 PRODUCTOS');
        setDispensingState({
          totalProducts: 3,
          currentProductIndex: 1,
          currentProductName: 'Vape Pod Mango 3000 Puffs'
        });
        setShowSuccessModal(true);
        break;

      case 4:
        console.log('[TEST] Simulando 5 PRODUCTOS');
        setDispensingState({
          totalProducts: 5,
          currentProductIndex: 1,
          currentProductName: 'Vape Pod Mango 3000 Puffs'
        });
        setShowSuccessModal(true);
        break;

      default:
        console.error('[TEST] Opción inválida:', choice);
        return;
    }

    const timeMap = { 1: '2.8s', 2: '5.6s', 3: '8.4s', 4: '14s' };
    const productMap = { 1: '1 producto', 2: '2 productos', 3: '3 productos', 4: '5 productos' };
    
    console.log(`[TEST] ✅ SuccessModal abierto con ${productMap[choice as keyof typeof productMap]}`);
    console.log(`[TEST] ⏰ Tiempo estimado: ${timeMap[choice as keyof typeof timeMap]}`);
    
    // Cerrar modal de simulación
    setShowSimulationModal(false);
  };
  
  // Test handler para simular pago exitoso completo CON SIMULACIÓN DE ARDUINO
  const handleTestPagoExitoso = async () => {
    console.log('[TEST] 🚀 Iniciando simulación de pago exitoso completo CON ARDUINO');
    
    try {
      // 1. Simular que hay productos en el carrito
      const testProduct = dbProducts[0]; // Tomar el primer producto disponible
      if (!testProduct) {
        console.error('[TEST] No hay productos disponibles para la prueba');
        return;
      }
      
      console.log('[TEST] Producto seleccionado para prueba:', testProduct.name);
      
      // 2. Simular que el hardware está inicializado
      if (!isInitialized) {
        console.log('[TEST] Hardware no inicializado, inicializando...');
        await initialize();
      }
      
      // 3. Simular que hay productos en el carrito
      console.log('[TEST] Agregando producto de prueba al carrito');
      clearCart(); // Limpiar carrito primero
      addToCart(testProduct); // Agregar producto de prueba
      
      // 4. Simular que el pago fue exitoso y llamar directamente a handlePaymentComplete
      console.log('[TEST] Llamando a handlePaymentComplete para simular flujo completo');
      await handlePaymentComplete();
      
      // 5. 🚀 ABRIR SUCCESSMODAL DIRECTAMENTE PARA LA SIMULACIÓN
      console.log('[TEST] 🚀 Abriendo SuccessModal directamente para la simulación');
      setDispensingState({
        totalProducts: 1,
        currentProductIndex: 1,
        currentProductName: testProduct.FS_SABOR || testProduct.name
      });
      setShowSuccessModal(true);
      
      // 6. 🚀 SIMULACIÓN DEL ARDUINO DESPUÉS DE ABRIR EL MODAL
      console.log('[TEST] 🚀 Iniciando simulación del Arduino...');
      
      // Simular flujo completo del Arduino (tiempos reales)
      setTimeout(() => {
        console.log('[TEST] Arduino: Simulando MMOK (motor activado)');
        setArduinoStatus('motor-on');
      }, 1000); // 1s después de abrir el modal
      
      setTimeout(() => {
        console.log('[TEST] Arduino: Simulando SNOK (sensor activado)');
        setArduinoStatus('sensor-on');
      }, 3000); // 3s después de abrir el modal
      
      setTimeout(() => {
        console.log('[TEST] Arduino: Simulando STPOK (producto dispensado)');
        setArduinoStatus('dispensed');
      }, 5000); // 5s después de abrir el modal
      
      console.log('[TEST] ✅ Simulación de pago exitoso + Arduino completada');
      
    } catch (error) {
      console.error('[TEST] ❌ Error en simulación de pago exitoso:', error);
    }
  };

  // Modificar el handler de SuccessModal timeout para mostrar el modal de caritas
  // ✅ OPTIMIZADO: Envolver en useCallback para evitar re-renders infinitos
  const handleSuccessModalTimeout = useCallback(() => {
    console.log('SuccessModal timed out, closing modal y yendo al splash screen');
    setShowSuccessModal(false);
    
    // Clear the cart
    clearCart();
    
    // Reset to splash screen
    resetToSplashScreen();
  }, [clearCart, resetToSplashScreen]);

  // Hardware status check
  const isHardwareConnected = Boolean(status?.arduino?.connected);
  const [isDispensing, setIsDispensing] = useState(false);
  

  
  const [testSlotId, setTestSlotId] = useState('A1');
  const [selectedTestProduct, setSelectedTestProduct] = useState<Product | null>(null);
  const [testDispenseResult, setTestDispenseResult] = useState<string | null>(null);
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  
  // Handle document scan result
  const handleVerificationComplete = (result: { success: boolean; age?: number; message?: string }) => {
    console.log('Verification result:', result);
    setIsDocumentScanModalOpen(false);
    
    // If verification was successful, proceed to payment
    if (result.success) {
      console.log('[ProductSelection] Document verification successful, opening PaymentModal.');
      setIsPaymentModalOpen(true);
    } else {
      // Optional: Handle failure case if needed (e.g., show error message)
      console.warn('[ProductSelection] Document verification failed or user was underage:', result.message);
      // Might want to display an error to the user here before resetting
      // For now, we just log it. The DocumentScanModal already handles showing the 'underage' message.
    }
  };

  // Initialize inventory from products data
  useEffect(() => {
    if (dbProducts.length > 0) {
      const initialInventory: Record<string, number> = {};
      dbProducts.forEach(product => {
        initialInventory[product.slot_id] = product.slot_quantity || 0;
      });
      setInventory(initialInventory);
    }
  }, [dbProducts]);

  // Update hardware status when status changes
  useEffect(() => {
    if (status) {
      setHardwareStatus(status);
    }
  }, [status]);

  // Check hardware status
  const checkHardwareStatus = async () => {
    if (!isInitialized) {
      console.warn('Hardware not initialized - skipping hardware status check');
      setIsCheckingStatus(false);
      return;
    }

    setIsCheckingStatus(true);
    try {
      await initialize();
      setIsCheckingStatus(false);
    } catch (error) {
      console.error('Error checking hardware status:', error);
      setIsCheckingStatus(false);
    }
  };

  // Check hardware status on component mount
  useEffect(() => {
    if (isInitialized) {
      checkHardwareStatus();
      // Set up interval to check status every 10 seconds
      const interval = setInterval(checkHardwareStatus, 10000);
      return () => clearInterval(interval);
    } else {
      console.warn('Hardware not initialized - skipping hardware initialization');
    }
  }, [isInitialized]);

  // Update test product when slot changes
  useEffect(() => {
    const product = dbProducts.find(p => p.slot_id === testSlotId);
    setSelectedTestProduct(product || null);
  }, [testSlotId, dbProducts]);

  // Handle test dispense
  const handleTestDispense = async () => {
    if (!isInitialized) {
      setTestDispenseResult('Error: Hardware not initialized');
      return;
    }

    if (!selectedTestProduct) {
      setTestDispenseResult('No product selected for testing');
      return;
    }

    if (!isHardwareConnected) {
      setTestDispenseResult('Error: Hardware not connected');
      return;
    }

    try {
      setIsDispensing(true);
      setTestDispenseResult(null);
      const result = await dispenseProduct(selectedTestProduct.slot_id);
      
      if (result.success) {
        setTestDispenseResult(`Successfully dispensed ${selectedTestProduct.name} from slot ${selectedTestProduct.slot_id}`);
      } else {
        setTestDispenseResult(`Failed to dispense: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during test dispense:', error);
      setTestDispenseResult(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsDispensing(false);
    }
  };

  // Add function to handle product selection for testing
  const handleTestProductChange = (productId: string) => {
    const product = dbProducts.find(p => p.slot_id === productId);
    if (product) {
      setSelectedTestProduct(product);
      setTestSlotId(product.slot_id);
    } else {
      setSelectedTestProduct(null);
    }
  };


  // Add state for cart error messages
  const [cartErrors, setCartErrors] = useState<Record<string, string>>({});
  // Add state for product detail stock error message
  const [detailStockError, setDetailStockError] = useState<string | null>(null);

  // Add to cart with stock validation
  const handleAddToCart = (product: Product) => {
    // Clear any previous detail stock error
    setDetailStockError(null);

    // Check stock before proceeding
    if (!product || product.slot_quantity === undefined || product.slot_quantity <= 0) {
      console.warn('[AddToCart] Attempted to add out-of-stock product:', product?.name);
      setDetailStockError('Producto sin stock, por favor selecciona otro');
      // Clear the error after 3 seconds
      setTimeout(() => setDetailStockError(null), 3000);
      return; // Stop execution
    }

    // Add price and puffs to the product before adding to cart
    const productWithDetails = {
      ...product,
      puffs: product.puffs
    };

    const result = addToCart(productWithDetails as any);

    if (!result.success && result.message) {
      // Store the *cart-specific* error message (e.g., max quantity reached)
      setCartErrors({
        ...cartErrors,
        [product.id]: result.message
      });

      // Clear the cart error after 3 seconds
      setTimeout(() => {
        setCartErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[product.id];
          return newErrors;
        });
      }, 3000);
    } else {
      // Clear any existing *cart* error for this product if add was successful
      if (cartErrors[product.id]) {
        setCartErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[product.id];
          return newErrors;
        });
      }
    }
  };

  // New handler for the direct "Comprar" button
  const handleDirectPurchase = (product: Product) => {
    console.log('[DirectPurchase] Initiated for product:', product.name);
    // Clear any previous detail stock error
    setDetailStockError(null);

    // Check stock before proceeding
    if (!product || product.slot_quantity === undefined || product.slot_quantity <= 0) {
      console.warn('[DirectPurchase] Attempted to buy out-of-stock product:', product?.name);
      setDetailStockError('Producto sin stock, por favor selecciona otro');
      // Clear the error after 3 seconds
      setTimeout(() => setDetailStockError(null), 3000);
      return; // Stop execution
    }

    // --- Stock is available, proceed ---

    // 1. Clear any existing items in the cart
    clearCart();
    console.log('[DirectPurchase] Cart cleared.');

    // 2. Add only the selected product to the cart (quantity 1)
    // We reuse handleAddToCart which now also clears detailStockError if successful
    handleAddToCart(product);

    // Check if the item was actually added (handleAddToCart might prevent it due to cart rules like max quantity)
    // We check cartErrors specifically here, as handleAddToCart handles the *detailStockError*
    if (!cartErrors[product.id]) { 
        console.log('[DirectPurchase] Product added to cart behind the scenes.');
        
        // 3. Ensure Cart UI is closed
        if (cart.isOpen) {
          closeCart();
          console.log('[DirectPurchase] Ensured cart UI is closed.');
        }

        // 4. Initiate the verification/payment flow
        if (features.facialRecognition) {
          setIsCameraModalOpen(true);
        } else {
          // Guardar usuario id 0 en sessionStorage con clave FS_ID
          window.sessionStorage.setItem('currentUser', JSON.stringify({ FS_ID: 0 }));
          setIsPaymentModalOpen(true);
        }
    } else {
        console.warn('[DirectPurchase] Could not add product to cart (cart rule violation). Aborting direct purchase.');
        // Cart-specific error message should be displayed by handleAddToCart already
    }
  };

  // Handle quantity update with stock validation
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const result = updateQuantity(productId, newQuantity);
    
    if (!result.success && result.message) {
      // Store the error message for this product
      setCartErrors({
        ...cartErrors,
        [productId]: result.message
      });
      
      // Clear the error after 3 seconds
      setTimeout(() => {
        setCartErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[productId];
          return newErrors;
        });
      }, 3000);
    } else {
      // Clear any existing error for this product
      if (cartErrors[productId]) {
        setCartErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[productId];
          return newErrors;
        });
      }
    }
  };

  // Add effect to listen for productDispensed event and show appropriate feedback
  useEffect(() => {
    if (productDispensed) {
      console.log('Product dispensed event detected, sensor activated:', sensorActivated);
      
      if (sensorActivated) {
        console.log('Product successfully dropped, showing success modal');
        setShowSuccessModal(true);
      } else {
        console.error('Sensor failed to detect product drop, showing error modal');
        setError('El producto no se detectó en la bandeja. Por favor, contacte con el personal de soporte.');
        setShowErrorModal(true);
      }
      
      resetProductDispensed();
    }
  }, [productDispensed, sensorActivated, resetProductDispensed]);

  // Display error state - will also show dummy products as fallback
  if (dbError && filteredProducts.length === 0) {
    console.error('Error loading products:', dbError);
  }

  const [isTestDispenseModalOpen, setIsTestDispenseModalOpen] = useState(false);

  // Add floating button to open test dispense modal
  const TestDispenseButton = () => (
    <button
      onClick={() => setIsTestDispenseModalOpen(true)}
      className="fixed bottom-20 left-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Dispense
    </button>
  );

  // Add floating button to test success modal with dispensing process
  const TestSuccessButton = () => (
    <button
      onClick={handleTestSuccessModal}
      className="fixed bottom-20 left-44 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Success
    </button>
  );

  // Add floating button to test multiple products dispensing
  const TestMultiButton = () => (
    <button
      onClick={handleTestMultiProductModal}
      className="fixed bottom-20 left-80 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Multi
    </button>
  );

  // Simple function to close feedback thank you modal and reset to splash
  const handleFeedbackThankYouClose = useCallback(() => {
    console.log('[ProductSelection] Feedback thank you modal closing, resetting to splash');
    
    // Close the modal first
    setShowFeedbackThankYou(false);
    
    // Clear the cart
    clearCart();
    
    // Simple reset - just close modal and clear cart for now
    console.log('[ProductSelection] Modal closed and cart cleared');
    
    // Reset to splash screen
    resetToSplashScreen();
  }, [clearCart, resetToSplashScreen]);

  // Test function to test feedback with a real payment transaction ID
  const testFeedbackWithRealTransactionId = async () => {
    console.log('[ProductSelection] Testing feedback with real transaction ID: 0000526512253768');
    
    try {
      // Test happy feedback
      const happyResult = await window.electron.ipcRenderer.invoke('purchase:submitFeedback', {
        paymentTransactionId: '0000526512253768',
        feedbackValue: 'happy',
        feedbackReason: null
      });
      console.log('[ProductSelection] Happy feedback result:', happyResult);
      
      // Test sad feedback with reason
      const sadResult = await window.electron.ipcRenderer.invoke('purchase:submitFeedback', {
        paymentTransactionId: '0000526512253768',
        feedbackValue: 'sad',
        feedbackReason: 'No tenia mi producto'
      });
      console.log('[ProductSelection] Sad feedback result:', sadResult);
      
      alert('Feedback test completed! Check console for results.');
    } catch (error) {
      console.error('[ProductSelection] Error testing feedback:', error);
      alert(`Error testing feedback: ${error}`);
    }
  };

  // Add floating button to test feedback with real transaction ID
  const TestFeedbackButton = () => (
    <button
      onClick={testFeedbackWithRealTransactionId}
      className="fixed bottom-20 left-80 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Feedback
    </button>
  );

  // Add floating button to simulate SuccessModal with one and multiple products
  const TestSuccessModalSimulationButton = () => (
    <button
      onClick={handleTestSuccessModalSimulation}
      className="fixed bottom-20 left-96 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test SuccessModal Sim
    </button>
  );

  // 🧪 NUEVO: Botón para validar dispensado múltiple corregido
  const TestMultipleDispenseButton = () => (
    <button
      onClick={handleTestMultipleDispense}
      className="fixed bottom-20 left-80 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      🧪 Test Dispensado Múltiple
    </button>
  );

  // 🚀 NUEVO: Botón para probar integración con Arduino
  const TestArduinoIntegrationButton = () => (
    <button
      onClick={handleTestArduinoIntegration}
      className="fixed bottom-20 left-96 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      🚀 Test Arduino Integration
    </button>
  );

  // Test function to simulate a real payment flow
  const simulateRealPaymentFlow = async () => {
    console.log('[ProductSelection] Starting real payment flow simulation');
    
    try {
      // Simulate adding a product to cart
      const testProduct = dbProducts.find(p => p.id === '75') || dbProducts[0];
      if (!testProduct) {
        console.error('No test product found');
        return;
      }
      
      // Add product to cart
      addToCart(testProduct);
      console.log('[ProductSelection] Added test product to cart:', testProduct.name);
      
      // Simulate opening payment modal
      setIsPaymentModalOpen(true);
      console.log('[ProductSelection] Payment modal opened');
      
      // Simulate successful payment after 3 seconds
      setTimeout(() => {
        console.log('[ProductSelection] Simulating successful payment');
        
        // Close payment modal
        setIsPaymentModalOpen(false);
        
        // Show success modal (this will trigger the real flow)
        setShowSuccessModal(true);
        
        // Simulate dispense completion after 4 seconds
        setTimeout(() => {
          console.log('[ProductSelection] Dispense completed, showing feedback options');
          // The SuccessModal will automatically show feedback options
        }, 4000);
        
      }, 3000);
      
    } catch (error) {
      console.error('[ProductSelection] Error in payment flow simulation:', error);
    }
  };

  // Test function to simulate successful POS response (code 00)
  const simulateSuccessfulPOSResponse = async () => {
    console.log('[ProductSelection] Starting successful POS response simulation');
    
    try {
      // Simulate adding a product to cart
      const testProduct = dbProducts.find(p => p.id === '75') || dbProducts[0];
      if (!testProduct) {
        console.error('No test product found');
        return;
      }
      
      // Add product to cart
      addToCart(testProduct);
      console.log('[ProductSelection] Added test product to cart:', testProduct.name);
      
      // Simulate opening payment modal
      setIsPaymentModalOpen(true);
      console.log('[ProductSelection] Payment modal opened');
      
      // Simulate successful POS response after 5 seconds (code 00)
      setTimeout(() => {
        console.log('[ProductSelection] Simulating successful POS response (code 00)');
        
        // Simulate the payment success flow
        const mockTransactionId = 'TEST_' + Date.now();
        window.sessionStorage.setItem('currentTransactionId', mockTransactionId);
        
        // Close payment modal and show success modal
        setIsPaymentModalOpen(false);
        handlePaymentComplete();
        
      }, 5000);
      
    } catch (error) {
      console.error('[ProductSelection] Error in POS simulation:', error);
    }
  };

  // Test function to let timer expire and show REINTENTAR modal
  const simulateTimerExpiration = async () => {
    console.log('[ProductSelection] Starting timer expiration simulation');
    
    try {
      // Simulate adding a product to cart
      const testProduct = dbProducts.find(p => p.id === '75') || dbProducts[0];
      if (!testProduct) {
        console.error('No test product found');
        return;
      }
      
      // Add product to cart
      addToCart(testProduct);
      console.log('[ProductSelection] Added test product to cart:', testProduct.name);
      
      // Simulate opening payment modal
      setIsPaymentModalOpen(true);
      console.log('[ProductSelection] Payment modal opened - Timer will expire in 120 seconds');
      console.log('[ProductSelection] Let the timer countdown to 0 to see REINTENTAR modal');
      
      // Don't close the modal - let the timer expire naturally
      // The modal will show "ERROR EN EL PAGO" with "REINTENTAR" button after 120s
      
    } catch (error) {
      console.error('[ProductSelection] Error in timer expiration simulation:', error);
    }
  };

  // Test button for real payment flow simulation
  const TestRealPaymentButton = () => (
    <button
      onClick={simulateRealPaymentFlow}
      className="fixed bottom-20 left-20 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Pago Real
    </button>
  );

  // Test button to open payment modal directly
  const TestPaymentModalButton = () => (
    <button
      onClick={() => setIsPaymentModalOpen(true)}
      className="fixed bottom-20 left-32 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Modal Pago
    </button>
  );

  // Test button to simulate successful POS response
  const TestSuccessfulPOSButton = () => (
    <button
      onClick={simulateSuccessfulPOSResponse}
      className="fixed bottom-20 left-44 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test POS Exitoso
    </button>
  );

  // Test button to let timer expire and see REINTENTAR modal
  const TestTimerExpirationButton = () => (
    <button
      onClick={simulateTimerExpiration}
      className="fixed bottom-20 left-56 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50 flex items-center"
    >
      Test Timer 0
    </button>
  );

  return (
    <main 
      className="relative min-h-screen bg-black text-white"
      onClick={handleScreenInteraction}
    >
      {/* Hero Section - Full width */}
      <section 
        className="relative w-full overflow-hidden"
        onClick={handleScreenInteraction}
      >
        <img
          src={banners[currentBanner]}
          alt={`Banner ${currentBanner + 1}`}
          className="w-full h-full object-fill"
        />
      </section>

      {/* Title and Filter Bar */}
      <div 
        className="flex flex-col mt-[40px] pl-[30px] pr-[30px] mb-[20px]"
        onClick={handleScreenInteraction}
      >
        <div className="flex items-center justify-between mb-[20px]">
          <h2 className="text-[32px] font-extrabold text-white font-akira">Escoge tus productos</h2>
          <div className="flex items-center gap-4">
            <span className="font-bold text-[18px] text-white mb-4">
              {temperature !== null && temperature !== undefined ? `${temperature}°C` : ''}
            </span>
            <button 
              className={`px-[16px] py-[16px] rounded-[447px] text-[24px] font-semibold relative ${
                Object.values(activeFilters).some(filters => filters.length > 0) 
                  ? 'bg-white text-black' 
                  : 'bg-white text-black'
              }`}
              onClick={toggleFilterModal}
            >
              <span className="font-bold">Filtros</span>
              {Object.values(activeFilters).some(filters => filters.length > 0) && (
                <span className="ml-2 bg-black text-white rounded-full w-[24px] h-[24px] text-[18px] inline-flex items-center justify-center font-bold px-[2px]">
                  {Object.values(activeFilters).reduce((count, filters) => count + filters.length, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Active Filter Tags */}
        {Object.values(activeFilters).some(filters => filters.length > 0) && (
          <div className="flex flex-wrap gap-4 mt-4">
            {Object.entries(activeFilters).map(([category, filters]) => 
              filters.map(filter => {
                // Find the label for this filter
                const filterCategory = filterCategories.find(cat => cat.name === category);
                const filterOption = filterCategory?.options.find((opt: any) => opt.id === filter);
                
                if (!filterOption) return null;
                
                // Format the label based on category
                let displayLabel = filterOption.label;
                // Eliminar el agregado de 'Puffs' para el filtro de precio
                // if (category === 'Precio') {
                //   displayLabel = `${displayLabel} Puffs`;
                // }
                
                return (
                  <div 
                    key={`${category}-${filter}`} 
                    className="bg-[#454eff] text-white px-[16px] py-[12px] rounded-full flex items-center gap-2"
                  >
                    <span className="text-[24px] font-[600]">{displayLabel}</span>
                    <button 
                      onClick={() => {
                        // Create a new filters object with the removed filter
                        const updatedFilters = {
                          ...activeFilters,
                          [category]: activeFilters[category].filter(f => f !== filter)
                        };
                        
                        // Update the active filters state
                        setActiveFilters(updatedFilters);
                        
                        // Apply the updated filters to refresh the product display
                        handleApplyFilters(updatedFilters);
                      }}
                      className="bg-white rounded-full w-[24px] h-[24px] flex items-center justify-center"
                    >
                      <X size={24} color="#454eff" />
                    </button>
                  </div>
                );
              })
            ).flat()}
          </div>
        )}
      </div>

      {/* Main content with flex layout */}
      <div 
        className="flex h-full"
        onClick={handleScreenInteraction}
      >
        {/* Product Grid Section - Always Scrollable */}
        <section 
          id="product-grid" 
          className={`px-[30px] ${selectedProduct ? 'w-[calc(100%-440px)]' : 'w-full'} overflow-y-auto`}
          style={{ 
            height: "calc(100vh - 100px)", 
            paddingBottom: "400px",
            marginRight: '10px'
          }}
          onClick={handleScreenInteraction}
        >
          <div className="pb-[400px]">
            {/* ===== START OF INLINE LOADING SECTION ===== */}
            {loading ? (
              <div className="flex flex-col items-center justify-center pt-[10vh] text-center">
                <img src={vapeBoxLogo} alt="Cargando..." className="w-32 h-32 mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2 text-gray-300">Cargando productos...</h2>
                <p className="text-xl text-gray-400 mb-4">Solo unos segundos</p>
                {/* Animated Progress Bar */}
                <div className="w-64 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full progress-bar-fill"></div>
                </div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={`grid ${selectedProduct ? 'grid-cols-3' : 'grid-cols-5'} gap-4`}>
                {filteredProducts.map((product, index) => (
                  <div
                    key={index}
                    className="relative bg-white rounded-lg shadow-sm border p-4 aspect-square cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-center product-item-container"
                    onClick={() => handleProductSelect(product)}
                    data-productid={product.id}
                  >
                    {/* Badge de descuento si FS_DSCTO > 0 */}
                    {(() => {
                      // Remover el símbolo % del descuento antes de convertir a número
                      const cleanDiscount = product.discount ? product.discount.toString().replace('%', '') : '';
                      const discountNumber = Number(cleanDiscount);
                      const hasDiscount = cleanDiscount && !isNaN(discountNumber) && discountNumber > 0;
                      
                      return hasDiscount && (
                        <span className="absolute top-3 right-3 bg-[#FF4545] text-white px-2 py-0.5 text-[10px] font-bold rounded-full z-10 shadow-md">
                          -{discountNumber}%
                        </span>
                      );
                    })()}
                    {/* Precio arriba de la imagen (eliminar) */}
                    {/* <div className="w-full flex justify-center mb-1">
                      <span className="text-white text-[5px] font-bold">
                        s/{formatPrice(calculateDiscountedPrice(product.price, product.discount))}
                      </span>
                    </div> */}
                    <div className="flex-1 flex items-center justify-center image-container" style={{ minHeight: '105px' }}>
                      <img
                        src={product.image || vapeBoxLogo}
                        alt={product.name}
                        className="max-h-[105px] max-w-[85%] object-contain product-image"
                        data-productid-img={product.id}
                      />
                    </div>
                    <div className="text-center mt-2">
                      {/* Medida o descripción */}
                      {/* 
                      <p className="text-[12px] text-gray-500">{product.FS_DIMENSION || ''}</p>
                      {/* Nombre */}
                      */

                      <p className="text-[10px] font-bold text-gray-500">{product.FS_SABOR || product.name}</p>
                      {/* Precio */}
                      <p className="text-[16px] font-bold text-black mt-1">s/{formatPrice(calculateDiscountedPrice(product.price, product.discount))}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-start items-center h-full w-full bg-black relative pt-[10vh]">
                <div className="text-center px-4 max-w-2xl mb-4">
                  <h2 className="text-[32px] font-extrabold text-[#929292] font-akira text-center leading-tight">
                    Lo sentimos, no hay lo que buscas por el momento
                  </h2>
                  <p className="text-[24px] font-medium text-[#929292] mt-4">(Elimina filtros)</p>
                  <div className="flex justify-center mt-6">
                    <img 
                      src={emptyStateNoFilters} 
                      alt="Empty state" 
                      className="max-h-[280px] w-auto object-contain opacity-60"
                      style={{ objectPosition: 'center bottom' }}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* ===== END OF INLINE LOADING SECTION ===== */}
          </div>
        </section>

        {/* Product Detail Sidebar */}
        {selectedProduct && (
          <div 
            className="w-[440px] bg-black shadow-lg flex flex-col relative" 
            style={{ 
              height: "calc(100vh - 200px)",
              paddingBottom: "800px"
            }}
            onClick={handleScreenInteraction}
          >
            <div className="pb-[800px]">
              <div className="pt-3 pr-6 pb-6 pl-0 flex flex-col">
                <div 
                  id="product-detail-content" 
                  className="flex flex-col border-2 border-[#4c4c4c] rounded-[16px] p-3"
                >
                  <div className="bg-white rounded-[10px] mb-6 w-full relative">
                    <button 
                      onClick={handleCloseProductDetail}
                      className="absolute top-4 right-4 bg-black text-white rounded-full h-8 w-8 flex items-center justify-center z-10 hover:bg-gray-800 transition-colors shadow-md"
                      aria-label="Close product detail"
                    >
                      <X size={24} />
                    </button>
                    <img 
                      src={selectedProduct.image || vapeBoxLogo}
                      alt={selectedProduct.name} 
                      className="w-full aspect-square object-contain p-4" 
                    />
                  </div>
                  {/* Título y marca */}
                  <div className="mb-2">
                    <div className="text-[13px] text-gray-400 uppercase font-medium mb-1">
                      {selectedProduct.brand || selectedProduct.name} {selectedProduct.puffs ? `${selectedProduct.puffs.toLocaleString()} Puffs` : ''}
                    </div>
                    <div className="text-[20px] text-white font-extrabold leading-tight mb-2">{selectedProduct.FS_SABOR || 'Sin sabor'}</div>
                  </div>
                  {/* Lista de contenido */}
                  {selectedProduct.FS_DES_PROD_CONT && (
                    <ul className="mb-2 text-white text-[13px] list-disc list-inside">
                      {selectedProduct.FS_DES_PROD_CONT.split(/\n|;/)
                        .map((line, idx) => line.trim())
                        .filter(line => !filterCategories.find(cat => cat.name === 'Categoria')?.options.some((opt: any) => opt.label === line))
                        .map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                    </ul>
                  )}
                  {/* Descripción detallada */}
                  {selectedProduct.FS_DES_PROD_DETA && (
                    <div className="bg-[#232323] text-gray-200 text-[12px] rounded-md p-3 mb-4">
                      <div className="font-semibold mb-1">Sobre el producto</div>
                      <div>{selectedProduct.FS_DES_PROD_DETA}</div>
                    </div>
                  )}
                  {/* Tabla de detalles */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[13px] text-white mb-1">
                      <span className="font-bold">Contenido</span>
                      <span>{selectedProduct.name || selectedProduct.FS_DES_PROD || selectedProduct.FS_DIMENSION}</span>
                    </div>
                  {/*
                  <div className="flex justify-between text-[13px] text-white mb-1">
                    <span className="font-bold">Punto de Carga</span>
                    <span>{selectedProduct.FS_TIP_CARGA}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-white mb-1">
                    <span className="font-bold">Marca</span>
                    <span>{selectedProduct.brand}</span>
                  </div>
                  */}
                  </div>
                  {/* Botones de acción */}
                  <div className="mt-auto flex flex-col gap-2">
                    <Button 
                      variant="cart" 
                      className={`w-[100%] mx-auto flex items-center justify-between px-4 ${selectedProduct.slot_quantity > 0 && getCartItemQuantity(selectedProduct.id) < selectedProduct.slot_quantity
                          ? "bg-white text-black hover:bg-gray-200" 
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      } h-[60px] text-[18px] font-semibold rounded-[8px]`}
                      onClick={() => handleAddToCart(selectedProduct)}
                    >
                      <span>Añadir a Carrito</span>
                      <ShoppingCartIcon size={24} />
                    </Button>
                    {cartErrors[selectedProduct.id] && (
                      <div className="text-red-500 mt-2 text-[10px] font-semibold text-center">
                        {cartErrors[selectedProduct.id]}
                      </div>
                    )}
                    {detailStockError && (
                      <div className="text-red-500 mt-2 text-[10px] font-semibold text-center">
                        {detailStockError}
                      </div>
                    )}
                    {selectedProduct && !(cart.isOpen && cart.items.length > 0) ? (
                      <Button 
                        id="product-detail-buy-button"
                        variant="buy" 
                        className="w-[100%] mx-auto flex items-center justify-between px-4 bg-[#6366f1] hover:bg-blue-700 h-[60px] text-[18px] font-semibold rounded-[8px]"
                        onClick={() => handleDirectPurchase(selectedProduct)}
                      >
                        <span>Comprar</span>
                        <span>s/{formatPrice(calculateDiscountedPrice(selectedProduct.price || 0, selectedProduct.discount))}</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
                {/* Carrito si está abierto */}
                {cart.isOpen && cart.items.length > 0 && (
                  <div className="mt-2 mb-2">
                    <div className="bg-black border-2 border-white rounded-[16px] w-full mx-auto shadow-lg overflow-hidden flex flex-col">
                      <div className="flex justify-between items-center border-b border-gray-800 pt-[10px]">
                        <h2 className="text-white text-[18px] font-[700] p-2">Carrito</h2>
                        <button 
                          onClick={clearCart}
                          className="text-white hover:text-gray-300 text-[18px] font-[300] pr-2"
                        >
                          Limpiar
                        </button>
                      </div>
                      <div 
                        className="overflow-auto" 
                        style={{ 
                          WebkitOverflowScrolling: 'touch',
                          height: '292px'
                        }}
                      >
                        {cart.items.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-white text-xl">No hay productos en el carrito</p>
                          </div>
                        ) : (
                          cart.items.map((item, index) => (
                            <div key={`cart-item-${item.product.id}-${index}`} className="flex items-center p-2 relative">
                              <div className="h-[46px] w-[46px] bg-white rounded-md flex-shrink-0">
                                <img 
                                  src={item.product.image || vapeBoxLogo}
                                  alt={item.product.name} 
                                  className="h-full w-full object-contain p-1" 
                                />
                              </div>
                              <div className="flex-1 ml-2">
                                <div className="text-gray-400 uppercase text-[12px] font-[400]">{item.product.FS_SABOR || 'Sin sabor'}</div>
                                <div className="text-white text-[10px] font-[700]">{item.product.name}</div>
                                <div className="text-white text-[10px] font-[700]">{item.product.puffs ? `${item.product.puffs.toLocaleString()} Puffs` : ''}</div>
                              </div>
                              <div className="flex items-center">
                                <div className="text-white text-[18px] font-[400] mr-2">
                                  s/{formatPrice(calculateDiscountedPrice(item.product.price, item.product.discount))}
                                </div>
                                <span className="text-white text-[18px] font-[400] mr-2">(x{item.quantity})</span>
                                <button 
                                  onClick={() => handleUpdateQuantity(String(item.product.id), Math.max(1, item.quantity - 1))}
                                  className="text-white bg-gray-800 rounded-full h-[32px] w-[32px] flex items-center justify-center mr-[12px]"
                                >
                                  <Minus size={24} />
                                </button>
                                <button 
                                  onClick={() => handleUpdateQuantity(String(item.product.id), item.quantity + 1)}
                                  className={`${item.quantity < item.product.slot_quantity 
                                      ? "text-white bg-gray-800" 
                                      : "text-gray-400 bg-gray-600 cursor-not-allowed"
                                  } rounded-full h-[32px] w-[32px] flex items-center justify-center mr-[12px]`}
                                  disabled={item.quantity >= item.product.slot_quantity}
                                >
                                  <Plus size={24} />
                                </button>
                                <button 
                                  onClick={() => removeFromCart(String(item.product.id))}
                                  className="text-black bg-white rounded-full h-[32px] w-[32px] flex items-center justify-center"
                                >
                                  <X size={24} color="black" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-gray-800 bg-black mt-auto">
                        <Button 
                          id="cart-buy-button"
                          variant="buy" 
                          className="w-full h-[60px] text-[18px] font-semibold rounded-[8px] flex items-center justify-between px-4"
                          onClick={enhancedCheckout}
                        >
                          <span>Comprar</span>
                          <span>s/{formatPrice(calculateCartTotal(cart.items))}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal Component */}
      <FilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        filterCategories={filterCategories} /* Pass the dynamic filter categories */
        machineCode="000003" /* Pass the current machine code */
      />

      {/* Camera Modal */}
      <CameraModal
        modalVisible={isCameraModalOpen}
        onClose={handleCameraModalClose}
        onSuccess={handleFacialRecognitionSuccess}
        onCreateAccount={handleCreateAccount}
        onNewUserDetected={handleNewUserDetected}
        onFeedbackSubmitted={handleFeedbackSubmitted}
        onResetToSplashScreen={resetToSplashScreen}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentMethodSelected={async (method) => {
          console.log('Payment method selected in ProductSelection:', method);
        }}
        onPaymentProcessed={(transactionId) => {
          console.log('Payment processed with transaction ID:', transactionId);
          window.sessionStorage.setItem('currentTransactionId', transactionId.toString());
          handlePaymentComplete();
        }}
        onPaymentTransactionIdReceived={(paymentTransactionId) => {
          console.log('Payment transaction ID received:', paymentTransactionId);
          setPaymentTransactionId(paymentTransactionId);
        }}
        onFeedbackSubmitted={handleFeedbackSubmitted}
        onComplete={handleFeedbackComplete}
        onRetryPayment={() => {
          console.log('Retrying payment');
          setIsPaymentModalOpen(false);
          setTimeout(() => setIsPaymentModalOpen(true), 100);
        }}
        onResetToSplashScreen={resetToSplashScreen}
        onPauseTimer={setIsTimerPaused}
        cartTotal={calculateCartTotal(cart.items)}
        cartItems={cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          slotId: item.product.slot_id || "",
          discountPercent: parseFloat(item.product.discount || "0") || 0
        }))}
      />

      {/* Footer - Only show when not in payment process */}
      {!isInPaymentProcess() && (
        <>
          {/* Main footer - show when no product detail is visible */}
          {!selectedProduct && (
            <div 
              id="main-footer" 
              className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[90%] z-50"
              onClick={handleScreenInteraction}
            >
              <div className="flex items-center justify-between p-2 bg-black text-white rounded-[16px] shadow-lg h-[105px] border-2 border-[#4C4C4C]">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-24 flex items-center justify-center">
                    <img src={vapeBoxLogo} alt="Vape Box" className="w-full h-full object-contain" />
                  </div>
                  <div style={{lineHeight: '1.75rem'}}>
                    <p className="text-[12px] font-akira font-bold text-[#FFFFFF]">ATENCION AL CLIENTE AL</p>
                    <p className="text-[32px] font-akira font-bold">908 936 036</p>
                  </div>
                </div>
                <div 
                  className="flex items-center cursor-pointer" 
                  onClick={handleRappiClick}
                >
                  <p className="text-[32px] font-inter font-semibold leading-[32px] mr-6 text-white">Recoge tu pedido aquí</p>
                  <ArrowRight className="w-10 h-10 text-white mr-4" />
                  <img src={rappiLogo} alt="Rappi" className="w-[84px] h-[84px] rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Compact footer - show when product detail is visible */}
          {selectedProduct && (
            <div 
              id="compact-footer" 
              className="fixed bottom-6 right-6 w-[410px] z-50"
              onClick={handleScreenInteraction}
            >
              <div className="flex items-center justify-between p-3 bg-black text-white rounded-[16px] shadow-lg border-2 border-[#4C4C4C]">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src={vapeBoxLogo} alt="Vape Box" className="w-full h-full object-contain" />
                  </div>
                  <div style={{lineHeight: '1.2rem'}}>
                    <p className="text-[10px] font-akira font-semibold text-[#FFFFFF]">ATENCION AL CLIENTE AL</p>
                    <p className="text-[22px] font-akira font-bold">908 936 036</p>
                  </div>
                </div>
                <div 
                  className="cursor-pointer" 
                  onClick={handleRappiClick}
                >
                  <img src={rappiLogo} alt="Rappi" className="w-12 h-12 rounded-lg" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state image & RappiModal, DocumentScanModal, ErrorModal */}
      {/* La imagen de estado vacío en la esquina inferior izquierda ha sido eliminada. */}
      <RappiModal
        isOpen={isRappiModalOpen}
        onClose={() => setIsRappiModalOpen(false)}
      />
      <DocumentScanModal
        isOpen={isDocumentScanModalOpen}
        onClose={() => {
            setIsDocumentScanModalOpen(false);
            setCapturedFaceImage(null); 
        }}
        onVerificationComplete={handleVerificationComplete}
        cameraFaceImage={capturedFaceImage} 
      />
      {showErrorModal && (
        <ErrorModal
          abierto={showErrorModal}
          mensaje={error || "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo."}
          onReintentar={() => {
            setShowErrorModal(false);
            resetToSplashScreen();
          }}
        />
      )}
      {showSuccessModal && (
        <SuccessModal
          onFeedbackSubmitted={handleFeedbackSubmitted}
          onTimeout={handleSuccessModalTimeout}
          totalProducts={dispensingState.totalProducts}
          currentProductIndex={dispensingState.currentProductIndex}
          currentProductName={dispensingState.currentProductName}
          onPauseTimer={setIsTimerPaused}
          arduinoStatus={arduinoStatus}
          onArduinoStatusChange={handleArduinoStatusChange}
        />
      )}

      {/* Feedback Detail Modal */}
      {showFeedbackDetail && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <FeedbackDetailModal
            onDetailedFeedback={handleDetailedFeedback}
            onClose={handleFeedbackDetailClose}
            onComplete={handleFeedbackComplete}
            onResetToSplashScreen={resetToSplashScreen}
          />
        </div>
      )}

      {/* Feedback Thank You Modal */}
      {showFeedbackThankYou && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <FeedbackThankYouModal
            onClose={handleFeedbackThankYouClose}
            onResetToSplashScreen={resetToSplashScreen}
            paymentTransactionId={paymentTransactionId}
            feedbackType={lastFeedbackType || undefined} // 🔍 CORREGIR: convertir null a undefined
            feedbackReason={lastFeedbackReason}
          />
        </div>
      )}

      {/* Test Dispense Modal */}
      <TestDispenseModal
        isOpen={isTestDispenseModalOpen}
        onClose={() => setIsTestDispenseModalOpen(false)}
        products={dbProducts}
        dispenseProductDb={dispenseProductDb}
        dispenseProduct={dispenseProduct}
      />

      {/* Test SuccessModal Simulation Modal */}
      {showSimulationModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center w-[480px]">
            <h2 className="text-2xl font-bold text-orange-600 text-center mb-6">
              🎯 SIMULACIÓN DEL SUCCESSMODAL
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Selecciona el tipo de simulación que quieres probar:
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Opción 1: Un solo producto */}
              <button
                onClick={() => handleSimulationChoice(1)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex flex-col items-center"
              >
                <span className="text-2xl mb-2">1️⃣</span>
                <span className="font-bold">UN SOLO PRODUCTO</span>
                <span className="text-sm opacity-90">2.8 segundos</span>
              </button>

              {/* Opción 2: Múltiples productos */}
              <button
                onClick={() => handleSimulationChoice(2)}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex flex-col items-center"
              >
                <span className="text-2xl mb-2">2️⃣</span>
                <span className="font-bold">MÚLTIPLES PRODUCTOS</span>
                <span className="text-sm opacity-90">5.6 segundos (2 productos)</span>
              </button>

              {/* Opción 3: Más productos */}
              <button
                onClick={() => handleSimulationChoice(3)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex flex-col items-center"
              >
                <span className="text-2xl mb-2">3️⃣</span>
                <span className="font-bold">MÁS PRODUCTOS</span>
                <span className="text-sm opacity-90">8.4 segundos (3 productos)</span>
              </button>

              {/* Opción 4: Muchos productos */}
              <button
                onClick={() => handleSimulationChoice(4)}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex flex-col items-center"
              >
                <span className="text-2xl mb-2">4️⃣</span>
                <span className="font-bold">MUCHOS PRODUCTOS</span>
                <span className="text-sm opacity-90">14 segundos (5 productos)</span>
              </button>
            </div>

            {/* Botón de cerrar */}
            <button
              onClick={() => setShowSimulationModal(false)}
              className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Test Buttons - Hidden for production */}
      {/* 
      <TestDispenseButton />
      <TestSuccessButton />
      <TestMultiButton />
      <TestFeedbackButton />
      <TestRealPaymentButton />
      <TestPaymentModalButton />
      <TestSuccessfulPOSButton />
      <TestTimerExpirationButton />
      <TestMultipleDispenseButton />
      <TestArduinoIntegrationButton />
      */}

      {/* Test2Buttons Component - Hidden for production */}
      {/* 
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500">
          <h3 className="text-lg font-bold text-blue-600 mb-3 text-center">Test2Buttons</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleTestSingleProduct}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              🧪 Test Producto Único
            </button>
            <button
              onClick={handleTestMultipleProducts}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              🧪 Test Múltiples Productos
            </button>
          </div>
        </div>
      </div>
      */}
      
      {/* Test Pago Exitoso Component - HIDDEN FOR PRODUCTION */}
      {/* 
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-green-500">
          <h3 className="text-lg font-bold text-green-600 mb-3 text-center">Test Pago Exitoso</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleTestPagoExitoso}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              💳 Simular Pago Exitoso
            </button>
          </div>
        </div>
      </div>
      */}

      {/* Test SuccessModal Simulation Component - HIDDEN FOR PRODUCTION */}
      {/* 
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-orange-500">
          <h3 className="text-lg font-bold text-orange-600 mb-3 text-center">Test SuccessModal Sim</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleTestSuccessModalSimulation}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              🎯 Simular SuccessModal
            </button>
          </div>
        </div>
      </div>
      */}
      


    </main>
  );
};

export default ProductSelection; 
