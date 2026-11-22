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
      aria-label="Abrir carrito"
    >
      <Icon name="bag" />
      <span>Carrito</span>
      <b>{count}</b>
    </button>
  )
}

