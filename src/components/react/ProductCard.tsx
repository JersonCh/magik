import type { Product } from "@/types/domain"
import AddToCartButton from "./AddToCartButton"

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const eyebrowText = product.model ? `${product.brand} · ${product.model}` : product.brand

  return (
    <article className={`product-card ${!product.stock ? "product-card--out" : ""}`}>
      <a
        href={`/producto/${product.id}`}
        className="product-image"
        aria-label={`Ver detalle de ${product.name}`}
      >
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && <span className="badge">{product.badge}</span>}
        {!product.stock && <span className="out-label">Agotado</span>}
      </a>

      <div className="product-copy">
        <p className="eyebrow">{eyebrowText}</p>
        <h3>{product.name}</h3>
      </div>

      <div className="price-row">
        <strong>S/{product.price}</strong>
        {product.oldPrice && (
          <>
            <del>S/{product.oldPrice}</del>
            <span>-{Math.round((1 - product.price / product.oldPrice) * 100)}%</span>
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
  )
}
