import type { Product, BrandWithCount, StoreConfigMap } from "@/types/domain"

interface OverviewTabProps {
  productList: Product[]
  brandsList: BrandWithCount[]
  storeConfig: StoreConfigMap
  onToggleStock: (p: Product) => void
}

export default function OverviewTab({
  productList,
  brandsList,
  storeConfig,
  onToggleStock,
}: OverviewTabProps) {
  const stockActivoCount = productList.filter((p) => p.stock).length
  const sinStockList = productList.filter((p) => !p.stock)
  const promocionesCount = productList.filter(
    (p) => p.badge === "Oferta" || (p.oldPrice && p.oldPrice > p.price)
  ).length

  return (
    <div>
      <div className="stats">
        <div>
          <span>Total de máquinas y productos</span>
          <b>{productList.length}</b>
          <small>{stockActivoCount} con stock activo</small>
        </div>
        <div>
          <span>Productos agotados</span>
          <b style={{ color: "var(--danger)" }}>{sinStockList.length}</b>
          <small>Requieren reposición en tienda</small>
        </div>
        <div>
          <span>Marcas registradas</span>
          <b>{brandsList.length}</b>
          <small>Distribuidores oficiales en Tacna</small>
        </div>
        <div>
          <span>Equipos en promoción</span>
          <b>{promocionesCount}</b>
          <small>Con precio de descuento activo</small>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div className="admin-config-card">
          <h2>Estado de Stock Crítico</h2>
          {sinStockList.length === 0 ? (
            <p style={{ color: "var(--green)", fontSize: "13px" }}>
              ✓ Todos los productos del catálogo cuentan con stock disponible.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sinStockList.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--line)",
                    paddingBottom: "8px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <strong>{p.name}</strong> <small>({p.brand})</small>
                  </div>
                  <button
                    type="button"
                    className="button button--primary"
                    style={{ padding: "4px 8px", fontSize: "10px" }}
                    onClick={() => onToggleStock(p)}
                  >
                    Habilitar stock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-config-card">
          <h2>Parámetros Operativos Actuales</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>
                WHATSAPP OFICIAL DE PEDIDOS
              </span>
              <strong>+51 {storeConfig.whatsapp_number}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>
                DIRECCIÓN LOCAL TACNA
              </span>
              <strong>{storeConfig.store_address}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>
                HORARIO DE ATENCIÓN
              </span>
              <strong>{storeConfig.opening_hours}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
