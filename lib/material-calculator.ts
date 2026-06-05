import type {
  GridState,
  MaterialSettings,
  MaterialEstimate,
  BeadColor,
  NetType,
  InstructionStep,
  GourdSettings,
} from "./shekere-types";
import { SPACING_VALUES, NET_TYPE_META } from "./shekere-types";
import { gourdCircumferenceAt, NECK_FRACTION } from "./gourd-geometry";

/**
 * Calculate materials factoring in the chosen net topology.
 *
 * Different net types have different cord-path lengths, intersection counts,
 * and knot densities.
 */
export function calculateMaterials(
  grid: GridState,
  settings: MaterialSettings,
  paletteColors: BeadColor[],
  netType: NetType,
  decorativeSkipInterval: number = 3,
  gourdSettings?: GourdSettings
): MaterialEstimate {
  const colorMap = new Map<string, { name: string; count: number }>();
  const density = NET_TYPE_META[netType].densityFactor;

  let totalBeads = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const hex = grid.cells[r]?.[c];
      if (hex) {
        totalBeads++;
        const existing = colorMap.get(hex);
        if (existing) {
          existing.count++;
        } else {
          const paletteEntry = paletteColors.find(
            (pc) => pc.hex.toLowerCase() === hex.toLowerCase()
          );
          colorMap.set(hex, { name: paletteEntry?.name || hex, count: 1 });
        }
      }
    }
  }

  const beadsByColor = Array.from(colorMap.entries())
    .map(([color, data]) => ({ color, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count);

  const s = SPACING_VALUES[settings.spacingPreset] || 3;
  const d = settings.beadSizeMm;
  const G = settings.gourdCircumferenceMm;
  const k = settings.knotAllowanceMm;
  const R = grid.rows;
  const C = grid.cols;

  // Cord count and length varies by net type
  let cordPasses: number;
  let knotCount: number;
  let lengthPerPassMm: number;

  switch (netType) {
    case "single-diagonal": {
      // Single direction: C diagonal cords running top-to-bottom
      cordPasses = C;
      lengthPerPassMm = R * Math.sqrt((d + s) ** 2 + (d + s) ** 2); // diagonal travel
      knotCount = R * C * 0.3;
      break;
    }
    case "double-diagonal": {
      // Both directions: 2 * C cords crossing
      cordPasses = C * 2;
      lengthPerPassMm = R * Math.sqrt((d + s) ** 2 + (d + s) ** 2);
      knotCount = R * C * 0.8;
      break;
    }
    case "intersection": {
      // Intersection net: every bead is a shared junction, so 2x cord through each bead
      cordPasses = C * 2;
      lengthPerPassMm = R * (d + s) * 1.2;
      knotCount = R * C; // every cell is a knot
      break;
    }
    case "decorative": {
      // Skip-knot: fewer beads, but cord still runs through
      const skipInterval = decorativeSkipInterval;
      cordPasses = C;
      lengthPerPassMm = R * (d + s + (skipInterval - 1) * s);
      knotCount = Math.ceil((R * C) / skipInterval) * 0.5;
      break;
    }
  }

  // Horizontal wrap cords (ring cords at each row).
  // If gourd geometry is available, use formula-based circumference per row.
  let horizontalLengthMm = 0;
  if (gourdSettings) {
    const bodyFraction = 1 - NECK_FRACTION;
    for (let row = 0; row < R; row++) {
      const rowT = R > 1 ? row / (R - 1) : 0.5;
      const z = rowT * bodyFraction;
      horizontalLengthMm += gourdCircumferenceAt(z, gourdSettings);
    }
  } else {
    horizontalLengthMm = R * (G > 0 ? G : C * (d + s));
  }

  // Total cord
  const totalCordMm = cordPasses * lengthPerPassMm + horizontalLengthMm;
  const knotAllowanceMm = knotCount * k;
  const adjustedMm = (totalCordMm + knotAllowanceMm) / settings.beadHoleFactor;
  const safetyMultiplier = 1 + settings.safetyMarginPercent / 100;
  const totalCordLengthM = (adjustedMm * safetyMultiplier * density) / 1000;

  // Weight: avg bead ~0.5g, cord ~2g/m
  const estimatedWeightG = Math.round(totalBeads * 0.5 + totalCordLengthM * 2);

  // Cost
  const estimatedCost =
    Math.round(
      (totalBeads * settings.pricePerBead + totalCordLengthM * settings.pricePerMeterCord) * 100
    ) / 100;

  return {
    totalBeads,
    beadsByColor,
    totalCordLengthM: Math.round(totalCordLengthM * 100) / 100,
    knotCount: Math.round(knotCount),
    estimatedWeightG,
    estimatedCost,
  };
}

// ── Instruction generators per net type ─────────────────────

export function generateInstructions(
  netType: NetType,
  rows: number,
  cols: number,
  decorativeSkipInterval: number = 3
): InstructionStep[] {
  switch (netType) {
    case "single-diagonal":
      return generateSingleDiagonalInstructions(rows, cols);
    case "double-diagonal":
      return generateDoubleDiagonalInstructions(rows, cols);
    case "intersection":
      return generateIntersectionInstructions(rows, cols);
    case "decorative":
      return generateDecorativeInstructions(rows, cols, decorativeSkipInterval);
  }
}

function generateSingleDiagonalInstructions(rows: number, cols: number): InstructionStep[] {
  return [
    {
      step: 1,
      action: "Prepare cords",
      detail: `Cut ${cols} cords, each long enough to travel diagonally across ${rows} rows plus knotting allowance.`,
    },
    {
      step: 2,
      action: "Attach to neck ring",
      detail: `Tie all ${cols} cords evenly spaced around the gourd neck ring. Space them so they divide the circumference into ${cols} equal sections.`,
    },
    {
      step: 3,
      action: "Begin Row 1",
      detail: `Starting from the first cord, thread a bead onto it, then tie a knot. Move to the next cord position diagonally (shift right by one position) and repeat.`,
    },
    {
      step: 4,
      action: "Continue diagonal pattern",
      detail: `For each subsequent row, shift every cord one position in the same direction. Thread bead, knot, shift. This creates the single-direction slant across ${rows} rows.`,
    },
    {
      step: 5,
      action: "Finish net",
      detail: `After row ${rows}, gather all cords at the bottom and tie off securely. Trim excess cord to 1-2cm below the final knot.`,
    },
  ];
}

function generateDoubleDiagonalInstructions(rows: number, cols: number): InstructionStep[] {
  return [
    {
      step: 1,
      action: "Prepare cords",
      detail: `Cut ${cols * 2} cords (two sets of ${cols}). One set will travel left-to-right diagonally, the other right-to-left.`,
    },
    {
      step: 2,
      action: "Attach to neck ring",
      detail: `Tie both sets of cords around the neck ring, alternating between left-diagonal and right-diagonal cords.`,
    },
    {
      step: 3,
      action: "Row 1 -- first crossing",
      detail: `Thread a bead where the first left-cord and first right-cord cross. Tie a knot to secure the bead at the intersection. Continue across all ${cols} crossing points.`,
    },
    {
      step: 4,
      action: "Continue diamond mesh",
      detail: `For rows 2 through ${rows}: each left-cord shifts one position right, each right-cord shifts one position left. Where they cross, thread a bead and knot. This creates the diamond pattern.`,
    },
    {
      step: 5,
      action: "Check tension",
      detail: `Every 3-4 rows, place the net on the gourd and verify bead spacing is even. Adjust knot tightness as needed.`,
    },
    {
      step: 6,
      action: "Finish net",
      detail: `After row ${rows}, gather all cords and tie off. The diamond openings should be uniform across the gourd body.`,
    },
  ];
}

function generateIntersectionInstructions(rows: number, cols: number): InstructionStep[] {
  return [
    {
      step: 1,
      action: "Prepare cords",
      detail: `Cut ${cols * 2} cords. Each pair of cords will share bead junctions throughout the net.`,
    },
    {
      step: 2,
      action: "String shared beads",
      detail: `For each junction point, thread BOTH cords through the same bead hole. This requires beads with holes large enough for two cords.`,
    },
    {
      step: 3,
      action: "Row 1 -- junction row",
      detail: `Create ${cols} junction beads across the first row. Each bead sits where two cord paths cross, locked in place by the friction of both cords.`,
    },
    {
      step: 4,
      action: "Continue rows",
      detail: `For rows 2 through ${rows}: offset the junction points by half a position (like brickwork) so the net creates a tight, flat mesh. Thread both cords through each bead.`,
    },
    {
      step: 5,
      action: "Tension check",
      detail: `This net type produces a tighter mesh. Check that the net lies flat against the gourd without bunching.`,
    },
    {
      step: 6,
      action: "Finish net",
      detail: `Tie off all cord ends after row ${rows}. The flat mesh should conform closely to the gourd surface.`,
    },
  ];
}

function generateDecorativeInstructions(
  rows: number,
  cols: number,
  skipInterval: number
): InstructionStep[] {
  return [
    {
      step: 1,
      action: "Plan the motif",
      detail: `This net uses a skip interval of ${skipInterval}: place a bead every ${skipInterval}th position. Mark your desired motif on the design grid first.`,
    },
    {
      step: 2,
      action: "Prepare cords",
      detail: `Cut ${cols} cords. Cord length should account for the extra spacing between beads (roughly ${skipInterval}x normal spacing).`,
    },
    {
      step: 3,
      action: "Attach and begin",
      detail: `Tie cords to the neck ring. For Row 1: thread a bead at positions 1, ${1 + skipInterval}, ${1 + skipInterval * 2}, etc. Tie a knot at each bead and leave open cord between them.`,
    },
    {
      step: 4,
      action: "Continue skip-knot pattern",
      detail: `For rows 2 through ${rows}: follow the same skip interval but offset by half the interval on alternating rows to create a decorative open pattern.`,
    },
    {
      step: 5,
      action: "Check motif alignment",
      detail: `Place the net on the gourd every few rows to ensure the decorative gaps create the intended visual pattern.`,
    },
    {
      step: 6,
      action: "Finish net",
      detail: `Tie off all cords. The open spacing should allow the gourd surface to show through between bead clusters.`,
    },
  ];
}

// ── CSV exports ─────────────────────────────────────────────

export function generateMaterialsCSV(
  estimate: MaterialEstimate,
  netType: NetType
): string {
  const lines: string[] = [];
  lines.push("Material,Color,Quantity,Unit");
  estimate.beadsByColor.forEach((bc) => {
    lines.push(`Bead,${bc.name} (${bc.color}),${bc.count},pcs`);
  });
  lines.push(`Bead Total,,${estimate.totalBeads},pcs`);
  lines.push(`Cord,,${estimate.totalCordLengthM},m`);
  lines.push(`Knots,,${estimate.knotCount},count`);
  lines.push(`Est. Weight,,${estimate.estimatedWeightG},g`);
  lines.push(`Est. Cost,,${estimate.estimatedCost},USD`);
  lines.push(`Net Type,,${NET_TYPE_META[netType].label},`);
  return lines.join("\n");
}

export function generateBeadSequenceCSV(grid: GridState, paletteColors: BeadColor[]): string {
  const lines: string[] = [];
  lines.push("Row," + Array.from({ length: grid.cols }, (_, i) => `Col${i + 1}`).join(","));
  for (let r = 0; r < grid.rows; r++) {
    const row =
      grid.cells[r]?.map((hex) => {
        if (!hex) return "-";
        const entry = paletteColors.find((pc) => pc.hex.toLowerCase() === hex.toLowerCase());
        return entry?.name || hex;
      }) || [];
    lines.push(`${r + 1},${row.join(",")}`);
  }
  return lines.join("\n");
}
