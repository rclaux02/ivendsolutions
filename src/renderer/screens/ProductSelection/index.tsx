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
import { getAvailableSlotMapping, dispenseProductFromSlot } from '@/main/database/operations/productOperations';
import { useProductOperations } from '@/renderer/hooks/useProductOperations';
import TestDispenseModal from '../../components/TestDispenseModal';
import SuccessModal from '@/renderer/components/SuccessModal';

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

// Define filter categories for display in the UI - but with dynamic brands to be populated later
const filterCategoriesData = [
  {
    name: 'Marcas',
    options: [] // Will be populated dynamically from the database
  },
  {
    name: 'Puffs',
    options: [
      { id: '40000+', label: '40,000+' },
      { id: '30000-40000', label: '30,000 - 40,000' },
      { id: '20000-30000', label: '20,000 - 30,000' },
      { id: '10000-20000', label: '10,000 - 20,000' },
      { id: '1000-10000', label: '1,000 - 10,000' },
    ],
  },
  {
    name: 'Precio',
    options: [
      { id: '150+', label: '150+ soles' },
      { id: '100-150', label: '100 - 150 soles' },
      { id: '50-100', label: '50 - 100 soles' },
      { id: '0-50', label: '0 - 50 soles' },
    ],
  },
];

const ProductSelection: React.FC = () => {
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Use the filter categories data with state to support updates
  const [filterCategories, setFilterCategories] = useState(filterCategoriesData);
  
  // Initialize active filters based on filter categories
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(() => {
    const initialFilters: Record<string, string[]> = {};
    filterCategoriesData.forEach(category => {
      initialFilters[category.name] = [];
    });
    return initialFilters;
  });

  // New effect to extract unique brands from products and update filter options
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      // Extract unique brands from products
      const uniqueBrands = Array.from(new Set(
        dbProducts
          .map(product => product.brand)
          .filter(brand => brand) // Filter out null/undefined
      )).sort(); // Sort alphabetically

      // Create new filter options for brands
      const brandOptions = uniqueBrands.map(brand => ({
        id: brand,
        label: brand
      }));

      // Update the filter categories with dynamic brand options
      setFilterCategories(prevCategories => {
        // Create a new array to avoid modifying the original
        const updatedCategories = [...prevCategories];
        
        // Find the index of the "Marcas" category
        const brandCategoryIndex = updatedCategories.findIndex(category => category.name === 'Marcas');
        
        // If found, update its options
        if (brandCategoryIndex !== -1) {
          updatedCategories[brandCategoryIndex] = {
            ...updatedCategories[brandCategoryIndex],
            options: brandOptions
          };
        }
        
        return updatedCategories;
      });

      // Apply any active filters to the new database products
      applyFiltersToProducts(dbProducts, activeFilters);
    }
  }, [dbProducts]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 8000); // Change banner every 8 seconds
    //implement videos as well 

    return () => clearInterval(interval);
  }, []);

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
    
    // Apply brand filter
    if (selectedFilters.Marcas && selectedFilters.Marcas.length > 0) {
      filtered = filtered.filter(product => 
        selectedFilters.Marcas.includes(product.brand)
      );
    }
    
    // Apply puff filter
    if (selectedFilters.Puffs && selectedFilters.Puffs.length > 0) {
      filtered = filtered.filter(product => {
        // Convert filter options to numbers for comparison
        const puffRanges = selectedFilters.Puffs.map(filter => {
          if (filter === "1000-10000") return [1000, 10000];
          if (filter === "10000-20000") return [10000, 20000];
          if (filter === "20000-30000") return [20000, 30000];
          if (filter === "30000-40000") return [30000, 40000];
          if (filter === "40000+") return [40000, Infinity];
          return [0, 0]; // Invalid range
        });
        
        // Check if product's puff count falls within any of the selected ranges
        return puffRanges.some(([min, max]) => 
          product.puffs >= min && product.puffs <= max
        );
      });
    }
    
    // Apply price filter
    if (selectedFilters.Precio && selectedFilters.Precio.length > 0) {
      filtered = filtered.filter(product => {
        // Convert filter options to numbers for comparison
        const priceRanges = selectedFilters.Precio.map(filter => {
          if (filter === "0-50") return [0, 50];
          if (filter === "50-100") return [50, 100];
          if (filter === "100-150") return [100, 150];
          if (filter === "150+") return [150, Infinity];
          return [0, 0]; // Invalid range
        });
        
        // Check if product's price falls within any of the selected ranges
        return priceRanges.some(([min, max]) => 
          product.price >= min && product.price <= max
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
    
    // Convert string discount to number if needed
    const discountValue = typeof discount === 'string' ? parseFloat(discount) : discount;
    
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
    setIsCameraModalOpen(true);
  };

  // Function to determine if we're in any part of the payment process
  const isInPaymentProcess = () => {
    return isPaymentModalOpen;
  };

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
      // Don't show success modal here, wait for product sensor status
      
      const cartItems = cart.items;
      
      // Process each type of product in the cart
      for (const item of cartItems) {
        // Make sure we're using a string product ID
        const productId = String(item.product.id);
        
        console.log(`------- Processing ${item.quantity} units of ${item.product.name} (ID: ${productId}) -------`);
        console.log('Product details:', {
          id: productId,
          type: typeof productId,
          name: item.product.name,
          brand: item.product.brand,
          price: item.product.price,
          // item.product.slot_id will be used as a suggestion on the first attempt
        });
        
        // Need to dispense the quantity of each product
        let remainingQuantity = item.quantity;
        let attemptCount = 0; // Tracks attempts for THIS product item
        const maxAttempts = 10; // Prevent infinite loops
        
        // Track which slots we've used for this product
        const usedSlots: Record<string, number> = {};
        
        while (remainingQuantity > 0 && attemptCount < maxAttempts) {
          attemptCount++;
          
          // On the first attempt for this product, suggest the original slot_id from the cart item.
          // On subsequent attempts (if the first slot didn't have enough), pass undefined for slotId
          // to let the backend search all available slots for the productId.
          const suggestedSlotIdForThisAttempt = (attemptCount === 1) ? item.product.slot_id : undefined;

          console.log(`Attempt ${attemptCount} for product ${productId}: Dispensing ${remainingQuantity} remaining units. Suggested slot for this attempt: ${suggestedSlotIdForThisAttempt}`);
                    
          // Request to dispense product. The backend (dispenseProductFromSlot)
          // will use suggestedSlotIdForThisAttempt if provided, or search all slots if it's undefined.
          const dbResult = await dispenseProductDb(productId, suggestedSlotIdForThisAttempt, remainingQuantity);
          
          console.log('Database result for attempt:', dbResult);
          
          if (!dbResult.success) {
            console.error(`Failed to dispense product ${productId}:`, dbResult.message);
            throw new Error(dbResult.message || `Failed to find available slot for product ${productId}`);
          }
          
          // Get the results from the backend
          const { slotId, quantityDispensed = 0 } = dbResult;
          
          if (!slotId) {
            console.error('No slot ID returned');
            throw new Error(`No slot ID returned for product ${productId}`);
          }
          
          // Track which slots we've used
          usedSlots[slotId] = (usedSlots[slotId] || 0) + quantityDispensed;
          
          console.log(`Successfully found ${quantityDispensed} units in slot ${slotId}`);
          
          // Dispense each unit individually
          console.log(`Dispensing ${quantityDispensed} units from slot ${slotId} (one at a time)`);
          
          let successfulDispenses = 0;
          
          // Loop through each unit and dispense one at a time
          for (let i = 0; i < quantityDispensed; i++) {
            console.log(`Dispensing unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
            // Dispense one unit at a time, using the correct motor number
            const dispensingResult = await dispenseProduct(slotId);
            
            if (!dispensingResult.success) {
              console.error(`Hardware dispense failed for unit ${i+1} from slot ${slotId}:`, dispensingResult.message);
              throw new Error(dispensingResult.message || `Failed to dispense unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
            }
            
            successfulDispenses++;
            console.log(`Successfully dispensed unit ${i+1}/${quantityDispensed} from slot ${slotId}`);
          }
          
          console.log(`Successfully dispensed all ${successfulDispenses} units from slot ${slotId}`);
          
          // Reduce the remaining quantity based on dispensed units
          remainingQuantity -= successfulDispenses;
          
          console.log(`Remaining quantity after dispensing from slot ${slotId}: ${remainingQuantity}`);
          
          // If we didn't dispense anything this attempt, something is wrong
          if (quantityDispensed === 0) {
            console.error('Dispensed 0 quantity, might be out of stock or hardware issue');
            throw new Error(`Could not dispense any units of product ${productId} from slot ${slotId}`);
          }
        }
        
        // Check if we dispensed everything
        if (remainingQuantity > 0) {
          console.error(`Could not dispense all requested units. ${remainingQuantity} units remaining.`);
          throw new Error(`Could not dispense all requested units of product ${productId}. ${remainingQuantity} units remaining.`);
        }
        
        // Log the slots we used
        console.log(`Successfully dispensed ${item.quantity} units of ${item.product.name} from slots:`, 
          Object.entries(usedSlots).map(([slot, qty]) => `${slot}(${qty})`).join(', ')
        );
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
      
      clearCart();
    } catch (error) {
      console.error('Error dispensing products:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setShowErrorModal(true);
    }
  };

  // Get the resetToSplashScreen function from context
  const { resetToSplashScreen } = useContext(AppNavigationContext);
  
  // Update the handleFeedbackSubmitted function to just log the feedback
  const handleFeedbackSubmitted = (feedback: 'happy' | 'neutral' | 'sad') => {
    console.log(`Feedback submitted: ${feedback}`);
    // We no longer reset everything here, as we need to wait for the thank you modal to display
  };

  // Add a new function to handle feedback completion (called after the thank you modal closes)
  const handleFeedbackComplete = () => {
    console.log('Feedback process complete, resetting application state');
    
    // Clear the cart (this will also clear localStorage)
    clearCart();
    
    // Close the cart UI
    closeCart();
    
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
  };

  // Handler for opening the Rappi modal
  const handleRappiClick = () => {
    console.log('Rappi logo clicked, opening Rappi modal');
    setIsRappiModalOpen(true);
  };

  // Test handler for SuccessModal
  const handleTestSuccessModal = () => {
    console.log('Test button clicked, opening SuccessModal');
    setShowSuccessModal(true);
  };

  // Test handler for SuccessModal timeout
  const handleSuccessModalTimeout = () => {
    console.log('SuccessModal timed out, closing modal and resetting to splash');
    setShowSuccessModal(false);
    resetToSplashScreen();
  };

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
        console.log('[DirectPurchase] Opening CameraModal...');
        setIsCameraModalOpen(true);
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

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Hero Section - Full width */}
      <section className="relative w-full overflow-hidden">
        <img
          src={banners[currentBanner]}
          alt={`Banner ${currentBanner + 1}`}
          className="w-full h-full object-cover"
        />
      </section>

      {/* Title and Filter Bar */}
      <div className="flex flex-col mt-[40px] pl-[30px] pr-[30px] mb-[20px]">
        <div className="flex items-center justify-between mb-[20px]">
          <h2 className="text-[32px] font-extrabold text-white font-akira">ESCOGE TU VAPE</h2>
          <div className="flex items-center gap-4">
            {/* Test Button for SuccessModal */}
            <button 
              className="px-[16px] py-[16px] rounded-[447px] text-[18px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              onClick={handleTestSuccessModal}
            >
              <span className="font-bold">TEST SUCCESS</span>
            </button>
            
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
                const filterOption = filterCategory?.options.find(opt => opt.id === filter);
                
                if (!filterOption) return null;
                
                // Format the label based on category
                let displayLabel = filterOption.label;
                if (category === 'Puffs') {
                  displayLabel = `${displayLabel} Puffs`;
                }
                
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
      <div className="flex h-full">
        {/* Product Grid Section - Always Scrollable */}
        <section 
          id="product-grid" 
          className={`px-[30px] ${selectedProduct ? 'w-[calc(100%-440px)]' : 'w-full'} overflow-y-auto`}
          style={{ 
            height: "calc(100vh - 100px)", 
            paddingBottom: "400px",
            marginRight: '10px'
          }}
        >
          <div className="pb-[400px]">
            {/* ===== START OF INLINE LOADING SECTION ===== */}
            {loading ? (
              <div className="flex flex-col items-center justify-center pt-[10vh] text-center">
                <img src={vapeBoxLogo} alt="Cargando..." className="w-32 h-32 mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2 text-gray-300">Preparando tu vape...</h2>
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
                    {product.discount && (
                      <span className="absolute top-[9px] right-[9px] bg-[#ff4545] text-white px-[14px] py-[6px] text-[10px] font-[700] rounded-[36px] leading-[initial]">
                        {product.discount}%
                      </span>
                    )}
                    <div className="flex-1 flex items-center justify-center image-container" style={{ minHeight: '105px' }}>
                      <img
                        src={product.image || vapeBoxLogo}
                        alt={product.name}
                        className="max-h-[105px] max-w-[85%] object-contain product-image"
                        data-productid-img={product.id}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-[400] text-gray-600">{product.FS_SABOR}</p>
                      <p className="text-[12px] font-[600] text-black">s/{formatPrice(calculateDiscountedPrice(product.price, product.discount))}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-start items-center h-full w-full bg-black relative pt-[10vh]">
                <div className="text-center px-4 max-w-2xl mb-4">
                  <h2 className="text-[32px] font-extrabold text-[#929292] font-akira text-center leading-tight">
                    LO SENTIMOS, NO HAY LO QUE BUSCAS POR EL MOMENTO
                  </h2>
                  <p className="text-[24px] font-medium text-[#929292] mt-4">(Elimina filtros)</p>
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
                  <div className="mb-8">
                    <h2 className="text-[18px] text-white uppercase font-normal mb-2">{selectedProduct.brand}</h2>
                    <div className="relative flex justify-between items-center">
                      <h1 className="text-[18px] font-semibold text-white">
                        {selectedProduct.name}{selectedProduct.puffs > 0 ? ` - ${selectedProduct.puffs.toLocaleString()} Puffs` : ''}
                      </h1>
                      {selectedProduct.discount && selectedProduct.discount !== '' && selectedProduct.discount !== '0' ? (
                        <span className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-[#ff4545] text-white px-[12px] py-[8px] text-[12px] font-[700] rounded-[36px]">
                          {selectedProduct.discount}% OFF
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mb-[16px]">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white font-bold">Marca</span>
                        <span className="text-[12px] text-white font-medium">{selectedProduct.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white font-bold">Modelo</span>
                        <span className="text-[12px] text-white font-medium">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white font-bold">Sabor</span>
                        <span className="text-[12px] text-white font-medium">{selectedProduct.FS_SABOR}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white font-bold">Porcentaje nicotina</span>
                        <span className="text-[12px] text-white font-medium">{selectedProduct.FS_PORCENTAJE_NICOTINA}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white font-bold">Precio original</span>
                        <span className="text-[12px] text-white font-medium">
                          s/{formatPrice(selectedProduct.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <div className="flex flex-col gap-2">
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
                          className="w-[100%] mx-auto flex items-center justify-between px-4 bg-blue-600 hover:bg-blue-700 h-[60px] text-[18px] font-semibold rounded-[8px]"
                          onClick={() => handleDirectPurchase(selectedProduct)}
                        >
                          <span>Comprar</span>
                          <span>s/{formatPrice(calculateDiscountedPrice(selectedProduct.price || 0, selectedProduct.discount))}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                
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
                                <div className="text-gray-400 uppercase text-[12px] font-[400]">{item.product.brand}</div>
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
        onFeedbackSubmitted={handleFeedbackSubmitted}
        onComplete={handleFeedbackComplete}
        onRetryPayment={() => {
          console.log('Retrying payment');
          setIsPaymentModalOpen(false);
          setTimeout(() => setIsPaymentModalOpen(true), 100);
        }}
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
            <div id="main-footer" className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[90%] z-50">
              <div className="flex items-center justify-between p-2 bg-black text-white rounded-[16px] shadow-lg h-[105px] border-2 border-[#4C4C4C]">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-24 flex items-center justify-center">
                    <img src={vapeBoxLogo} alt="Vape Box" className="w-full h-full object-contain" />
                  </div>
                  <div style={{lineHeight: '1.75rem'}}>
                    <p className="text-[12px] font-akira font-bold text-[#00FF66]">ATENCION AL CLIENTE AL</p>
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
            <div id="compact-footer" className="fixed bottom-6 right-6 w-[410px] z-50">
              <div className="flex items-center justify-between p-3 bg-black text-white rounded-[16px] shadow-lg border-2 border-[#4C4C4C]">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src={vapeBoxLogo} alt="Vape Box" className="w-full h-full object-contain" />
                  </div>
                  <div style={{lineHeight: '1.2rem'}}>
                    <p className="text-[10px] font-akira font-semibold text-[#00FF66]">ATENCION AL CLIENTE AL</p>
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
      {filteredProducts.length === 0 && !loading && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          <img 
            src={emptyStateNoFilters} 
            alt="Empty state" 
            className="max-h-[30vh] w-auto object-contain opacity-80"
            style={{ objectPosition: '50% 100%' }}
          />
        </div>
      )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-lg text-black">
            <h2 className="text-2xl font-bold mb-4">Error al procesar la compra</h2>
            <p>{error || 'Ha ocurrido un error al procesar la compra. Por favor, inténtelo más tarde.'}</p>
            <button
              onClick={() => {
                setShowErrorModal(false);
                resetToSplashScreen();
              }}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* Test SuccessModal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <SuccessModal 
            onFeedbackSubmitted={(feedback) => {
              console.log('Test feedback submitted:', feedback);
              setShowSuccessModal(false);
            }}
            onTimeout={handleSuccessModalTimeout}
          />
        </div>
      )}
    </main>
  );
};

export default ProductSelection; 
