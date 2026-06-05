"use client"

import { useMemo, useState } from "react"
import { Calculator, Download, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { calculateMaterials, generateMaterialsCSV } from "@/lib/material-calculator"
import { GOURD_PRESETS } from "@/lib/shekere-types"
import type { ShekereStore } from "@/hooks/use-shekere-store"

interface RightPanelProps {
  store: ShekereStore
}

export function RightPanel({ store }: RightPanelProps) {
  const [showDetailedMath, setShowDetailedMath] = useState(false)

  const estimate = useMemo(
    () =>
      calculateMaterials(
        store.state.grid,
        store.state.materialSettings,
        store.state.palette.colors
      ),
    [store.state.grid, store.state.materialSettings, store.state.palette.colors]
  )

  const handleDownloadCSV = () => {
    const csv = generateMaterialsCSV(estimate)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${store.state.name.replace(/\s+/g, "-").toLowerCase()}-materials.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ms = store.state.materialSettings

  return (
    <aside className="w-72 border-l bg-card flex flex-col" aria-label="Materials and inspector panel">
      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-4">
          {/* Materials Calculator */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Materials
              </h3>
            </div>

            <div className="bg-secondary/50 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total Beads</p>
                  <p className="text-lg font-bold text-foreground">{estimate.totalBeads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cord Length</p>
                  <p className="text-lg font-bold text-foreground">{estimate.totalRopeLengthM}m</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="text-sm font-semibold text-foreground">{estimate.estimatedWeightG}g</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Cost</p>
                  <p className="text-sm font-semibold text-foreground">${estimate.estimatedCost}</p>
                </div>
              </div>
            </div>

            {/* Bead counts by color */}
            <div className="mb-3">
              <h4 className="text-xs text-muted-foreground font-medium mb-1.5">Beads by Color</h4>
              <div className="flex flex-col gap-1">
                {estimate.beadsByColor.map((bc) => (
                  <div key={bc.color} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0 border border-foreground/10"
                      style={{ backgroundColor: bc.color }}
                    />
                    <span className="flex-1 truncate text-foreground">{bc.name}</span>
                    <span className="text-muted-foreground font-mono">{bc.count}</span>
                  </div>
                ))}
                {estimate.beadsByColor.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No beads placed yet</p>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs w-full gap-1.5"
              onClick={handleDownloadCSV}
            >
              <Download className="h-3 w-3" />
              Download Materials CSV
            </Button>
          </section>

          <Separator />

          {/* Detailed Math */}
          <section>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={() => setShowDetailedMath(!showDetailedMath)}
            >
              <Info className="h-3.5 w-3.5" />
              <span className="font-medium">Detailed Formulas</span>
              {showDetailedMath ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </button>
            {showDetailedMath && (
              <div className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5 font-mono leading-relaxed">
                <p>{'Vertical passes = C+1 = '}{store.state.grid.cols + 1}</p>
                <p>{'Vert length = R*(d+s) = '}{store.state.grid.rows}*({ms.beadSizeMm}+{ms.spacingPreset === "tight" ? 1.5 : ms.spacingPreset === "standard" ? 3 : 5})</p>
                <p>{'Horiz/row = G = '}{ms.gourdCircumferenceMm}mm</p>
                <p>{'Knots = R*C*0.5*k'}</p>
                <p>{'Safety = +'}{ms.safetyMarginPercent}%</p>
                <p className="mt-1 text-foreground font-semibold">
                  {'Total = '}{estimate.totalRopeLengthM}m
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Gourd Settings */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Gourd Size
            </h3>
            <Select
              onValueChange={(v) => {
                const preset = GOURD_PRESETS.find((p) => p.name === v)
                if (preset) store.setMaterialSettings({ gourdCircumferenceMm: preset.circumferenceMm })
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-secondary border-none mb-2" aria-label="Gourd size preset">
                <SelectValue placeholder="Choose preset..." />
              </SelectTrigger>
              <SelectContent>
                {GOURD_PRESETS.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs text-muted-foreground">Circumference (mm)</Label>
              <Input
                type="number"
                min={100}
                max={2000}
                value={ms.gourdCircumferenceMm}
                onChange={(e) => store.setMaterialSettings({ gourdCircumferenceMm: parseInt(e.target.value) || 450 })}
                className="h-8 text-xs mt-1 bg-secondary border-none"
                aria-label="Gourd circumference"
              />
            </div>
          </section>

          <Separator />

          {/* Cost Settings */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Pricing
            </h3>
            <div className="flex flex-col gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Price per bead ($)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={ms.pricePerBead}
                  onChange={(e) => store.setMaterialSettings({ pricePerBead: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs mt-1 bg-secondary border-none"
                  aria-label="Price per bead"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Price per meter cord ($)</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  value={ms.pricePerMeterCord}
                  onChange={(e) => store.setMaterialSettings({ pricePerMeterCord: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs mt-1 bg-secondary border-none"
                  aria-label="Price per meter cord"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Safety margin (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    min={0}
                    max={50}
                    step={5}
                    value={[ms.safetyMarginPercent]}
                    onValueChange={([v]) => store.setMaterialSettings({ safetyMarginPercent: v })}
                    className="flex-1"
                    aria-label="Safety margin percentage"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{ms.safetyMarginPercent}%</span>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Metadata */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Metadata
            </h3>
            <div className="flex flex-col gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Author</Label>
                <Input
                  value={store.state.author}
                  onChange={(e) => store.setAuthor(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-xs mt-1 bg-secondary border-none"
                  aria-label="Author name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  value={store.state.notes}
                  onChange={(e) => store.setNotes(e.target.value)}
                  placeholder="Design notes..."
                  className="text-xs mt-1 bg-secondary border-none min-h-[60px]"
                  aria-label="Pattern notes"
                />
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
