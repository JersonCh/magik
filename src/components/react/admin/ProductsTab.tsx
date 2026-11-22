import { useState } from "react"
import type { Product, BrandWithCount } from "@/types/domain"
import Icon from "../Icon"

const CATEGORY_OPTIONS = [
  "Cortadoras",
  "Trimmers",
  "Shaver",
  "Cuidado",
  "Accesorios",
  "Combos",
]

interface ProductsTabProps {
  productList: Product[]
  brandsList: BrandWithCount[]
  editingProduct: Product
  isNewProduct: boolean
  onSelectProduct: (p: Product) => void
  onToggleStock: (p: Product) => void
  onRequestDeleteProduct: (p: Product) => void
}

export default function ProductsTab({
  productList,
  brandsList,
  editingProduct,
  isNewProduct,
  onSelectProduct,
  onToggleStock,
  onRequestDeleteProduct,
}: ProductsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("Todas")
  const [brandFilter, setBrandFilter] = useState("Todas")
  const [statusFilter, setStatusFilter] = useState("Todos")

  const filteredProducts = productList.filter((p) => {
    const matchesSearch = `${p.name} ${p.brand} ${p.model}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesCategory =
      categoryFilter === "Todas" || p.category.toLowerCase() === categoryFilter.toLowerCase()
    const matchesBrand =
      brandFilter === "Todas" || p.brand.toUpperCase() === brandFilter.toUpperCase()
    const matchesStatus =
      statusFilter === "Todos"
        ? true
        : statusFilter === "Disponibles"
        ? p.stock
        : statusFilter === "Agotados"
        ? !p.stock
        : true

    return matchesSearch && matchesCategory && matchesBrand && matchesStatus
  })

  return (
    <div className="admin-table">
      {/* Barra de Filtros */}
      <div
        className="table-toolbar"
        style={{ gridTemplateColumns: "1fr 140px 140px 130px", marginBottom: "15px" }}
      >
        <label className="field" style={{ margin: 0 }}>
          <input
            placeholder="Buscar por nombre, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>

        <label className="field" style={{ margin: 0 }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="Todas">Todas las cat.</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ margin: 0 }}>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="Todas">Todas las marcas</option>
            {brandsList.map((b) => (
              <option key={b.id} value={b.nombre}>
                {b.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ margin: 0 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="Disponibles">Disponibles</option>
            <option value="Agotados">Agotados</option>
          </select>
        </label>
      </div>

      <div
        className="table-row table-labels"
        style={{ gridTemplateColumns: "minmax(220px, 1fr) 100px 90px 90px 90px" }}
      >
        <span>PRODUCTO</span>
        <span>MARCA</span>
        <span>PRECIO</span>
        <span>STOCK</span>
        <span style={{ textAlign: "right" }}>ACCIONES</span>
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
          No se encontraron productos con los filtros aplicados.
        </div>
      ) : (
        filteredProducts.map((p) => (
          <div
            className="table-row"
            key={p.id}
            style={{
              gridTemplateColumns: "minmax(220px, 1fr) 100px 90px 90px 90px",
              background: editingProduct.id === p.id && !isNewProduct ? "var(--ivory-warm)" : "transparent",
            }}
          >
            <div className="table-product">
              <img src={p.image} alt={p.name} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.model}</small>
              </span>
            </div>

            <span className="admin-brand-chip">{p.brand}</span>

            <div>
              <strong>S/{p.price}</strong>
              {p.oldPrice && (
                <small style={{ display: "block", color: "var(--muted)", textDecoration: "line-through" }}>
                  S/{p.oldPrice}
                </small>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggleStock(p)}
              className={p.stock ? "status" : "status off"}
              style={{ cursor: "pointer", border: 0 }}
              title="Haz clic para alternar stock"
            >
              {p.stock ? "Disponible" : "Agotado"}
            </button>

            <div className="table-row-actions">
              <button
                type="button"
                className="btn-edit"
                onClick={() => onSelectProduct(p)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={() => onRequestDeleteProduct(p)}
                title="Eliminar producto"
              >
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
