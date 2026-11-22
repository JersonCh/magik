import type { CategoryItem } from "@/types/domain"

interface CategoryOptionsProps {
  categories: CategoryItem[]
}

const FALLBACK_CATEGORIES = [
  "Cortadoras",
  "Trimmers",
  "Shavers",
  "Secadoras",
  "Planchadoras",
  "Rizadoras",
  "Pulidores de uñas",
  "Secadoras de uñas",
  "Repuestos",
  "Accesorios",
  "Masajeadores",
  "Cuidado",
]

export default function CategoryOptions({ categories }: CategoryOptionsProps) {
  if (categories.length === 0) {
    return (
      <>
        {FALLBACK_CATEGORIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </>
    )
  }

  const grouped = new Map<string, CategoryItem[]>()
  for (const cat of categories) {
    const groupName = cat.parentName || "Catálogo"
    const list = grouped.get(groupName)
    if (list) list.push(cat)
    else grouped.set(groupName, [cat])
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([groupName, items]) => (
        <optgroup key={groupName} label={groupName}>
          {items.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  )
}
