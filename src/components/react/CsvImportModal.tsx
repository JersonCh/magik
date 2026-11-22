import { useEffect, useState } from "react"
import type { BrandWithCount, Product, ResultadoImportacionCsv } from "@/types/domain"
import { downloadBlob, downloadCsv } from "@/lib/download"
import { generarPlantillaCsv, generarPlantillaExcel } from "@/lib/import/catalogExporter"
import {
  procesarBufferExcel,
  procesarContenidoCsv,
  type FilaCsvProcesada,
  type ResumenCsv,
} from "@/lib/import/productValidator"
import { AdminApiError, adminApi } from "@/services/adminApi"
import Icon from "./Icon"
import ImportPreviewStep, { type CsvFilterView } from "./admin/import/ImportPreviewStep"
import ImportResultStep from "./admin/import/ImportResultStep"
import ImportUploadStep from "./admin/import/ImportUploadStep"

interface CsvImportModalProps {
  isOpen: boolean
  productos: Product[]
  marcas: BrandWithCount[]
  onClose: () => void
  onSuccess: () => void
  onUnauthorized?: () => void
}

const INITIAL_RESUMEN: ResumenCsv = { total: 0, validos: 0, duplicados: 0, conErrores: 0 }

export default function CsvImportModal({
  isOpen,
  productos,
  marcas,
  onClose,
  onSuccess,
  onUnauthorized,
}: CsvImportModalProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [nombreArchivo, setNombreArchivo] = useState("")
  const [tamanoArchivo, setTamanoArchivo] = useState("")
  const [tipoArchivo, setTipoArchivo] = useState<"excel" | "csv">("excel")
  const [filas, setFilas] = useState<FilaCsvProcesada[]>([])
  const [resumen, setResumen] = useState<ResumenCsv>(INITIAL_RESUMEN)
  const [modoDuplicados, setModoDuplicados] = useState<"omitir" | "actualizar">("actualizar")
  const [filtroVista, setFiltroVista] = useState<CsvFilterView>("todos")
  const [importando, setImportando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoImportacionCsv | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setPaso(1)
      setNombreArchivo("")
      setTamanoArchivo("")
      setFilas([])
      setResumen(INITIAL_RESUMEN)
      setFiltroVista("todos")
      setErrorGlobal(null)
      setResultadoFinal(null)
      return
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importando) onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, importando, onClose])

  if (!isOpen) return null

  const procesarArchivo = (file: File) => {
    const ext = file.name.toLowerCase()
    const esExcel = ext.endsWith(".xlsx")
    const esCsv = ext.endsWith(".csv")

    if (ext.endsWith(".xls")) {
      setErrorGlobal("El formato antiguo .xls no está soportado; guarda el archivo como Excel (.xlsx) o CSV (.csv).")
      return
    }

    if (!esExcel && !esCsv) {
      setErrorGlobal("Por favor selecciona un archivo Excel (.xlsx) o CSV (.csv) válido.")
      return
    }

    setErrorGlobal(null)
    setNombreArchivo(file.name)
    setTamanoArchivo(`${(file.size / 1024).toFixed(1)} KB`)
    setTipoArchivo(esExcel ? "excel" : "csv")

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const result = esExcel
          ? await procesarBufferExcel(e.target?.result as ArrayBuffer, productos, marcas)
          : procesarContenidoCsv((e.target?.result as string) || "", productos, marcas)

        if (result.filas.length === 0) {
          setErrorGlobal("El archivo está vacío o las cabeceras no coinciden.")
          return
        }

        setFilas(result.filas)
        setResumen(result.resumen)
        setPaso(2)
      } catch (err: unknown) {
        setErrorGlobal(
          err instanceof Error ? err.message : "Error al procesar el archivo seleccionado."
        )
      }
    }
    reader.onerror = () => {
      setErrorGlobal("Error al leer el archivo desde el dispositivo.")
    }

    if (esExcel) reader.readAsArrayBuffer(file)
    else reader.readAsText(file, "UTF-8")
  }

  const handleConfirmImport = async () => {
    setImportando(true)
    setErrorGlobal(null)
    const filasAEnviar = filas.filter((f) => f.esValido)

    try {
      const resultado = await adminApi.importProducts(filasAEnviar, modoDuplicados)
      setResultadoFinal(resultado)
      setPaso(3)
    } catch (err: unknown) {
      if (err instanceof AdminApiError && err.isUnauthorized) {
        onUnauthorized?.()
        onClose()
        return
      }
      setErrorGlobal(err instanceof Error ? err.message : "Fallo en la conexión al importar lote.")
    } finally {
      setImportando(false)
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
  }

  return (
    <div
      className="admin-modal-backdrop"
      onClick={() => !importando && onClose()}
    >
      <div
        className="admin-modal-card csv-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csv-modal-head">
          <div>
            <p className="eyebrow">IMPORTACIÓN MASIVA · CATÁLOGO MAGIK</p>
            <h3 id="csv-import-title">
              {paso === 1 && "Importación Masiva de Catálogo (Excel / CSV)"}
              {paso === 2 &&
                `Vista Previa: ${nombreArchivo} (${tamanoArchivo}) · ${tipoArchivo.toUpperCase()}`}
              {paso === 3 && "Resultado de la Importación"}
            </h3>
          </div>
          <button
            type="button"
            className="csv-modal-close"
            onClick={onClose}
            disabled={importando}
            aria-label="Cerrar modal"
          >
            <Icon name="close" />
          </button>
        </div>

        {errorGlobal && (
          <div className="csv-error-banner" role="alert">
            {errorGlobal}
          </div>
        )}

        {paso === 1 && (
          <ImportUploadStep
            onFileSelected={procesarArchivo}
            onDownloadExcel={async () => {
              downloadBlob(await generarPlantillaExcel(), "plantilla_catalogo_magik.xlsx")
            }}
            onDownloadCsv={() =>
              downloadCsv(generarPlantillaCsv(), "plantilla_catalogo_magik.csv")
            }
          />
        )}

        {paso === 2 && (
          <ImportPreviewStep
            filas={filas}
            resumen={resumen}
            modoDuplicados={modoDuplicados}
            filtroVista={filtroVista}
            importando={importando}
            onChangeModoDuplicados={setModoDuplicados}
            onChangeFiltroVista={setFiltroVista}
            onChangeFile={() => setPaso(1)}
            onCancel={onClose}
            onConfirm={handleConfirmImport}
          />
        )}

        {paso === 3 && resultadoFinal && (
          <ImportResultStep resultado={resultadoFinal} onFinish={handleFinish} />
        )}
      </div>
    </div>
  )
}
