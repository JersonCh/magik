import { useState, useEffect } from "react"
import { products as initialProducts, type Product } from "../../data/products"
import type { BrandWithCount, StoreConfigMap } from "../../lib/db"
import { defaultStoreConfig } from "../../lib/db"
import Icon from "./Icon"

const A = "/assets/"

const CATEGORY_OPTIONS = [
  "Cortadoras",
  "Trimmers",
  "Shaver",
  "Cuidado",
  "Accesorios",
  "Combos",
]

export default function AdminDashboard() {
  const [logged, setLogged] = useState(false)
  const [emailInput, setEmailInput] = useState("admin@magikbarber.pe")
  const [passwordInput, setPasswordInput] = useState("magik")
  const [loginError, setLoginError] = useState("")

  const [tab, setTab] = useState<"Resumen" | "Productos" | "Marcas" | "Configuración">("Productos")
  const [saved, setSaved] = useState(false)
  const [toastMessage, setToastMessage] = useState("Cambios guardados correctamente")

  // Estado de Productos
  const [productList, setProductList] = useState<Product[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("Todas")
  const [brandFilter, setBrandFilter] = useState("Todas")
  const [statusFilter, setStatusFilter] = useState("Todos")

  const [editingProduct, setEditingProduct] = useState<Product>({
    ...initialProducts[0],
  })
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [description, setDescription] = useState("Descripción detallada del equipo profesional para barbería.")
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Estado de Marcas
  const [brandsList, setBrandsList] = useState<BrandWithCount[]>([])
  const [newBrandName, setNewBrandName] = useState("")
  const [brandToDelete, setBrandToDelete] = useState<BrandWithCount | null>(null)

  // Estado de Configuración de la Tienda
  const [storeConfig, setStoreConfig] = useState<StoreConfigMap>(defaultStoreConfig)

  // 1. Validar sesión persistente al montar
  useEffect(() => {
    const session = localStorage.getItem("magik_admin_session")
    if (session === "true") {
      setLogged(true)
    }
  }, [])

  // 2. Cargar datos desde las APIs de backend
  useEffect(() => {
    if (!logged) return

    async function loadData() {
      // Cargar productos
      try {
        const resP = await fetch("/api/products")
        if (resP.ok) {
          const prods = await resP.json()
          if (Array.isArray(prods) && prods.length > 0) {
            setProductList(prods)
            setEditingProduct(prods[0])
          }
        }
      } catch (err) {
        console.warn("Usando catálogo local para productos:", err)
      }

      // Cargar marcas
      try {
        const resB = await fetch("/api/admin/brands")
        if (resB.ok) {
          const dataB = await resB.json()
          if (dataB.brands && Array.isArray(dataB.brands)) {
            setBrandsList(dataB.brands)
          }
        }
      } catch (err) {
        console.warn("Usando marcas locales:", err)
      }

      // Cargar configuración de tienda
      try {
        const resC = await fetch("/api/admin/config")
        if (resC.ok) {
          const dataC = await resC.json()
          if (dataC.config) {
            setStoreConfig(dataC.config)
          }
        }
      } catch (err) {
        console.warn("Usando configuración local:", err)
      }
    }

    loadData()
  }, [logged])

  const triggerToast = (msg = "Cambios guardados correctamente") => {
    setToastMessage(msg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  // --- AUTENTICACIÓN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      })

      if (res.ok) {
        localStorage.setItem("magik_admin_session", "true")
        setLogged(true)
      } else {
        const data = await res.json()
        setLoginError(data.message || "Credenciales incorrectas")
      }
    } catch {
      // Fallback local directo
      if (passwordInput === "magik" || passwordInput === "admin") {
        localStorage.setItem("magik_admin_session", "true")
        setLogged(true)
      } else {
        setLoginError("Contraseña incorrecta (Usa: magik)")
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("magik_admin_session")
    setLogged(false)
  }

  // --- ACCIONES DE PRODUCTO ---
  const toggleStock = async (product: Product) => {
    const nextStock = !product.stock
    setProductList((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p))
    )
    if (editingProduct.id === product.id) {
      setEditingProduct((prev) => ({ ...prev, stock: nextStock }))
    }

    try {
      const res = await fetch("/api/admin/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, stock: nextStock }),
      })
      if (res.ok) {
        triggerToast(`Stock actualizado: ${nextStock ? "Disponible" : "Agotado"}`)
      }
    } catch {
      triggerToast("Stock actualizado localmente")
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        const savedProd: Product = data.product || editingProduct

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
        triggerToast("Error al guardar en base de datos")
      }
    } catch {
      triggerToast("Cambios guardados localmente")
    }
  }

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return

    const id = productToDelete.id
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setProductList((prev) => prev.filter((p) => p.id !== id))
        if (editingProduct.id === id) {
          const remaining = productList.filter((p) => p.id !== id)
          if (remaining.length > 0) {
            setEditingProduct(remaining[0])
          }
        }
        triggerToast(`Producto "${productToDelete.name}" eliminado`)
      } else {
        triggerToast("No se pudo eliminar el producto")
      }
    } catch {
      setProductList((prev) => prev.filter((p) => p.id !== id))
      triggerToast(`Producto eliminado localmente`)
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
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBrandName.trim().toUpperCase()
    if (!name) return

    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.brand) {
          setBrandsList((prev) => [...prev, data.brand])
          setNewBrandName("")
          triggerToast(`Marca ${name} registrada`)
        }
      }
    } catch {
      triggerToast("Error al registrar marca")
    }
  }

  const handleDeleteBrandConfirm = async () => {
    if (!brandToDelete) return
    const id = brandToDelete.id

    try {
      const res = await fetch("/api/admin/brands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setBrandsList((prev) => prev.filter((b) => b.id !== id))
        triggerToast(`Marca eliminada`)
      }
    } catch {
      setBrandsList((prev) => prev.filter((b) => b.id !== id))
      triggerToast("Marca eliminada localmente")
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeConfig),
      })

      if (res.ok) {
        triggerToast("Configuración de tienda actualizada")
      } else {
        triggerToast("Error al guardar configuración")
      }
    } catch {
      triggerToast("Configuración actualizada localmente")
    }
  }

  // --- FILTROS DE PRODUCTOS ---
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

  // Pantalla de Login
  if (!logged) {
    return (
      <main className="admin-login">
        <div>
          <span className="logo-crop">
            <img src={`${A}9f199.png`} alt="Magik Barber Supply" />
          </span>
          <p>ACCESO ADMINISTRATIVO</p>
          <h1>Gestor de Tienda</h1>
          <form onSubmit={handleLogin}>
            <label className="field">
              <span>Correo de Administrador</span>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </label>

            {loginError && (
              <div style={{ color: "var(--danger)", fontSize: "11px", marginBottom: "15px" }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="button button--primary">
              Ingresar al gestor
            </button>
          </form>
          <small>Credenciales iniciales: admin@magikbarber.pe / magik</small>
        </div>
      </main>
    )
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
            <button
              type="button"
              className="button button--primary"
              onClick={handleNewProductClick}
            >
              <Icon name="plus" /> Nuevo producto
            </button>
          )}
        </div>

        {saved && (
          <div className="save-toast">
            <Icon name="check" /> {toastMessage}
          </div>
        )}

        {/* ===================== TAB: RESUMEN ===================== */}
        {tab === "Resumen" && (
          <div>
            <div className="stats">
              <div>
                <span>Total de máquinas y productos</span>
                <b>{productList.length}</b>
                <small>{productList.filter((p) => p.stock).length} con stock activo</small>
              </div>
              <div>
                <span>Productos agotados</span>
                <b style={{ color: "var(--danger)" }}>
                  {productList.filter((p) => !p.stock).length}
                </b>
                <small>Requieren reposición en tienda</small>
              </div>
              <div>
                <span>Marcas registradas</span>
                <b>{brandsList.length}</b>
                <small>Distribuidores oficiales en Tacna</small>
              </div>
              <div>
                <span>Equipos en promoción</span>
                <b>
                  {
                    productList.filter(
                      (p) => p.badge === "Oferta" || (p.oldPrice && p.oldPrice > p.price)
                    ).length
                  }
                </b>
                <small>Con precio de descuento activo</small>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div className="admin-config-card">
                <h2>Estado de Stock Crítico</h2>
                {productList.filter((p) => !p.stock).length === 0 ? (
                  <p style={{ color: "var(--green)", fontSize: "13px" }}>
                    ✓ Todos los productos del catálogo cuentan con stock disponible.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {productList
                      .filter((p) => !p.stock)
                      .slice(0, 5)
                      .map((p) => (
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
                            onClick={() => toggleStock(p)}
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
        )}

        {/* ===================== TAB: PRODUCTOS ===================== */}
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
              {/* Tabla de Productos */}
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
                        onClick={() => toggleStock(p)}
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
                          onClick={() => {
                            setIsNewProduct(false)
                            setEditingProduct({ ...p })
                            setDescription(
                              p.name.includes("Saber")
                                ? "Motor magnético de 7,200 RPM con cuchilla DLC Black Diamond Carbon."
                                : "Producto profesional garantizado de alta durabilidad."
                            )
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => setProductToDelete(p)}
                          title="Eliminar producto"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Panel Lateral de Edición / Creación */}
              <aside className="edit-panel">
                <p>{isNewProduct ? "CREAR REGISTRO" : "EDICIÓN EN VIVO"}</p>
                <h2>{isNewProduct ? "Nuevo producto" : editingProduct.name}</h2>

                <label className="field">
                  <span>Nombre del producto</span>
                  <input
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                  />
                </label>

                <div className="field-row">
                  <label className="field">
                    <span>Marca</span>
                    <select
                      value={editingProduct.brand}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, brand: e.target.value })
                      }
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
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, model: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>Categoría</span>
                    <select
                      value={editingProduct.category}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
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
                        setEditingProduct({
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
                        setEditingProduct({
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
                        setEditingProduct({
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
                      setEditingProduct({
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
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, image: e.target.value })
                    }
                  />
                </label>

                <label className="field">
                  <span>Descripción Técnica</span>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleSaveProduct}
                  style={{ marginTop: "12px" }}
                >
                  {isNewProduct ? "Crear producto en catálogo" : "Guardar cambios"}
                </button>
              </aside>
            </div>
          </div>
        )}

        {/* ===================== TAB: MARCAS ===================== */}
        {tab === "Marcas" && (
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
                      onClick={() => setBrandToDelete(b)}
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
              <form onSubmit={handleAddBrand}>
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
        )}

        {/* ===================== TAB: CONFIGURACIÓN ===================== */}
        {tab === "Configuración" && (
          <form onSubmit={handleSaveConfig} className="admin-config-container">
            <div className="admin-config-card">
              <h2>Canales de Atención y Pedidos</h2>
              <label className="field">
                <span>Número oficial de WhatsApp (para checkout)</span>
                <input
                  value={storeConfig.whatsapp_number}
                  onChange={(e) =>
                    setStoreConfig({ ...storeConfig, whatsapp_number: e.target.value })
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Dirección física de la tienda (Tacna)</span>
                <input
                  value={storeConfig.store_address}
                  onChange={(e) =>
                    setStoreConfig({ ...storeConfig, store_address: e.target.value })
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Horario de atención comercial</span>
                <input
                  value={storeConfig.opening_hours}
                  onChange={(e) =>
                    setStoreConfig({ ...storeConfig, opening_hours: e.target.value })
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
                    setStoreConfig({ ...storeConfig, announcement_bar: e.target.value })
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Tarifa base de flete (S/)</span>
                <input
                  value={storeConfig.shipping_base_price}
                  onChange={(e) =>
                    setStoreConfig({ ...storeConfig, shipping_base_price: e.target.value })
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
        )}
      </section>

      {/* Modal de Confirmación de Eliminación de Producto */}
      {productToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setProductToDelete(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">CONFIRMAR BAJA DE PRODUCTO</p>
            <h3>¿Eliminar "{productToDelete.name}"?</h3>
            <p className="desc">
              Esta acción dará de baja este producto del catálogo público y de la base de datos D1. Los pedidos pasados conservarán su historial intacto.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setProductToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteProductConfirm}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Marca */}
      {brandToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setBrandToDelete(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">CONFIRMAR BAJA DE MARCA</p>
            <h3>¿Eliminar marca "{brandToDelete.nombre}"?</h3>
            <p className="desc">
              Se dará de baja la marca. Si existen productos asociados a esta marca, seguirán existiendo pero la marca ya no aparecerá en el filtro activo.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setBrandToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteBrandConfirm}
              >
                Eliminar marca
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
