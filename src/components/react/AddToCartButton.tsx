import { addToCart } from "../../stores/cart"
import type { Product } from "../../data/products"

interface AddToCartButtonProps {
  product: Product
  variant?: string
  quantity?: number
  className?: string
  children?: React.ReactNode
}

export default function AddToCartButton({
  product,
  variant,
  quantity = 1,
  className = "button button--primary",
  children,
}: AddToCartButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product, variant, quantity)
  }

  return (
    <button
      type="button"
      className={className}
      disabled={!product.stock}
      onClick={handleClick}
    >
      {children || (product.stock ? "Agregar" : "Agotado")}
    </button>
  )
}

