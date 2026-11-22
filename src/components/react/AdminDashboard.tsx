import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { products as initialProducts } from "../../data/products"
import {
  getDefaultStoreConfig,
  type BrandWithCount,
  type CategoryItem,
  type Product,
  type StoreConfigMap,
} from "@/types/domain"
import { downloadBlob, downloadCsv } from "@/lib/download"
import { AdminApiError, adminApi } from "@/services/adminApi"
import Icon from "./Icon"
import AdminLogin from "./admin/AdminLogin"
import BrandsTab from "./admin/BrandsTab"
import ConfigTab from "./admin/ConfigTab"
import ConfirmDeleteModal from "./admin/ConfirmDeleteModal"
import OverviewTab from "./admin/OverviewTab"
import ProductEditSidebar from "./admin/ProductEditSidebar"
import ProductsTab from "./admin/ProductsTab"

const CsvImportModal = lazy(() => import("./CsvImportModal"))
const A = "/assets/"

export default function AdminDashboard() {
  const [logged, setLogged] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<"Resumen" | "Productos" | "Marcas" | "Configuración">("Productos")
  const [saved, setSaved] = useState(false)
  const [toastMessage, setToastMessage] = useState("Cambios guardados correctamente")
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [productList, setProductList] = useState<Product[]>(initialProducts)
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([])
  const [editingProduct, setEditingProduct] = useState<Product>({ ...initialProducts[0] })
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const [brandsList, setBrandsList] = useState<BrandWithCount[]>([])
  const [brandToDelete, setBrandToDelete] = useState<BrandWithCount | null>(null)
  const [storeConfig, setStoreConfig] = useState<StoreConfigMap>(() => getDefaultStoreConfig())
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)

  const triggerToast = (msg = "Cambios guardados correctamente") => {
    setToastMessage(msg)
    setSaved(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setSaved(false), 2600)
  }

  const handleApiFailure = (err: unknown, fallbackMessage: string) => {
    if (err instanceof AdminApiError && err.isUnauthorized) {
      setLogged(false)
      return
    }
    triggerToast(err instanceof Error ? err.message : fallbackMessage)
  }

  useEffect(() => {
    let active = true
    adminApi
      .checkSession()
      .then((res) => {
        if (active) setLogged(res.authenticated)
      })
      .catch(() => {
        if (active) setLogged(false)
      })
      .finally(() => {
        if (active) setCheckingAuth(false)
      })

    return () => {
      active = false
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const syncAllAdminData = async () => {
    const [{ products, categories }, brands, config] = await Promise.all([
      adminApi.fetchProductsAndCategories(),
      adminApi.fetchBrands(),
      adminApi.fetchConfig(),
    ])
    setProductList(products)
    setCategoriesList(categories)
    if (products.length > 0) setEditingProduct(products[0])
    setBrandsList(brands)
    if (config) setStoreConfig(config)
  }

  useEffect(() => {
    if (!logged) return
    syncAllAdminData().catch((err) =>
      handleApiFailure(err, "Error de conexión al cargar datos del servidor")
    )
  }, [logged])

  const handleLogout = async () => {
    try {
      await adminApi.logout()
    } finally {
      try {
        localStorage.removeItem("magik_admin_session")
      } catch {
        // Ignorar errores de storage
      }
      setLogged(false)
    }
  }

  const toggleStock = async (product: Product) => {
    const prevStock = product.stock
    const nextStock = !prevStock
    setProductList((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p)))
    if (editingProduct.id === product.id) {
      setEditingProduct((prev) => ({ ...prev, stock: nextStock }))
    }

    try {
      await adminApi.updateStock(product.id, nextStock)
      triggerToast(`Stock actualizado: ${nextStock ? "Disponible" : "Agotado"}`)
    } catch (err) {
      setProductList((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: prevStock } : p)))
      if (editingProduct.id === product.id) {
        setEditingProduct((prev) => ({ ...prev, stock: prevStock }))
      }
      handleApiFailure(err, "Error al actualizar stock en el servidor")
    }
  }

  const handleSaveProduct = async () => {
    const activeImages =
      editingProduct.images && editingProduct.images.length > 0
        ? editingProduct.images
        : [editingProduct.image || `${A}a0f2f.png`]

    const payload = {
      id: isNewProduct ? undefined : editingProduct.id,
      name: editingProduct.name,
      brand: editingProduct.brand,
      model: editingProduct.model || "",
      sku: editingProduct.sku || undefined,
      category: editingProduct.category || "Cortadoras",
      price: Number(editingProduct.price),
      oldPrice: editingProduct.oldPrice ? Number(editingProduct.oldPrice) : undefined,
      stock: editingProduct.stock,
      badge: editingProduct.badge || undefined,
      image: activeImages[0],
      images: activeImages,
      description: editingProduct.description,
      technicalSpecs: editingProduct.technicalSpecs,
      boxContents: editingProduct.boxContents,
      status: editingProduct.status || "publicado",
    }

    try {
      const savedProd = await adminApi.saveProduct(payload)
      if (isNewProduct) {
        setProductList((prev) => [savedProd, ...prev])
        setIsNewProduct(false)
        setEditingProduct(savedProd)
      } else {
        setProductList((prev) => prev.map((p) => (p.id === savedProd.id ? savedProd : p)))
      }
      triggerToast("Producto guardado exitosamente")
    } catch (err) {
      handleApiFailure(err, "Error al guardar producto")
    }
  }

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return
    const target = productToDelete
    try {
      await adminApi.deleteProduct(target.id)
      const remaining = productList.filter((p) => p.id !== target.id)
      setProductList(remaining)
      if (editingProduct.id === target.id && remaining.length > 0) {
        setEditingProduct(remaining[0])
      }
      triggerToast(`Producto "${target.name}" eliminado`)
    } catch (err) {
      handleApiFailure(err, "No se pudo eliminar el producto")
    } finally {
      setProductToDelete(null)
    }
  }

  const handleNewProductClick = () => {
    setIsNewProduct(true)
    setEditingProduct({
      id: 0,
      name: "Nuevo producto",
      brand: brandsList[0]?.nombre || "STYLECRAFT",
      model: "",
      price: 150,
      image: `${A}a0f2f.png`,
      images: [`${A}a0f2f.png`],
      category: categoriesList[0]?.name || "Cortadoras",
      stock: true,
      badge: "Nuevo",
      status: "publicado",
    })
  }

  const handleAddBrand = async (name: string) => {
    try {
      const brand = await adminApi.saveBrand(name)
      setBrandsList((prev) => {
        const exists = prev.some((b) => b.id === brand.id)
        return exists ? prev.map((b) => (b.id === brand.id ? brand : b)) : [...prev, brand]
      })
      triggerToast(`Marca ${name} registrada`)
    } catch (err) {
      handleApiFailure(err, "Error al registrar marca")
    }
  }

  const handleDeleteBrandConfirm = async () => {
    if (!brandToDelete) return
    const id = brandToDelete.id
    try {
      await adminApi.deleteBrand(id)
      setBrandsList((prev) => prev.filter((b) => b.id !== id))
      triggerToast("Marca eliminada")
    } catch (err) {
      handleApiFailure(err, "No se pudo eliminar la marca")
    } finally {
      setBrandToDelete(null)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = await adminApi.saveConfig(storeConfig)
      if (updated) setStoreConfig(updated)
      triggerToast("Configuración de tienda actualizada")
    } catch (err) {
      handleApiFailure(err, "Error al guardar configuración")
    }
  }

  const handleExportExcel = async () => {
    try {
      const { exportarCatalogoExcel } = await import("@/lib/import/catalogExporter")
      const dateStr = new Date().toISOString().split("T")[0]
      const blob = await exportarCatalogoExcel(productList)
      downloadBlob(blob, `catalogo_magik_${dateStr}.xlsx`)
      triggerToast("Catálogo exportado exitosamente a Excel (.xlsx)")
    } catch {
      triggerToast("Error al exportar archivo Excel")
    }
  }

  const handleExportCsv = async () => {
    try {
      const { exportarCatalogoCsv } = await import("@/lib/import/catalogExporter")
      const dateStr = new Date().toISOString().split("T")[0]
      downloadCsv(exportarCatalogoCsv(productList), `catalogo_magik_${dateStr}.csv`)
      triggerToast("Catálogo exportado exitosamente a CSV")
    } catch {
      triggerToast("Error al exportar archivo CSV")
    }
  }

  const handleCsvImportSuccess = async () => {
    try {
      const [{ products, categories }, brands] = await Promise.all([
        adminApi.fetchProductsAndCategories(),
        adminApi.fetchBrands(),
      ])
      setProductList(products)
      setCategoriesList(categories)
      if (products.length > 0) setEditingProduct(products[0])
      setBrandsList(brands)
      triggerToast("Catálogo sincronizado desde archivo")
    } catch (err) {
      handleApiFailure(err, "Error al refrescar tras importación")
    }
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

  if (!logged) {
    return <AdminLogin onLoginSuccess={() => setLogged(true)} />
  }

  return (
    <main className="admin-shell">
      <aside className="admin-nav">
        <span className="admin-brand">
          MAGIK<span>GESTOR PRO</span>
        </span>
        {(["Resumen", "Productos", "Marcas", "Configuración"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "Productos"
              ? `Productos (${productList.length})`
              : item === "Marcas"
                ? `Marcas (${brandsList.length})`
                : item}
          </button>
        ))}
        <button type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-content">
        <div className="admin-head">
          <div>
            <p>SISTEMA ADMINISTRATIVO</p>
            <h1>{tab}</h1>
          </div>

          {tab === "Productos" && (
            <div className="admin-head-actions">
              <button
                type="button"
                className="admin-action-btn"
                onClick={handleExportExcel}
                title="Descargar todo el catálogo a Microsoft Excel (.xlsx)"
              >
                <Icon name="arrow" /> Exportar Excel
              </button>
              <button
                type="button"
                className="admin-action-btn"
                onClick={handleExportCsv}
                title="Descargar catálogo a formato CSV plano (.csv)"
              >
                <Icon name="arrow" /> Exportar CSV
              </button>
              <button
                type="button"
                className="admin-action-btn admin-action-btn--soft"
                onClick={() => setIsCsvModalOpen(true)}
                title="Carga masiva desde archivo Excel (.xlsx, .xls) o CSV (.csv)"
              >
                <Icon name="filter" /> Importar Excel / CSV
              </button>
              <button
                type="button"
                className="button button--primary csv-btn-pad"
                onClick={handleNewProductClick}
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

        {tab === "Resumen" && (
          <OverviewTab
            productList={productList}
            brandsList={brandsList}
            storeConfig={storeConfig}
            onToggleStock={toggleStock}
          />
        )}

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
                categoriesList={categoriesList}
                editingProduct={editingProduct}
                isNewProduct={isNewProduct}
                onSelectProduct={(p) => {
                  setIsNewProduct(false)
                  setEditingProduct({ ...p })
                }}
                onToggleStock={toggleStock}
                onRequestDeleteProduct={(p) => setProductToDelete(p)}
              />

              <ProductEditSidebar
                isNewProduct={isNewProduct}
                editingProduct={editingProduct}
                brandsList={brandsList}
                categoriesList={categoriesList}
                onChangeProduct={(p) => setEditingProduct(p)}
                onSaveProduct={handleSaveProduct}
              />
            </div>
          </div>
        )}

        {tab === "Marcas" && (
          <BrandsTab
            brandsList={brandsList}
            onAddBrand={handleAddBrand}
            onRequestDeleteBrand={(b) => setBrandToDelete(b)}
          />
        )}

        {tab === "Configuración" && (
          <ConfigTab
            storeConfig={storeConfig}
            onChangeConfig={(cfg) => setStoreConfig(cfg)}
            onSaveConfig={handleSaveConfig}
          />
        )}
      </section>

      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        eyebrow="CONFIRMAR BAJA DE PRODUCTO"
        title={`¿Eliminar "${productToDelete?.name}"?`}
        description="Esta acción archivará este producto para retirarlo del catálogo público."
        onConfirm={handleDeleteProductConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(brandToDelete)}
        eyebrow="CONFIRMAR BAJA DE MARCA"
        title={`¿Eliminar marca "${brandToDelete?.nombre}"?`}
        description="Se dará de baja la marca del filtro activo en la tienda."
        confirmText="Eliminar marca"
        onConfirm={handleDeleteBrandConfirm}
        onCancel={() => setBrandToDelete(null)}
      />

      {isCsvModalOpen && (
        <Suspense fallback={null}>
          <CsvImportModal
            isOpen={isCsvModalOpen}
            productos={productList}
            marcas={brandsList}
            onClose={() => setIsCsvModalOpen(false)}
            onSuccess={handleCsvImportSuccess}
            onUnauthorized={() => setLogged(false)}
          />
        </Suspense>
      )}
    </main>
  )
}
