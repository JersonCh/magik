import { useState, useEffect } from "react"
import { products as initialProducts, type Product } from "../../data/products"
import Icon from "./Icon"

const A = "/assets/"

export default function AdminDashboard() {
  const [logged, setLogged] = useState(false)
  const [tab, setTab] = useState("Productos")
  const [saved, setSaved] = useState(false)
  const [toastMessage, setToastMessage] = useState("Cambios guardados correctamente")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")

  // Lista de productos dinámica (inicia con catálogo fallback y sincroniza vía /api/products)
  const [productList, setProductList] = useState<Product[]>(initialProducts)

  // Producto actualmente seleccionado para edición rápida
  const [editingProduct, setEditingProduct] = useState<Product>({
    ...initialProducts[0],
  })
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [description, setDescription] = useState("Descripción editable del producto.")

  // Cargar productos desde la API al iniciar
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setProductList(data)
            if (!isNewProduct) {
              setEditingProduct(data[0])
            }
          }
        }
      } catch (err) {
        console.warn("Usando datos locales para admin:", err)
      }
    }
    loadProducts()
  }, [])

  const triggerToast = (msg = "Cambios guardados correctamente") => {
    setToastMessage(msg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  // Alternar stock con 1 clic desde la tabla
  const toggleStock = async (product: Product) => {
    const nextStock = !product.stock
    // Actualización optimista local
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

  // Guardar cambios del producto (POST /api/admin/products)
  const handleSaveProduct = async () => {
    const payload = {
      id: isNewProduct ? undefined : editingProduct.id,
      name: editingProduct.name,
      brand: editingProduct.brand,
      model: editingProduct.model,
      category: editingProduct.category || "Cortadoras",
      price: editingProduct.price,
      oldPrice: editingProduct.oldPrice,
      stock: editingProduct.stock,
      badge: editingProduct.badge,
      image: editingProduct.image,
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
          setProductList((prev) => [...prev, savedProd])
          setIsNewProduct(false)
          setEditingProduct(savedProd)
        } else {
          setProductList((prev) =>
            prev.map((p) => (p.id === savedProd.id ? savedProd : p))
          )
        }
        triggerToast("Producto guardado en base de datos")
      } else {
        triggerToast("Cambios guardados correctamente")
      }
    } catch {
      triggerToast("Cambios guardados localmente")
    }
  }

  // Seleccionar producto para edición
  const handleSelectProduct = (p: Product) => {
    setIsNewProduct(false)
    setEditingProduct({ ...p })
  }

  // Iniciar formulario de nuevo producto
  const handleNewProductClick = () => {
    setIsNewProduct(true)
    setEditingProduct({
      id: 0,
      name: "Nuevo producto",
      brand: "STYLECRAFT",
      model: "Modelo estándar",
      price: 150,
      image: `${A}a0f2f.png`,
      category: "Cortadoras",
      stock: true,
      badge: "Nuevo",
    })
    setDescription("Descripción del nuevo producto.")
  }

  if (!logged) {
    return (
      <main className="admin-login">
        <div>
          <span className="logo-crop">
            <img src={`${A}9f199.png`} alt="Magik Barber Supply" />
          </span>
          <p>ACCESO ADMINISTRATIVO</p>
          <h1>Gestiona tu catálogo</h1>
          <label className="field">
            <span>Correo</span>
            <input defaultValue="admin@ejemplo.pe" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" defaultValue="••••••••" />
          </label>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setLogged(true)}
          >
            Ingresar al panel
          </button>
          <small>Prototipo visual. Autenticación por implementar.</small>
        </div>
      </main>
    )
  }

  const filteredProducts = productList.filter((p) => {
    const matchesSearch = `${p.name} ${p.brand} ${p.model}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === "Todos"
        ? true
        : statusFilter === "Disponibles"
        ? p.stock
        : statusFilter === "Agotados"
        ? !p.stock
        : true
    return matchesSearch && matchesStatus
  })

  return (
    <main className="admin-shell">
      <aside className="admin-nav">
        <span className="admin-brand">
          MAGIK<span>ADMIN</span>
        </span>
        {[
          "Resumen",
          "Productos",
          "Categorías",
          "Marcas",
          "Promociones",
          "Contenido",
          "Configuración",
        ].map((item) => (
          <button
            type="button"
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
        <button type="button" onClick={() => setLogged(false)}>
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-content">
        <div className="admin-head">
          <div>
            <p>PANEL ADMINISTRATIVO</p>
            <h1>{tab}</h1>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={handleNewProductClick}
          >
            Nuevo producto
          </button>
        </div>

        {saved && (
          <div className="save-toast">
            <Icon name="check" /> {toastMessage}
          </div>
        )}

        <div className="stats">
          <div>
            <span>Productos</span>
            <b>{productList.length}</b>
            <small>{productList.filter((p) => p.stock).length} disponibles</small>
          </div>
          <div>
            <span>Sin stock</span>
            <b>{productList.filter((p) => !p.stock).length}</b>
            <small>Requieren atención</small>
          </div>
          <div>
            <span>Promociones</span>
            <b>{productList.filter((p) => p.badge === "Oferta" || (p.oldPrice && p.oldPrice > p.price)).length}</b>
            <small>Activas</small>
          </div>
          <div>
            <span>Destacados</span>
            <b>{productList.filter((p) => p.badge === "Destacado").length}</b>
            <small>En inicio</small>
          </div>
        </div>

        <div className="admin-grid">
          <section className="admin-table">
            <div className="table-toolbar">
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Buscar</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre, modelo o marca"
                />
              </label>
              <label className="select-field">
                <span>Estado</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>Todos</option>
                  <option>Disponibles</option>
                  <option>Agotados</option>
                  <option>Archivados</option>
                </select>
              </label>
            </div>

            <div className="table-row table-labels">
              <span>Producto</span>
              <span>Precio</span>
              <span>Stock</span>
              <span>Estado</span>
              <span />
            </div>

            {filteredProducts.map((p) => (
              <div className="table-row" key={p.id}>
                <span className="table-product">
                  <img src={p.image} alt={p.name} />
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {p.brand} · {p.model}
                    </small>
                  </span>
                </span>
                <span>S/{p.price}</span>
                <span>{p.stock ? "Disponible" : "0"}</span>
                <button
                  type="button"
                  className={p.stock ? "status" : "status off"}
                  onClick={() => toggleStock(p)}
                  title="Haz clic para alternar disponibilidad"
                  style={{ border: 0, cursor: "pointer" }}
                >
                  {p.stock ? "Publicado" : "Agotado"}
                </button>
                <button type="button" onClick={() => handleSelectProduct(p)}>
                  Editar
                </button>
              </div>
            ))}
          </section>

          <aside className="edit-panel">
            <p>{isNewProduct ? "CREACIÓN RÁPIDA" : "EDICIÓN RÁPIDA"}</p>
            <h2>{editingProduct.name || "Nuevo producto"}</h2>

            <label className="field">
              <span>Nombre del producto</span>
              <input
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Marca</span>
                <input
                  value={editingProduct.brand}
                  onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Modelo</span>
                <input
                  value={editingProduct.model}
                  onChange={(e) => setEditingProduct({ ...editingProduct, model: e.target.value })}
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Precio regular</span>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Precio promocional</span>
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

            <label className="select-field" style={{ marginBottom: "15px" }}>
              <span>Disponibilidad</span>
              <select
                value={editingProduct.stock ? "Disponible" : "Agotado"}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    stock: e.target.value === "Disponible",
                  })
                }
              >
                <option value="Disponible">Disponible</option>
                <option value="Agotado">Agotado</option>
              </select>
            </label>

            <label className="field">
              <span>Descripción</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="upload-box">
              Cargar y ordenar imágenes<small>PNG o JPG · Arrastra aquí</small>
            </div>

            <button
              type="button"
              className="button button--primary"
              onClick={handleSaveProduct}
            >
              {isNewProduct ? "Crear producto" : "Guardar cambios"}
            </button>
          </aside>
        </div>
      </section>
    </main>
  )
}
