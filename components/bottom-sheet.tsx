"use client";

import React, { useState, useMemo } from "react";
import {
  Grid3X3,
  Palette,
  CircleDot,
  Package,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  FileJson,
  FileImage,
  FileText,
  Cable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/lib/use-editor-store";
import {
  DEFAULT_PALETTES,
  GOURD_PRESETS,
  NET_TYPE_META,
  SKIP_INTERVALS,
} from "@/lib/shekere-types";
import type { BottomSheetTab, NetType } from "@/lib/shekere-types";
import { PATTERN_PRESETS } from "@/lib/pattern-presets";
import {
  calculateMaterials,
  generateMaterialsCSV,
  generateBeadSequenceCSV,
  generateInstructions,
} from "@/lib/material-calculator";

const TABS: { id: BottomSheetTab; label: string; icon: React.ReactNode }[] = [
  { id: "net", label: "Net", icon: <Cable className="h-4 w-4" /> },
  { id: "pattern", label: "Pattern", icon: <Grid3X3 className="h-4 w-4" /> },
  { id: "beads", label: "Beads", icon: <Palette className="h-4 w-4" /> },
  { id: "gourd", label: "Gourd", icon: <CircleDot className="h-4 w-4" /> },
  { id: "materials", label: "Materials", icon: <Package className="h-4 w-4" /> },
  { id: "export", label: "Export", icon: <Download className="h-4 w-4" /> },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </h3>
  );
}

// ── Net Tab (FIRST in workflow) ─────────────────────────────

