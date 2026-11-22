import { useMemo, useState } from "react"
import type { CategoryItem, Product } from "@/types/domain"
import Icon from "./Icon"
import ProductCard from "./ProductCard"
import CategoryOptions from "./admin/CategoryOptions"

interface CatalogFiltersProps {
  products: Product[]
  categories: CategoryItem[]
  brands: string[]
  initialCategory?: string
  initialBrand?: string
  onlyOffers?: boolean
}

type PriceRange = "all" | "under_100" | "100_500" | "over_500"

export default function CatalogFilters({
  products,
  categories,
  brands,
  initialCategory = "Todas las categorías",
  initialBrand = "Todas las marcas",
  onlyOffers = false,
}: CatalogFiltersProps) {
  const [category, setCategory] = useState(initialCategory)
  const [brand, setBrand] = useState(initialBrand)
  const [priceRange, setPriceRange] = useState<PriceRange>("all")
  const [availability, setAvailability] = useState("Disponibilidad: Todas")
  const [sort, setSort] = useState("Relevancia")
  const [mobileFilters, setMobileFilters] = useState(false)

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchCat =
        category === "Todas las categorías" ||
        p.category.toLowerCase() === category.toLowerCase()
      const matchBrand =
        brand === "Todas las marcas" ||
        p.brand.toUpperCase() === brand.toUpperCase()
      const matchStock = availability === "Disponibilidad: Todas" || p.stock
      const matchOffers =
        !onlyOffers ||
        p.badge === "Oferta" ||
        (p.oldPrice !== undefined && p.oldPrice > p.price)
      const matchPrice =
        priceRange === "all"
          ? true
          : priceRange === "under_100"
            ? p.price <= 100
            : priceRange === "100_500"
              ? p.price > 100 && p.price <= 500
              : p.price > 500

      return matchCat && matchBrand && matchStock && matchOffers && matchPrice
    })

    if (sort === "Menor precio") result = [...result].sort((a, b) => a.price - b.price)
    if (sort === "Mayor precio") result = [...result].sort((a, b) => b.price - a.price)
    if (sort === "Novedades") result = [...result].sort((a, b) => b.id - a.id)
    return result
  }, [products, category, brand, priceRange, availability, sort, onlyOffers])

  const reset = () => {
    setCategory("Todas las categorías")
    setBrand("Todas las marcas")
    setPriceRange("all")
    setAvailability("Disponibilidad: Todas")
    setSort("Relevancia")
  }

  const isFiltered =
    category !== "Todas las categorías" ||
    brand !== "Todas las marcas" ||
    priceRange !== "all" ||
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
            <option value="Todas las categorías">Todas las categorías</option>
            <CategoryOptions categories={categories} />
          </select>
        </label>

        <label className="select-field">
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="Todas las marcas">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value as PriceRange)}
          >
            <option value="all">Precio: Todos</option>
            <option value="under_100">Hasta S/100</option>
            <option value="100_500">S/100 – S/500</option>
            <option value="over_500">Más de S/500</option>
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
                    : "Filtros activos"}
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
            <ProductCard key={product.id} product={product} />
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
