import { useStore } from "@nanostores/react"
import {
  $cart,
  $isDrawerOpen,
  $cartSubtotal,
  closeDrawer,
  updateQuantity,
  removeFromCart,
} from "../../stores/cart"
import Icon from "./Icon"

export default function CartDrawer() {
  const items = useStore($cart)
  const isOpen = useStore($isDrawerOpen)
  const subtotal = useStore($cartSubtotal)

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={closeDrawer}
        aria-hidden={!isOpen}
      />
      <aside
        className={`drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Carrito de compras"
        aria-modal="true"
      >
        <div className="drawer-head">
          <div>
            <p>MI PEDIDO</p>
            <h2>
              {items.length} {items.length === 1 ? "producto" : "productos"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Cerrar pedido"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="drawer-content">
          {items.length > 0 ? (
            items.map((item) => (
              <article className="mini-cart-item" key={`${item.id}-${item.selectedVariant || "default"}`}>
                <img src={item.image} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.selectedVariant || item.model}</p>
                  <strong>S/{item.price}</strong>
                  <div className="quantity">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Disminuir cantidad"
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
                </div>
                <button
                  type="button"
                  className="delete"
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Eliminar producto"
                >
                  <Icon name="trash" />
                </button>
              </article>
            ))
          ) : (
            <div className="empty-cart compact">
              <span>
                <Icon name="bag" />
              </span>
              <h2>Tu pedido está vacío</h2>
              <p>Agrega productos desde el catálogo.</p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="subtotal">
              <span>Subtotal</span>
              <strong>S/{subtotal}</strong>
            </div>
            <a
              href="/pedido"
              className="button button--primary"
              onClick={closeDrawer}
            >
              Revisar y enviar pedido
            </a>
            <p>Envío y stock final por confirmar.</p>
          </div>
        )}
      </aside>
    </>
  )
}

