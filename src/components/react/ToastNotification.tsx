import { useStore } from "@nanostores/react"
import { $toastMessage, hideToast, openDrawer } from "../../stores/cart"
import Icon from "./Icon"

export default function ToastNotification() {
  const message = useStore($toastMessage)

  if (!message) return null

  return (
    <>
      <style>{`
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "86px",
          right: "24px",
          zIndex: 90,
          background: "var(--ink, #080808)",
          color: "white",
          border: "1px solid var(--yellow, #ffe000)",
          borderRadius: "var(--radius-lg, 8px)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.45)",
          maxWidth: "min(90vw, 380px)",
          animation: "toastSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "var(--yellow, #ffe000)",
          color: "var(--ink, #080808)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <svg
          style={{ width: "14px", height: "14px" }}
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

      <span
        style={{
          fontSize: "12px",
          fontFamily: "var(--font-medium)",
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {message}
      </span>

      <button
        type="button"
        onClick={() => {
          hideToast()
          openDrawer()
        }}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--yellow, #ffe000)",
          fontFamily: "var(--font-bold)",
          fontSize: "11px",
          textDecoration: "underline",
          cursor: "pointer",
          padding: 0,
          whiteSpace: "nowrap",
        }}
      >
        Ver pedido
      </button>

      <button
        type="button"
        onClick={hideToast}
        aria-label="Cerrar notificación"
        style={{
          background: "transparent",
          border: 0,
          color: "#888",
          cursor: "pointer",
          padding: "2px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="close" />
      </button>
    </div>
    </>
  )
}
