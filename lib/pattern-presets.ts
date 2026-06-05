import type { PatternPreset } from "./shekere-types"

function createEmptyGrid(rows: number, cols: number): (string | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
}

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "diamond-net",
    name: "Diamond Net",
    description: "Traditional shekere diamond netting pattern with alternating offset rows",
    category: "traditional",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const c1 = palette[0] || "#C75B39"
      const c2 = palette[1] || "#D4A574"
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offset = r % 2 === 0 ? 0 : 1
          if ((c + offset) % 2 === 0) {
            grid[r][c] = c1
          } else {
            grid[r][c] = c2
          }
        }
      }
      return grid
    },
  },
  {
    id: "alternating-diamond",
    name: "Alternating Diamond",
    description: "Diamond pattern with color blocks that shift every 4 rows",
    category: "traditional",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const c1 = palette[0] || "#C75B39"
      const c2 = palette[1] || "#D4A574"
      const c3 = palette[2] || "#5C3A21"
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const block = Math.floor(r / 4) % 2
          const offset = r % 2 === 0 ? 0 : 1
          if ((c + offset) % 2 === 0) {
            grid[r][c] = block === 0 ? c1 : c3
          } else {
            grid[r][c] = c2
          }
        }
      }
      return grid
    },
  },
  {
    id: "concentric-diamond",
    name: "Concentric Diamond Motif",
    description: "Nested diamond shapes radiating from center, great for focal-point netting",
    category: "traditional",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const c1 = palette[0] || "#C75B39"
      const c2 = palette[1] || "#D4A574"
      const c3 = palette[2] || "#5C3A21"
      const cx = Math.floor(cols / 2)
      const cy = Math.floor(rows / 2)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dist = Math.abs(r - cy) + Math.abs(c - cx)
          const ring = Math.floor(dist / 3) % 3
          grid[r][c] = ring === 0 ? c1 : ring === 1 ? c2 : c3
        }
      }
      return grid
    },
  },
  {
    id: "checkerboard",
    name: "Checkerboard",
    description: "Classic alternating pixel-art checkerboard pattern",
    category: "modern",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const c1 = palette[0] || "#1A1A1A"
      const c2 = palette[4] || "#FFFFFF"
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid[r][c] = (r + c) % 2 === 0 ? c1 : c2
        }
      }
      return grid
    },
  },
  {
    id: "stripes",
    name: "Horizontal Stripes",
    description: "Horizontal color bands that wrap around the gourd",
    category: "modern",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const colors = palette.slice(0, 4)
      if (colors.length === 0) colors.push("#C75B39")
      for (let r = 0; r < rows; r++) {
        const ci = Math.floor(r / 2) % colors.length
        for (let c = 0; c < cols; c++) {
          grid[r][c] = colors[ci]
        }
      }
      return grid
    },
  },
  {
    id: "gradient-bands",
    name: "Gradient Bands",
    description: "Smooth gradient transitions between palette colors",
    category: "modern",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const colors = palette.length >= 2 ? palette : ["#C75B39", "#D4A574", "#5C3A21"]
      for (let r = 0; r < rows; r++) {
        const t = r / Math.max(rows - 1, 1)
        const ci = Math.floor(t * (colors.length - 1))
        const color = colors[Math.min(ci, colors.length - 1)]
        for (let c = 0; c < cols; c++) {
          grid[r][c] = color
        }
      }
      return grid
    },
  },
  {
    id: "radial-star",
    name: "Radial Star",
    description: "Star motif translated to rectangular net with wrap seam indicator",
    category: "traditional",
    generator: (rows, cols, palette) => {
      const grid = createEmptyGrid(rows, cols)
      const c1 = palette[0] || "#FFD700"
      const c2 = palette[1] || "#D4A574"
      const c3 = palette[2] || "#5C3A21"
      const cx = Math.floor(cols / 2)
      const cy = Math.floor(rows / 2)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = c - cx
          const dy = r - cy
          const angle = Math.atan2(dy, dx)
          const dist = Math.sqrt(dx * dx + dy * dy)
          const points = 6
          const ray = Math.cos(points * angle) * dist
          if (ray > 2) {
            grid[r][c] = c1
          } else if (dist < Math.min(rows, cols) * 0.35) {
            grid[r][c] = c2
          } else {
            grid[r][c] = c3
          }
        }
      }
      return grid
    },
  },
]
