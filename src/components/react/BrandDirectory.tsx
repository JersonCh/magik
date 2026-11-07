import { useState } from "react"
import { products, brands } from "../../data/products"
import AddToCartButton from "./AddToCartButton"

export default function BrandDirectory() {
  const [selected, setSelected] = useState("STYLECRAFT")
  const brandProducts = products.filter((p) => p.brand === selected)

  return (
    <div>
      <div className="brand-directory">
        {brands.map((brand) => (
          <button
            type="button"
            key={brand}
            className={selected === brand ? "selected" : ""}
            onClick={() => setSelected(brand)}
          >
            {brand}
            <small>
              {products.filter((p) => p.brand === brand).length} productos
            </small>
          </button>
        ))}
      </div>

      <section className="category-banner">
        <p>Inicio / Marcas / {selected}</p>
        <h2>{selected}</h2>
        <span>Explora los productos disponibles de esta marca.</span>
      </section>

      <div className="product-grid catalog-grid">
        {brandProducts.map((product) => (
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
    </div>
  )
}

