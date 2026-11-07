import { useState } from "react"
import { products } from "../../data/products"
import Icon from "./Icon"

const A = "/assets/"

export default function AdminDashboard() {
  const [logged, setLogged] = useState(false)
  const [tab, setTab] = useState("Productos")
  const [saved, setSaved] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")

  const triggerSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
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

  const filteredProducts = products.filter((p) => {
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
            onClick={triggerSave}
          >
            Nuevo producto
          </button>
        </div>

        {saved && (
          <div className="save-toast">
            <Icon name="check" /> Cambios guardados correctamente
          </div>
        )}

        <div className="stats">
          <div>
            <span>Productos</span>
            <b>{products.length}</b>
            <small>{products.filter((p) => p.stock).length} disponibles</small>
          </div>
          <div>
            <span>Sin stock</span>
            <b>{products.filter((p) => !p.stock).length}</b>
            <small>Requieren atención</small>
          </div>
          <div>
            <span>Promociones</span>
            <b>2</b>
            <small>Activas</small>
          </div>
          <div>
            <span>Destacados</span>
            <b>4</b>
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

            {filteredProducts.slice(0, 5).map((p) => (
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
                <span className={p.stock ? "status" : "status off"}>
                  {p.stock ? "Publicado" : "Agotado"}
                </span>
                <button type="button" onClick={triggerSave}>
                  Editar
                </button>
              </div>
            ))}
          </section>

          <aside className="edit-panel">
            <p>EDICIÓN RÁPIDA</p>
            <h2>Cortadora Saber II</h2>
            <label className="field">
              <span>Nombre del producto</span>
              <input defaultValue="Cortadora Saber II" />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Precio regular</span>
                <input defaultValue="950" />
              </label>
              <label className="field">
                <span>Precio promocional</span>
                <input placeholder="Opcional" />
              </label>
            </div>
            <label className="select-field" style={{ marginBottom: "15px" }}>
              <span>Disponibilidad</span>
              <select defaultValue="Disponible">
                <option>Disponible</option>
                <option>Agotado</option>
                <option>Oculto</option>
              </select>
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea defaultValue="Descripción editable del producto." />
            </label>
            <div className="upload-box">
              Cargar y ordenar imágenes<small>PNG o JPG · Arrastra aquí</small>
            </div>
            <button
              type="button"
              className="button button--primary"
              onClick={triggerSave}
            >
              Guardar cambios
            </button>
          </aside>
        </div>
      </section>
    </main>
  )
}

