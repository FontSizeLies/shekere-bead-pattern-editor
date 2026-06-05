// ── Net Weaving Types ───────────────────────────────────
export type NetType =
  | "single-diagonal"
  | "double-diagonal"
  | "intersection"
  | "decorative";

export const NET_TYPE_META: Record<
  NetType,
  { label: string; description: string; densityFactor: number }
> = {
  "single-diagonal": {
    label: "Single-Direction Diagonal",
    description:
      "Beads placed along one cord direction creating a consistent slanted mesh with more open spacing.",
    densityFactor: 0.5,
  },
  "double-diagonal": {
    label: "Double-Direction Diagonal",
    description:
      "Beads on both crossing cord directions forming a criss-cross diamond structure.",
    densityFactor: 1.0,
  },
  intersection: {
    label: "Intersection Net",
    description:
      "Two cords pass through the same bead at each junction, producing a tighter flat mesh.",
    densityFactor: 1.2,
  },
  decorative: {
    label: "Decorative / Skip-Knot",
    description:
      "Patterned spacing with intentional bead gaps allowing bold geometric motifs.",
    densityFactor: 0.65,
  },
};

// ── Bead & Grid ─────────────────────────────────────────

export interface BeadColor {
  id: string;
  name: string;
  hex: string;
}

export interface BeadCell {
  color: string | null;
}

export interface GridState {
  rows: number;
  cols: number;
  cells: (string | null)[][]; // [row][col] = hex color or null
}

export interface Palette {
  id: string;
  name: string;
  colors: BeadColor[];
}

export interface PatternPreset {
  id: string;
  name: string;
  description: string;
  category: "traditional" | "modern";
  generator: (rows: number, cols: number, palette: string[]) => (string | null)[][];
}

// ── Material Settings ───────────────────────────────────

export interface MaterialSettings {
  beadSizeMm: number;
  spacingPreset: "tight" | "standard" | "loose";
  gourdCircumferenceMm: number;
  knotAllowanceMm: number;
  beadHoleFactor: number;
  safetyMarginPercent: number;
  pricePerBead: number;
  pricePerMeterCord: number;
}

// ── Gourd ───────────────────────────────────────────────

export interface GourdSettings {
  /** Body diameter in mm (the widest point) */
  bodyDiameterMm: number;
  /** Neck diameter in mm -- defaults to 0.4 * bodyDiameterMm */
  neckDiameterMm: number;
  /** Total height in mm (neck + body) */
  heightMm: number;
  /**
   * Bulge power 'p' in D(z) = d + (D - d) * sin(pi * z^p) * e^(-q*z).
   * Controls how quickly the body swells from the base.
   * Traditional Maracatu range: 1.2 - 2.5, default 1.8.
   */
  bulgePower: number;
  /**
   * Neck taper 'q' in D(z) = d + (D - d) * sin(pi * z^p) * e^(-q*z).
   * Controls how sharply the profile narrows toward the neck.
   * Traditional Maracatu range: 1.0 - 3.5, default 2.0.
   */
  neckTaper: number;
  /**
   * Base width ratio: how wide the base is relative to max body diameter.
   * 1.0 = flat bottom (starts at full width), 0.5 = very narrow base.
   * Default 0.92 for a natural rounded bottom.
   */
  baseWidthRatio: number;
  /**
   * Curve smoothness: controls how smooth transitions are between body regions.
   * 0.0 = sharp transitions, 1.0 = very smooth/gradual curves.
   * Default 0.5 for balanced natural curves.
   */
  curveSmoothness: number;
}

export interface MaterialEstimate {
  totalBeads: number;
  beadsByColor: { color: string; name: string; count: number }[];
  totalCordLengthM: number;
  knotCount: number;
  estimatedWeightG: number;
  estimatedCost: number;
}

// ── Construction Instructions ───────────────────────────

export interface InstructionStep {
  step: number;
  action: string;
  detail: string;
}

// ── App State ───────────────────────────────────────────

export type ToolMode = "paint" | "erase" | "eyedropper" | "select" | "bucket";
export type AppMode = "design" | "preview";
/** Controls bead visual scale in the 3D gourd preview (0.5 - 3.0) */
export type PreviewBeadScale = number;
export type BottomSheetTab =
  | "net"
  | "pattern"
  | "beads"
  | "gourd"
  | "materials"
  | "export";

