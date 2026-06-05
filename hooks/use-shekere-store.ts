"use client"

import { useState, useCallback, useRef } from "react"
import type {
  ProjectState,
  GridState,
  HistoryEntry,
  ToolMode,
  ViewMode,
  MaterialSettings,
  Palette,
} from "@/lib/shekere-types"
import { DEFAULT_PALETTES } from "@/lib/shekere-types"

function createEmptyGrid(rows: number, cols: number): GridState {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => null)),
  }
}

const DEFAULT_MATERIAL_SETTINGS: MaterialSettings = {
  beadSizeMm: 6,
  spacingPreset: "standard",
  gourdCircumferenceMm: 450,
  knotAllowanceMm: 3,
  beadHoleFactor: 1.0,
  safetyMarginPercent: 10,
  pricePerBead: 0.05,
  pricePerMeterCord: 1.5,
}

function createInitialState(): ProjectState {
  return {
    name: "Untitled Pattern",
    grid: createEmptyGrid(16, 16),
    palette: { ...DEFAULT_PALETTES[0] },
    materialSettings: { ...DEFAULT_MATERIAL_SETTINGS },
    activeColor: DEFAULT_PALETTES[0].colors[0].hex,
    toolMode: "paint",
    viewMode: "bead",
    zoom: 1,
    panX: 0,
    panY: 0,
    author: "",
    notes: "",
  }
}

const MAX_HISTORY = 100

