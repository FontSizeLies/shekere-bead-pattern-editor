"use client";

import { useRef, useSyncExternalStore } from "react";
import type {
  GridState,
  MaterialSettings,
  GourdSettings,
  Palette,
  ToolMode,
  AppMode,
  BottomSheetTab,
  HistoryEntry,
  BeadColor,
  NetType,
} from "./shekere-types";
import { DEFAULT_PALETTES, DEFAULT_GOURD_SETTINGS } from "./shekere-types";
import { PATTERN_PRESETS } from "./pattern-presets";
import { gourdMaxCircumference } from "./gourd-geometry";

// ── State shape ──────────────────────────────────────────────
export interface EditorSnapshot {
  projectName: string;
  author: string;
  notes: string;
  /** Net weaving type -- the foundation of the design */
  netType: NetType;
  /** Skip interval for decorative net (2-5) */
  decorativeSkipInterval: number;
  grid: GridState;
  palette: Palette;
  materialSettings: MaterialSettings;
  gourdSettings: GourdSettings;
  activeColor: string;
  toolMode: ToolMode;
  appMode: AppMode;
  /** Whether the user has explicitly chosen a net type (first-run gate) */
  netChosen: boolean;
  bottomSheetOpen: boolean;
  bottomSheetTab: BottomSheetTab;
  zoom: number;
  panX: number;
  panY: number;
  gourdRotation: number;
  /** Controls visual bead size in the gourd preview (0.5 - 3.0) */
  previewBeadScale: number;
  hoveredCell: { row: number; col: number } | null;
  isPainting: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

function createDefaultGrid(rows: number, cols: number): GridState {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    ),
  };
}

function createInitialState(): EditorSnapshot {
  const palette = DEFAULT_PALETTES[0];
  return {
    projectName: "My Shekere Pattern",
    author: "",
    notes: "",
    netType: "double-diagonal",
    decorativeSkipInterval: 3,
    grid: createDefaultGrid(14, 18),
    palette,
    materialSettings: {
      beadSizeMm: 6,
      spacingPreset: "standard",
      gourdCircumferenceMm: Math.round(gourdMaxCircumference(DEFAULT_GOURD_SETTINGS)),
      knotAllowanceMm: 3,
      beadHoleFactor: 1.0,
      safetyMarginPercent: 10,
      pricePerBead: 0.05,
      pricePerMeterCord: 2.0,
    },
    gourdSettings: { ...DEFAULT_GOURD_SETTINGS },
    activeColor: palette.colors[0].hex,
    toolMode: "paint",
    appMode: "design",
    netChosen: false,
    bottomSheetOpen: false,
    bottomSheetTab: "net",
    zoom: 1,
    panX: 0,
    panY: 0,
    gourdRotation: 0,
    previewBeadScale: 1.0,
    hoveredCell: null,
    isPainting: false,
    canUndo: false,
    canRedo: false,
  };
}

// ── Store ────────────────────────────────────────────────────
type Listener = () => void;

class EditorStore {
  private snap: EditorSnapshot;
  private listeners = new Set<Listener>();
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private maxHistory = 200;

  constructor() {
    this.snap = createInitialState();
    this.pushHistory();
  }

