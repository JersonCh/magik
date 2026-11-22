import type { Product, BrandWithCount } from "@/types/domain"

const CATEGORY_OPTIONS = [
  "Cortadoras",
  "Trimmers",
  "Shaver",
  "Cuidado",
  "Accesorios",
  "Combos",
]

interface ProductEditSidebarProps {
  isNewProduct: boolean
  editingProduct: Product
  brandsList: BrandWithCount[]
  description: string
  onChangeProduct: (p: Product) => void
  onChangeDescription: (desc: string) => void
  onSaveProduct: () => void
}

export default function ProductEditSidebar({
  isNewProduct,
  editingProduct,
  brandsList,
  description,
  onChangeProduct,
  onChangeDescription,
  onSaveProduct,
}: ProductEditSidebarProps) {
  return (
    <aside className="edit-panel">
      <p>{isNewProduct ? "CREAR REGISTRO" : "EDICIÓN EN VIVO"}</p>
      <h2>{isNewProduct ? "Nuevo producto" : editingProduct.name}</h2>

      <label className="field">
        <span>Nombre del producto</span>
        <input
          value={editingProduct.name}
          onChange={(e) => onChangeProduct({ ...editingProduct, name: e.target.value })}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Marca</span>
          <select
            value={editingProduct.brand}
            onChange={(e) => onChangeProduct({ ...editingProduct, brand: e.target.value })}
          >
            {brandsList.map((b) => (
              <option key={b.id} value={b.nombre}>
                {b.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Modelo / Subtítulo</span>
          <input
            value={editingProduct.model}
            onChange={(e) => onChangeProduct({ ...editingProduct, model: e.target.value })}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Categoría</span>
          <select
            value={editingProduct.category}
            onChange={(e) => onChangeProduct({ ...editingProduct, category: e.target.value })}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Distintivo (Badge)</span>
          <select
            value={editingProduct.badge || "Ninguno"}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                badge: e.target.value === "Ninguno" ? undefined : e.target.value,
              })
            }
          >
            <option value="Ninguno">Sin distintivo</option>
            <option value="Destacado">Destacado</option>
            <option value="Oferta">Oferta</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Combo">Combo</option>
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Precio Venta (S/)</span>
          <input
            type="number"
            value={editingProduct.price}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                price: Number(e.target.value),
              })
            }
          />
        </label>

        <label className="field">
          <span>Precio Anterior (S/)</span>
          <input
            type="number"
            placeholder="Opcional"
            value={editingProduct.oldPrice || ""}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                oldPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
      </div>

      <label className="field">
        <span>Disponibilidad de Stock</span>
        <select
          value={editingProduct.stock ? "Disponible" : "Agotado"}
          onChange={(e) =>
            onChangeProduct({
              ...editingProduct,
              stock: e.target.value === "Disponible",
            })
          }
        >
          <option value="Disponible">Disponible para venta</option>
          <option value="Agotado">Agotado temporalmente</option>
        </select>
      </label>

      <label className="field">
        <span>URL de Imagen Principal</span>
        <input
          value={editingProduct.image}
          onChange={(e) => onChangeProduct({ ...editingProduct, image: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Descripción Técnica</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="button button--primary"
        onClick={onSaveProduct}
        style={{ marginTop: "12px" }}
      >
        {isNewProduct ? "Crear producto en catálogo" : "Guardar cambios"}
      </button>
    </aside>
  )
}
