import { useState, useEffect, useRef } from "react"
import { products as initialProducts } from "../../data/products"
import {
  getDefaultStoreConfig,
  type Product,
  type BrandWithCount,
  type StoreConfigMap,
} from "@/types/domain"
import { exportarCatalogoCsv, exportarCatalogoExcel } from "../../lib/csvHelper"
import Icon from "./Icon"
import CsvImportModal from "./CsvImportModal"
import AdminLogin from "./admin/AdminLogin"
import OverviewTab from "./admin/OverviewTab"
import ProductsTab from "./admin/ProductsTab"
import ProductEditSidebar from "./admin/ProductEditSidebar"
import BrandsTab from "./admin/BrandsTab"
import ConfigTab from "./admin/ConfigTab"
import ConfirmDeleteModal from "./admin/ConfirmDeleteModal"

const A = "/assets/"

export default function AdminDashboard() {
  const [logged, setLogged] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<"Resumen" | "Productos" | "Marcas" | "Configuración">("Productos")
  const [saved, setSaved] = useState(false)
  const [toastMessage, setToastMessage] = useState("Cambios guardados correctamente")
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Estado de Productos
  const [productList, setProductList] = useState<Product[]>(initialProducts)
  const [editingProduct, setEditingProduct] = useState<Product>({ ...initialProducts[0] })
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [description, setDescription] = useState("Descripción detallada del equipo profesional para barbería.")
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Estado de Marcas
  const [brandsList, setBrandsList] = useState<BrandWithCount[]>([])
  const [brandToDelete, setBrandToDelete] = useState<BrandWithCount | null>(null)

  // Estado de Configuración de la Tienda
  const [storeConfig, setStoreConfig] = useState<StoreConfigMap>(() => getDefaultStoreConfig())

  // Estado de Modales
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)

  // 1. Validar sesión real en el servidor mediante cookie HttpOnly al montar
  useEffect(() => {
    let active = true
    async function verifySession() {
      try {
        const res = await fetch("/api/admin/auth", {
          method: "GET",
          credentials: "same-origin",
        })
        if (active && res.ok) {
          const data = await res.json().catch(() => ({}))
          setLogged(Boolean(data.authenticated))
        } else if (active) {
          setLogged(false)
        }
      } catch {
        if (active) setLogged(false)
      } finally {
        if (active) setCheckingAuth(false)
      }
    }
    verifySession()
    return () => {
      active = false
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // 2. Cargar datos desde las APIs de backend autenticadas
  useEffect(() => {
    if (!logged) return

    async function loadData() {
      try {
        const [resP, resB, resC] = await Promise.all([
          fetch("/api/admin/products", { credentials: "same-origin" }),
          fetch("/api/admin/brands", { credentials: "same-origin" }),
          fetch("/api/admin/config", { credentials: "same-origin" }),
        ])

        if (resP.status === 401 || resB.status === 401 || resC.status === 401) {
          setLogged(false)
          return
        }

        if (resP.ok) {
          const dataP = await resP.json()
          const prods = Array.isArray(dataP.products) ? dataP.products : []
          setProductList(prods)
          if (prods.length > 0) {
            setEditingProduct(prods[0])
            setDescription(prods[0].description || "")
          }
        }

        if (resB.ok) {
          const dataB = await resB.json()
          if (Array.isArray(dataB.brands)) {
            setBrandsList(dataB.brands)
          }
        }

        if (resC.ok) {
          const dataC = await resC.json()
          if (dataC.config) {
            setStoreConfig(dataC.config)
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del panel:", err)
        triggerToast("Error de conexión al cargar datos del servidor")
      }
    }

    loadData()
  }, [logged])

  const triggerToast = (msg = "Cambios guardados correctamente") => {
    setToastMessage(msg)
    setSaved(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setSaved(false), 2600)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    } finally {
      try {
        localStorage.removeItem("magik_admin_session")
      } catch {
        // Ignorar errores de storage
      }
      setLogged(false)
    }
  }

  // --- ACCIONES DE PRODUCTO ---
  const toggleStock = async (product: Product) => {
    const prevStock = product.stock
    const nextStock = !prevStock
    setProductList((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p))
    )
    if (editingProduct.id === product.id) {
      setEditingProduct((prev) => ({ ...prev, stock: nextStock }))
    }

    try {
      const res = await fetch("/api/admin/stock", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, stock: nextStock }),
      })
      if (res.status === 401) {
        setLogged(false)
        return
      }
      if (res.ok) {
        triggerToast(`Stock actualizado: ${nextStock ? "Disponible" : "Agotado"}`)
      } else {
        throw new Error("No se pudo actualizar el stock")
      }
    } catch {
      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: prevStock } : p))
      )
      if (editingProduct.id === product.id) {
        setEditingProduct((prev) => ({ ...prev, stock: prevStock }))
      }
      triggerToast("Error al actualizar stock en el servidor")
    }
  }

  const handleSaveProduct = async () => {
    const payload = {
      id: isNewProduct ? undefined : editingProduct.id,
      name: editingProduct.name,
      brand: editingProduct.brand,
      model: editingProduct.model,
      category: editingProduct.category || "Cortadoras",
      price: Number(editingProduct.price),
      oldPrice: editingProduct.oldPrice ? Number(editingProduct.oldPrice) : undefined,
      stock: editingProduct.stock,
      badge: editingProduct.badge || undefined,
      image: editingProduct.image || `${A}a0f2f.png`,
      description,
    }

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        setLogged(false)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.product) {
        const savedProd: Product = data.product

        if (isNewProduct) {
          setProductList((prev) => [savedProd, ...prev])
          setIsNewProduct(false)
          setEditingProduct(savedProd)
        } else {
          setProductList((prev) =>
            prev.map((p) => (p.id === savedProd.id ? savedProd : p))
          )
        }
        triggerToast("Producto guardado exitosamente")
      } else {
        triggerToast(data.message || "Error al guardar en base de datos")
      }
    } catch {
      triggerToast("Error de conexión al guardar producto")
    }
  }

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return

    const id = productToDelete.id
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.status === 401) {
        setLogged(false)
        return
      }

      if (res.ok) {
        setProductList((prev) => prev.filter((p) => p.id !== id))
        if (editingProduct.id === id) {
          const remaining = productList.filter((p) => p.id !== id)
          if (remaining.length > 0) {
            setEditingProduct(remaining[0])
            setDescription(remaining[0].description || "")
          }
        }
        triggerToast(`Producto "${productToDelete.name}" eliminado`)
      } else {
        const data = await res.json().catch(() => ({}))
        triggerToast(data.message || "No se pudo eliminar el producto")
      }
    } catch {
      triggerToast("Error de conexión al eliminar el producto")
    } finally {
      setProductToDelete(null)
    }
  }

  const handleNewProductClick = () => {
    setIsNewProduct(true)
    const newDraft: Product = {
      id: 0,
      name: "Nueva máquina o accesorio",
      brand: brandsList[0]?.nombre || "STYLECRAFT",
      model: "Pro 2026",
      price: 150,
      image: `${A}a0f2f.png`,
      category: "Cortadoras",
      stock: true,
      badge: "Nuevo",
    }
    setEditingProduct(newDraft)
    setDescription("Equipo profesional para barbería de alta precisión.")
  }

  // --- ACCIONES DE MARCAS ---
  const handleAddBrand = async (name: string) => {
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name }),
      })

      if (res.status === 401) {
        setLogged(false)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.brand) {
        setBrandsList((prev) => {
          const exists = prev.some((b) => b.id === data.brand.id)
          return exists ? prev.map((b) => (b.id === data.brand.id ? data.brand : b)) : [...prev, data.brand]
        })
        triggerToast(`Marca ${name} registrada`)
      } else {
        triggerToast(data.message || "Error al registrar marca")
      }
    } catch {
      triggerToast("Error de conexión al registrar marca")
    }
  }

  const handleDeleteBrandConfirm = async () => {
    if (!brandToDelete) return
    const id = brandToDelete.id

    try {
      const res = await fetch("/api/admin/brands", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.status === 401) {
        setLogged(false)
        return
      }

      if (res.ok) {
        setBrandsList((prev) => prev.filter((b) => b.id !== id))
        triggerToast("Marca eliminada")
      } else {
        const data = await res.json().catch(() => ({}))
        triggerToast(data.message || "No se pudo eliminar la marca")
      }
    } catch {
      triggerToast("Error de conexión al eliminar marca")
    } finally {
      setBrandToDelete(null)
    }
  }

  // --- ACCIONES DE CONFIGURACIÓN ---
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeConfig),
      })

      if (res.status === 401) {
        setLogged(false)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.config) setStoreConfig(data.config)
        triggerToast("Configuración de tienda actualizada")
      } else {
        triggerToast(data.message || "Error al guardar configuración")
      }
    } catch {
      triggerToast("Error de conexión al guardar configuración")
    }
  }

  // --- EXPORTACIONES ---
  const handleExportExcel = () => {
    try {
      const uint8 = exportarCatalogoExcel(productList)
      const blob = new Blob([uint8.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const dateStr = new Date().toISOString().split("T")[0]
      link.href = url
      link.setAttribute("download", `catalogo_magik_${dateStr}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      triggerToast("Catálogo exportado exitosamente a Excel (.xlsx)")
    } catch {
      triggerToast("Error al exportar archivo Excel")
    }
  }

  const handleExportCsv = () => {
    try {
      const csvData = exportarCatalogoCsv(productList)
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const dateStr = new Date().toISOString().split("T")[0]
      link.href = url
      link.setAttribute("download", `catalogo_magik_${dateStr}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      triggerToast("Catálogo exportado exitosamente a CSV")
    } catch {
      triggerToast("Error al exportar archivo CSV")
    }
  }

  const handleCsvImportSuccess = async () => {
    try {
      const [resP, resB] = await Promise.all([
        fetch("/api/admin/products", { credentials: "same-origin" }),
        fetch("/api/admin/brands", { credentials: "same-origin" }),
      ])
      if (resP.status === 401 || resB.status === 401) {
        setLogged(false)
        return
      }
      if (resP.ok) {
        const dataP = await resP.json()
        const prods = Array.isArray(dataP.products) ? dataP.products : []
        setProductList(prods)
        if (prods.length > 0) {
          setEditingProduct(prods[0])
          setDescription(prods[0].description || "")
        }
      }
      if (resB.ok) {
        const dataB = await resB.json()
        if (Array.isArray(dataB.brands)) {
          setBrandsList(dataB.brands)
        }
      }
    } catch (err) {
      console.warn("Error al refrescar tras importación:", err)
    }
    triggerToast("Catálogo sincronizado desde archivo")
  }

  if (checkingAuth) {
    return (
      <main className="admin-login">
        <div>
          <p>ACCESO ADMINISTRATIVO</p>
          <h1>Verificando sesión...</h1>
        </div>
      </main>
    )
  }

  // Pantalla de Login si no está autenticado
  if (!logged) {
    return <AdminLogin onLoginSuccess={() => setLogged(true)} />
  }

  return (
    <main className="admin-shell">
      {/* Barra lateral de navegación con estética negra industrial */}
      <aside className="admin-nav">
        <span className="admin-brand">
          MAGIK<span>GESTOR PRO</span>
        </span>

        <button
          type="button"
          className={tab === "Resumen" ? "active" : ""}
          onClick={() => setTab("Resumen")}
        >
          Resumen
        </button>

        <button
          type="button"
          className={tab === "Productos" ? "active" : ""}
          onClick={() => setTab("Productos")}
        >
          Productos ({productList.length})
        </button>

        <button
          type="button"
          className={tab === "Marcas" ? "active" : ""}
          onClick={() => setTab("Marcas")}
        >
          Marcas ({brandsList.length})
        </button>

        <button
          type="button"
          className={tab === "Configuración" ? "active" : ""}
          onClick={() => setTab("Configuración")}
        >
          Configuración
        </button>

        <button type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      {/* Área de contenido */}
      <section className="admin-content">
        <div className="admin-head">
          <div>
            <p>SISTEMA ADMINISTRATIVO</p>
            <h1>{tab}</h1>
          </div>

          {tab === "Productos" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleExportExcel}
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  padding: "9px 14px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-medium)",
                }}
                title="Descargar todo el catálogo a Microsoft Excel (.xlsx)"
              >
                <Icon name="arrow" /> Exportar Excel
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  padding: "9px 14px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-medium)",
                }}
                title="Descargar catálogo a formato CSV plano (.csv)"
              >
                <Icon name="arrow" /> Exportar CSV
              </button>

              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                style={{
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  padding: "9px 14px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-medium)",
                }}
                title="Carga masiva desde archivo Excel (.xlsx, .xls) o CSV (.csv)"
              >
                <Icon name="filter" /> Importar Excel / CSV
              </button>

              <button
                type="button"
                className="button button--primary"
                onClick={handleNewProductClick}
                style={{ padding: "9px 16px", fontSize: "12px" }}
              >
                <Icon name="plus" /> Nuevo producto
              </button>
            </div>
          )}
        </div>

        {saved && (
          <div className="save-toast">
            <Icon name="check" /> {toastMessage}
          </div>
        )}

        {/* PESTAÑA RESUMEN */}
        {tab === "Resumen" && (
          <OverviewTab
            productList={productList}
            brandsList={brandsList}
            storeConfig={storeConfig}
            onToggleStock={toggleStock}
          />
        )}

        {/* PESTAÑA PRODUCTOS */}
        {tab === "Productos" && (
          <div>
            <div className="stats">
              <div>
                <span>Total de productos</span>
                <b>{productList.length}</b>
                <small>{productList.filter((p) => p.stock).length} disponibles</small>
              </div>
              <div>
                <span>Sin stock</span>
                <b>{productList.filter((p) => !p.stock).length}</b>
                <small>Requieren atención</small>
              </div>
              <div>
                <span>Ofertas</span>
                <b>
                  {
                    productList.filter(
                      (p) => p.badge === "Oferta" || (p.oldPrice && p.oldPrice > p.price)
                    ).length
                  }
                </b>
                <small>Precios reducidos</small>
              </div>
              <div>
                <span>Destacados</span>
                <b>{productList.filter((p) => p.badge === "Destacado").length}</b>
                <small>Visibles en home</small>
              </div>
            </div>

            <div className="admin-grid">
              <ProductsTab
                productList={productList}
                brandsList={brandsList}
                editingProduct={editingProduct}
                isNewProduct={isNewProduct}
                onSelectProduct={(p) => {
                  setIsNewProduct(false)
                  setEditingProduct({ ...p })
                  setDescription(p.description || "")
                }}
                onToggleStock={toggleStock}
                onRequestDeleteProduct={(p) => setProductToDelete(p)}
              />

              <ProductEditSidebar
                isNewProduct={isNewProduct}
                editingProduct={editingProduct}
                brandsList={brandsList}
                description={description}
                onChangeProduct={(p) => setEditingProduct(p)}
                onChangeDescription={(desc) => setDescription(desc)}
                onSaveProduct={handleSaveProduct}
              />
            </div>
          </div>
        )}

        {/* PESTAÑA MARCAS */}
        {tab === "Marcas" && (
          <BrandsTab
            brandsList={brandsList}
            onAddBrand={handleAddBrand}
            onRequestDeleteBrand={(b) => setBrandToDelete(b)}
          />
        )}

        {/* PESTAÑA CONFIGURACIÓN */}
        {tab === "Configuración" && (
          <ConfigTab
            storeConfig={storeConfig}
            onChangeConfig={(cfg) => setStoreConfig(cfg)}
            onSaveConfig={handleSaveConfig}
          />
        )}
      </section>

      {/* Modal de Confirmación de Eliminación de Producto */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        eyebrow="CONFIRMAR BAJA DE PRODUCTO"
        title={`¿Eliminar "${productToDelete?.name}"?`}
        description="Esta acción dará de baja este producto del catálogo público y de la base de datos D1. Los pedidos pasados conservarán su historial intacto."
        onConfirm={handleDeleteProductConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Modal de Confirmación de Eliminación de Marca */}
      <ConfirmDeleteModal
        isOpen={Boolean(brandToDelete)}
        eyebrow="CONFIRMAR BAJA DE MARCA"
        title={`¿Eliminar marca "${brandToDelete?.nombre}"?`}
        description="Se dará de baja la marca. Si existen productos asociados a esta marca, seguirán existiendo pero la marca ya no aparecerá en el filtro activo."
        confirmText="Eliminar marca"
        onConfirm={handleDeleteBrandConfirm}
        onCancel={() => setBrandToDelete(null)}
      />

      {/* Modal de Importación Masiva Excel / CSV */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        productos={productList}
        marcas={brandsList}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={handleCsvImportSuccess}
      />
    </main>
  )
}
