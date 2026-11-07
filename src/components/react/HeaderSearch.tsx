import { useState, useRef, useEffect } from "react"
import { products } from "../../data/products"
import Icon from "./Icon"

export default function HeaderSearch() {
  const [search, setSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const matches = search.trim()
    ? products
        .filter((p) =>
          `${p.name} ${p.model} ${p.brand}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .slice(0, 4)
    : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="search-wrap" ref={wrapRef}>
      <Icon name="search" />
      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setShowSuggestions(true)
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Busca por nombre, modelo o marca"
        aria-label="Buscar productos"
      />
      {showSuggestions && search && (
        <div className="suggestions">
          <strong>Sugerencias</strong>
          {matches.length > 0 ? (
            matches.map((item) => (
              <a
                key={item.id}
                href={`/producto/${item.id}`}
                onClick={() => setShowSuggestions(false)}
              >
                {item.name}
                <span>
                  {item.brand} · {item.model}
                </span>
              </a>
            ))
          ) : (
            <p style={{ padding: "8px 10px", margin: 0, fontSize: "12px", color: "var(--muted)" }}>
              No encontramos resultados.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

