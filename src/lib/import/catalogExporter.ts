import type { Product } from "@/types/domain"
import { writeSpreadsheetMatrix } from "./spreadsheetAdapter"

const TEMPLATE_HEADERS = [
  "nombre",
  "marca",
  "modelo",
  "categoria",
  "precio",
  "precio_anterior",
  "stock",
  "badge",
  "imagen",
  "descripcion",
]

const TEMPLATE_SAMPLE_ROWS: Array<Array<string | number>> = [
  [
    "Cortadora Saber II",
    "STYLECRAFT",
    "Saber II",
    "Cortadoras",
    950,
    1100,
    1,
    "Destacado",
    "/assets/a0f2f.png",
    "Motor magnético silencioso de 7,200 RPM con cuchilla DLC",
  ],
  [
    "Trimmer Saber",
    "STYLECRAFT",
    "Saber",
    "Trimmers",
    720,
    "",
    1,
    "Nuevo",
    "/assets/7e195.png",
    "Cuchilla en T expuesta 360 grados para contornos precisos",
  ],
  [
    "Shaver profesional",
    "STYLECRAFT",
    "Foil",
    "Shavers",
    410,
    "",
    1,
    "Nuevo",
    "/assets/16698.png",
    "Doble lámina de titanio dorado hipoalergénica para afeitado al ras",
  ],
  [
    "Polvo de textura mate",
    "VASSO",
    "35 g",
    "Cuidado",
    25,
    30,
    1,
    "Oferta",
    "/assets/2031c.png",
    "Fijación y volumen instantáneo acabado mate sin residuos",
  ],
  [
    "Plancha profesional",
    "JRL",
    "Ceramic",
    "Planchadoras",
    280,
    "",
    1,
    "",
    "/assets/c25e4.png",
    "Placas cerámicas flotantes de calentamiento rápido",
  ],
]

const TEMPLATE_COL_WIDTHS = [25, 15, 18, 16, 10, 15, 8, 12, 22, 48]

const EXPORT_HEADERS = [
  "id",
  "nombre",
  "marca",
  "modelo",
  "categoria",
  "precio",
  "precio_anterior",
  "stock",
  "badge",
  "imagen",
]

const EXPORT_COL_WIDTHS = [8, 25, 15, 18, 16, 10, 15, 8, 12, 24]

function escapeCsvCell(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return ""
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function matrixToCsv(matrix: Array<Array<string | number | boolean | undefined>>): string {
  const lines = matrix.map((row) => row.map(escapeCsvCell).join(","))
  return "\uFEFF" + lines.join("\r\n")
}

export async function generarPlantillaExcel(): Promise<Blob> {
  return writeSpreadsheetMatrix("Catálogo Magik", [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS], TEMPLATE_COL_WIDTHS)
}

export function generarPlantillaCsv(): string {
  return matrixToCsv([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS])
}

export async function exportarCatalogoExcel(productos: Product[]): Promise<Blob> {
  const rows: Array<Array<string | number>> = productos.map((p) => [
    p.id,
    p.name,
    p.brand,
    p.model,
    p.category,
    p.price,
    p.oldPrice ?? "",
    p.stock ? 1 : 0,
    p.badge || "",
    p.image || "",
  ])

  return writeSpreadsheetMatrix("Productos", [EXPORT_HEADERS, ...rows], EXPORT_COL_WIDTHS)
}

export function exportarCatalogoCsv(productos: Product[]): string {
  const rows = productos.map((p) => [
    p.id,
    p.name,
    p.brand,
    p.model,
    p.category,
    p.price,
    p.oldPrice ?? "",
    p.stock ? 1 : 0,
    p.badge || "",
    p.image || "",
  ])

  return matrixToCsv([EXPORT_HEADERS, ...rows])
}
