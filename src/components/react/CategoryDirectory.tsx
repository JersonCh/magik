import { useState } from "react"
import type { Product } from "@/types/domain"
import Icon from "./Icon"
import ProductCard from "./ProductCard"

const A = "/assets/"

interface CategoryDirectoryProps {
  products: Product[]
  categories: [string, string, string][]
  initialCategory?: string
}

export default function CategoryDirectory({
  products,
  categories,
  initialCategory,
}: CategoryDirectoryProps) {
  const defaultCat =
    (initialCategory &&
      categories.find((c) => c[0].toLowerCase() === initialCategory.toLowerCase())?.[0]) ||
    categories[0]?.[0] ||
    "Cortadoras"
  const [selected, setSelected] = useState(defaultCat)
  const categoryProducts = products.filter(
    (p) => p.category.toLowerCase() === selected.toLowerCase()
  )
  const currentCategory = categories.find(
    (c) => c[0].toLowerCase() === selected.toLowerCase()
  )

  return (
    <div>
      <div className="category-grid directory">
        {categories.map(([key, label, image]) => (
          <button
            type="button"
            className={`category-card ${selected.toLowerCase() === key.toLowerCase() ? "selected" : ""}`}
            key={key}
            onClick={() => setSelected(key)}
          >
            <span>
              <img src={image.startsWith("/") ? image : `${A}${image}`} alt={label} />
            </span>
            <b>{label}</b>
            {selected.toLowerCase() === key.toLowerCase() && (
              <small>
                <Icon name="check" /> Seleccionada
              </small>
            )}
          </button>
        ))}
      </div>

      <section className="category-banner">
        <p>Inicio / Categorías / {currentCategory?.[1] || selected}</p>
        <h2>{currentCategory?.[1] || selected}</h2>
        <span>
          Herramientas y productos para tu técnica. Revisa cada producto antes de agregarlo a tu carrito.
        </span>
      </section>

      <div className="product-grid catalog-grid">
        {categoryProducts.length > 0 ? (
          categoryProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="empty-inline">
            Próximamente más productos en esta categoría.
          </div>
        )}
      </div>
    </div>
  )
}
