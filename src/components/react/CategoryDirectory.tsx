import { useState } from "react"
import { products, categories } from "../../data/products"
import Icon from "./Icon"
import AddToCartButton from "./AddToCartButton"

const A = "/assets/"

export default function CategoryDirectory() {
  const [selected, setSelected] = useState("Cortadoras")
  const categoryProducts = products.filter((p) => p.category === selected)
  const currentCategory = categories.find((c) => c[0] === selected)

  return (
    <div>
      <div className="category-grid directory">
        {categories.map(([key, label, image]) => (
          <button
            type="button"
            className={`category-card ${selected === key ? "selected" : ""}`}
            key={key}
            onClick={() => setSelected(key)}
          >
            <span>
              <img src={`${A}${image}`} alt={label} />
            </span>
            <b>{label}</b>
            {selected === key && (
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
          Herramientas y productos para tu técnica. Revisa cada producto antes de agregarlo a tu pedido.
        </span>
      </section>

      <div className="product-grid catalog-grid">
        {categoryProducts.length > 0 ? (
          categoryProducts.map((product) => (
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

