import type { StoreConfigMap } from "@/types/domain"
import Icon from "../Icon"

interface ConfigTabProps {
  storeConfig: StoreConfigMap
  onChangeConfig: (config: StoreConfigMap) => void
  onSaveConfig: (e: React.FormEvent) => void
}

export default function ConfigTab({
  storeConfig,
  onChangeConfig,
  onSaveConfig,
}: ConfigTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="admin-config-container">
      <div className="admin-config-card">
        <h2>Canales de Atención y Pedidos</h2>
        <label className="field">
          <span>Número oficial de WhatsApp (para checkout)</span>
          <input
            value={storeConfig.whatsapp_number}
            onChange={(e) =>
              onChangeConfig({ ...storeConfig, whatsapp_number: e.target.value })
            }
            required
          />
        </label>

        <label className="field">
          <span>Dirección física de la tienda (Tacna)</span>
          <input
            value={storeConfig.store_address}
            onChange={(e) =>
              onChangeConfig({ ...storeConfig, store_address: e.target.value })
            }
            required
          />
        </label>

        <label className="field">
          <span>Horario de atención comercial</span>
          <input
            value={storeConfig.opening_hours}
            onChange={(e) =>
              onChangeConfig({ ...storeConfig, opening_hours: e.target.value })
            }
            required
          />
        </label>
      </div>

      <div className="admin-config-card">
        <h2>Envíos y Promociones</h2>
        <label className="field">
          <span>Texto de barra superior (Announcement bar)</span>
          <input
            value={storeConfig.announcement_bar}
            onChange={(e) =>
              onChangeConfig({ ...storeConfig, announcement_bar: e.target.value })
            }
            required
          />
        </label>

        <label className="field">
          <span>Tarifa base de flete (S/)</span>
          <input
            value={storeConfig.shipping_base_price}
            onChange={(e) =>
              onChangeConfig({ ...storeConfig, shipping_base_price: e.target.value })
            }
            placeholder="0 para pago en destino"
          />
        </label>

        <div style={{ marginTop: "24px" }}>
          <button type="submit" className="button button--primary" style={{ width: "100%" }}>
            <Icon name="check" /> Guardar toda la configuración
          </button>
        </div>
      </div>
    </form>
  )
}
