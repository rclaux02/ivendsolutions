import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types/product';
import dummyVapeImage from '../dummyData/dummyVapeImage.png';

// Default machine code
const DEFAULT_MACHINE_CODE = '001';

/**
 * Hook for fetching products from the database
 * @param machineCode - Optional machine code to fetch products for (default: 'M001')
 */
export function useProducts(machineCode: string = DEFAULT_MACHINE_CODE) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define the fetch function so we can reuse it
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if running in Electron context
      console.log('Checking for Electron API...');
      console.log('window.electron exists:', typeof window.electron !== 'undefined');
      
      // Check if the electron API is available
      if (!window.electron) {
        console.log('Electron API not available. This might be expected if running in browser mode');
        console.log('Environment:', process.env.NODE_ENV);
        throw new Error('Electron API not available');
      }

      console.log('Electron API available, attempting to fetch products for machine code:', machineCode);
      
      // Fetch products from the database
      const result = await window.electron.ipcRenderer.invoke('products:get-for-machine', machineCode);
      console.log('IPC result:', result);
      
      if (result.success) {
        setProducts(result.products);
      } else {
        throw new Error(result.error || 'Failed to load products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading products');
      
      // We should not fallback to dummy products anymore
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [machineCode]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Return the refetch function as part of the hook's return value
  return { products, loading, error, refetch: fetchProducts };
} 