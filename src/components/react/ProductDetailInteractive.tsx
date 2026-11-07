import { useState } from "react"
import { addToCart } from "../../stores/cart"
import { type Product, WHATSAPP_NUMBER } from "../../data/products"
import Icon from "./Icon"

interface ProductDetailInteractiveProps {
  product: Product
}

export default function ProductDetailInteractive({ product }: ProductDetailInteractiveProps) {
  const [quantity, setQuantity] = useState(1)
  const variants = product.variant
    ? [product.variant, "Negro"]
    : ["Presentación estándar"]
  const [variant, setVariant] = useState(variants[0])

  const directMessage = `Hola, quisiera consultar por ${product.name} (${product.brand} ${product.model}), variante ${variant}.`

  const handleAdd = () => {
    addToCart(product, variant, quantity)
  }

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(directMessage)}`,
      "_blank"
    )
  }

  return (
    <div>
      <label className="select-field" style={{ margin: "24px 0" }}>
        <span>Variante</span>
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          {variants.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <div className="quantity-label">
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
          {product.stock ? "Agregar al pedido" : "Producto agotado"}
        </button>

        <button
          type="button"
          className="button button--whatsapp"
          onClick={handleWhatsApp}
        >
          <Icon name="whatsapp" />{" "}
          {product.stock
            ? "Consultar por WhatsApp"
            : "Consultar disponibilidad"}
        </button>
      </div>

      <div className="confirmation-note">
        El stock y el costo de envío se confirman por WhatsApp.
      </div>
    </div>
  )
}

