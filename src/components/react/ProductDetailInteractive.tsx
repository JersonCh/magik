import { useState } from "react"
import { addToCart } from "../../stores/cart"
import { DEFAULT_WHATSAPP_NUMBER, type Product, type ProductVariant } from "@/types/domain"
import Icon from "./Icon"

interface ProductDetailInteractiveProps {
  product: Product
  whatsappNumber?: string
}

export default function ProductDetailInteractive({
  product,
  whatsappNumber = DEFAULT_WHATSAPP_NUMBER,
}: ProductDetailInteractiveProps) {
  const [quantity, setQuantity] = useState(1)

  const normalizedVariants: ProductVariant[] = (() => {
    if (product.variants && product.variants.length > 0) {
      const seen = new Set<string>()
      return product.variants.filter((v) => {
        if (seen.has(v.name)) return false
        seen.add(v.name)
        return true
      })
    }
    if (product.variant) {
      return [{ name: product.variant, stock: product.stock }]
    }
    return []
  })()

  const [selectedVariant, setSelectedVariant] = useState(normalizedVariants[0]?.name || "")
  const activeVariantObj = normalizedVariants.find((v) => v.name === selectedVariant)
  const effectivePrice = activeVariantObj?.price ?? product.price
  const effectiveProduct: Product =
    effectivePrice !== product.price ? { ...product, price: effectivePrice } : product

  const productLabel = product.model ? `${product.brand} ${product.model}` : product.brand
  const variantSuffix = selectedVariant ? `, variante ${selectedVariant}` : ""
  const directMessage = `Hola, quisiera consultar por ${product.name} (${productLabel})${variantSuffix}.`

  const handleAdd = () => {
    addToCart(effectiveProduct, selectedVariant || undefined, quantity)
  }

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(directMessage)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  return (
    <div>
      {normalizedVariants.length > 0 && (
        <label className="select-field" style={{ margin: "24px 0" }}>
          <span>Variante</span>
          <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
            {normalizedVariants.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}{v.price ? ` — S/${v.price}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="quantity-label" style={normalizedVariants.length === 0 ? { marginTop: "24px" } : undefined}>
        <span>Cantidad</span>
        <div className="quantity">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            aria-label="Reducir cantidad"
          >
            <Icon name="minus" />
          </button>
          <b>{quantity}</b>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            aria-label="Aumentar cantidad"
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>

      <div className="detail-actions">
        <button
          type="button"
          className="button button--primary"
          onClick={handleAdd}
          disabled={!product.stock}
        >
          {product.stock ? "Agregar al carrito" : "Producto agotado"}
        </button>

        <button
          type="button"
          className="button button--whatsapp"
          onClick={handleWhatsApp}
        >
          <Icon name="whatsapp" />{" "}
          {product.stock ? "Consultar por WhatsApp" : "Consultar disponibilidad"}
        </button>
      </div>

      <div className="confirmation-note">
        El stock y el costo de envío se confirman por WhatsApp.
      </div>
    </div>
  )
}
