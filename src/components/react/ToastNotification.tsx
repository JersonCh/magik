import { useStore } from "@nanostores/react"
import { $toastMessage, hideToast, openDrawer } from "../../stores/cart"
import Icon from "./Icon"

export default function ToastNotification() {
  const message = useStore($toastMessage)

  if (!message) return null

  return (
    <div className="toast-notification" role="status" aria-live="polite">
      <div className="toast-notification__icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </div>

      <span className="toast-notification__text">{message}</span>

      <button
        type="button"
        className="toast-notification__link"
        onClick={() => {
          hideToast()
          openDrawer()
        }}
      >
        Ver carrito
      </button>

      <button
        type="button"
        className="toast-notification__close"
        onClick={hideToast}
        aria-label="Cerrar notificación"
      >
        <Icon name="close" />
      </button>
    </div>
  )
}
