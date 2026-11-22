import * as XLSX from "xlsx"
import type { Product, BrandWithCount } from "../types/domain"

export interface FilaCsvProcesada {
  filaNumero: number
  nombre: string
  marca: string
  modelo: string
  categoria: string
  precio: number
  precioAnterior?: number
  stock: boolean
  badge?: string
  imagen?: string
  descripcion?: string

  // Estado de validación
  esValido: boolean
  esDuplicado: boolean
  idProductoExistente?: number
  marcaEsNueva: boolean
  errores: string[]
  advertencias: string[]
}

export interface ResumenCsv {
  total: number
  validos: number
  duplicados: number
  conErrores: number
}

/**
 * Detecta si el delimitador más probable es coma (,), punto y coma (;) o tabulación (\t).
 */
export function detectarDelimitador(texto: string): string {
  const primeraLinea = texto.split(/\r?\n/)[0] || ""
  const comas = (primeraLinea.match(/,/g) || []).length
  const puntoYComas = (primeraLinea.match(/;/g) || []).length
  const tabs = (primeraLinea.match(/\t/g) || []).length

  if (puntoYComas > comas && puntoYComas > tabs) return ";"
  if (tabs > comas && tabs > puntoYComas) return "\t"
  return ","
}

/**
 * Parser de CSV nativo compatible con comillas escapadas (""), saltos de línea y delimitadores variables.
 */
export function parsearLineasCsv(texto: string, delimitador?: string): string[][] {
  const delim = delimitador || detectarDelimitador(texto)
  const lineas: string[][] = []
  const limpio = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  const filasRaw = limpio.split(/\r?\n/).filter((l) => l.trim().length > 0)

  for (const fila of filasRaw) {
    const valores: string[] = []
    let dentroDeComillas = false
    let valorActual = ""

    for (let i = 0; i < fila.length; i++) {
      const char = fila[i]
      const siguienteChar = fila[i + 1]

      if (char === '"') {
        if (dentroDeComillas && siguienteChar === '"') {
          valorActual += '"'
          i++
        } else {
          dentroDeComillas = !dentroDeComillas
        }
      } else if (char === delim && !dentroDeComillas) {
        valores.push(valorActual.trim())
        valorActual = ""
      } else {
        valorActual += char
      }
    }
    valores.push(valorActual.trim())

    if (valores.some((v) => v.length > 0)) {
      lineas.push(valores)
    }
  }

  return lineas
}

/**
 * Lee y convierte un ArrayBuffer de un archivo Excel (.xlsx o .xls) a una matriz de celdas de texto.
 */
export function parsearArchivoExcel(buffer: ArrayBuffer): string[][] {
  const data = new Uint8Array(buffer)
  const wb = XLSX.read(data, { type: "array" })
  if (!wb.SheetNames.length) return []

  // Seleccionar la primera hoja que contenga registros
  let sheetName = wb.SheetNames.find((name) => {
    const lower = name.toLowerCase()
    return (
      (lower.includes("producto") || lower.includes("catalogo") || lower.includes("catálogo") || lower.includes("magik")) &&
      !lower.includes("guia") &&
      !lower.includes("instruccion")
    )
  })

  if (!sheetName) {
    sheetName = wb.SheetNames[0]
  }

  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
  return rows.map((row) =>
    Array.isArray(row)
      ? row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""))
      : []
  )
}

/**
 * Función núcleo que procesa cualquier matriz de celdas (provenga de Excel .xlsx o CSV plano),
 * validando reglas de negocio, detectando duplicados y asignando marcas.
 */
