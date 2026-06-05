import type { GourdSettings } from "./shekere-types";

/**
 * Gourd shape model for traditional shekere instruments.
 *
 * Reference shape: a thick, bulbous, almost-spherical body with a concave
 * neck that cinches to a waist then flares back out to a lip/rim at the top
 * -- the classic "teardrop with flared neck" seen on Yoruba / Maracatu gourds.
 *
 * The profile is piecewise, from base (z=0) to top of neck (z=1):
 *
 *   BODY (z = 0 to BODY_FRACTION):
 *     t = z / BODY_FRACTION  (0..1 across the body)
 *     radius = baseRadius + (bodyR - baseRadius) * cos(PI/2 * (t - peakT) / peakT)
 *     where peakT is derived from bulgePower `p`.
 *     The bottom half of the body (near t=0) starts nearly full-width,
 *     peaks at the maximum body diameter, then tapers toward the neck junction.
 *
 *   NECK (z = BODY_FRACTION to 1.0):
 *     Cinches inward from the body-end radius to a waist, then flares back
 *     to a lip/rim at the very top. The taper parameter `q` controls how
 *     narrow the waist gets (and thus how dramatic the flare is).
 */

export const NECK_FRACTION = 0.30;
export const BODY_FRACTION = 0.70;
export const DEFAULT_NECK_RATIO = 0.4;

/** 
 * Parametric smoothstep between a and b at t [0..1].
 * The 'smoothness' parameter (0..1) controls curve intensity:
 * 0.0 = linear, 0.5 = cubic Hermite, 1.0 = quintic (very smooth, slow start/end)
 */
function smoothstep(a: number, b: number, t: number, smoothness: number = 0.5): number {
  const tc = Math.max(0, Math.min(1, t));
  // Three levels of smoothing
  const linear = tc;
  const cubic = tc * tc * (3 - 2 * tc);
  const quintic = tc * tc * tc * (tc * (tc * 6 - 15) + 10);
  
  // Blend: 0-0.5 goes linear->cubic, 0.5-1.0 goes cubic->quintic
  let s: number;
  if (smoothness <= 0.5) {
    const blend = smoothness * 2; // 0..1
    s = linear + (cubic - linear) * blend;
  } else {
    const blend = (smoothness - 0.5) * 2; // 0..1
    s = cubic + (quintic - cubic) * blend;
  }
  return a + (b - a) * s;
}

/**
 * Compute the radius at normalized height z (0 = base, 1 = top of neck).
 */
export function gourdRadiusAt(z: number, s: GourdSettings): number {
  const bodyR = s.bodyDiameterMm / 2;
  const neckR = s.neckDiameterMm / 2;
  const p = s.bulgePower;
  const q = s.neckTaper;
  const baseRatio = s.baseWidthRatio ?? 0.92;
  const smooth = s.curveSmoothness ?? 0.5;
  const zc = Math.max(0, Math.min(1, z));

  if (zc <= BODY_FRACTION) {
    // ═══ BODY REGION ═══
    // t goes from 0 (base) to 1 (top of body / neck junction)
    const t = zc / BODY_FRACTION;

    // "Peak position" -- where the widest diameter sits.
    // p < 1 pushes peak toward the base (squat gourd)
    // p = 1 => peak at ~35% up from base
    // p > 1 => peak shifts upward (taller, more elongated gourd)
    const peakT = 0.15 + 0.25 * Math.min(p, 3);  // 0.33..0.90

    // Base radius: controlled by baseWidthRatio parameter
    // 1.0 = flat bottom, 0.5 = very narrow base
    const baseR = bodyR * baseRatio;

    if (t <= peakT) {
      // Swelling from base up to the widest point.
      // Blend between sine easing and linear based on smoothness
      const frac = t / peakT;
      const sineEase = Math.sin(frac * Math.PI / 2);
      const eased = frac + (sineEase - frac) * smooth;
      return baseR + (bodyR - baseR) * eased;
    } else {
      // Tapering from the widest point down toward the neck.
      const frac = (t - peakT) / (1 - peakT);
      // End radius at the neck junction -- approaches neckR
      const junctionR = neckR * 1.15;
      return smoothstep(bodyR, junctionR, frac, smooth);
    }
  } else {
    // ═══ NECK REGION ═══
    // Smooth curve from body junction to the top opening.
    // q controls the top opening flare: higher q = wider opening, lower q = narrower
    const tN = (zc - BODY_FRACTION) / NECK_FRACTION; // 0..1

    // Entry radius: matches the end of the body
    const junctionR = neckR * 1.15;
    
    // Top opening radius: controlled by q (neckTaper)
    // q = 1.0 => opening = neckR (no flare)
    // q = 2.0 => opening = neckR * 1.3 (moderate flare) 
    // q = 3.5 => opening = neckR * 1.75 (dramatic flare)
    const flareFactor = 1 + (q - 1) * 0.25;
    const topOpeningR = neckR * Math.max(0.6, Math.min(2.0, flareFactor));
    
    // The neck profile: starts at junction, narrows to a waist, then flares to opening
    // Waist sits at about 60% up the neck
    const waistPos = 0.6;
    const waistR = neckR * 0.85; // Waist is always slightly narrower than base neck
    
    if (tN <= waistPos) {
      // Junction to waist: taper inward
      const frac = tN / waistPos;
      return smoothstep(junctionR, waistR, frac, smooth);
    } else {
      // Waist to top: flare outward to the opening
      const frac = (tN - waistPos) / (1 - waistPos);
      return smoothstep(waistR, topOpeningR, frac, smooth);
    }
  }
}

/** Diameter at normalized height z. */
export function gourdDiameterAt(z: number, s: GourdSettings): number {
  return gourdRadiusAt(z, s) * 2;
}

/** Circumference at normalized height z. */
export function gourdCircumferenceAt(z: number, s: GourdSettings): number {
  return Math.PI * gourdDiameterAt(z, s);
}

/** Profile array of { z, radiusMm } from base (z=0) to top (z=1). */
export function generateGourdProfile(
  s: GourdSettings,
  steps: number
): { z: number; radiusMm: number }[] {
  const out: { z: number; radiusMm: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const z = i / (steps - 1);
    out.push({ z, radiusMm: gourdRadiusAt(z, s) });
  }
  return out;
}

/** Body + neck heights in mm. */
export function gourdDimensions(s: GourdSettings) {
  return {
    neckHeightMm: s.heightMm * NECK_FRACTION,
    bodyHeightMm: s.heightMm * BODY_FRACTION,
    totalHeightMm: s.heightMm,
  };
}

/** Max circumference by sampling. */
export function gourdMaxCircumference(s: GourdSettings, steps = 100): number {
  let maxC = 0;
  for (let i = 0; i <= steps; i++) {
    const c = gourdCircumferenceAt(i / steps, s);
    if (c > maxC) maxC = c;
  }
  return maxC;
}
