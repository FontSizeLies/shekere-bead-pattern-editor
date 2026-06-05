"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import type { ShekereStore } from "@/hooks/use-shekere-store"

interface BeadGridProps {
  store: ShekereStore
}

const CELL_SIZE = 28
const HEADER_SIZE = 24

export function BeadGrid({ store }: BeadGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPainting, setIsPainting] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const { grid, viewMode, activeColor, toolMode, zoom, panX, panY } = store.state
  const scaledCell = CELL_SIZE * zoom

  const handleCellAction = useCallback(
    (row: number, col: number) => {
      if (toolMode === "paint") {
        store.setCell(row, col, activeColor)
      } else if (toolMode === "erase") {
        store.setCell(row, col, null)
      } else if (toolMode === "eyedropper") {
        const color = grid.cells[row]?.[col]
        if (color) store.setActiveColor(color)
      }
    },
    [toolMode, activeColor, grid.cells, store]
  )

  const getGridCoords = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const container = containerRef.current
      if (!container) return null
      const rect = container.getBoundingClientRect()
      const x = (clientX - rect.left - panX - HEADER_SIZE) / (scaledCell)
      const y = (clientY - rect.top - panY - HEADER_SIZE) / (scaledCell)
      const col = Math.floor(x)
      const row = Math.floor(y)
      if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
        return { row, col }
      }
      return null
    },
    [panX, panY, scaledCell, grid.rows, grid.cols]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Middle button or space+click for panning
      if (e.button === 1) {
        setIsPanning(true)
        panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY }
        e.preventDefault()
        return
      }
      if (e.button !== 0) return

      const coords = getGridCoords(e.clientX, e.clientY)
      if (coords) {
        setIsPainting(true)
        handleCellAction(coords.row, coords.col)
      }
    },
    [getGridCoords, handleCellAction, panX, panY]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        store.setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy)
        return
      }

      const coords = getGridCoords(e.clientX, e.clientY)
      setHoveredCell(coords)

      if (isPainting && coords) {
        handleCellAction(coords.row, coords.col)
      }
    },
    [isPainting, isPanning, getGridCoords, handleCellAction, store]
  )

  const handlePointerUp = useCallback(() => {
    setIsPainting(false)
    setIsPanning(false)
    panStartRef.current = null
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        store.setZoom(zoom + delta)
      } else {
        store.setPan(panX - e.deltaX, panY - e.deltaY)
      }
    },
    [zoom, panX, panY, store]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case "p":
          store.setToolMode("paint")
          break
        case "e":
          store.setToolMode("erase")
          break
        case "i":
          store.setToolMode("eyedropper")
          break
        case "z":
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              store.redo()
            } else {
              store.undo()
            }
            e.preventDefault()
          }
          break
        case "=":
        case "+":
          if (e.ctrlKey || e.metaKey) {
            store.setZoom(zoom + 0.2)
            e.preventDefault()
          }
          break
        case "-":
          if (e.ctrlKey || e.metaKey) {
            store.setZoom(zoom - 0.2)
            e.preventDefault()
          }
          break
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [store, zoom])

  const totalWidth = grid.cols * scaledCell + HEADER_SIZE
  const totalHeight = grid.rows * scaledCell + HEADER_SIZE

  const cursorStyle =
    toolMode === "paint"
      ? "crosshair"
      : toolMode === "erase"
        ? "pointer"
        : toolMode === "eyedropper"
          ? "crosshair"
          : "default"

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-secondary/30 relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      style={{ cursor: cursorStyle }}
      role="grid"
      aria-label={`Bead grid, ${grid.rows} rows by ${grid.cols} columns`}
      tabIndex={0}
    >
      {/* Wrap seam indicator */}
      <div
        className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/40 pointer-events-none z-10"
        style={{
          left: panX + HEADER_SIZE - 1,
          display: panX + HEADER_SIZE > 0 ? "block" : "none",
        }}
      />
      <div
        className="absolute top-0 bottom-0 border-r-2 border-dashed border-primary/40 pointer-events-none z-10"
        style={{
          left: panX + totalWidth - 1,
        }}
      />

      <svg
        width={Math.max(totalWidth + 200, 600)}
        height={Math.max(totalHeight + 200, 600)}
        style={{
          transform: `translate(${panX}px, ${panY}px)`,
        }}
        className="select-none"
      >
        {/* Column headers */}
        {Array.from({ length: grid.cols }, (_, c) => (
          <text
            key={`ch-${c}`}
            x={HEADER_SIZE + c * scaledCell + scaledCell / 2}
            y={HEADER_SIZE - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={Math.max(8, Math.min(10, scaledCell * 0.4))}
          >
            {c + 1}
          </text>
        ))}

        {/* Row headers */}
        {Array.from({ length: grid.rows }, (_, r) => (
          <text
            key={`rh-${r}`}
            x={HEADER_SIZE - 6}
            y={HEADER_SIZE + r * scaledCell + scaledCell / 2 + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={Math.max(8, Math.min(10, scaledCell * 0.4))}
          >
            {r + 1}
          </text>
        ))}

        {/* Grid background */}
        <rect
          x={HEADER_SIZE}
          y={HEADER_SIZE}
          width={grid.cols * scaledCell}
          height={grid.rows * scaledCell}
          className="fill-card stroke-border"
          strokeWidth={1}
        />

        {/* Grid lines */}
        {Array.from({ length: grid.rows + 1 }, (_, r) => (
          <line
            key={`hl-${r}`}
            x1={HEADER_SIZE}
            y1={HEADER_SIZE + r * scaledCell}
            x2={HEADER_SIZE + grid.cols * scaledCell}
            y2={HEADER_SIZE + r * scaledCell}
            className="stroke-border/50"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: grid.cols + 1 }, (_, c) => (
          <line
            key={`vl-${c}`}
            x1={HEADER_SIZE + c * scaledCell}
            y1={HEADER_SIZE}
            x2={HEADER_SIZE + c * scaledCell}
            y2={HEADER_SIZE + grid.rows * scaledCell}
            className="stroke-border/50"
            strokeWidth={0.5}
          />
        ))}

        {/* Beads */}
        {grid.cells.map((row, r) =>
          row.map((color, c) => {
            if (!color) return null
            const cx = HEADER_SIZE + c * scaledCell + scaledCell / 2
            const cy = HEADER_SIZE + r * scaledCell + scaledCell / 2
            const isHovered = hoveredCell?.row === r && hoveredCell?.col === c

            if (viewMode === "bead") {
              const radius = scaledCell * 0.38
              return (
                <g key={`b-${r}-${c}`}>
                  {/* Bead shadow */}
                  <circle
                    cx={cx + 1}
                    cy={cy + 1}
                    r={radius}
                    fill="rgba(0,0,0,0.15)"
                  />
                  {/* Bead */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={color}
                    stroke={isHovered ? "hsl(var(--foreground))" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isHovered ? 2 : 0.5}
                  />
                  {/* Highlight */}
                  <circle
                    cx={cx - radius * 0.25}
                    cy={cy - radius * 0.25}
                    r={radius * 0.2}
                    fill="rgba(255,255,255,0.35)"
                  />
                </g>
              )
            } else {
              // Wireframe view
              return (
                <g key={`b-${r}-${c}`}>
                  <rect
                    x={HEADER_SIZE + c * scaledCell + 1}
                    y={HEADER_SIZE + r * scaledCell + 1}
                    width={scaledCell - 2}
                    height={scaledCell - 2}
                    fill={color}
                    stroke={isHovered ? "hsl(var(--foreground))" : "none"}
                    strokeWidth={isHovered ? 2 : 0}
                    opacity={0.85}
                  />
                  {scaledCell >= 20 && (
                    <text
                      x={cx}
                      y={cy + 3}
                      textAnchor="middle"
                      fontSize={Math.max(7, scaledCell * 0.3)}
                      className="fill-foreground"
                      style={{ mixBlendMode: "difference" }}
                    >
                      {r * grid.cols + c + 1}
                    </text>
                  )}
                </g>
              )
            }
          })
        )}

        {/* Hover highlight for empty cells */}
        {hoveredCell && !grid.cells[hoveredCell.row]?.[hoveredCell.col] && (
          <rect
            x={HEADER_SIZE + hoveredCell.col * scaledCell + 1}
            y={HEADER_SIZE + hoveredCell.row * scaledCell + 1}
            width={scaledCell - 2}
            height={scaledCell - 2}
            fill={toolMode === "paint" ? activeColor : "transparent"}
            opacity={0.3}
            rx={viewMode === "bead" ? scaledCell * 0.4 : 0}
            ry={viewMode === "bead" ? scaledCell * 0.4 : 0}
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div
          className="absolute pointer-events-none bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border z-20"
          style={{
            left: panX + HEADER_SIZE + hoveredCell.col * scaledCell + scaledCell + 8,
            top: panY + HEADER_SIZE + hoveredCell.row * scaledCell,
          }}
        >
          <span className="font-mono">
            ({hoveredCell.row + 1}, {hoveredCell.col + 1})
          </span>
          {grid.cells[hoveredCell.row]?.[hoveredCell.col] && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block border border-foreground/20"
                style={{ backgroundColor: grid.cells[hoveredCell.row][hoveredCell.col]! }}
              />
              {grid.cells[hoveredCell.row][hoveredCell.col]}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