export function procesarMatrizFilas(
  matriz: string[][],
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
): {
  filas: FilaCsvProcesada[]
  resumen: ResumenCsv
} {
  const filasNoVacias = matriz.filter((fila) => fila.some((celda) => celda && String(celda).trim().length > 0))

  if (filasNoVacias.length < 2) {
    return {
      filas: [],
      resumen: { total: 0, validos: 0, duplicados: 0, conErrores: 0 },
    }
  }

  // 1. Mapear encabezados dinámicamente
  const cabeceras = filasNoVacias[0].map((h) =>
    String(h)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .trim()
  )

  const idxNombre = cabeceras.findIndex((c) => c.includes("nombre") || c.includes("producto") || c === "item")
  const idxMarca = cabeceras.findIndex((c) => c.includes("marca") || c.includes("brand"))
  const idxModelo = cabeceras.findIndex((c) => c.includes("modelo") || c.includes("subtitulo") || c === "ref")
  const idxCategoria = cabeceras.findIndex((c) => c.includes("categoria") || c.includes("tipo"))
  const idxPrecio = cabeceras.findIndex((c) => c === "precio" || c.includes("precio_venta") || c.includes("precio_actual"))
  const idxPrecioAnt = cabeceras.findIndex((c) => c.includes("precio_anterior") || c.includes("old") || c.includes("oferta"))
  const idxStock = cabeceras.findIndex((c) => c.includes("stock") || c.includes("disponib"))
  const idxBadge = cabeceras.findIndex((c) => c.includes("badge") || c.includes("distintivo") || c.includes("etiqueta"))
  const idxImagen = cabeceras.findIndex((c) => c.includes("imagen") || c.includes("foto") || c.includes("url"))
  const idxDesc = cabeceras.findIndex((c) => c.includes("descrip") || c.includes("detalle"))

  // Mapa de productos existentes para detección de duplicados (marca + nombre)
  const mapaProductosExistentes = new Map<string, number>()
  for (const p of productosActuales) {
    const clave = `${p.brand.trim().toUpperCase()}|${p.name.trim().toLowerCase()}`
    mapaProductosExistentes.set(clave, p.id)
  }

  const marcasRegistradasUpper = new Set(
    marcasActuales.map((m) => m.nombre.trim().toUpperCase())
  )

  const filasResultado: FilaCsvProcesada[] = []

  for (let i = 1; i < filasNoVacias.length; i++) {
    const col = filasNoVacias[i]
    const filaNumero = i + 1
    const errores: string[] = []
    const advertencias: string[] = []

    const nombre = idxNombre >= 0 ? col[idxNombre]?.trim() || "" : ""
    const marcaRaw = idxMarca >= 0 ? col[idxMarca]?.trim() || "" : ""
    const marca = marcaRaw.toUpperCase()
    const modelo = idxModelo >= 0 ? col[idxModelo]?.trim() || nombre : nombre
    const categoria = idxCategoria >= 0 ? col[idxCategoria]?.trim() || "Cortadoras" : "Cortadoras"
    const precioStr = idxPrecio >= 0 ? String(col[idxPrecio] || "").replace(/[^0-9.]/g, "").trim() || "0" : "0"
    const precio = parseFloat(precioStr)

    const precioAntStr = idxPrecioAnt >= 0 ? String(col[idxPrecioAnt] || "").replace(/[^0-9.]/g, "").trim() || "" : ""
    const precioAnterior = precioAntStr ? parseFloat(precioAntStr) : undefined

    const stockStr = (idxStock >= 0 ? String(col[idxStock] || "").trim().toLowerCase() || "1" : "1")
    const stock = !["0", "false", "no", "agotado", "sin stock"].includes(stockStr)

    const badge = idxBadge >= 0 ? col[idxBadge]?.trim() || undefined : undefined
    const imagen = idxImagen >= 0 ? col[idxImagen]?.trim() || "/assets/a0f2f.png" : "/assets/a0f2f.png"
    const descripcion = idxDesc >= 0 ? col[idxDesc]?.trim() || undefined : undefined

    // Validaciones
    if (!nombre) errores.push("El nombre del producto es obligatorio.")
    if (!marca) errores.push("La marca es obligatoria.")
    if (isNaN(precio) || precio <= 0) errores.push("El precio debe ser un número mayor a 0.")

    // Detección de marca nueva
    const marcaEsNueva = Boolean(marca && !marcasRegistradasUpper.has(marca))
    if (marcaEsNueva) {
      advertencias.push(`La marca "${marca}" no está registrada; se creará automáticamente.`)
    }

    // Detección de duplicado
    const claveDuplicado = `${marca}|${nombre.toLowerCase()}`
    const idExistente = mapaProductosExistentes.get(claveDuplicado)
    const esDuplicado = idExistente !== undefined

    if (esDuplicado) {
      advertencias.push(`Ya existe en el catálogo oficial (ID #${idExistente}).`)
    }

    const esValido = errores.length === 0

    filasResultado.push({
      filaNumero,
      nombre,
      marca,
      modelo,
      categoria,
      precio: isNaN(precio) ? 0 : precio,
      precioAnterior: isNaN(Number(precioAnterior)) ? undefined : precioAnterior,
      stock,
      badge: badge || undefined,
      imagen: imagen || "/assets/a0f2f.png",
      descripcion,
      esValido,
      esDuplicado,
      idProductoExistente: idExistente,
      marcaEsNueva,
      errores,
      advertencias,
    })
  }

  const resumen: ResumenCsv = {
    total: filasResultado.length,
    validos: filasResultado.filter((f) => f.esValido).length,
    duplicados: filasResultado.filter((f) => f.esDuplicado).length,
    conErrores: filasResultado.filter((f) => !f.esValido).length,
  }

  return { filas: filasResultado, resumen }
}

/**
 * Procesa un archivo Excel (.xlsx o .xls) desde su buffer binario.
 */
export function procesarBufferExcel(
  buffer: ArrayBuffer,
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
) {
  const matriz = parsearArchivoExcel(buffer)
  return procesarMatrizFilas(matriz, productosActuales, marcasActuales)
}

/**
 * Procesa un archivo CSV plano en texto.
 */
export function procesarContenidoCsv(
  contenido: string,
  productosActuales: Product[],
  marcasActuales: BrandWithCount[]
) {
  const delimitador = detectarDelimitador(contenido)
  const matriz = parsearLineasCsv(contenido, delimitador)
  return procesarMatrizFilas(matriz, productosActuales, marcasActuales)
}

/**
 * Genera un archivo Excel (.xlsx) de plantilla con productos de ejemplo para barbería.
 */
