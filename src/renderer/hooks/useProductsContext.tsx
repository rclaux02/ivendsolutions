import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '@/renderer/types/product';
import { useProducts } from './useProducts';

interface ProductsContextType {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  error: string | null;
  setFilteredProducts: (products: Product[]) => void;
  refetchProducts: () => void;
}

const ProductsContext = createContext<ProductsContextType>({
  products: [],
  filteredProducts: [],
  loading: true,
  error: null,
  setFilteredProducts: () => {},
  refetchProducts: () => {},
});

export const useProductsContext = () => useContext(ProductsContext);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the existing hook to fetch products
  const { products: dbProducts, loading, error, refetch } = useProducts('001');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Refetch products function
  const refetchProducts = useCallback(() => {
    console.log('[ProductsProvider] Refetching products...');
    refetch();
  }, [refetch]);

  // When products are loaded, initialize filtered products
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      setFilteredProducts(dbProducts);
    }
  }, [dbProducts]);

  return (
    <ProductsContext.Provider
      value={{
        products: dbProducts,
        filteredProducts,
        loading,
        error,
        setFilteredProducts,
        refetchProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}; 