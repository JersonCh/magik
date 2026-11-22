import { useState } from "react"
import type { BrandWithCount } from "@/types/domain"
import Icon from "../Icon"

interface BrandsTabProps {
  brandsList: BrandWithCount[]
  onAddBrand: (nombre: string) => Promise<void>
  onRequestDeleteBrand: (b: BrandWithCount) => void
}

export default function BrandsTab({
  brandsList,
  onAddBrand,
  onRequestDeleteBrand,
}: BrandsTabProps) {
  const [newBrandName, setNewBrandName] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBrandName.trim().toUpperCase()
    if (!name) return
    await onAddBrand(name)
    setNewBrandName("")
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
      <div className="admin-table">
        <div
          className="table-row table-labels"
          style={{ gridTemplateColumns: "1fr 120px 80px" }}
        >
          <span>MARCA DE BARBERÍA</span>
          <span>PRODUCTOS</span>
          <span style={{ textAlign: "right" }}>ACCIONES</span>
        </div>

        {brandsList.map((b) => (
          <div
            className="table-row"
            key={b.id}
            style={{ gridTemplateColumns: "1fr 120px 80px" }}
          >
            <strong style={{ fontSize: "13px", letterSpacing: ".05em" }}>{b.nombre}</strong>
            <span style={{ color: "var(--muted)" }}>
              {b.totalProductos} productos
            </span>
            <div className="table-row-actions">
              <button
                type="button"
                className="btn-delete"
                onClick={() => onRequestDeleteBrand(b)}
                title="Eliminar marca"
              >
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="admin-config-card">
        <h2>Registrar Nueva Marca</h2>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "20px" }}>
          Las marcas registradas aparecerán inmediatamente en los selectores del catálogo y filtros.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre de la Marca (ej. WAHL, BABYLISS, GAMMA+)</span>
            <input
              placeholder="Escribe el nombre..."
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="button button--primary"
            style={{ width: "100%", marginTop: "14px" }}
          >
            <Icon name="plus" /> Registrar marca
          </button>
        </form>
      </aside>
    </div>
  )
}
