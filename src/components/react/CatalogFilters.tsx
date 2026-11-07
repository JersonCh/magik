import { useState, useMemo } from "react"
import { products, categories, type Product } from "../../data/products"
import Icon from "./Icon"
import AddToCartButton from "./AddToCartButton"

interface CatalogFiltersProps {
  initialCategory?: string
  initialBrand?: string
  onlyOffers?: boolean
}

export default function CatalogFilters({
  initialCategory = "Todas las categorías",
  initialBrand = "Todas las marcas",
  onlyOffers = false,
}: CatalogFiltersProps) {
  const [category, setCategory] = useState(initialCategory)
  const [brand, setBrand] = useState(initialBrand)
  const [availability, setAvailability] = useState("Disponibilidad: Todas")
  const [sort, setSort] = useState("Relevancia")
  const [mobileFilters, setMobileFilters] = useState(false)

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchCat = category === "Todas las categorías" || p.category === category
      const matchBrand = brand === "Todas las marcas" || p.brand === brand
      const matchStock = availability === "Disponibilidad: Todas" || p.stock
      const matchOffers = !onlyOffers || (p.badge === "Oferta" || (p.oldPrice !== undefined && p.oldPrice > p.price))
      return matchCat && matchBrand && matchStock && matchOffers
    })

    if (sort === "Menor precio") result = [...result].sort((a, b) => a.price - b.price)
    if (sort === "Mayor precio") result = [...result].sort((a, b) => b.price - a.price)
    if (sort === "Novedades") result = [...result].sort((a, b) => b.id - a.id)
    return result
  }, [category, brand, availability, sort, onlyOffers])

  const reset = () => {
    setCategory("Todas las categorías")
    setBrand("Todas las marcas")
    setAvailability("Disponibilidad: Todas")
    setSort("Relevancia")
  }

  const isFiltered =
    category !== "Todas las categorías" ||
    brand !== "Todas las marcas" ||
    availability !== "Disponibilidad: Todas"

  return (
    <div>
      <button
        type="button"
        className="button button--outline filter-toggle"
        onClick={() => setMobileFilters(!mobileFilters)}
      >
        <Icon name="filter" /> Filtros
      </button>

      <div className={`filters ${mobileFilters ? "filters--open" : ""}`}>
        <label className="select-field">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Todas las categorías</option>
            {categories.map((c) => (
              <option key={c[0]} value={c[0]}>
                {c[0]}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option>Todas las marcas</option>
            <option value="STYLECRAFT">STYLECRAFT</option>
            <option value="JRL">JRL</option>
            <option value="VASSO">VASSO</option>
            <option value="MAGIK SELECT">MAGIK SELECT</option>
            <option value="GENÉRICO">GENÉRICO</option>
          </select>
        </label>

        <label className="select-field">
          <select defaultValue="Precio: S/0 – S/1,000">
            <option>Precio: S/0 – S/1,000</option>
          </select>
        </label>

        <label className="select-field">
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option>Disponibilidad: Todas</option>
            <option>Solo disponibles</option>
          </select>
        </label>
      </div>

      <div className="results-bar">
        <div>
          <b>{filtered.length} productos</b>
          {isFiltered && (
            <>
              <span className="filter-chip">
                {category !== "Todas las categorías"
                  ? category
                  : brand !== "Todas las marcas"
                  ? brand
                  : "Disponibles"}
              </span>
              <button type="button" onClick={reset}>
                Limpiar filtros
              </button>
            </>
          )}
        </div>

        <label className="select-field">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="Relevancia">Relevancia</option>
            <option value="Menor precio">Menor precio</option>
            <option value="Mayor precio">Mayor precio</option>
            <option value="Novedades">Novedades</option>
          </select>
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="product-grid catalog-grid">
          {filtered.map((product) => (
            <article
              key={product.id}
              className={`product-card ${!product.stock ? "product-card--out" : ""}`}
            >
              <a
                href={`/producto/${product.id}`}
                className="product-image"
                aria-label={`Ver detalle de ${product.name}`}
              >
                <img src={product.image} alt={product.name} />
                {product.badge && <span className="badge">{product.badge}</span>}
                {!product.stock && <span className="out-label">Agotado</span>}
              </a>
              <div className="product-copy">
                <p className="eyebrow">
                  {product.brand} · {product.model}
                </p>
                <h3>{product.name}</h3>
              </div>
              <div className="price-row">
                <strong>S/{product.price}</strong>
                {product.oldPrice && (
                  <>
                    <del>S/{product.oldPrice}</del>
                    <span>
                      -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className={product.stock ? "availability" : "availability unavailable"}>
                {product.stock ? "Disponible" : "Agotado · Consulta disponibilidad"}
              </p>
              <div className="card-actions">
                <a href={`/producto/${product.id}`} className="button button--outline">
                  Ver producto
                </a>
                <AddToCartButton product={product} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="search" />
          </span>
          <h2>No encontramos productos</h2>
          <p>Prueba otra combinación o limpia los filtros activos.</p>
          <button type="button" className="button button--primary" onClick={reset}>
            Limpiar búsqueda y filtros
          </button>
        </div>
      )}
    </div>
  )
}

