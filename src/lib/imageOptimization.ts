export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  initialQuality?: number
  maxBytes?: number
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1000,
  maxHeight: 1000,
  initialQuality: 0.85,
  maxBytes: 1024 * 1024, // 1 MB máximo garantizado
}

/**
 * Convierte y comprime una imagen en el navegador usando HTML5 Canvas hacia WebP (o JPEG como fallback)
 * para reducir peso antes de subirla a Cloudflare R2.
 */
export async function optimizarImagenParaWebP(
  archivo: File,
  opciones?: ImageOptimizationOptions
): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return archivo
  }

  if (archivo.type === "image/svg+xml") {
    return archivo
  }

  const { maxWidth, maxHeight, initialQuality, maxBytes } = {
    ...DEFAULT_OPTIONS,
    ...opciones,
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(archivo)
    const img = new Image()

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)

      try {
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.max(1, Math.round(width * ratio))
          height = Math.max(1, Math.round(height * ratio))
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          throw new Error("No se pudo inicializar el lienzo gráfico para optimizar la imagen.")
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        const toBlob = (mime: string, quality: number): Promise<Blob | null> =>
          new Promise((res) => canvas.toBlob((b) => res(b), mime, quality))

        let mimeType = "image/webp"
        let extension = "webp"
        let blob = await toBlob(mimeType, initialQuality)

        if (!blob) {
          mimeType = "image/jpeg"
          extension = "jpg"
          blob = await toBlob(mimeType, initialQuality)
        }

        if (!blob) {
          throw new Error("No se pudo generar el archivo comprimido.")
        }

        if (blob.size > maxBytes) {
          for (const step of [0.75, 0.65, 0.55, 0.45]) {
            const smaller = await toBlob(mimeType, step)
            if (smaller) {
              blob = smaller
              if (blob.size <= maxBytes) break
            }
          }
        }

        const dotIdx = archivo.name.lastIndexOf(".")
        const baseName = dotIdx !== -1 ? archivo.name.slice(0, dotIdx) : archivo.name
        const optimized = new File([blob], `${baseName}.${extension}`, {
          type: mimeType,
          lastModified: Date.now(),
        })

        resolve(optimized)
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("No se pudo leer el archivo de imagen seleccionado."))
    }

    img.src = objectUrl
  })
}
