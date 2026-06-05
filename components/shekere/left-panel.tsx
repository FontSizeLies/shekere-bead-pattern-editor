"use client"

import { useState } from "react"
import {
  Paintbrush,
  Eraser,
  Pipette,
  Grid3X3,
  Plus,
  Minus,
  X,
  Eye,
  Rows3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFAULT_PALETTES } from "@/lib/shekere-types"
import { PATTERN_PRESETS } from "@/lib/pattern-presets"
import type { ShekereStore } from "@/hooks/use-shekere-store"
import type { ToolMode, ViewMode } from "@/lib/shekere-types"

interface LeftPanelProps {
  store: ShekereStore
}

export function LeftPanel({ store }: LeftPanelProps) {
  const [newColorHex, setNewColorHex] = useState("#D4752E")
  const [newColorName, setNewColorName] = useState("")

  const tools: { id: ToolMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: "paint", label: "Paint", icon: <Paintbrush className="h-4 w-4" />, shortcut: "P" },
    { id: "erase", label: "Erase", icon: <Eraser className="h-4 w-4" />, shortcut: "E" },
    { id: "eyedropper", label: "Eyedropper", icon: <Pipette className="h-4 w-4" />, shortcut: "I" },
  ]

  const handleAddColor = () => {
    if (newColorHex) {
      store.addColorToPalette(newColorName || newColorHex, newColorHex)
      setNewColorName("")
    }
  }

  const handleLoadPreset = (presetId: string) => {
    const preset = PATTERN_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const palette = store.state.palette.colors.map((c) => c.hex)
    const cells = preset.generator(store.state.grid.rows, store.state.grid.cols, palette)
    store.loadPreset(cells)
  }

  const handleLoadPalette = (paletteId: string) => {
    const palette = DEFAULT_PALETTES.find((p) => p.id === paletteId)
    if (palette) {
      store.setPalette({ ...palette })
      if (palette.colors.length > 0) {
        store.setActiveColor(palette.colors[0].hex)
      }
    }
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col" aria-label="Tools panel">
      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-4">
          {/* Tools */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tools
            </h3>
            <div className="flex gap-1">
              {tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={store.state.toolMode === tool.id ? "default" : "secondary"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => store.setToolMode(tool.id)}
                      aria-label={tool.label}
                      aria-pressed={store.state.toolMode === tool.id}
                    >
                      {tool.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tool.label} ({tool.shortcut})
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </section>

          <Separator />

          {/* View Mode */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              View
            </h3>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={store.state.viewMode === "bead" ? "default" : "secondary"}
                    size="sm"
                    className="h-8 flex-1 text-xs gap-1.5"
                    onClick={() => store.setViewMode("bead")}
                    aria-label="Bead view"
                    aria-pressed={store.state.viewMode === "bead"}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Bead
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visual bead rendering</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={store.state.viewMode === "wireframe" ? "default" : "secondary"}
                    size="sm"
                    className="h-8 flex-1 text-xs gap-1.5"
                    onClick={() => store.setViewMode("wireframe")}
                    aria-label="Wireframe view"
                    aria-pressed={store.state.viewMode === "wireframe"}
                  >
                    <Grid3X3 className="h-3.5 w-3.5" />
                    Grid
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid with indices</TooltipContent>
              </Tooltip>
            </div>
          </section>

          <Separator />

          {/* Grid Size */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Grid Size
            </h3>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Rows</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => store.resizeGrid(Math.max(4, store.state.grid.rows - 1), store.state.grid.cols)}
                    aria-label="Decrease rows"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={4}
                    max={200}
                    value={store.state.grid.rows}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      if (v >= 4 && v <= 200) store.resizeGrid(v, store.state.grid.cols)
                    }}
                    className="h-7 text-xs text-center bg-secondary border-none"
                    aria-label="Row count"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => store.resizeGrid(Math.min(200, store.state.grid.rows + 1), store.state.grid.cols)}
                    aria-label="Increase rows"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Cols</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => store.resizeGrid(store.state.grid.rows, Math.max(4, store.state.grid.cols - 1))}
                    aria-label="Decrease columns"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={4}
                    max={200}
                    value={store.state.grid.cols}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      if (v >= 4 && v <= 200) store.resizeGrid(store.state.grid.rows, v)
                    }}
                    className="h-7 text-xs text-center bg-secondary border-none"
                    aria-label="Column count"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => store.resizeGrid(store.state.grid.rows, Math.min(200, store.state.grid.cols + 1))}
                    aria-label="Increase columns"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 flex-1 text-xs gap-1"
                onClick={() => store.insertRow(store.state.grid.rows, true)}
                aria-label="Add row"
              >
                <Rows3 className="h-3 w-3" />
                + Row
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 flex-1 text-xs gap-1"
                onClick={() => store.insertCol(store.state.grid.cols, true)}
                aria-label="Add column"
              >
                <Rows3 className="h-3 w-3 rotate-90" />
                + Col
              </Button>
            </div>
          </section>

          <Separator />

          {/* Bead Size */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Bead Size (mm)
            </h3>
            <div className="flex items-center gap-2">
              <Slider
                min={1}
                max={12}
                step={0.5}
                value={[store.state.materialSettings.beadSizeMm]}
                onValueChange={([v]) => store.setMaterialSettings({ beadSizeMm: v })}
                className="flex-1"
                aria-label="Bead size in millimeters"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {store.state.materialSettings.beadSizeMm}
              </span>
            </div>
          </section>

          {/* Spacing */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Net Spacing
            </h3>
            <Select
              value={store.state.materialSettings.spacingPreset}
              onValueChange={(v) => store.setMaterialSettings({ spacingPreset: v as "tight" | "standard" | "loose" })}
            >
              <SelectTrigger className="h-8 text-xs bg-secondary border-none" aria-label="Spacing preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tight">Tight (1.5mm)</SelectItem>
                <SelectItem value="standard">Standard (3mm)</SelectItem>
                <SelectItem value="loose">Loose (5mm)</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* Color Palette */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Palette
            </h3>
            <Select onValueChange={handleLoadPalette}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-none mb-2" aria-label="Load palette">
                <SelectValue placeholder="Load palette..." />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_PALETTES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {store.state.palette.colors.map((color) => (
                <Tooltip key={color.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={`w-8 h-8 rounded-md border-2 transition-all ${
                        store.state.activeColor === color.hex
                          ? "border-foreground ring-2 ring-primary/50 scale-110"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => store.setActiveColor(color.hex)}
                      aria-label={`Select ${color.name}`}
                      aria-pressed={store.state.activeColor === color.hex}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <span>{color.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          store.removeColorFromPalette(color.id)
                        }}
                        aria-label={`Remove ${color.name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="h-8 w-8 rounded border-0 p-0 cursor-pointer"
                aria-label="Pick color"
              />
              <Input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="Name"
                className="h-8 text-xs flex-1 bg-secondary border-none"
                aria-label="Color name"
              />
              <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={handleAddColor}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </section>

          <Separator />

          {/* Pattern Presets */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Presets
            </h3>
            <div className="flex flex-col gap-1">
              {PATTERN_PRESETS.map((preset) => (
                <Tooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs justify-start"
                      onClick={() => handleLoadPreset(preset.id)}
                    >
                      {preset.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-48">
                    {preset.description}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
