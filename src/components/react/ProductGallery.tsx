import { useState, useEffect } from "react"
import Icon from "./Icon"

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const safeImages = images.length > 0 ? images : ["/assets/a0f2f.png"]
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const currentImage = safeImages[activeIndex] || safeImages[0]

  useEffect(() => {
    if (!isZoomOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isZoomOpen])

  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={currentImage} alt={productName} id="main-product-img" />
        <button
          type="button"
          onClick={() => setIsZoomOpen(true)}
          aria-label="Ampliar imagen"
        >
          Ampliar
        </button>
      </div>

      {safeImages.length > 1 && (
        <div className="thumbnails">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={index === activeIndex ? "active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver ángulo ${index + 1}`}
            >
              <img src={image} alt={`${productName} - vista ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

      {isZoomOpen && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${productName}`}
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Cerrar vista ampliada"
          >
            <Icon name="close" />
          </button>
          <img
            src={currentImage}
            alt={productName}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
