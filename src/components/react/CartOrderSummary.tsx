import { useStore } from "@nanostores/react"
import {
  $cart,
  $cartSubtotal,
  $customer,
  updateQuantity,
  removeFromCart,
} from "../../stores/cart"
import { buildWhatsAppUrl } from "../../lib/whatsapp"
import Icon from "./Icon"

export default function CartOrderSummary() {
  const items = useStore($cart)
  const subtotal = useStore($cartSubtotal)
  const customer = useStore($customer)

  const sendOrder = () => {
    if (!customer.name.trim()) {
      window.alert("Ingresa tu nombre completo para coordinar el pedido.")
      return
    }

    if (customer.delivery === "Shalom") {
      if (!customer.dni?.trim()) {
        window.alert("Ingresa tu DNI para la guía de remisión de Shalom.")
        return
      }
      if (!customer.city?.trim() && !customer.agency?.trim()) {
        window.alert("Ingresa la ciudad o agencia Shalom de destino.")
        return
      }
    }

    if (customer.delivery === "Olva Courier") {
      if (!customer.dni?.trim()) {
        window.alert("Ingresa tu DNI para la emisión de la guía de Olva Courier.")
        return
      }
      if (!customer.address?.trim()) {
        window.alert("Ingresa tu dirección exacta de entrega a domicilio.")
        return
      }
    }

    const whatsappUrl = buildWhatsAppUrl(items, subtotal, {
      name: customer.name,
      phone: customer.phone,
      dni: customer.dni,
      delivery: customer.delivery,
      city: customer.city,
      agency: customer.agency,
      address: customer.address,
      note: customer.note,
    })

    window.open(whatsappUrl, "_blank")
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
          <span>Nombre y Apellido *</span>
          <input
            value={customer.name}
            placeholder="¿Cómo te llamas?"
            onChange={(e) => $customer.set({ ...customer, name: e.target.value })}
            required
          />
        </label>

        <label className="field">
          <span>Teléfono o WhatsApp (opcional)</span>
          <input
            type="tel"
            value={customer.phone}
            placeholder="Ej. 952 123 456"
            onChange={(e) => $customer.set({ ...customer, phone: e.target.value })}
          />
        </label>

        <label className="select-field" style={{ marginBottom: "15px" }}>
          <span>Modalidad de entrega en Perú *</span>
          <select
            value={customer.delivery}
            onChange={(e) =>
              $customer.set({
                ...customer,
                delivery: e.target.value as "Recojo en tienda" | "Shalom" | "Olva Courier",
              })
            }
          >
            <option value="Recojo en tienda">Recojo en tienda física (Tacna - S/0)</option>
            <option value="Shalom">Envío por Shalom (Agencia a agencia · Pago en destino)</option>
            <option value="Olva Courier">Envío por Olva Courier (Entrega a domicilio nacional)</option>
          </select>
        </label>

        {customer.delivery === "Shalom" && (
          <>
            <label className="field">
              <span>DNI o RUC del titular que retira en agencia *</span>
              <input
                value={customer.dni}
                placeholder="Número de documento para la guía"
                onChange={(e) => $customer.set({ ...customer, dni: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Ciudad y Agencia Shalom de destino *</span>
              <input
                value={customer.agency}
                placeholder="Ej. Arequipa - Agencia La Negrita o Terminal"
                onChange={(e) => $customer.set({ ...customer, agency: e.target.value })}
                required
              />
            </label>
            <div style={{
              background: "#fff9cb",
              border: "1px solid #ead100",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "11px",
              color: "#6b5800",
              marginBottom: "15px",
            }}>
              <strong>📦 Shalom - Pago en destino:</strong> Cancelas el costo de encomienda directamente a Shalom al momento de retirar tu paquete con tu DNI.
            </div>
          </>
        )}

        {customer.delivery === "Olva Courier" && (
          <>
            <label className="field">
              <span>DNI o RUC del titular *</span>
              <input
                value={customer.dni}
                placeholder="Número de documento"
                onChange={(e) => $customer.set({ ...customer, dni: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Departamento / Ciudad / Distrito *</span>
              <input
                value={customer.city}
                placeholder="Ej. Lima, Miraflores / Cusco, Wanchaq"
                onChange={(e) => $customer.set({ ...customer, city: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Dirección exacta y referencia *</span>
              <input
                value={customer.address}
                placeholder="Calle, avenida, número y referencia"
                onChange={(e) => $customer.set({ ...customer, address: e.target.value })}
                required
              />
            </label>
            <div style={{
              background: "#e6f6ec",
              border: "1px solid #a3e2bb",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "11px",
              color: "#0f5a2a",
              marginBottom: "15px",
            }}>
              <strong>🚚 Olva Courier - Puerta a Puerta:</strong> El flete se cotiza según el peso de tus equipos antes de despachar.
            </div>
          </>
        )}

        {customer.delivery === "Recojo en tienda" && (
          <div style={{
            background: "#f0f0ed",
            border: "1px solid #deded9",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "11px",
            color: "#555",
            marginBottom: "15px",
          }}>
            <strong>📍 Punto de entrega en Tacna:</strong> Coordinamos por WhatsApp la hora de retiro en nuestro espacio comercial sin costo adicional de flete.
          </div>
        )}

        <label className="field">
          <span>Observaciones (opcional)</span>
          <input
            value={customer.note}
            placeholder="Color preferido, factura, horario, etc."
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
          Abrir WhatsApp no descuenta pagos automáticos.
        </p>
      </aside>
    </div>
  )
}
