import type { ResultadoImportacionCsv } from "@/types/domain"
import Icon from "../../Icon"

interface ImportResultStepProps {
  resultado: ResultadoImportacionCsv
  onFinish: () => void
}

export default function ImportResultStep({
  resultado,
  onFinish,
}: ImportResultStepProps) {
  return (
    <div className="csv-result-root">
      <div className="csv-result-icon">
        <Icon name="check" />
      </div>

      <div>
        <h4>¡Catálogo actualizado correctamente!</h4>
        <p>El procesamiento por lotes se ejecutó con éxito en la base de datos.</p>
      </div>

      <div className="csv-result-grid">
        <div className="csv-result-card csv-metric--ok">
          <span>CREADOS</span>
          <b>{resultado.creados}</b>
          <small>Nuevos registros</small>
        </div>
        <div className="csv-result-card csv-metric--warn">
          <span>ACTUALIZADOS</span>
          <b>{resultado.actualizados}</b>
          <small>Precios y stock sincronizados</small>
        </div>
        <div className="csv-result-card csv-metric">
          <span>OMITIDOS</span>
          <b>{resultado.omitidos}</b>
          <small>Duplicados o filas con error</small>
        </div>
      </div>

      {resultado.errores.length > 0 && (
        <div className="csv-result-errors">
          <strong>Advertencias encontradas:</strong>
          <ul>
            {resultado.errores.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="button button--primary csv-result-finish"
        onClick={onFinish}
      >
        Cerrar y ver catálogo actualizado
      </button>
    </div>
  )
}
