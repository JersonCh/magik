# Magik Barber Supply - Astro 5 + React 19 Architecture

Proyecto migrado desde Figma Make a **Astro 5** en modo híbrido/SSR con **React 19**, preservando el 100% de la fidelidad visual, tokens y microinteracciones del diseño original.

## Pila Tecnológica

- **Framework**: Astro 5 (`astro@^5.18.2`) en modo híbrido/SSR
- **Interactividad**: React 19 (`react@^19.0.0`, `@astrojs/react@^4.4.2`) mediante Arquitectura de Islas
- **Estado de Islas**: Nano Stores (`nanostores`, `@nanostores/react`) para reactividad ligera entre Astro y React
- **Estilos**: Tailwind CSS v4 (`@tailwindcss/vite`) + Sistema modular de CSS tokens (`src/styles/tokens.css`)
- **Despliegue Cloudflare**: `@astrojs/cloudflare` con `nodejs_compat` en `wrangler.jsonc` y alias condicional de React 19

## Arquitectura del Proyecto

```
src/
├── components/
│   ├── astro/                   # Componentes nativos Astro (0 KB JavaScript)
│   │   ├── BrandsStrip.astro
│   │   ├── CategoryCard.astro
│   │   ├── FloatingWhatsApp.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── HowToBuy.astro
│   │   ├── ProductCard.astro
│   │   ├── PromoStrip.astro
│   │   └── TrustStrip.astro
│   └── react/                   # Islas reactivas (React 19)
│       ├── AddToCartButton.tsx
│       ├── AdminDashboard.tsx
│       ├── BrandDirectory.tsx
│       ├── CartDrawer.tsx
│       ├── CartOrderSummary.tsx
│       ├── CartTrigger.tsx
│       ├── CatalogFilters.tsx
│       ├── CategoryDirectory.tsx
│       ├── HeaderSearch.tsx
│       ├── Icon.tsx
│       ├── MobileNav.tsx
│       └── ProductDetailInteractive.tsx
├── data/                        # Datos y modelos de productos
│   └── products.ts
├── layouts/                     # Layout maestro
│   └── Layout.astro
├── pages/                       # Enrutamiento basado en archivos
│   ├── admin.astro              # /admin - Panel administrativo
│   ├── catalogo.astro           # /catalogo - Catálogo con filtros reactivos
│   ├── categorias.astro         # /categorias - Directorio de categorías
│   ├── contacto.astro           # /contacto - Información y WhatsApp
│   ├── index.astro              # / - Inicio (Hero, Destacados, Ofertas)
│   ├── marcas.astro             # /marcas - Directorio de marcas
│   ├── pedido.astro             # /pedido - Checkout y envío WhatsApp
│   └── producto/
│       └── [id].astro           # /producto/:id - Ficha de producto
├── stores/                      # Store reactivo global
│   └── cart.ts
└── styles/                      # Tokens y hojas de estilo modulares
    ├── base.css
    ├── components.css
    ├── drawer.css
    ├── global.css
    ├── header.css
    ├── pages.css
    ├── responsive.css
    └── tokens.css
```

## Comandos

- `npm run dev` - Inicia el servidor de desarrollo de Astro
- `npm run build` - Compila la aplicación para producción / Cloudflare
- `npm run preview` - Vista previa del build local

## Preparación Cloudflare Workers / Pages

- **Alias condicional**: Configurado en `astro.config.mjs` para evitar `MessageChannel is not defined` con React 19 en Cloudflare Workers:
  `'react-dom/server': 'react-dom/server.edge'` (activo durante el build de producción).
- **Compatibilidad**: `compatibility_flags = ["nodejs_compat"]` en `wrangler.jsonc` y `wrangler.toml`.
- **Agnóstico de plataforma**: Sin binarios específicos de SO.
