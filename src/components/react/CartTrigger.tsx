import { useStore } from "@nanostores/react"
import { $cartCount, openDrawer } from "../../stores/cart"
import Icon from "./Icon"

export default function CartTrigger() {
  const count = useStore($cartCount)

  return (
    <button
      type="button"
      className="button button--ghost cart-trigger"
      onClick={openDrawer}
      aria-label="Abrir resumen de pedido"
    >
      <Icon name="bag" />
      <span>Mi pedido</span>
      <b>{count}</b>
    </button>
  )
}

