# Shèkèrè Bead Pattern Editor

A browser-based design tool for creating and visualising bead net patterns for the **shèkèrè** — the Yoruba/West African gourd rattle used across traditions including Afro-Brazilian Maracatu.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

---

## Features

- **Bead canvas** — paint, erase, eyedropper, bucket-fill, and selection tools on a fully pannable/zoomable grid
- **Net types** — Single-Diagonal, Double-Diagonal, Intersection, and Decorative/Skip-Knot weave structures
- **Pattern presets** — 8 generative patterns including traditional diamond and Maracatu-inspired motifs (geometric, wave, spiral, chevron, and more)
- **Colour palettes** — Earth Tones, Ocean Blues, Vibrant Festival, and Colour-Blind Safe; full custom palette editor
- **3D gourd preview** — parametric gourd geometry (bulge power, neck taper, base ratio, curve smoothness) with bead net wrapped in real time
- **Material calculator** — estimates bead count per colour, total cord length, knot count, weight, and cost
- **Gourd size presets** — Small / Medium / Large Traditional Maracatu proportions, or fully custom dimensions
- **Image import** — import a reference image and map its colours to the bead grid
- **Local save / load** — project state persisted to localStorage; export as JSON
- **Undo / redo** history

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| State | Zustand (via custom editor store) |
| Icons | Lucide React |
| Canvas | HTML5 Canvas (custom renderer) |

---

## Getting Started

```bash
# Install dependencies (pnpm recommended)
pnpm install

# Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
app/                  Next.js App Router entry
components/
  shekere/            Core editor panels (TopBar, LeftPanel, RightPanel, BeadGrid)
  ui/                 shadcn/ui primitives
  bead-canvas.tsx     HTML5 canvas bead painter
  gourd-preview.tsx   3D parametric gourd renderer
  bottom-sheet.tsx    Mobile-friendly settings drawer
  net-picker-overlay.tsx   Net type selector
  image-import-dialog.tsx  Image → bead colour mapper
hooks/
  use-shekere-store.ts     Zustand store
lib/
  shekere-types.ts    All TypeScript types and constants
  gourd-geometry.ts   Parametric gourd profile maths
  material-calculator.ts   Bead/cord/cost estimation
  pattern-presets.ts  Generative pattern algorithms
  use-editor-store.ts Editor state + history
```

---

## Cultural Context

The shèkèrè is a beaded gourd rattle of Yoruba origin, integral to ceremonies and percussion ensembles across West Africa, Cuba, Brazil, and the Caribbean. In **Maracatu de Baque Virado** (Pernambuco, Brazil) it appears as the **xequerê**, played with a swinging and slapping technique that drives the cort cortejo procession.

This tool was built to support the physical construction of shèkèrè instruments, allowing makers to design bead patterns before stringing, estimate materials, and preview how a pattern wraps around a specific gourd shape.

---

## License

MIT