  getSnapshot = (): EditorSnapshot => this.snap;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.snap = { ...this.snap };
    this.listeners.forEach((l) => l());
  }

  private pushHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      grid: {
        rows: this.snap.grid.rows,
        cols: this.snap.grid.cols,
        cells: this.snap.grid.cells.map((r) => [...r]),
      },
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.snap.canUndo = this.historyIndex > 0;
    this.snap.canRedo = false;
  }

  // ── Actions ────────────────────────────────────────────────

  setProjectName = (name: string) => {
    this.snap.projectName = name;
    this.emit();
  };
  setAuthor = (author: string) => {
    this.snap.author = author;
    this.emit();
  };
  setNotes = (notes: string) => {
    this.snap.notes = notes;
    this.emit();
  };
  setNetType = (type: NetType) => {
    this.snap.netType = type;
    this.snap.netChosen = true;
    // Clear grid when switching net type
    this.snap.grid = createDefaultGrid(this.snap.grid.rows, this.snap.grid.cols);
    this.pushHistory();
    this.emit();
  };
  confirmNetChoice = () => {
    this.snap.netChosen = true;
    this.emit();
  };
  setDecorativeSkipInterval = (interval: number) => {
    this.snap.decorativeSkipInterval = Math.max(2, Math.min(5, interval));
    this.emit();
  };
  setActiveColor = (hex: string) => {
    this.snap.activeColor = hex;
    this.emit();
  };
  setToolMode = (mode: ToolMode) => {
    this.snap.toolMode = mode;
    this.emit();
  };
  setAppMode = (mode: AppMode) => {
    this.snap.appMode = mode;
    this.emit();
  };
  setBottomSheetOpen = (open: boolean) => {
    this.snap.bottomSheetOpen = open;
    this.emit();
  };
  setBottomSheetTab = (tab: BottomSheetTab) => {
    this.snap.bottomSheetTab = tab;
    this.snap.bottomSheetOpen = true;
    this.emit();
  };
  setZoom = (zoom: number) => {
    this.snap.zoom = Math.max(0.3, Math.min(4, zoom));
    this.emit();
  };
  setPan = (x: number, y: number) => {
    this.snap.panX = x;
    this.snap.panY = y;
    this.emit();
  };
  setGourdRotation = (rotation: number) => {
    this.snap.gourdRotation = rotation;
    this.emit();
  };
  setPreviewBeadScale = (scale: number) => {
    this.snap.previewBeadScale = Math.max(0.5, Math.min(3.0, scale));
    this.emit();
  };
  setHoveredCell = (cell: { row: number; col: number } | null) => {
    const prev = this.snap.hoveredCell;
    if (prev?.row === cell?.row && prev?.col === cell?.col) return;
    this.snap.hoveredCell = cell;
    this.emit();
  };
  setIsPainting = (val: boolean) => {
    this.snap.isPainting = val;
    this.emit();
  };

  // Grid operations -- fast path: mutate in place during a paint stroke.
  // Only emit a shallow grid copy so React sees a new reference, but
  // we do NOT deep-clone every row. This makes drag-painting O(1) per cell.
  paintCell = (row: number, col: number, color: string | null) => {
    if (row < 0 || row >= this.snap.grid.rows || col < 0 || col >= this.snap.grid.cols) return;
    this.snap.grid.cells[row][col] = color;
    // Shallow copy grid object so useSyncExternalStore sees a change
    this.snap.grid = { ...this.snap.grid };
    this.emit();
  };

  commitPaint = () => {
    // Deep-clone cells for the history entry only at the end of a stroke
    this.pushHistory();
    this.emit();
  };

  /** Flood-fill: recolor all contiguous cells with the same color starting from (row, col). */
  floodFill = (row: number, col: number, fillColor: string) => {
    const { rows, cols, cells } = this.snap.grid;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    const targetColor = cells[row][col]; // null or hex string
    if (targetColor === fillColor) return; // already that color

    // BFS flood fill
    const visited = new Set<string>();
    const queue: [number, number][] = [[row, col]];
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      cells[r][c] = fillColor;

      // 4-directional neighbors (up, down, left, right)
      const neighbors: [number, number][] = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        // Match: both null, or same hex (case-insensitive)
        const cellColor = cells[nr][nc];
        const match = targetColor === null
          ? cellColor === null
          : cellColor !== null && cellColor.toLowerCase() === targetColor.toLowerCase();
        if (!match) continue;
        visited.add(key);
        queue.push([nr, nc]);
      }
    }

    this.snap.grid = { ...this.snap.grid };
    this.pushHistory();
    this.emit();
  };

  addRowTop = () => {
    const { rows, cols, cells } = this.snap.grid;
    const newRow: (string | null)[] = Array(cols).fill(null);
    this.snap.grid = { rows: rows + 1, cols, cells: [newRow, ...cells] };
    this.pushHistory();
    this.emit();
  };
  addRowBottom = () => {
    const { rows, cols, cells } = this.snap.grid;
    const newRow: (string | null)[] = Array(cols).fill(null);
    this.snap.grid = { rows: rows + 1, cols, cells: [...cells, newRow] };
    this.pushHistory();
    this.emit();
  };
  addColLeft = () => {
    const { rows, cols, cells } = this.snap.grid;
    const newCells = cells.map((row) => [null, ...row]);
    this.snap.grid = { rows, cols: cols + 1, cells: newCells };
    this.pushHistory();
    this.emit();
  };
  addColRight = () => {
    const { rows, cols, cells } = this.snap.grid;
    const newCells = cells.map((row) => [...row, null]);
    this.snap.grid = { rows, cols: cols + 1, cells: newCells };
    this.pushHistory();
    this.emit();
  };
  removeRowTop = () => {
    const { rows, cols, cells } = this.snap.grid;
    if (rows <= 1) return;
    this.snap.grid = { rows: rows - 1, cols, cells: cells.slice(1) };
    this.pushHistory();
    this.emit();
  };
  removeRowBottom = () => {
    const { rows, cols, cells } = this.snap.grid;
    if (rows <= 1) return;
    this.snap.grid = { rows: rows - 1, cols, cells: cells.slice(0, -1) };
    this.pushHistory();
    this.emit();
  };
  removeColLeft = () => {
    const { rows, cols, cells } = this.snap.grid;
    if (cols <= 1) return;
    const newCells = cells.map((row) => row.slice(1));
    this.snap.grid = { rows, cols: cols - 1, cells: newCells };
    this.pushHistory();
    this.emit();
  };
  removeColRight = () => {
    const { rows, cols, cells } = this.snap.grid;
    if (cols <= 1) return;
    const newCells = cells.map((row) => row.slice(0, -1));
    this.snap.grid = { rows, cols: cols - 1, cells: newCells };
    this.pushHistory();
    this.emit();
  };

  setGridSize = (rows: number, cols: number) => {
    const oldGrid = this.snap.grid;
    const newCells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        r < oldGrid.rows && c < oldGrid.cols ? oldGrid.cells[r][c] : null
      )
    );
    this.snap.grid = { rows, cols, cells: newCells };
    this.pushHistory();
    this.emit();
  };

  clearGrid = () => {
    this.snap.grid = createDefaultGrid(this.snap.grid.rows, this.snap.grid.cols);
    this.pushHistory();
    this.emit();
  };

  fillGrid = (color: string) => {
    const newCells = this.snap.grid.cells.map((row) => row.map(() => color));
    this.snap.grid = { ...this.snap.grid, cells: newCells };
    this.pushHistory();
    this.emit();
  };

  // Palette operations
  setPalette = (palette: Palette) => {
    this.snap.palette = palette;
    this.snap.activeColor = palette.colors[0]?.hex || "#000000";
    this.emit();
  };

  addPaletteColor = (color: BeadColor) => {
    this.snap.palette = { ...this.snap.palette, colors: [...this.snap.palette.colors, color] };
    this.emit();
  };

  removePaletteColor = (id: string) => {
    this.snap.palette = {
      ...this.snap.palette,
      colors: this.snap.palette.colors.filter((c) => c.id !== id),
    };
    this.emit();
  };

  updatePaletteColor = (id: string, hex: string, name: string) => {
    const oldHex = this.snap.palette.colors.find((c) => c.id === id)?.hex;
    this.snap.palette = {
      ...this.snap.palette,
      colors: this.snap.palette.colors.map((c) => (c.id === id ? { ...c, hex, name } : c)),
    };
    if (oldHex && oldHex !== hex) {
      const newCells = this.snap.grid.cells.map((row) =>
        row.map((cell) => (cell?.toLowerCase() === oldHex.toLowerCase() ? hex : cell))
      );
      this.snap.grid = { ...this.snap.grid, cells: newCells };
      if (this.snap.activeColor.toLowerCase() === oldHex.toLowerCase()) {
        this.snap.activeColor = hex;
      }
    }
    this.pushHistory();
    this.emit();
  };

  // Material settings
  setMaterialSettings = (settings: Partial<MaterialSettings>) => {
    this.snap.materialSettings = { ...this.snap.materialSettings, ...settings };
    this.emit();
  };

  // Gourd settings
  setGourdSettings = (settings: Partial<GourdSettings>) => {
    this.snap.gourdSettings = { ...this.snap.gourdSettings, ...settings };
    // Keep material circumference in sync using the formula-based max circumference
    this.snap.materialSettings.gourdCircumferenceMm = Math.round(
      gourdMaxCircumference(this.snap.gourdSettings)
    );
    this.emit();
  };

  // Presets
  loadPreset = (presetId: string) => {
    const preset = PATTERN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const paletteHexes = this.snap.palette.colors.map((c) => c.hex);
    const { rows, cols } = this.snap.grid;
    const cells = preset.generator(rows, cols, paletteHexes);
    this.snap.grid = { rows, cols, cells };
    this.pushHistory();
    this.emit();
  };

  // Undo / Redo
  undo = () => {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    const entry = this.history[this.historyIndex];
    this.snap.grid = { rows: entry.grid.rows, cols: entry.grid.cols, cells: entry.grid.cells.map((r) => [...r]) };
    this.snap.canUndo = this.historyIndex > 0;
    this.snap.canRedo = this.historyIndex < this.history.length - 1;
    this.emit();
  };

  redo = () => {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this.snap.grid = { rows: entry.grid.rows, cols: entry.grid.cols, cells: entry.grid.cells.map((r) => [...r]) };
    this.snap.canUndo = this.historyIndex > 0;
    this.snap.canRedo = this.historyIndex < this.history.length - 1;
    this.emit();
  };

  // Image-to-bead import: receives an ImageData and maps pixel brightness to bead colors
  importImageData = (imageData: ImageData, paletteHexes: string[]) => {
    const { rows, cols } = this.snap.grid;
    const w = imageData.width;
    const h = imageData.height;
    const newCells: (string | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < cols; c++) {
        // Sample the pixel at the corresponding grid position
        const px = Math.floor((c / cols) * w);
        const py = Math.floor((r / rows) * h);
        const idx = (py * w + px) * 4;
        const red = imageData.data[idx];
        const green = imageData.data[idx + 1];
        const blue = imageData.data[idx + 2];
        const alpha = imageData.data[idx + 3];

        if (alpha < 30) {
          // Transparent = no bead
          row.push(null);
          continue;
        }

        // Find closest palette color by Euclidean distance in RGB space
        let bestDist = Infinity;
        let bestHex = paletteHexes[0] || "#000000";
        for (const hex of paletteHexes) {
          const pr = parseInt(hex.slice(1, 3), 16);
          const pg = parseInt(hex.slice(3, 5), 16);
          const pb = parseInt(hex.slice(5, 7), 16);
          const dist = Math.sqrt(
            (red - pr) ** 2 + (green - pg) ** 2 + (blue - pb) ** 2
          );
          if (dist < bestDist) {
            bestDist = dist;
            bestHex = hex;
          }
        }
        row.push(bestHex);
      }
      newCells.push(row);
    }

    this.snap.grid = { rows, cols, cells: newCells };
    this.pushHistory();
    this.emit();
  };

  // Save / Load
  exportJSON = (): string => {
    return JSON.stringify(
      {
        version: 3,
        name: this.snap.projectName,
        author: this.snap.author,
        notes: this.snap.notes,
        netType: this.snap.netType,
        decorativeSkipInterval: this.snap.decorativeSkipInterval,
        grid: this.snap.grid,
        palette: this.snap.palette,
        materialSettings: this.snap.materialSettings,
        gourdSettings: this.snap.gourdSettings,
      },
      null,
      2
    );
  };

  importJSON = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.netType) this.snap.netType = data.netType;
      if (data.decorativeSkipInterval) this.snap.decorativeSkipInterval = data.decorativeSkipInterval;
      if (data.grid) this.snap.grid = data.grid;
      if (data.palette) {
        this.snap.palette = data.palette;
        this.snap.activeColor = data.palette.colors?.[0]?.hex || this.snap.activeColor;
      }
      if (data.materialSettings) {
        this.snap.materialSettings = { ...this.snap.materialSettings, ...data.materialSettings };
      }
      if (data.gourdSettings) {
        this.snap.gourdSettings = { ...this.snap.gourdSettings, ...data.gourdSettings };
      }
      if (data.name) this.snap.projectName = data.name;
      if (data.author) this.snap.author = data.author;
      if (data.notes) this.snap.notes = data.notes;
      this.snap.netChosen = true;
      this.pushHistory();
      this.emit();
    } catch {
      console.error("Failed to import JSON");
    }
  };

  saveLocal = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("shekere-project-v3", this.exportJSON());
      }
    } catch { /* ignore */ }
  };

  loadLocal = () => {
    try {
      if (typeof window !== "undefined") {
        const json = window.localStorage.getItem("shekere-project-v3");
        if (json) this.importJSON(json);
      }
    } catch { /* ignore */ }
  };
}

// Singleton
let storeInstance: EditorStore | null = null;
function getStore(): EditorStore {
  if (!storeInstance) storeInstance = new EditorStore();
  return storeInstance;
}

export function useEditorStore() {
  const store = useRef(getStore()).current;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { snapshot, actions: store };
}

export function useEditorActions() {
  return useRef(getStore()).current;
}
