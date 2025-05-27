import React from "react"
import type { Product } from "../types/product"
import { Button } from "./ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from '@/renderer/hooks/useCart'

interface ProductDetailProps {
  product: Product | null
  onClose: () => void
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onClose }) => {
  const { addToCart, cart } = useCart()

  // Return null or a placeholder if product is not available
  if (!product) {
    return (
      <div className="bg-black p-4 flex flex-col items-center justify-center">
        <p className="text-white">No product selected</p>
      </div>
    )
  }

  return (
    <div className="bg-black p-6 flex flex-col relative" style={{ height: "calc(100% - 48px)" }}>
      {/* Main content with border */}
      <div className="overflow-auto mb-4" style={{ height: "calc(100% - 120px)" }}>
        <div 
          id="product-detail-content" 
          className="flex flex-col border-4 border-[#4c4c4c] rounded-[30px] p-5"
        >
          {/* Product Image */}
          <div className="bg-white rounded-[20px] mb-6 w-full">
            <img 
              src={product.image || "/placeholder.svg"} 
              alt={product.name} 
              className="w-full aspect-square object-contain p-4" 
            />
          </div>

          {/* Brand and Product Name */}
          <div className="mb-8">
            <h2 className="text-[35px] text-white uppercase font-normal mb-5">{product.brand}</h2>
            <h1 className="text-[36px] font-semibold mb-2 text-white">{product.name}</h1>
            <p className="text-lg text-gray-300">
              {product.puffs ? `${product.puffs.toLocaleString()} Puffs` : ''}
            </p>
          </div>

          {/* Kit Contents */}
          <div className="mb-6">
            <ul className="text-gray-300 space-y-1">
              <li>1x {product.name} Pod Kit</li>
              {product.specifications?.Resistencia && (
                <li>1x {product.name} Pod Kit ({product.specifications.Resistencia})</li>
              )}
              <li>1x Manual de usuario</li>
            </ul>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-white">Sobre el producto</h3>
              <p className="text-gray-300">{product.description}</p>
            </div>
          )}

          {/* Product Specifications */}
          <div className="mb-[25px]">
            <div className="space-y-5">
              <div className="flex justify-between">
                <span className="text-[24px] text-white font-bold">Marca</span>
                <span className="text-[24px] text-white font-medium">{product.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[24px] text-white font-bold">Modelo</span>
                <span className="text-[24px] text-white font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[24px] text-white font-bold">Tamaño</span>
                <span className="text-[24px] text-white font-medium">
                  {product.specifications?.Dimensiones || "18×77×44.7"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[24px] text-white font-bold">Punto de Carga</span>
                <span className="text-[24px] text-white font-medium">
                  {product.specifications?.["Punto de Carga"] || "SATA (USB-C)"}
                </span>
              </div>
              {product.specifications && Object.entries(product.specifications)
                .filter(([key]) => !["Dimensiones", "Punto de Carga"].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-[24px] text-white font-bold">{key}</span>
                    <span className="text-[24px] text-white font-medium">{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Price and Action Buttons - Inside the border container */}
          <div className="mt-auto">
            <div className="flex flex-col gap-4">
              <Button 
                variant="cart" 
                className="w-[100%] mx-auto flex items-center justify-between px-8 bg-white text-black hover:bg-gray-200 h-[120px] text-[36px] font-semibold rounded-[15px]"
                onClick={() => {
                  console.log('Add to cart button clicked');
                  console.log('Product being added:', product);
                  addToCart(product);
                  console.log('Cart state after adding:', cart);
                }}
              >
                <span>Añadir a Carrito</span>
                <ShoppingCart size={40} />
              </Button>
              <Button variant="buy" className="w-[100%] mx-auto flex items-center justify-between px-8 bg-blue-600 hover:bg-blue-700 h-[120px] text-[36px] font-semibold rounded-[15px]">
                <span>Comprar</span>
                <span>s/{product.price ? product.price.toFixed(2) : '99.00'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - Fixed at the bottom of the container */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center justify-between bg-black text-white p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="font-bold text-[#00FF66]">VAPEBOX</div>
          </div>
          <div className="font-bold">908 936 036</div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail 