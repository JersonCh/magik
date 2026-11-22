import { useState } from "react"
import { optimizarImagenParaWebP } from "../../../lib/imageOptimization"

interface ProductImagesFieldProps {
  productName: string
  images: string[]
  onChangeImages: (nextImages: string[]) => void
}

const SLOTS = [
  { key: "portada", label: "1. Portada *", required: true },
  { key: "secundaria", label: "2. Vista 2", required: false },
  { key: "detalle", label: "3. Caja / detalle", required: false },
] as const

export default function ProductImagesField({
  productName,
  images,
  onChangeImages,
}: ProductImagesFieldProps) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slotIndex: number,
    slotKey: string
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploadError(null)
    setUploadingSlot(slotIndex)

    try {
      const optimized = await optimizarImagenParaWebP(file)
      const formData = new FormData()
      formData.append("file", optimized)
      formData.append("nombre", productName || "producto")
      formData.append("slot", slotKey)
      formData.append("carpeta", "productos")

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        throw new Error(data.message || "No se pudo subir la imagen a R2.")
      }

      const next = [images[0] || "", images[1] || "", images[2] || ""]
      next[slotIndex] = String(data.url)
      onChangeImages(next.filter(Boolean))
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error al procesar la imagen.")
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleRemove = async (slotIndex: number) => {
    const targetUrl = images[slotIndex]
    if (!targetUrl) return

    setUploadError(null)
    if (targetUrl.startsWith("/api/images/")) {
      try {
        await fetch("/api/admin/upload", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        })
      } catch {
        // Si falla la limpieza en R2 no bloqueamos quitar la referencia del producto
      }
    }

    const next = images.filter((_, idx) => idx !== slotIndex)
    onChangeImages(next)
  }

  return (
    <div className="field">
      <span>Galería de Imágenes R2 (hasta 3 fotos)</span>
      {uploadError && (
        <div className="media-upload-error" role="alert">
          {uploadError}
        </div>
      )}
      <div className="media-slots-grid">
        {SLOTS.map((slot, idx) => {
          const url = images[idx] || ""
          const inputId = `product-img-slot-${idx}`
          const isBusy = uploadingSlot === idx

          return (
            <div key={slot.key} className="media-slot">
              <div className="media-slot-head">
                <strong>{slot.label}</strong>
                {!slot.required && <small>Opcional</small>}
              </div>

              <label htmlFor={inputId} className="media-slot-preview" title="Seleccionar imagen">
                {url ? (
                  <img src={url} alt={`${productName || "Producto"} - ${slot.key}`} />
                ) : (
                  <span>{isBusy ? "Subiendo..." : "+ Subir"}</span>
                )}
              </label>

              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={uploadingSlot !== null}
                style={{ display: "none" }}
                onChange={(e) => handleFileSelected(e, idx, slot.key)}
              />

              <div className="media-slot-actions">
                <label htmlFor={inputId} className="media-slot-btn">
                  {isBusy ? "Subiendo..." : url ? "Cambiar" : "Subir"}
                </label>
                {url && (
                  <button
                    type="button"
                    className="media-slot-remove"
                    onClick={() => handleRemove(idx)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