function NetTab() {
  const { snapshot, actions } = useEditorStore();
  const netTypes = Object.entries(NET_TYPE_META) as [NetType, typeof NET_TYPE_META[NetType]][];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Choose the net construction method. This determines bead anchor positions, grid
        topology, instruction logic, and material calculations.
      </p>

      <div className="flex flex-col gap-2">
        {netTypes.map(([type, meta]) => (
          <button
            key={type}
            className={`text-left p-3 rounded-lg border transition-colors ${
              snapshot.netType === type
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:bg-muted/50 active:bg-muted"
            }`}
            onClick={() => actions.setNetType(type)}
          >
            <div className="text-sm font-medium text-foreground">{meta.label}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              {meta.description}
            </div>
          </button>
        ))}
      </div>

      {snapshot.netType === "decorative" && (
        <>
          <Separator />
          <div>
            <SectionLabel>
              Skip Interval (every {snapshot.decorativeSkipInterval}th position)
            </SectionLabel>
            <div className="flex gap-2">
              {SKIP_INTERVALS.map((interval) => (
                <Button
                  key={interval}
                  variant={snapshot.decorativeSkipInterval === interval ? "default" : "outline"}
                  size="sm"
                  className="h-10 flex-1"
                  onClick={() => actions.setDecorativeSkipInterval(interval)}
                >
                  {interval}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Pattern Tab ──────────────────────────────────────────

function PatternTab() {
  const { snapshot, actions } = useEditorStore();
  const [rowInput, setRowInput] = useState(String(snapshot.grid.rows));
  const [colInput, setColInput] = useState(String(snapshot.grid.cols));

  const handleResize = () => {
    const r = Math.max(4, Math.min(100, parseInt(rowInput) || 14));
    const c = Math.max(4, Math.min(100, parseInt(colInput) || 18));
    setRowInput(String(r));
    setColInput(String(c));
    actions.setGridSize(r, c);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>Grid Size</SectionLabel>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">Rows</Label>
            <Input type="number" min={4} max={100} value={rowInput}
              onChange={(e) => setRowInput(e.target.value)}
              onBlur={handleResize}
              onKeyDown={(e) => e.key === "Enter" && handleResize()}
              className="h-10 text-sm" aria-label="Grid rows" />
          </div>
          <span className="text-muted-foreground mt-5 font-mono">x</span>
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">Cols</Label>
            <Input type="number" min={4} max={100} value={colInput}
              onChange={(e) => setColInput(e.target.value)}
              onBlur={handleResize}
              onKeyDown={(e) => e.key === "Enter" && handleResize()}
              className="h-10 text-sm" aria-label="Grid columns" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm"
            className="flex-1 h-10 text-xs text-destructive hover:text-destructive"
            onClick={() => actions.clearGrid()}>
            <Trash2 className="h-3 w-3 mr-1" /> Clear All
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-10 text-xs"
            onClick={() => actions.fillGrid(snapshot.activeColor)}>
            <Grid3X3 className="h-3 w-3 mr-1" /> Fill All
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Load Preset</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {PATTERN_PRESETS.map((preset) => (
            <Button key={preset.id} variant="outline"
              className="h-auto py-2.5 px-3 justify-start text-left"
              onClick={() => actions.loadPreset(preset.id)}>
              <div>
                <div className="text-xs font-medium">{preset.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {preset.category}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Beads Tab ────────────────────────────────────────────

function BeadsTab() {
  const { snapshot, actions } = useEditorStore();
  const [newColorHex, setNewColorHex] = useState("#FF6600");
  const [newColorName, setNewColorName] = useState("");

  const addColor = () => {
    if (!newColorHex) return;
    actions.addPaletteColor({
      id: `custom-${Date.now()}`,
      hex: newColorHex,
      name: newColorName || newColorHex,
    });
    setNewColorName("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="w-10 h-10 rounded-lg border-2 border-foreground/20"
          style={{ backgroundColor: snapshot.activeColor }} />
        <div>
          <div className="text-xs text-muted-foreground">Active Color</div>
          <div className="text-sm font-mono font-medium">{snapshot.activeColor}</div>
        </div>
      </div>

      <div>
        <SectionLabel>Palette</SectionLabel>
        <Select value={snapshot.palette.id}
          onValueChange={(id) => {
            const p = DEFAULT_PALETTES.find((pal) => pal.id === id);
            if (p) actions.setPalette(p);
          }}>
          <SelectTrigger className="h-10 text-sm" aria-label="Select palette">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_PALETTES.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {snapshot.palette.colors.map((c) => (
          <button key={c.id}
            className={`aspect-square rounded-lg border-2 transition-all min-h-[44px] ${
              snapshot.activeColor.toLowerCase() === c.hex.toLowerCase()
                ? "border-foreground ring-2 ring-primary scale-105"
                : "border-border active:scale-95"
            }`}
            style={{ backgroundColor: c.hex }}
            onClick={() => actions.setActiveColor(c.hex)}
            aria-label={`Select ${c.name}`} />
        ))}
      </div>

      <Separator />

      <div>
        <SectionLabel>Bead Size ({snapshot.materialSettings.beadSizeMm}mm)</SectionLabel>
        <Slider min={2} max={12} step={0.5}
          value={[snapshot.materialSettings.beadSizeMm]}
          onValueChange={([v]) => actions.setMaterialSettings({ beadSizeMm: v })}
          className="py-2" aria-label="Bead size" />
      </div>

      <Separator />

      <div>
        <SectionLabel>Add Custom Color</SectionLabel>
        <div className="flex items-center gap-2">
          <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent flex-shrink-0"
            aria-label="Pick custom color" />
          <Input placeholder="Name" value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            className="h-10 text-sm flex-1" aria-label="Color name" />
          <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0"
            onClick={addColor}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Gourd Tab ────────────────────────────────────────────

function GourdTab() {
  const { snapshot, actions } = useEditorStore();
  const gs = snapshot.gourdSettings;

  const neckRatio = gs.bodyDiameterMm > 0 ? (gs.neckDiameterMm / gs.bodyDiameterMm).toFixed(2) : "0.40";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Teardrop body with concave flared neck. Neck is 30% of height; the waist narrows then flares back to a lip/rim at the top.
      </p>

      <div>
        <SectionLabel>Size Preset</SectionLabel>
        <Select value={GOURD_PRESETS.find((g) => g.bodyDiameterMm === gs.bodyDiameterMm && g.heightMm === gs.heightMm)?.name ?? "Custom"}
          onValueChange={(v) => {
            const preset = GOURD_PRESETS.find((g) => g.name === v);
            if (preset) {
              actions.setGourdSettings({
                bodyDiameterMm: preset.bodyDiameterMm,
                neckDiameterMm: Math.round(preset.bodyDiameterMm * 0.4),
                heightMm: preset.heightMm,
              });
            }
          }}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOURD_PRESETS.map((g) => (
              <SelectItem key={g.name} value={g.name}>
                {g.name} ({g.bodyDiameterMm}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionLabel>Body Diameter ({gs.bodyDiameterMm}mm)</SectionLabel>
        <Slider min={120} max={300} step={5}
          value={[gs.bodyDiameterMm]}
          onValueChange={([v]) => actions.setGourdSettings({ bodyDiameterMm: v })}
          className="py-2" aria-label="Body diameter" />
      </div>

      <div>
        <SectionLabel>Neck Diameter ({gs.neckDiameterMm}mm) -- ratio: {neckRatio}</SectionLabel>
        <Slider min={30} max={Math.round(gs.bodyDiameterMm * 0.7)} step={5}
          value={[gs.neckDiameterMm]}
          onValueChange={([v]) => actions.setGourdSettings({ neckDiameterMm: v })}
          className="py-2" aria-label="Neck diameter" />
      </div>

      <div>
        <SectionLabel>Total Height ({gs.heightMm}mm)</SectionLabel>
        <Slider min={180} max={500} step={10}
          value={[gs.heightMm]}
          onValueChange={([v]) => actions.setGourdSettings({ heightMm: v })}
          className="py-2" aria-label="Gourd height" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Neck: {Math.round(gs.heightMm * 0.3)}mm</span>
          <span>Body: {Math.round(gs.heightMm * 0.7)}mm</span>
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Bulge Power p = {gs.bulgePower.toFixed(1)}</SectionLabel>
        <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
          Controls where the widest point sits on the body. Lower = squat/round, higher = shifts the bulge upward.
        </p>
        <Slider min={0.8} max={3.0} step={0.1}
          value={[gs.bulgePower]}
          onValueChange={([v]) => actions.setGourdSettings({ bulgePower: v })}
          className="py-2" aria-label="Bulge power" />
      </div>

      <div>
        <SectionLabel>Neck Taper q = {gs.neckTaper.toFixed(1)}</SectionLabel>
        <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
          Controls how tight the neck waist cinches before flaring to the lip. Higher = tighter waist, more dramatic flare.
        </p>
        <Slider min={0.5} max={4.0} step={0.1}
          value={[gs.neckTaper]}
          onValueChange={([v]) => actions.setGourdSettings({ neckTaper: v })}
          className="py-2" aria-label="Neck taper" />
      </div>

      <Separator />

      <div>
        <SectionLabel>Base Width = {Math.round((gs.baseWidthRatio ?? 0.92) * 100)}%</SectionLabel>
        <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
          Controls the width at the very bottom of the gourd. 100% = flat bottom, lower = rounder/narrower base.
        </p>
        <Slider min={0.5} max={1.0} step={0.02}
          value={[gs.baseWidthRatio ?? 0.92]}
          onValueChange={([v]) => actions.setGourdSettings({ baseWidthRatio: v })}
          className="py-2" aria-label="Base width ratio" />
      </div>

      <div>
        <SectionLabel>Curve Smoothness = {Math.round((gs.curveSmoothness ?? 0.5) * 100)}%</SectionLabel>
        <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
          Controls how smooth the curves are between body regions. Lower = sharper transitions, higher = more gradual blending.
        </p>
        <Slider min={0} max={1.0} step={0.05}
          value={[gs.curveSmoothness ?? 0.5]}
          onValueChange={([v]) => actions.setGourdSettings({ curveSmoothness: v })}
          className="py-2" aria-label="Curve smoothness" />
      </div>
    </div>
  );
}

// ── Materials Tab ────────────────────────────────────────

function MaterialsTab() {
  const { snapshot } = useEditorStore();
  const estimate = useMemo(
    () =>
      calculateMaterials(
        snapshot.grid,
        snapshot.materialSettings,
        snapshot.palette.colors,
        snapshot.netType,
        snapshot.decorativeSkipInterval,
        snapshot.gourdSettings
      ),
    [snapshot.grid, snapshot.materialSettings, snapshot.palette.colors, snapshot.netType, snapshot.decorativeSkipInterval, snapshot.gourdSettings]
  );

  const instructions = useMemo(
    () =>
      generateInstructions(
        snapshot.netType,
        snapshot.grid.rows,
        snapshot.grid.cols,
        snapshot.decorativeSkipInterval
      ),
    [snapshot.netType, snapshot.grid.rows, snapshot.grid.cols, snapshot.decorativeSkipInterval]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted/30 rounded-lg p-4 flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Net Type</span>
          <span className="text-sm font-medium">{NET_TYPE_META[snapshot.netType].label}</span>
        </div>
        <Separator className="my-0.5" />
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Total Beads</span>
          <span className="text-sm font-mono font-semibold text-primary">
            {estimate.totalBeads.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Cord Length</span>
          <span className="text-sm font-mono">{estimate.totalCordLengthM.toFixed(2)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Knot Count</span>
          <span className="text-sm font-mono">{estimate.knotCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Est. Weight</span>
          <span className="text-sm font-mono">{estimate.estimatedWeightG}g</span>
        </div>
        <Separator className="my-0.5" />
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Est. Cost</span>
          <span className="text-sm font-mono font-semibold text-primary">
            ${estimate.estimatedCost.toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <SectionLabel>Beads by Color</SectionLabel>
        {estimate.beadsByColor.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No beads placed yet</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {estimate.beadsByColor.map((bc) => (
              <div key={bc.color}
                className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-muted/20">
                <span className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                  style={{ backgroundColor: bc.color }} />
                <span className="text-sm flex-1 truncate">{bc.name}</span>
                <span className="text-sm font-mono font-medium">{bc.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <SectionLabel>Construction Instructions</SectionLabel>
        <div className="flex flex-col gap-2">
          {instructions.map((inst) => (
            <div key={inst.step} className="p-3 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {inst.step}
                </span>
                <span className="text-xs font-semibold text-foreground">{inst.action}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                {inst.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Export Tab ────────────────────────────────────────────

function ExportTab() {
  const { snapshot, actions } = useEditorStore();
  const estimate = useMemo(
    () =>
      calculateMaterials(
        snapshot.grid,
        snapshot.materialSettings,
        snapshot.palette.colors,
        snapshot.netType,
        snapshot.decorativeSkipInterval,
        snapshot.gourdSettings
      ),
    [snapshot.grid, snapshot.materialSettings, snapshot.palette.colors, snapshot.netType, snapshot.decorativeSkipInterval, snapshot.gourdSettings]
  );

  const download = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const slug = snapshot.projectName.replace(/\s+/g, "-").toLowerCase();

  const handleExportJSON = () => {
    download(actions.exportJSON(), `${slug}.json`, "application/json");
  };

  const handleExportCSV = () => {
    download(generateMaterialsCSV(estimate, snapshot.netType), `${slug}-materials.csv`, "text/csv");
  };

  const handleExportBeadCSV = () => {
    download(
      generateBeadSequenceCSV(snapshot.grid, snapshot.palette.colors),
      `${slug}-bead-sequence.csv`,
      "text/csv"
    );
  };

  const handleExportSVG = () => {
    const beadSize = 24;
    const spacingX = beadSize;
    const spacingY = beadSize * 0.866;
    const pad = beadSize;
    const w = (snapshot.grid.cols - 1) * spacingX + spacingX / 2 + pad * 2;
    const h = (snapshot.grid.rows - 1) * spacingY + pad * 2;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}">\n`;
    svg += `<rect width="${Math.round(w)}" height="${Math.round(h)}" fill="white"/>\n`;
    for (let r = 0; r < snapshot.grid.rows; r++) {
      for (let c = 0; c < snapshot.grid.cols; c++) {
        const color = snapshot.grid.cells[r]?.[c];
        if (!color) continue;
        const isOdd = r % 2 === 1;
        const xOff = isOdd ? spacingX / 2 : 0;
        const cx = pad + c * spacingX + xOff;
        const cy = pad + r * spacingY;
        svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(beadSize * 0.35).toFixed(1)}" fill="${color}" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>\n`;
      }
    }
    svg += `</svg>`;
    download(svg, `${slug}.svg`, "image/svg+xml");
  };

  const handleExportPNG = () => {
    const scale = 3;
    const beadSize = 24;
    const spacingX = beadSize;
    const spacingY = beadSize * 0.866;
    const pad = beadSize;
    const w = (snapshot.grid.cols - 1) * spacingX + spacingX / 2 + pad * 2;
    const h = (snapshot.grid.rows - 1) * spacingY + pad * 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w) * scale;
    canvas.height = Math.round(h) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < snapshot.grid.rows; r++) {
      for (let c = 0; c < snapshot.grid.cols; c++) {
        const color = snapshot.grid.cells[r]?.[c];
        if (!color) continue;
        const isOdd = r % 2 === 1;
        const xOff = isOdd ? spacingX / 2 : 0;
        const cx = pad + c * spacingX + xOff;
        const cy = pad + r * spacingY;
        ctx.beginPath();
        ctx.arc(cx, cy, beadSize * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) actions.importJSON(text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 text-sm" onClick={handleExportJSON}>
          <FileJson className="h-4 w-4 mr-2" /> JSON
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={handleExportPNG}>
          <FileImage className="h-4 w-4 mr-2" /> PNG
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={handleExportSVG}>
          <FileImage className="h-4 w-4 mr-2" /> SVG
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={handleExportCSV}>
          <FileText className="h-4 w-4 mr-2" /> Materials CSV
        </Button>
        <Button variant="outline" className="h-12 text-sm col-span-2" onClick={handleExportBeadCSV}>
          <Download className="h-4 w-4 mr-2" /> Bead Sequence CSV
        </Button>
      </div>

      <Separator />

      <Button variant="outline" className="h-12 text-sm" onClick={handleImportJSON}>
        <FileJson className="h-4 w-4 mr-2" /> Import JSON
      </Button>
    </div>
  );
}

// ── Main Bottom Sheet ────────────────────────────────────

export function BottomSheet() {
  const { snapshot, actions } = useEditorStore();
  const { bottomSheetOpen, bottomSheetTab } = snapshot;

  const tabContent: Record<BottomSheetTab, React.ReactNode> = {
    net: <NetTab />,
    pattern: <PatternTab />,
    beads: <BeadsTab />,
    gourd: <GourdTab />,
    materials: <MaterialsTab />,
    export: <ExportTab />,
  };

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Tab bar */}
      <div className="bg-card border-t border-border flex items-center px-1 py-1 gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 rounded-lg text-[10px] font-medium transition-colors min-h-[48px] ${
              bottomSheetTab === tab.id && bottomSheetOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground active:bg-muted"
            }`}
            onClick={() => {
              if (bottomSheetTab === tab.id && bottomSheetOpen) {
                actions.setBottomSheetOpen(false);
              } else {
                actions.setBottomSheetTab(tab.id);
              }
            }}
            aria-label={tab.label}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sheet content */}
      {bottomSheetOpen && (
        <div className="bg-card border-t border-border overflow-y-auto panel-scroll"
          style={{ maxHeight: "50vh" }}>
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-sm font-semibold capitalize">{bottomSheetTab}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => actions.setBottomSheetOpen(false)}
              aria-label="Close panel">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-4 pb-4 pt-1">{tabContent[bottomSheetTab]}</div>
        </div>
      )}
    </div>
  );
}
