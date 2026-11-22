import { useRef } from "react"
import Icon from "../../Icon"

interface ImportUploadStepProps {
  onFileSelected: (file: File) => void
  onDownloadExcel: () => void
  onDownloadCsv: () => void
}

export default function ImportUploadStep({
  onFileSelected,
  onDownloadExcel,
  onDownloadCsv,
}: ImportUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) onFileSelected(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div className="csv-step-stack">
      <p className="desc csv-step-desc">
        Carga tu catálogo completo de máquinas de corte, trimmers, planchadoras, repuestos y
        cuidado en lote. Admite libros <strong>Microsoft Excel (.xlsx, .xls)</strong> y archivos{" "}
        <strong>CSV (.csv)</strong>.
      </p>

      <div
        className="csv-dropzone"
        role="button"
        tabIndex={0}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.csv"
          className="csv-hidden-input"
        />
        <div className="csv-dropzone-icon">
          <Icon name="filter" />
        </div>
        <strong className="csv-dropzone-title">
          Arrastra tu archivo Excel (.xlsx) o CSV (.csv) aquí o haz clic para seleccionarlo
        </strong>
        <small className="csv-dropzone-hint">
          Formatos compatibles: Microsoft Excel (.xlsx) y valores separados por comas (.csv)
        </small>
      </div>

      <div className="csv-template-box">
        <div>
          <strong className="csv-template-title">
            ¿Necesitas la plantilla oficial preformateada?
          </strong>
          <span className="csv-template-sub">
            Incluye las columnas estándar (nombre, marca, modelo, categoria, precio, precio_anterior, stock, badge, imagen, descripcion).
          </span>
        </div>
        <div className="csv-template-actions">
          <button
            type="button"
            className="button button--primary csv-btn-compact"
            onClick={onDownloadExcel}
          >
            Descargar Excel (.xlsx)
          </button>
          <button
            type="button"
            className="csv-btn-outline"
            onClick={onDownloadCsv}
          >
            Descargar CSV (.csv)
          </button>
        </div>
      </div>
    </div>
  )
}
