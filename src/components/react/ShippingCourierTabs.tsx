import { useState } from "react"

type Courier = "tacna" | "shalom" | "olva"

export default function ShippingCourierTabs() {
  const [activeCourier, setActiveCourier] = useState<Courier>("shalom")

  return (
    <div className="courier-tabs">
      <div className="courier-tabs__header">
        <p className="courier-tabs__eyebrow">LOGÍSTICA Y COBERTURA DESDE TACNA</p>
        <h3 className="courier-tabs__title">Modalidades de entrega en todo el Perú</h3>
      </div>

      <div className="courier-tabs__grid">
        <button
          type="button"
          onClick={() => setActiveCourier("tacna")}
          className={`courier-tab ${activeCourier === "tacna" ? "courier-tab--active" : ""}`}
        >
          <b>Tienda Tacna</b>
          <small className="courier-tab__sub--free">Recojo inmediato (S/0)</small>
        </button>

        <button
          type="button"
          onClick={() => setActiveCourier("shalom")}
          className={`courier-tab ${activeCourier === "shalom" ? "courier-tab--active" : ""}`}
        >
          <b>Shalom</b>
          <small>Agencia a Agencia · Pago destino</small>
        </button>

        <button
          type="button"
          onClick={() => setActiveCourier("olva")}
          className={`courier-tab ${activeCourier === "olva" ? "courier-tab--active" : ""}`}
        >
          <b>Olva Courier</b>
          <small>A Domicilio · Puerta a puerta</small>
        </button>
      </div>

      <div className="courier-tabs__panel">
        {activeCourier === "tacna" && (
          <div>
            <h4>Recojo en tienda física (Tacna)</h4>
            <p>
              Si estás en Tacna, puedes coordinar por WhatsApp para retirar tus equipos y productos
              directamente en nuestro punto de entrega sin costo de flete.
            </p>
            <ul>
              <li>Disponibilidad inmediata para productos en stock.</li>
              <li>Revisión presencial del producto antes de retirarlo.</li>
              <li>Coordinación de horario flexible vía WhatsApp.</li>
            </ul>
          </div>
        )}

        {activeCourier === "shalom" && (
          <div>
            <h4>Envíos Nacionales vía Shalom (Agencia a Agencia)</h4>
            <p>
              Despachos diarios desde Tacna hacia todas las agencias Shalom del Perú (Arequipa,
              Moquegua, Puno, Cusco, Lima, Trujillo, Chiclayo, Piura, etc.).
            </p>
            <ul>
              <li>
                <strong>Pago en Destino:</strong> Pagas el flete directamente a Shalom al retirar tu
                encomienda.
              </li>
              <li>
                <strong>Tiempo estimado:</strong> 24 a 48 horas hábiles para el sur y centro del país.
              </li>
              <li>
                <strong>Seguimiento:</strong> Te enviamos la guía y clave de seguimiento de Shalom
                vía WhatsApp.
              </li>
              <li>
                <strong>Requisitos:</strong> Nombre completo y DNI del titular que recogerá.
              </li>
            </ul>
          </div>
        )}

        {activeCourier === "olva" && (
          <div>
            <h4>Envíos Puerta a Puerta vía Olva Courier</h4>
            <p>
              Ideal para barberías y profesionales que prefieren recibir sus herramientas
              directamente en su local comercial o domicilio.
            </p>
            <ul>
              <li>
                <strong>Entrega a domicilio:</strong> Cobertura en todos los distritos a nivel
                nacional.
              </li>
              <li>
                <strong>Tiempo estimado:</strong> 48 a 72 horas hábiles según destino.
              </li>
              <li>
                <strong>Flete:</strong> Se cotiza de acuerdo con el peso y volumen del paquete.
              </li>
              <li>
                <strong>Requisitos:</strong> Dirección exacta, distrito, departamento y teléfono de
                contacto.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