export function generarPlantillaExcel(): Uint8Array {
  const datos = [
    ["nombre", "marca", "modelo", "categoria", "precio", "precio_anterior", "stock", "badge", "imagen", "descripcion"],
    ["Cortadora Saber II", "STYLECRAFT", "Saber II", "Cortadoras", 950, 1100, 1, "Destacado", "/assets/a0f2f.png", "Motor magnético silencioso de 7200 RPM con cuchilla DLC"],
    ["Trimmer Ghost", "JRL", "2020T Ghost", "Trimmers", 680, 750, 1, "Oferta", "/assets/311b5.png", "Cuchilla en T ultra afilada con autonomía de 2 horas"],
    ["Afeitadora Prodigy", "STYLECRAFT", "Prodigy Foil", "Shaver", 420, "", 1, "Nuevo", "/assets/a0f2f.png", "Láminas de titanio dorado hipoalergénicas para afeitado al ras"],
    ["Polvo de textura mate", "VASSO", "35 g", "Cuidado", 25, 30, 1, "Oferta", "/assets/2031c.png", "Fijación y volumen instantáneo acabado mate sin residuos"],
    ["Combo Gold FX", "BABYLISS", "Clipper + Trimmer", "Combos", 1450, 1650, 1, "Combo", "/assets/a0f2f.png", "Edición especial dorada de alto torque para salón"],
  ]

  const ws = XLSX.utils.aoa_to_sheet(datos)
  // Ancho de columnas
  ws["!cols"] = [
    { wch: 25 }, // nombre
    { wch: 15 }, // marca
    { wch: 18 }, // modelo
    { wch: 14 }, // categoria
    { wch: 10 }, // precio
    { wch: 15 }, // precio_anterior
    { wch: 8 },  // stock
    { wch: 12 }, // badge
    { wch: 20 }, // imagen
    { wch: 45 }, // descripcion
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Catálogo Magik")
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Uint8Array(buffer)
}

/**
 * Genera el texto CSV de la plantilla de ejemplo.
 */
export function generarPlantillaCsv(): string {
  const lineas = [
    "nombre,marca,modelo,categoria,precio,precio_anterior,stock,badge,imagen,descripcion",
    'Cortadora Saber II,STYLECRAFT,Saber II,Cortadoras,950,1100,1,Destacado,/assets/a0f2f.png,"Motor magnético silencioso de 7200 RPM con cuchilla DLC"',
    'Trimmer Ghost,JRL,2020T Ghost,Trimmers,680,750,1,Oferta,/assets/311b5.png,"Cuchilla en T ultra afilada con autonomía de 2 horas"',
    'Afeitadora Prodigy,STYLECRAFT,Prodigy Foil,Shaver,420,,1,Nuevo,/assets/a0f2f.png,"Láminas de titanio dorado hipoalergénicas para afeitado al ras"',
    'Polvo de textura mate,VASSO,35 g,Cuidado,25,30,1,Oferta,/assets/2031c.png,"Fijación y volumen instantáneo acabado mate sin residuos"',
    'Combo Gold FX,BABYLISS,Clipper + Trimmer,Combos,1450,1650,1,Combo,/assets/a0f2f.png,"Edición especial dorada de alto torque para uso en salón"',
  ]
  return "\uFEFF" + lineas.join("\r\n")
}

/**
 * Exporta el catálogo actual a un libro Excel (.xlsx).
 */
export function exportarCatalogoExcel(productos: Product[]): Uint8Array {
  const encabezados = ["id", "nombre", "marca", "modelo", "categoria", "precio", "precio_anterior", "stock", "badge", "imagen"]
  const filas = productos.map((p) => [
    p.id,
    p.name,
    p.brand,
    p.model,
    p.category,
    p.price,
    p.oldPrice || "",
    p.stock ? 1 : 0,
    p.badge || "",
    p.image || "",
  ])

  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas])
  ws["!cols"] = [
    { wch: 8 },  // id
    { wch: 25 }, // nombre
    { wch: 15 }, // marca
    { wch: 18 }, // modelo
    { wch: 14 }, // categoria
    { wch: 10 }, // precio
    { wch: 15 }, // precio_anterior
    { wch: 8 },  // stock
    { wch: 12 }, // badge
    { wch: 22 }, // imagen
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Productos")
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Uint8Array(buffer)
}

/**
 * Exporta el catálogo actual de productos a un archivo CSV descargable.
 */
export function exportarCatalogoCsv(productos: Product[]): string {
  const cabeceras = "id,nombre,marca,modelo,categoria,precio,precio_anterior,stock,badge,imagen"
  const filas = productos.map((p) => {
    const esc = (txt: string | number | undefined | boolean) => {
      if (txt === undefined || txt === null) return ""
      const str = String(txt).replace(/"/g, '""')
      return `"${str}"`
    }
    return [
      p.id,
      esc(p.name),
      esc(p.brand),
      esc(p.model),
      esc(p.category),
      p.price,
      p.oldPrice || "",
      p.stock ? 1 : 0,
      esc(p.badge || ""),
      esc(p.image || ""),
    ].join(",")
  })

  return "\uFEFF" + [cabeceras, ...filas].join("\r\n")
}