export function useShekereStore() {
  const [state, setState] = useState<ProjectState>(createInitialState)
  const historyRef = useRef<HistoryEntry[]>([])
  const futureRef = useRef<HistoryEntry[]>([])

  const pushHistory = useCallback((grid: GridState) => {
    historyRef.current.push({ grid: JSON.parse(JSON.stringify(grid)), timestamp: Date.now() })
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift()
    }
    futureRef.current = []
  }, [])

  const setCell = useCallback(
    (row: number, col: number, color: string | null) => {
      setState((prev) => {
        if (row < 0 || row >= prev.grid.rows || col < 0 || col >= prev.grid.cols) return prev
        if (prev.grid.cells[row][col] === color) return prev
        pushHistory(prev.grid)
        const newCells = prev.grid.cells.map((r) => [...r])
        newCells[row][col] = color
        return { ...prev, grid: { ...prev.grid, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const setCellBatch = useCallback(
    (changes: { row: number; col: number; color: string | null }[]) => {
      setState((prev) => {
        pushHistory(prev.grid)
        const newCells = prev.grid.cells.map((r) => [...r])
        for (const { row, col, color } of changes) {
          if (row >= 0 && row < prev.grid.rows && col >= 0 && col < prev.grid.cols) {
            newCells[row][col] = color
          }
        }
        return { ...prev, grid: { ...prev.grid, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const undo = useCallback(() => {
    setState((prev) => {
      const entry = historyRef.current.pop()
      if (!entry) return prev
      futureRef.current.push({ grid: JSON.parse(JSON.stringify(prev.grid)), timestamp: Date.now() })
      return { ...prev, grid: entry.grid }
    })
  }, [])

  const redo = useCallback(() => {
    setState((prev) => {
      const entry = futureRef.current.pop()
      if (!entry) return prev
      historyRef.current.push({ grid: JSON.parse(JSON.stringify(prev.grid)), timestamp: Date.now() })
      return { ...prev, grid: entry.grid }
    })
  }, [])

  const resizeGrid = useCallback(
    (newRows: number, newCols: number) => {
      setState((prev) => {
        pushHistory(prev.grid)
        const newCells: (string | null)[][] = Array.from({ length: newRows }, (_, r) =>
          Array.from({ length: newCols }, (_, c) => {
            if (r < prev.grid.rows && c < prev.grid.cols) {
              return prev.grid.cells[r][c]
            }
            return null
          })
        )
        return { ...prev, grid: { rows: newRows, cols: newCols, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const insertRow = useCallback(
    (index: number, blank: boolean = true) => {
      setState((prev) => {
        pushHistory(prev.grid)
        const newCells = [...prev.grid.cells]
        const newRow = blank
          ? Array.from({ length: prev.grid.cols }, () => null as string | null)
          : [...(prev.grid.cells[Math.min(index, prev.grid.rows - 1)] || []).map((c) => c)]
        newCells.splice(index, 0, newRow)
        return { ...prev, grid: { rows: prev.grid.rows + 1, cols: prev.grid.cols, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const deleteRow = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.grid.rows <= 4) return prev
        pushHistory(prev.grid)
        const newCells = prev.grid.cells.filter((_, i) => i !== index)
        return { ...prev, grid: { rows: prev.grid.rows - 1, cols: prev.grid.cols, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const insertCol = useCallback(
    (index: number, blank: boolean = true) => {
      setState((prev) => {
        pushHistory(prev.grid)
        const newCells = prev.grid.cells.map((row, r) => {
          const newRow = [...row]
          const val = blank ? null : prev.grid.cells[r][Math.min(index, prev.grid.cols - 1)]
          newRow.splice(index, 0, val)
          return newRow
        })
        return { ...prev, grid: { rows: prev.grid.rows, cols: prev.grid.cols + 1, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const deleteCol = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.grid.cols <= 4) return prev
        pushHistory(prev.grid)
        const newCells = prev.grid.cells.map((row) => row.filter((_, i) => i !== index))
        return { ...prev, grid: { rows: prev.grid.rows, cols: prev.grid.cols - 1, cells: newCells } }
      })
    },
    [pushHistory]
  )

  const loadPreset = useCallback(
    (cells: (string | null)[][]) => {
      setState((prev) => {
        pushHistory(prev.grid)
        const rows = cells.length
        const cols = cells[0]?.length || prev.grid.cols
        return { ...prev, grid: { rows, cols, cells } }
      })
    },
    [pushHistory]
  )

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }))
  }, [])

  const setActiveColor = useCallback((color: string) => {
    setState((prev) => ({ ...prev, activeColor: color }))
  }, [])

  const setToolMode = useCallback((toolMode: ToolMode) => {
    setState((prev) => ({ ...prev, toolMode }))
  }, [])

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode }))
  }, [])

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.2, Math.min(5, zoom)) }))
  }, [])

  const setPan = useCallback((panX: number, panY: number) => {
    setState((prev) => ({ ...prev, panX, panY }))
  }, [])

  const setMaterialSettings = useCallback((settings: Partial<MaterialSettings>) => {
    setState((prev) => ({
      ...prev,
      materialSettings: { ...prev.materialSettings, ...settings },
    }))
  }, [])

  const setPalette = useCallback((palette: Palette) => {
    setState((prev) => ({ ...prev, palette }))
  }, [])

  const addColorToPalette = useCallback((name: string, hex: string) => {
    setState((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        colors: [
          ...prev.palette.colors,
          { id: `c${Date.now()}`, name, hex },
        ],
      },
    }))
  }, [])

  const removeColorFromPalette = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        colors: prev.palette.colors.filter((c) => c.id !== id),
      },
    }))
  }, [])

  const setAuthor = useCallback((author: string) => {
    setState((prev) => ({ ...prev, author }))
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState((prev) => ({ ...prev, notes }))
  }, [])

  const exportJSON = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        name: state.name,
        author: state.author,
        notes: state.notes,
        grid: state.grid,
        palette: state.palette,
        materialSettings: state.materialSettings,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
  }, [state])

  const importJSON = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json)
        if (data.grid && data.palette) {
          pushHistory(state.grid)
          setState((prev) => ({
            ...prev,
            name: data.name || prev.name,
            author: data.author || prev.author,
            notes: data.notes || prev.notes,
            grid: data.grid,
            palette: data.palette,
            materialSettings: data.materialSettings || prev.materialSettings,
          }))
          return true
        }
      } catch {
        // Invalid JSON
      }
      return false
    },
    [state.grid, pushHistory]
  )

  const saveToStorage = useCallback(() => {
    try {
      const data = {
        name: state.name,
        author: state.author,
        notes: state.notes,
        grid: state.grid,
        palette: state.palette,
        materialSettings: state.materialSettings,
        savedAt: new Date().toISOString(),
      }
      const saves = JSON.parse(localStorage.getItem("shekere-saves") || "[]")
      const existing = saves.findIndex((s: { name: string }) => s.name === state.name)
      if (existing >= 0) {
        saves[existing] = data
      } else {
        saves.push(data)
      }
      localStorage.setItem("shekere-saves", JSON.stringify(saves))
      return true
    } catch {
      return false
    }
  }, [state])

  const loadFromStorage = useCallback(
    (name: string) => {
      try {
        const saves = JSON.parse(localStorage.getItem("shekere-saves") || "[]")
        const save = saves.find((s: { name: string }) => s.name === name)
        if (save) {
          pushHistory(state.grid)
          setState((prev) => ({
            ...prev,
            ...save,
          }))
          return true
        }
      } catch {
        // invalid
      }
      return false
    },
    [state.grid, pushHistory]
  )

  const getSavedPatterns = useCallback((): string[] => {
    try {
      const saves = JSON.parse(localStorage.getItem("shekere-saves") || "[]")
      return saves.map((s: { name: string }) => s.name)
    } catch {
      return []
    }
  }, [])

  const clearGrid = useCallback(() => {
    setState((prev) => {
      pushHistory(prev.grid)
      return {
        ...prev,
        grid: createEmptyGrid(prev.grid.rows, prev.grid.cols),
      }
    })
  }, [pushHistory])

  const canUndo = historyRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  return {
    state,
    setCell,
    setCellBatch,
    undo,
    redo,
    canUndo,
    canRedo,
    resizeGrid,
    insertRow,
    deleteRow,
    insertCol,
    deleteCol,
    loadPreset,
    setName,
    setActiveColor,
    setToolMode,
    setViewMode,
    setZoom,
    setPan,
    setMaterialSettings,
    setPalette,
    addColorToPalette,
    removeColorFromPalette,
    setAuthor,
    setNotes,
    exportJSON,
    importJSON,
    saveToStorage,
    loadFromStorage,
    getSavedPatterns,
    clearGrid,
  }
}

export type ShekereStore = ReturnType<typeof useShekereStore>
