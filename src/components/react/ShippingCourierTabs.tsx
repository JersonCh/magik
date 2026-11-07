import { useState } from "react"
import Icon from "./Icon"

type Courier = "tacna" | "shalom" | "olva"

export default function ShippingCourierTabs() {
  const [activeCourier, setActiveCourier] = useState<Courier>("shalom")

  return (
    <div style={{
      background: "var(--soft)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: "24px",
      marginTop: "35px",
    }}>
      <div style={{ marginBottom: "18px" }}>
        <p style={{
          fontSize: "10px",
          fontFamily: "var(--font-bold)",
          letterSpacing: ".15em",
          color: "var(--muted)",
          textTransform: "uppercase",
          margin: "0 0 6px",
        }}>
          LOGÍSTICA Y COBERTURA DESDE TACNA
        </p>
        <h3 style={{
          fontFamily: "var(--font-extrabold)",
          fontSize: "20px",
          margin: 0,
        }}>
          Modalidades de entrega en todo el Perú
        </h3>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        marginBottom: "20px",
      }}>
        <button
          type="button"
          onClick={() => setActiveCourier("tacna")}
          style={{
            background: activeCourier === "tacna" ? "white" : "transparent",
            border: activeCourier === "tacna" ? "2px solid var(--yellow)" : "1px solid var(--line)",
            borderRadius: "var(--radius-md, 7px)",
            padding: "12px",
            textAlign: "left",
            cursor: "pointer",
            transition: "all .18s ease",
          }}
        >
          <b style={{ display: "block", fontSize: "13px", color: "var(--ink)" }}>Tienda Tacna</b>
          <small style={{ fontSize: "11px", color: "var(--green)", fontWeight: 600 }}>Recojo inmediato (S/0)</small>
        </button>

        <button
          type="button"
          onClick={() => setActiveCourier("shalom")}
          style={{
            background: activeCourier === "shalom" ? "white" : "transparent",
            border: activeCourier === "shalom" ? "2px solid var(--yellow)" : "1px solid var(--line)",
            borderRadius: "var(--radius-md, 7px)",
            padding: "12px",
            textAlign: "left",
            cursor: "pointer",
            transition: "all .18s ease",
          }}
        >
          <b style={{ display: "block", fontSize: "13px", color: "var(--ink)" }}>Shalom</b>
          <small style={{ fontSize: "11px", color: "var(--muted)" }}>Agencia a Agencia · Pago destino</small>
        </button>

        <button
          type="button"
          onClick={() => setActiveCourier("olva")}
          style={{
            background: activeCourier === "olva" ? "white" : "transparent",
            border: activeCourier === "olva" ? "2px solid var(--yellow)" : "1px solid var(--line)",
            borderRadius: "var(--radius-md, 7px)",
            padding: "12px",
            textAlign: "left",
            cursor: "pointer",
            transition: "all .18s ease",
          }}
        >
          <b style={{ display: "block", fontSize: "13px", color: "var(--ink)" }}>Olva Courier</b>
          <small style={{ fontSize: "11px", color: "var(--muted)" }}>A Domicilio · Puerta a puerta</small>
        </button>
      </div>

      <div style={{
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md, 7px)",
        padding: "20px",
      }}>
        {activeCourier === "tacna" && (
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontFamily: "var(--font-bold)" }}>
              Recojo en tienda física (Tacna)
            </h4>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
              Si estás en Tacna, puedes coordinar por WhatsApp para retirar tus equipos y productos directamente en nuestro punto de entrega sin costo de flete.
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", color: "#444", lineHeight: 1.8 }}>
              <li>Disponibilidad inmediata para productos en stock.</li>
              <li>Revisión presencial del producto antes de retirarlo.</li>
              <li>Coordinación de horario flexible vía WhatsApp.</li>
            </ul>
          </div>
        )}

        {activeCourier === "shalom" && (
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontFamily: "var(--font-bold)" }}>
              Envíos Nacionales vía Shalom (Agencia a Agencia)
            </h4>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
              Despachos diarios desde Tacna hacia todas las agencias Shalom del Perú (Arequipa, Moquegua, Puno, Cusco, Lima, Trujillo, Chiclayo, Piura, etc.).
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", color: "#444", lineHeight: 1.8 }}>
              <li><strong>Pago en Destino:</strong> Pagas el flete directamente a Shalom al retirar tu encomienda.</li>
              <li><strong>Tiempo estimado:</strong> 24 a 48 horas hábiles para el sur y centro del país.</li>
              <li><strong>Seguimiento:</strong> Te enviamos la guía y clave de seguimiento de Shalom vía WhatsApp.</li>
              <li><strong>Requisitos:</strong> Nombre completo y DNI del titular que recogerá.</li>
            </ul>
          </div>
        )}

        {activeCourier === "olva" && (
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "15px", fontFamily: "var(--font-bold)" }}>
              Envíos Puerta a Puerta vía Olva Courier
            </h4>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
              Ideal para barberías y profesionales que prefieren recibir sus herramientas directamente en su local comercial o domicilio.
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", color: "#444", lineHeight: 1.8 }}>
              <li><strong>Entrega a domicilio:</strong> Cobertura en todos los distritos a nivel nacional.</li>
              <li><strong>Tiempo estimado:</strong> 48 a 72 horas hábiles según destino.</li>
              <li><strong>Flete:</strong> Se cotiza de acuerdo con el peso y volumen del paquete.</li>
              <li><strong>Requisitos:</strong> Dirección exacta, distrito, departamento y teléfono de contacto.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
