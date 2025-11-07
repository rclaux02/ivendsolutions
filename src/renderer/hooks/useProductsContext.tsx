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
  // Obtener el código de máquina real desde localStorage
  const machineCode = localStorage.getItem('FS_COD_MAQ') || '001';
  // Usar el hook con el código correcto
  const { products: dbProducts, loading, error, refetch } = useProducts(machineCode);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Refetch products function
  const refetchProducts = useCallback(() => {
    console.log('[ProductsProvider] Refetching products...');
    refetch();
  }, [refetch]);

  // When products are loaded, initialize filtered products with stock validation
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      console.log('[ProductsProvider] 🔍 Aplicando filtro de stock a', dbProducts.length, 'productos del machine code:', machineCode);
      
      // Aplicar filtro de stock ANTES de mostrar productos
      const productsWithStock = dbProducts.filter(product => {
        const hasStock = product.slot_quantity !== undefined && product.slot_quantity > 0;
        if (!hasStock) {
          console.log(`[ProductsProvider] ❌ Producto sin stock ocultado: ${product.name} (stock: ${product.slot_quantity})`);
        }
        return hasStock;
      });
      
      console.log('[ProductsProvider] ✅ Productos con stock:', productsWithStock.length, 'de', dbProducts.length);
      
      // Solo mostrar productos con stock
      setFilteredProducts(productsWithStock);
    } else {
      setFilteredProducts([]);
    }
  }, [dbProducts, machineCode]);

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