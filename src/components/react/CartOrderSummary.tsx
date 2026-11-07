import { useStore } from "@nanostores/react"
import {
  $cart,
  $cartSubtotal,
  $customer,
  updateQuantity,
  removeFromCart,
} from "../../stores/cart"
import { WHATSAPP_NUMBER } from "../../data/products"
import Icon from "./Icon"

export default function CartOrderSummary() {
  const items = useStore($cart)
  const subtotal = useStore($cartSubtotal)
  const customer = useStore($customer)

  const sendOrder = () => {
    if (!customer.name.trim()) {
      window.alert("Ingresa tu nombre para preparar el mensaje.")
      return
    }
    if (customer.delivery === "Envío a domicilio" && !customer.address.trim()) {
      window.alert("Ingresa una ubicación o dirección.")
      return
    }

    const lines = [
      "Hola, quiero consultar este pedido:",
      "",
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.name} (${item.brand} ${item.model})${
            item.selectedVariant ? ` · ${item.selectedVariant}` : ""
          }\n   ${item.quantity} × S/${item.price} = S/${item.quantity * item.price}`
      ),
      "",
      `Subtotal: S/${subtotal}`,
      "",
      `Nombre: ${customer.name}`,
      `Entrega: ${customer.delivery}`,
      customer.address ? `Dirección: ${customer.address}` : "",
      customer.note ? `Observaciones: ${customer.note}` : "",
      "",
      "Entiendo que el envío y la disponibilidad final deben confirmarse.",
    ].filter(Boolean)

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank"
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <span>
          <Icon name="bag" />
        </span>
        <h2>Tu pedido está vacío</h2>
        <p>Explora el catálogo y agrega los productos que necesitas.</p>
        <a href="/catalogo" className="button button--primary" style={{ marginTop: "14px" }}>
          Explorar catálogo
        </a>
      </div>
    )
  }

  return (
    <div className="cart-layout">
      <section className="cart-items">
        {items.map((item) => (
          <article className="cart-item" key={`${item.id}-${item.selectedVariant || "def"}`}>
            <img src={item.image} alt={item.name} />
            <div className="cart-item-copy">
              <p>
                {item.brand} · {item.model}
              </p>
              <h3>{item.name}</h3>
              {item.selectedVariant && (
                <span>Variante: {item.selectedVariant}</span>
              )}
              <strong>S/{item.price}</strong>
            </div>
            <div className="cart-item-controls">
              <div className="quantity">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Reducir cantidad"
                >
                  <Icon name="minus" />
                </button>
                <b>{item.quantity}</b>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Aumentar cantidad"
                >
                  <Icon name="plus" />
                </button>
              </div>
              <b>S/{item.price * item.quantity}</b>
              <button
                type="button"
                className="delete"
                onClick={() => removeFromCart(item.id)}
                aria-label="Eliminar producto"
              >
                <Icon name="trash" />
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="order-form">
        <h2>Datos para coordinar</h2>
        <label className="field">
          <span>Nombre *</span>
          <input
            value={customer.name}
            placeholder="¿Cómo te llamas?"
            onChange={(e) => $customer.set({ ...customer, name: e.target.value })}
            required
          />
        </label>

        <label className="select-field" style={{ marginBottom: "15px" }}>
          <span>Modalidad de entrega</span>
          <select
            value={customer.delivery}
            onChange={(e) => $customer.set({ ...customer, delivery: e.target.value })}
          >
            <option>Recojo en tienda</option>
            <option>Envío a domicilio</option>
          </select>
        </label>

        {customer.delivery === "Envío a domicilio" && (
          <label className="field">
            <span>Ubicación o dirección *</span>
            <input
              value={customer.address}
              placeholder="Distrito, referencia y dirección"
              onChange={(e) => $customer.set({ ...customer, address: e.target.value })}
              required
            />
          </label>
        )}

        <label className="field">
          <span>Observaciones (opcional)</span>
          <input
            value={customer.note}
            placeholder="Color, horario u otra consulta"
            onChange={(e) => $customer.set({ ...customer, note: e.target.value })}
          />
        </label>

        <div className="subtotal">
          <span>Subtotal</span>
          <strong>S/{subtotal}</strong>
        </div>

        <button
          type="button"
          className="button button--whatsapp"
          onClick={sendOrder}
        >
          <Icon name="whatsapp" /> Enviar pedido por WhatsApp
        </button>

        <p className="legal-note">
          El costo de envío y la disponibilidad final se confirman por WhatsApp.
          Abrir WhatsApp no confirma el pedido.
        </p>
      </aside>
    </div>
  )
}