export interface ProjectState {
  name: string;
  netType: NetType;
  grid: GridState;
  palette: Palette;
  materialSettings: MaterialSettings;
  gourdSettings: GourdSettings;
  activeColor: string;
  toolMode: ToolMode;
  appMode: AppMode;
  zoom: number;
  panX: number;
  panY: number;
  author: string;
  notes: string;
}

export interface HistoryEntry {
  grid: GridState;
  timestamp: number;
}

// ── Constants ───────────────────────────────────────────

export const SPACING_VALUES: Record<string, number> = {
  tight: 1.5,
  standard: 3,
  loose: 5,
};

/** Decorative net skip interval options */
export const SKIP_INTERVALS = [2, 3, 4, 5] as const;

export const GOURD_PRESETS: {
  name: string;
  bodyDiameterMm: number;
  heightMm: number;
}[] = [
  { name: "Small Traditional", bodyDiameterMm: 180, heightMm: 280 },
  { name: "Medium Traditional", bodyDiameterMm: 200, heightMm: 310 },
  { name: "Large Traditional", bodyDiameterMm: 220, heightMm: 350 },
  { name: "Custom", bodyDiameterMm: 200, heightMm: 310 },
];

/**
 * Default gourd based on traditional Maracatu proportions:
 * - Neck length = 30% of total height
 * - Body height = 70% of total height
 * - Neck diameter = 40% of body diameter
 * - Height:Diameter ratio ~ 1.55 (within the 2-3x range)
 */
export const DEFAULT_GOURD_SETTINGS: GourdSettings = {
  bodyDiameterMm: 200,
  neckDiameterMm: 80, // 0.4 * 200
  heightMm: 310,
  bulgePower: 1.8,
  neckTaper: 2.0,
  baseWidthRatio: 0.92,
  curveSmoothness: 0.5,
};

export const DEFAULT_PALETTES: Palette[] = [
  {
    id: "earth-tones",
    name: "Earth Tones",
    colors: [
      { id: "c1", name: "Terracotta", hex: "#C75B39" },
      { id: "c2", name: "Warm Sand", hex: "#D4A574" },
      { id: "c3", name: "Deep Brown", hex: "#5C3A21" },
      { id: "c4", name: "Ivory", hex: "#F5ECD7" },
      { id: "c5", name: "Forest Green", hex: "#3D6B4F" },
      { id: "c6", name: "Burnt Orange", hex: "#D4752E" },
    ],
  },
  {
    id: "ocean",
    name: "Ocean Blues",
    colors: [
      { id: "c1", name: "Deep Sea", hex: "#1B3A5C" },
      { id: "c2", name: "Teal", hex: "#2D8B7A" },
      { id: "c3", name: "Sky Blue", hex: "#6EB5D9" },
      { id: "c4", name: "Pearl", hex: "#E8F0F2" },
      { id: "c5", name: "Coral", hex: "#E87461" },
      { id: "c6", name: "Sand", hex: "#D4C5A9" },
    ],
  },
  {
    id: "vibrant",
    name: "Vibrant Festival",
    colors: [
      { id: "c1", name: "Crimson", hex: "#DC143C" },
      { id: "c2", name: "Gold", hex: "#FFD700" },
      { id: "c3", name: "Royal Blue", hex: "#2555A0" },
      { id: "c4", name: "Emerald", hex: "#50C878" },
      { id: "c5", name: "White", hex: "#FFFFFF" },
      { id: "c6", name: "Onyx", hex: "#1A1A1A" },
    ],
  },
  {
    id: "colorblind-safe",
    name: "Color-Blind Safe",
    colors: [
      { id: "c1", name: "Blue", hex: "#0072B2" },
      { id: "c2", name: "Orange", hex: "#E69F00" },
      { id: "c3", name: "Green", hex: "#009E73" },
      { id: "c4", name: "Pink", hex: "#CC79A7" },
      { id: "c5", name: "Light Blue", hex: "#56B4E9" },
      { id: "c6", name: "Vermillion", hex: "#D55E00" },
    ],
  },
];
