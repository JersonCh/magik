/**
 * Detecta si el delimitador más probable es coma (,), punto y coma (;) o tabulación (\t),
 * analizando la primera fila lógica sin contar separadores dentro de comillas.
 */
export function detectarDelimitador(texto: string): string {
  const limpio = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  let inQuotes = false
  let comas = 0
  let puntoYComas = 0
  let tabs = 0

  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i]
    if (ch === '"') {
      if (inQuotes && limpio[i + 1] === '"') {
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (!inQuotes) {
      if (ch === "\n" || ch === "\r") break
      if (ch === ",") comas++
      else if (ch === ";") puntoYComas++
      else if (ch === "\t") tabs++
    }
  }

  if (puntoYComas > comas && puntoYComas > tabs) return ";"
  if (tabs > comas && tabs > puntoYComas) return "\t"
  return ","
}

/**
 * Parser CSV conforme a RFC 4180: soporta campos multilínea entre comillas,
 * comillas escapadas ("") y delimitadores variables (, ; \t).
 */
export function parsearLineasCsv(texto: string, delimitador?: string): string[][] {
  const limpio = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  if (!limpio.trim()) return []

  const delim = delimitador || detectarDelimitador(limpio)
  const filas: string[][] = []
  let filaActual: string[] = []
  let campoActual = ""
  let dentroDeComillas = false

  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i]
    const next = limpio[i + 1]

    if (ch === '"') {
      if (dentroDeComillas && next === '"') {
        campoActual += '"'
        i++
      } else {
        dentroDeComillas = !dentroDeComillas
      }
    } else if (ch === delim && !dentroDeComillas) {
      filaActual.push(campoActual.trim())
      campoActual = ""
    } else if ((ch === "\r" || ch === "\n") && !dentroDeComillas) {
      if (ch === "\r" && next === "\n") i++
      filaActual.push(campoActual.trim())
      if (filaActual.some((v) => v.length > 0)) {
        filas.push(filaActual)
      }
      filaActual = []
      campoActual = ""
    } else {
      campoActual += ch
    }
  }

  filaActual.push(campoActual.trim())
  if (filaActual.some((v) => v.length > 0)) {
    filas.push(filaActual)
  }

  return filas
}
