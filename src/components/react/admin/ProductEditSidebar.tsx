import type { BrandWithCount, CategoryItem, Product, ProductStatus } from "@/types/domain"
import CategoryOptions from "./CategoryOptions"
import ProductImagesField from "./ProductImagesField"

interface ProductEditSidebarProps {
  isNewProduct: boolean
  editingProduct: Product
  brandsList: BrandWithCount[]
  categoriesList: CategoryItem[]
  onChangeProduct: (p: Product) => void
  onSaveProduct: () => void
}

export default function ProductEditSidebar({
  isNewProduct,
  editingProduct,
  brandsList,
  categoriesList,
  onChangeProduct,
  onSaveProduct,
}: ProductEditSidebarProps) {
  const activeImages =
    editingProduct.images && editingProduct.images.length > 0
      ? editingProduct.images
      : editingProduct.image
        ? [editingProduct.image]
        : []

  return (
    <aside className="edit-panel">
      <p>{isNewProduct ? "CREAR REGISTRO" : "EDICIÓN EN VIVO"}</p>
      <h2>{isNewProduct ? "Nuevo producto" : editingProduct.name}</h2>

      {/* Campos esenciales (publicación rápida) */}
      <label className="field">
        <span>Nombre del producto *</span>
        <input
          value={editingProduct.name}
          onChange={(e) => onChangeProduct({ ...editingProduct, name: e.target.value })}
          required
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Marca *</span>
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
          <span>Categoría *</span>
          <select
            value={editingProduct.category}
            onChange={(e) => onChangeProduct({ ...editingProduct, category: e.target.value })}
          >
            <CategoryOptions categories={categoriesList} />
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Precio Venta (S/) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
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
          <span>Disponibilidad *</span>
          <select
            value={editingProduct.stock ? "Disponible" : "Agotado"}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                stock: e.target.value === "Disponible",
              })
            }
          >
            <option value="Disponible">Disponible</option>
            <option value="Agotado">Agotado</option>
          </select>
        </label>
      </div>

      <ProductImagesField
        productName={editingProduct.name}
        images={activeImages}
        onChangeImages={(nextImages) =>
          onChangeProduct({
            ...editingProduct,
            images: nextImages,
            image: nextImages[0] || "/assets/a0f2f.png",
          })
        }
      />

      {/* Opcionales en bloque colapsable para no sobrecargar el flujo */}
      <details className="edit-advanced">
        <summary>Detalles técnicos, caja y opciones adicionales</summary>

        <div className="field-row">
          <label className="field">
            <span>Modelo (opcional)</span>
            <input
              placeholder="Ej. Saber II, 35 g"
              value={editingProduct.model || ""}
              onChange={(e) => onChangeProduct({ ...editingProduct, model: e.target.value })}
            />
          </label>

          <label className="field">
            <span>SKU (opcional)</span>
            <input
              placeholder="Código interno"
              value={editingProduct.sku || ""}
              onChange={(e) =>
                onChangeProduct({
                  ...editingProduct,
                  sku: e.target.value || undefined,
                })
              }
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Precio Anterior (S/)</span>
            <input
              type="number"
              step="0.01"
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
            <span>Estado de publicación</span>
            <select
              value={editingProduct.status || "publicado"}
              onChange={(e) =>
                onChangeProduct({
                  ...editingProduct,
                  status: e.target.value as ProductStatus,
                })
              }
            >
              <option value="publicado">Publicado en tienda</option>
              <option value="borrador">Borrador (oculto)</option>
            </select>
          </label>

          <label className="field">
            <span>URL portada directa</span>
            <input
              placeholder="/assets/..."
              value={editingProduct.image || ""}
              onChange={(e) => {
                const nextUrl = e.target.value
                const rest = activeImages.slice(1)
                onChangeProduct({
                  ...editingProduct,
                  image: nextUrl,
                  images: nextUrl ? [nextUrl, ...rest] : rest,
                })
              }}
            />
          </label>
        </div>

        <label className="field">
          <span>Descripción (Columna 1)</span>
          <textarea
            rows={3}
            placeholder="Resumen claro del producto y su uso recomendado"
            value={editingProduct.description || ""}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                description: e.target.value || undefined,
              })
            }
          />
        </label>

        <label className="field">
          <span>Características técnicas (Columna 2 · una por línea)</span>
          <textarea
            rows={4}
            placeholder={"Motor rotativo 7,200 RPM\nCuchilla DLC Black Diamond\nBatería ion-litio"}
            value={editingProduct.technicalSpecs || ""}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                technicalSpecs: e.target.value || undefined,
              })
            }
          />
        </label>

        <label className="field">
          <span>Contenido de la caja (Columna 3 · opcional, si queda vacío se oculta)</span>
          <textarea
            rows={3}
            placeholder={"Máquina principal\nBase de carga y cable\nPeines guía y cepillo"}
            value={editingProduct.boxContents || ""}
            onChange={(e) =>
              onChangeProduct({
                ...editingProduct,
                boxContents: e.target.value || undefined,
              })
            }
          />
        </label>
      </details>

      <button
        type="button"
        className="button button--primary"
        onClick={onSaveProduct}
        style={{ marginTop: "14px" }}
      >
        {isNewProduct ? "Crear producto en catálogo" : "Guardar cambios"}
      </button>
    </aside>
  )
}
