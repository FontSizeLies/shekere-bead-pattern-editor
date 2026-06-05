"use client";

import React, { useCallback, useRef, useState, useMemo } from "react";
import { useEditorStore } from "@/lib/use-editor-store";
import {
  generateGourdProfile,
  gourdDimensions,
  gourdRadiusAt,
  BODY_FRACTION,
  NECK_FRACTION,
} from "@/lib/gourd-geometry";
import { Slider } from "@/components/ui/slider";

/**
 * Gourd Preview: renders a realistic shekere silhouette with the teardrop body
 * + concave flared neck profile, plus bead projection.
 *
 * Now includes draggable control handles on the silhouette to adjust:
 * - Body diameter (widest point)
 * - Neck diameter (at the waist)
 * - Base width
 * - Total height
 */

const PROFILE_STEPS = 120;
const BASE_BEAD_RADIUS = 3.5;
const HANDLE_RADIUS = 8;

type DragTarget = "bodyDiameter" | "neckDiameter" | "baseWidth" | "height" | "lipWidth" | null;

export function GourdPreview() {
  const { snapshot, actions } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Rotation drag
  const [isRotating, setIsRotating] = useState(false);
  const lastX = useRef(0);
  
  // Handle drag
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const dragStartValue = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const { grid, gourdSettings, gourdRotation, previewBeadScale } = snapshot;
  const beadR = BASE_BEAD_RADIUS * previewBeadScale;

  // -- Profile from geometry --
  const profile = useMemo(
    () => generateGourdProfile(gourdSettings, PROFILE_STEPS),
    [gourdSettings]
  );
  const dims = useMemo(() => gourdDimensions(gourdSettings), [gourdSettings]);

  // -- SVG sizing --
  const svgW = 420;
  const svgH = 560;
  const centerX = svgW / 2;
  const marginTop = 40;
  const marginBottom = 60;
  const availableH = svgH - marginTop - marginBottom;
  const availableW = svgW * 0.7; // Leave room for handles on sides

  const maxR = Math.max(...profile.map((p) => p.radiusMm));
  const totalH = gourdSettings.heightMm;
  const totalW = maxR * 2;
  
  // Scale to fit both height AND width, respecting the actual gourd proportions
  const scaleByHeight = availableH / Math.max(totalH, 1);
  const scaleByWidth = availableW / Math.max(totalW, 1);
  const scaleFactor = Math.min(scaleByHeight, scaleByWidth);
  
  // Actual display dimensions after scaling
  const gourdDisplayH = totalH * scaleFactor;
  const gourdDisplayW = totalW * scaleFactor;
  
  // Center vertically in available space
  const topY = marginTop + (availableH - gourdDisplayH) / 2;

  // Conversion helpers
  const mmToSvgX = useCallback((mm: number) => mm * scaleFactor, [scaleFactor]);
  const svgXToMm = useCallback((svgUnits: number) => svgUnits / scaleFactor, [scaleFactor]);
  const zToSvgY = useCallback((z: number) => topY + (1 - z) * gourdDisplayH, [topY, gourdDisplayH]);

  // Reversed: SVG top = z=1 (top of neck), SVG bottom = z=0 (base)
  const profileReversed = useMemo(() => [...profile].reverse(), [profile]);

  // -- Silhouette path --
  const silhouettePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < PROFILE_STEPS; i++) {
      const { z, radiusMm } = profileReversed[i];
      const r = radiusMm * scaleFactor;
      const x = centerX + r;
      // Map z (0=base, 1=top) to SVG y (topY=top, topY+gourdDisplayH=bottom)
      const y = topY + (1 - z) * gourdDisplayH;
      pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    for (let i = PROFILE_STEPS - 1; i >= 0; i--) {
      const { z, radiusMm } = profileReversed[i];
      const r = radiusMm * scaleFactor;
      const x = centerX - r;
      const y = topY + (1 - z) * gourdDisplayH;
      pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(" ") + " Z";
  }, [profileReversed, scaleFactor, gourdDisplayH, centerX, topY]);

  // -- Control handle positions --
  const handles = useMemo(() => {
    const gs = gourdSettings;
    const p = gs.bulgePower;
    const baseRatio = gs.baseWidthRatio ?? 0.92;
    
    // Peak position (where body is widest)
    const peakT = 0.15 + 0.25 * Math.min(p, 3);
    const peakZ = peakT * BODY_FRACTION;
    const bodyRadius = gourdRadiusAt(peakZ, gs);
    
    // Base position (z=0)
    const baseRadius = gourdRadiusAt(0, gs);
    
    // Neck waist position (narrowest part of neck)
    const waistZ = BODY_FRACTION + 0.55 * NECK_FRACTION;
    const neckRadius = gourdRadiusAt(waistZ, gs);
    
    // Lip position (top)
    const lipRadius = gourdRadiusAt(1, gs);
    
    return {
      bodyDiameter: { 
        x: centerX + mmToSvgX(bodyRadius), 
        y: zToSvgY(peakZ),
        label: `Body: ${gs.bodyDiameterMm}mm`,
        value: gs.bodyDiameterMm
      },
      baseWidth: { 
        x: centerX + mmToSvgX(baseRadius), 
        y: zToSvgY(0),
        label: `Base: ${Math.round(baseRatio * 100)}%`,
        value: baseRatio
      },
      neckDiameter: { 
        x: centerX + mmToSvgX(neckRadius), 
        y: zToSvgY(waistZ),
        label: `Neck: ${gs.neckDiameterMm}mm`,
        value: gs.neckDiameterMm
      },
      lipWidth: {
        x: centerX + mmToSvgX(lipRadius),
        y: zToSvgY(1),
        label: `Lip`,
        value: lipRadius
      },
      height: {
        x: svgW - 30,
        y: topY + gourdDisplayH / 2,
        label: `H: ${gs.heightMm}mm`,
        value: gs.heightMm
      }
    };
  }, [gourdSettings, centerX, mmToSvgX, zToSvgY, topY, gourdDisplayH, svgW]);

  // -- Project beads onto gourd body --
  const projectedBeads = useMemo(() => {
    const beads: { x: number; y: number; color: string; opacity: number }[] = [];
    const totalRows = grid.rows;
    const totalCols = grid.cols;
    if (totalRows === 0 || totalCols === 0) return beads;

    for (let r = 0; r < totalRows; r++) {
      const rowT = totalRows > 1 ? r / (totalRows - 1) : 0.5;
      const z = (1 - rowT) * BODY_FRACTION;
      const localR = gourdRadiusAt(z, gourdSettings) * scaleFactor;
      const svgFraction = 1 - z;
      const y = topY + svgFraction * gourdDisplayH;

      for (let c = 0; c < totalCols; c++) {
        const color = grid.cells[r]?.[c];
        if (!color) continue;

        const isOddRow = r % 2 === 1;
        const colOffset = isOddRow ? 0.5 : 0;
        const angle =
          ((c + colOffset) / totalCols + gourdRotation / 360) * Math.PI * 2;

        const zDepth = Math.cos(angle);
        if (zDepth < -0.05) continue;

        const xProjected = Math.sin(angle) * localR;
        const opacity = 0.15 + 0.85 * Math.max(0, zDepth);

        beads.push({ x: centerX + xProjected, y, color, opacity });
      }
    }
    return beads;
  }, [grid, gourdSettings, scaleFactor, gourdDisplayH, gourdRotation, centerX, topY]);

  // -- Handle drag start --
  const handleDragStart = useCallback((target: DragTarget, e: React.PointerEvent) => {
    e.stopPropagation();
    setDragTarget(target);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    const gs = gourdSettings;
    if (target === "bodyDiameter") dragStartValue.current = gs.bodyDiameterMm;
    else if (target === "neckDiameter") dragStartValue.current = gs.neckDiameterMm;
    else if (target === "baseWidth") dragStartValue.current = gs.baseWidthRatio ?? 0.92;
    else if (target === "height") dragStartValue.current = gs.heightMm;
    
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [gourdSettings]);

  // -- Handle drag move --
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragTarget) {
      // Rotation mode
      if (isRotating) {
        const dx = e.clientX - lastX.current;
        lastX.current = e.clientX;
        actions.setGourdRotation((gourdRotation + dx * 0.5) % 360);
      }
      return;
    }
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Convert pixel movement to mm (rough approximation)
    const sensitivity = 0.5;
    
    if (dragTarget === "bodyDiameter") {
      const newValue = Math.round(Math.max(120, Math.min(300, dragStartValue.current + dx * sensitivity)));
      actions.setGourdSettings({ bodyDiameterMm: newValue });
    } else if (dragTarget === "neckDiameter") {
      const newValue = Math.round(Math.max(30, Math.min(gourdSettings.bodyDiameterMm * 0.7, dragStartValue.current + dx * sensitivity)));
      actions.setGourdSettings({ neckDiameterMm: newValue });
    } else if (dragTarget === "baseWidth") {
      const newValue = Math.max(0.5, Math.min(1.0, dragStartValue.current + dx * 0.002));
      actions.setGourdSettings({ baseWidthRatio: newValue });
    } else if (dragTarget === "height") {
      const newValue = Math.round(Math.max(180, Math.min(500, dragStartValue.current - dy * sensitivity)));
      actions.setGourdSettings({ heightMm: newValue });
    }
  }, [dragTarget, isRotating, gourdRotation, actions, gourdSettings.bodyDiameterMm]);

  // -- Handle drag end --
  const handleDragEnd = useCallback(() => {
    setDragTarget(null);
    setIsRotating(false);
  }, []);

  // -- Background rotation drag --
  const handleBackgroundDown = useCallback((e: React.PointerEvent) => {
    setIsRotating(true);
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  // Neck start y in SVG (where body meets neck at z=BODY_FRACTION)
  const neckStartSvgY = topY + (1 - BODY_FRACTION) * gourdDisplayH;

  // -- Dimension lines --
  const dimensionLines = useMemo(() => {
    const gs = gourdSettings;
    const p = gs.bulgePower;
    const peakT = 0.15 + 0.25 * Math.min(p, 3);
    const peakZ = peakT * BODY_FRACTION;
    const waistZ = BODY_FRACTION + 0.55 * NECK_FRACTION;
    
    return {
      bodyY: zToSvgY(peakZ),
      baseY: zToSvgY(0),
      neckY: zToSvgY(waistZ),
      lipY: zToSvgY(1),
    };
  }, [gourdSettings, zToSvgY]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden bg-background"
        style={{ touchAction: "none" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="max-w-full max-h-full"
          style={{ width: "100%", height: "100%", cursor: dragTarget ? "ew-resize" : "grab" }}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handleBackgroundDown}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <defs>
            <radialGradient id="gourd-shading" cx="0.38" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="hsl(28, 55%, 62%)" />
              <stop offset="50%" stopColor="hsl(24, 50%, 45%)" />
              <stop offset="100%" stopColor="hsl(20, 45%, 28%)" />
            </radialGradient>
            <clipPath id="gourd-clip">
              <path d={silhouettePath} />
            </clipPath>
          </defs>

          {/* Ground shadow */}
          <ellipse
            cx={centerX + 3}
            cy={topY + gourdDisplayH + 8}
            rx={gourdRadiusAt(0, gourdSettings) * scaleFactor * 0.6}
            ry={4}
            fill="hsl(var(--foreground))"
            opacity={0.08}
          />

          {/* Gourd body + neck silhouette */}
          <path
            d={silhouettePath}
            fill="url(#gourd-shading)"
            stroke="hsl(25, 40%, 28%)"
            strokeWidth={1}
          />

          {/* Dimension guide lines (dashed) */}
          <g stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="4 4" opacity={0.4}>
            {/* Body diameter line */}
            <line x1={centerX - handles.bodyDiameter.x + centerX} y1={dimensionLines.bodyY} x2={handles.bodyDiameter.x} y2={dimensionLines.bodyY} />
            {/* Neck diameter line */}
            <line x1={centerX - handles.neckDiameter.x + centerX} y1={dimensionLines.neckY} x2={handles.neckDiameter.x} y2={dimensionLines.neckY} />
            {/* Base width line */}
            <line x1={centerX - handles.baseWidth.x + centerX} y1={dimensionLines.baseY} x2={handles.baseWidth.x} y2={dimensionLines.baseY} />
            {/* Height line */}
            <line x1={svgW - 35} y1={topY} x2={svgW - 35} y2={topY + gourdDisplayH} />
          </g>

          {/* Cord-ring guide at the top of the body (net anchor) */}
          <ellipse
            cx={centerX}
            cy={neckStartSvgY}
            rx={gourdRadiusAt(BODY_FRACTION, gourdSettings) * scaleFactor}
            ry={2}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.2}
            opacity={0.3}
            strokeDasharray="4 3"
          />

          {/* Projected beads */}
          <g clipPath="url(#gourd-clip)">
            {projectedBeads.map((bead, i) => (
              <circle
                key={i}
                cx={bead.x}
                cy={bead.y}
                r={beadR}
                fill={bead.color}
                opacity={bead.opacity}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth={0.3}
              />
            ))}
          </g>

          {/* Draggable Control Handles */}
          <g>
            {/* Body diameter handle */}
            <g 
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => handleDragStart("bodyDiameter", e)}
            >
              <circle
                cx={handles.bodyDiameter.x}
                cy={handles.bodyDiameter.y}
                r={HANDLE_RADIUS}
                fill="hsl(var(--primary))"
                stroke="white"
                strokeWidth={2}
                opacity={dragTarget === "bodyDiameter" ? 1 : 0.8}
              />
              <text
                x={handles.bodyDiameter.x + 14}
                y={handles.bodyDiameter.y + 4}
                fontSize={10}
                fill="hsl(var(--primary))"
                fontWeight="500"
              >
                {handles.bodyDiameter.label}
              </text>
            </g>

            {/* Base width handle */}
            <g 
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => handleDragStart("baseWidth", e)}
            >
              <circle
                cx={handles.baseWidth.x}
                cy={handles.baseWidth.y}
                r={HANDLE_RADIUS}
                fill="hsl(var(--chart-2))"
                stroke="white"
                strokeWidth={2}
                opacity={dragTarget === "baseWidth" ? 1 : 0.8}
              />
              <text
                x={handles.baseWidth.x + 14}
                y={handles.baseWidth.y + 4}
                fontSize={10}
                fill="hsl(var(--chart-2))"
                fontWeight="500"
              >
                {handles.baseWidth.label}
              </text>
            </g>

            {/* Neck diameter handle */}
            <g 
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => handleDragStart("neckDiameter", e)}
            >
              <circle
                cx={handles.neckDiameter.x}
                cy={handles.neckDiameter.y}
                r={HANDLE_RADIUS}
                fill="hsl(var(--chart-3))"
                stroke="white"
                strokeWidth={2}
                opacity={dragTarget === "neckDiameter" ? 1 : 0.8}
              />
              <text
                x={handles.neckDiameter.x + 14}
                y={handles.neckDiameter.y + 4}
                fontSize={10}
                fill="hsl(var(--chart-3))"
                fontWeight="500"
              >
                {handles.neckDiameter.label}
              </text>
            </g>

            {/* Height handle (vertical bar on the right side showing full height) */}
            <g 
              style={{ cursor: "ns-resize" }}
              onPointerDown={(e) => handleDragStart("height", e)}
            >
              {/* Vertical bar showing the gourd height */}
              <line
                x1={svgW - 30}
                y1={topY}
                x2={svgW - 30}
                y2={topY + gourdDisplayH}
                stroke="hsl(var(--chart-4))"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={dragTarget === "height" ? 1 : 0.7}
              />
              {/* Top arrow cap */}
              <path
                d={`M${svgW - 30} ${topY - 8} l-5 8 h10 z`}
                fill="hsl(var(--chart-4))"
                opacity={dragTarget === "height" ? 1 : 0.7}
              />
              {/* Bottom arrow cap */}
              <path
                d={`M${svgW - 30} ${topY + gourdDisplayH + 8} l-5 -8 h10 z`}
                fill="hsl(var(--chart-4))"
                opacity={dragTarget === "height" ? 1 : 0.7}
              />
              {/* Label */}
              <text
                x={svgW - 30}
                y={topY + gourdDisplayH / 2 + 4}
                fontSize={10}
                fill="hsl(var(--chart-4))"
                fontWeight="600"
                textAnchor="middle"
              >
                {gourdSettings.heightMm}mm
              </text>
            </g>
          </g>

          {/* Legend */}
          <g fontSize={9} fill="hsl(var(--muted-foreground))" opacity={0.7}>
            <text x={12} y={svgH - 30}>Drag handles to adjust</text>
            <text x={12} y={svgH - 18}>Drag gourd to rotate</text>
          </g>
        </svg>
      </div>

      {/* Bead size slider */}
      <div className="bg-card border-t border-border px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          Bead Scale
        </span>
        <Slider
          min={0.5}
          max={3.0}
          step={0.1}
          value={[previewBeadScale]}
          onValueChange={([v]) => actions.setPreviewBeadScale(v)}
          className="flex-1"
          aria-label="Preview bead size scale"
        />
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
          {previewBeadScale.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
