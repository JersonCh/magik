import { useState } from "react"
import type { Product } from "@/types/domain"
import ProductCard from "./ProductCard"

interface BrandDirectoryProps {
  products: Product[]
  brands: string[]
  initialBrand?: string
}

export default function BrandDirectory({
  products,
  brands,
  initialBrand,
}: BrandDirectoryProps) {
  const defaultBrand =
    (initialBrand && brands.find((b) => b.toUpperCase() === initialBrand.toUpperCase())) ||
    brands[0] ||
    "STYLECRAFT"
  const [selected, setSelected] = useState(defaultBrand)
  const brandProducts = products.filter(
    (p) => p.brand.toUpperCase() === selected.toUpperCase()
  )

  return (
    <div>
      <div className="brand-directory">
        {brands.map((brand) => (
          <button
            type="button"
            key={brand}
            className={selected.toUpperCase() === brand.toUpperCase() ? "selected" : ""}
            onClick={() => setSelected(brand)}
          >
            {brand}
            <small>
              {products.filter((p) => p.brand.toUpperCase() === brand.toUpperCase()).length} productos
            </small>
          </button>
        ))}
      </div>

      <section className="category-banner">
        <p>Inicio / Marcas / {selected}</p>
        <h2>{selected}</h2>
        <span>Explora los productos disponibles de esta marca.</span>
      </section>

      {brandProducts.length > 0 ? (
        <div className="product-grid catalog-grid">
          {brandProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-inline">
          Próximamente más productos de esta marca.
        </div>
      )}
    </div>
  )
}
