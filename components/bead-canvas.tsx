"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { useEditorStore } from "@/lib/use-editor-store";
import type { NetType } from "@/lib/shekere-types";
import { Plus, Minus } from "lucide-react";

// ── Layout constants ────────────────────────────────────────

const BASE = 36;
const BEAD_R = BASE * 0.35;
const PAD = BASE;

// ── Position helpers ────────────────────────────────────────

function beadX(row: number, col: number, netType: NetType): number {
  if (netType === "intersection") {
    const sx = BASE * 0.8;
    return PAD + col * sx + (row % 2) * (sx * 0.5);
  }
  return PAD + col * BASE + (row % 2) * (BASE * 0.5);
}

function beadY(row: number, netType: NetType): number {
  if (netType === "intersection") {
    return PAD + row * BASE * 0.7;
  }
  return PAD + row * BASE * 0.866;
}

function canvasSize(
  rows: number,
  cols: number,
  netType: NetType
): { w: number; h: number } {
  if (rows === 0 || cols === 0) return { w: PAD * 2, h: PAD * 2 };
  const lastX = beadX(1, cols - 1, netType);
  const lastY = beadY(rows - 1, netType);
  return {
    w: lastX + PAD + BASE * 0.5,
    h: lastY + PAD,
  };
}

// ── Theme color cache ───────────────────────────────────────

let _cachedColors: { border: string; muted: string; fg: string; bg: string } | null = null;
let _lastCacheTime = 0;

function getThemeColors(): { border: string; muted: string; fg: string; bg: string } {
  const now = Date.now();
  if (_cachedColors && now - _lastCacheTime < 2000) return _cachedColors;
  if (typeof document === "undefined")
    return { border: "#ccc", muted: "#999", fg: "#222", bg: "#f5f5f5" };
  const style = getComputedStyle(document.documentElement);
  const hsl = (v: string) => {
    const raw = style.getPropertyValue(v).trim();
    return raw ? `hsl(${raw})` : "#888";
  };
  _cachedColors = {
    border: hsl("--border"),
    muted: hsl("--muted-foreground"),
    fg: hsl("--foreground"),
    bg: hsl("--background"),
  };
  _lastCacheTime = now;
  return _cachedColors;
}

// ── Draw ────────────────────────────────────────────────────

function drawCanvas(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  rows: number,
  cols: number,
  cells: (string | null)[][],
  netType: NetType,
  decorativeSkipInterval: number,
  hovR: number,
  hovC: number
) {
  const { w, h } = canvasSize(rows, cols, netType);
  const tc = getThemeColors();

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // ---- Net lines ----
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = tc.border;
  ctx.globalAlpha = 0.35;
  if (netType === "decorative") {
    ctx.setLineDash([3, 2]);
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.6;
  }

  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = beadX(r, c, netType);
      const y = beadY(r, netType);

      if (netType === "intersection" && c < cols - 1) {
        const nx = beadX(r, c + 1, netType);
        ctx.moveTo(x, y);
        ctx.lineTo(nx, y);
      }

      if (r < rows - 1) {
        const isOdd = r % 2 === 1;
        if (netType === "single-diagonal") {
          const nx = beadX(r + 1, c, netType);
          const ny = beadY(r + 1, netType);
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
        } else {
          const dlC = isOdd ? c : c - 1;
          if (dlC >= 0 && dlC < cols) {
            ctx.moveTo(x, y);
            ctx.lineTo(beadX(r + 1, dlC, netType), beadY(r + 1, netType));
          }
          const drC = isOdd ? c + 1 : c;
          if (drC >= 0 && drC < cols) {
            ctx.moveTo(x, y);
            ctx.lineTo(beadX(r + 1, drC, netType), beadY(r + 1, netType));
          }
        }
      }
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ---- Beads ----
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = beadX(r, c, netType);
      const y = beadY(r, netType);
      const color = cells[r]?.[c];
      const isHov = r === hovR && c === hovC;
      const isDecSkip =
        netType === "decorative" && (r + c) % decorativeSkipInterval !== 0;

      if (color) {
        ctx.beginPath();
        ctx.arc(x, y, BEAD_R, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isHov ? tc.fg : "rgba(0,0,0,0.2)";
        ctx.lineWidth = isHov ? 2 : 0.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - BEAD_R * 0.2, y - BEAD_R * 0.25, BEAD_R * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
      } else if (isDecSkip) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = tc.muted;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.arc(x, y, BEAD_R * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? tc.muted : tc.border;
        ctx.globalAlpha = isHov ? 0.8 : 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}

// ── Spatial hit-test (O(1)) ─────────────────────────────────

function cellFromLogicalXY(
  lx: number,
  ly: number,
  rows: number,
  cols: number,
  netType: NetType
): { row: number; col: number } | null {
  const sy = netType === "intersection" ? BASE * 0.7 : BASE * 0.866;
  const rowApprox = (ly - PAD) / sy;
  const rowMin = Math.max(0, Math.floor(rowApprox) - 1);
  const rowMax = Math.min(rows - 1, Math.ceil(rowApprox) + 1);

  let bestDist = BEAD_R * 2.2;
  let bestR = -1;
  let bestC = -1;

  for (let r = rowMin; r <= rowMax; r++) {
    const y = beadY(r, netType);
    const dy = ly - y;
    if (Math.abs(dy) > BEAD_R * 2.5) continue;

    const sx = netType === "intersection" ? BASE * 0.8 : BASE;
    const xOff = (r % 2) * (sx * 0.5);
    const colApprox = (lx - PAD - xOff) / sx;
    const cMin = Math.max(0, Math.floor(colApprox) - 1);
    const cMax = Math.min(cols - 1, Math.ceil(colApprox) + 1);

    for (let c = cMin; c <= cMax; c++) {
      const x = beadX(r, c, netType);
      const dx = lx - x;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestR = r;
        bestC = c;
      }
    }
  }
  return bestR >= 0 ? { row: bestR, col: bestC } : null;
}

// ── Edge button component ───────────────────────────────────

function EdgeButton({
  side,
  icon: Icon,
  label,
  onClick,
  style,
}: {
  side: "top" | "bottom" | "left" | "right";
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const isHoriz = side === "top" || side === "bottom";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`absolute z-20 flex items-center justify-center rounded-full
        bg-card text-muted-foreground border border-border
        shadow-sm hover:bg-accent hover:text-accent-foreground
        transition-colors duration-150
        ${isHoriz ? "h-7 w-7" : "h-7 w-7"}`}
      style={style}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Center helpers ──────────────────────────────────────────

function computeCenter(
  containerW: number,
  containerH: number,
  gridW: number,
  gridH: number,
  extraMargin = 56 // leave room for edge buttons
): { zoom: number; panX: number; panY: number } {
  const availW = containerW - extraMargin * 2;
  const availH = containerH - extraMargin * 2;
  const fitZoom = Math.min(availW / gridW, availH / gridH, 1.5);
  const scaledW = gridW * fitZoom;
  const scaledH = gridH * fitZoom;
  return {
    zoom: Math.max(0.3, fitZoom),
    panX: (containerW - scaledW) / 2,
    panY: (containerH - scaledH) / 2,
  };
}

// ── Main Component ──────────────────────────────────────────

export function BeadCanvas() {
  const { snapshot, actions } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef(false);
  const lastPaintedRef = useRef<string | null>(null);
  const hovRef = useRef<{ row: number; col: number } | null>(null);

  const [hoveredCell, setHovLocal] = useState<{ row: number; col: number } | null>(null);
  const hasCenteredRef = useRef(false);

  const { grid, zoom, panX, panY, activeColor, toolMode, appMode, netType, decorativeSkipInterval } =
    snapshot;
  const { w: logicalW, h: logicalH } = canvasSize(grid.rows, grid.cols, netType);

  // ── Always center on mount and grid size change ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const delay = hasCenteredRef.current ? 0 : 120;
    const timer = setTimeout(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw === 0 || ch === 0) return;
      const { zoom: fz, panX: px, panY: py } = computeCenter(cw, ch, logicalW, logicalH);
      actions.setZoom(fz);
      actions.setPan(px, py);
      hasCenteredRef.current = true;
    }, delay);
    return () => clearTimeout(timer);
  }, [grid.rows, grid.cols, netType, logicalW, logicalH]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also re-center when the window resizes (desktop)
  useEffect(() => {
    const handler = () => {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw === 0 || ch === 0) return;
      const { zoom: fz, panX: px, panY: py } = computeCenter(cw, ch, logicalW, logicalH);
      actions.setZoom(fz);
      actions.setPan(px, py);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [logicalW, logicalH]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logical coords from screen coords ──
  const toLogical = useCallback(
    (clientX: number, clientY: number): { lx: number; ly: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        lx: (clientX - rect.left - panX) / zoom,
        ly: (clientY - rect.top - panY) / zoom,
      };
    },
    [zoom, panX, panY]
  );

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const pt = toLogical(clientX, clientY);
      if (!pt) return null;
      return cellFromLogicalXY(pt.lx, pt.ly, grid.rows, grid.cols, netType);
    },
    [toLogical, grid.rows, grid.cols, netType]
  );

  const handleCellAction = useCallback(
    (row: number, col: number) => {
      if (toolMode === "erase") {
        actions.paintCell(row, col, null);
      } else if (toolMode === "eyedropper") {
        const color = grid.cells[row]?.[col];
        if (color) actions.setActiveColor(color);
        actions.setToolMode("paint");
      } else if (toolMode === "bucket") {
        actions.floodFill(row, col, activeColor);
      } else if (toolMode === "paint") {
        actions.paintCell(row, col, activeColor);
      }
    },
    [grid.cells, toolMode, activeColor, actions]
  );

  const collapseSheet = useCallback(() => {
    if (snapshot.bottomSheetOpen) {
      actions.setBottomSheetOpen(false);
    }
  }, [snapshot.bottomSheetOpen, actions]);

  // ── Pan state ──
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const touchStateRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (appMode === "preview") return;
      collapseSheet();
      if (e.button === 1 || (e.button === 0 && toolMode === "select")) {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { x: panX, y: panY };
        return;
      }
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        if (toolMode === "bucket") {
          handleCellAction(cell.row, cell.col);
          return;
        }
        isPaintingRef.current = true;
        lastPaintedRef.current = `${cell.row}-${cell.col}`;
        actions.setIsPainting(true);
        handleCellAction(cell.row, cell.col);
      }
    },
    [appMode, toolMode, panX, panY, getCellFromPoint, handleCellAction, actions, collapseSheet]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        actions.setPan(
          panStart.current.x + (e.clientX - dragStart.current.x),
          panStart.current.y + (e.clientY - dragStart.current.y)
        );
        return;
      }
      const cell = getCellFromPoint(e.clientX, e.clientY);
      hovRef.current = cell;
      setHovLocal(cell);
      actions.setHoveredCell(cell);
      if (isPaintingRef.current && cell) {
        const key = `${cell.row}-${cell.col}`;
        if (key !== lastPaintedRef.current) {
          lastPaintedRef.current = key;
          handleCellAction(cell.row, cell.col);
        }
      }
    },
    [isDragging, getCellFromPoint, handleCellAction, actions]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPaintedRef.current = null;
      actions.setIsPainting(false);
      actions.commitPaint();
    }
  }, [isDragging, actions]);

  // ── Touch handlers ──
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (appMode === "preview") return;
      collapseSheet();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStateRef.current = {
          dist: Math.sqrt(dx * dx + dy * dy),
          cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        panStart.current = { x: panX, y: panY };
        return;
      }
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const cell = getCellFromPoint(t.clientX, t.clientY);
        if (cell) {
          if (toolMode === "bucket") {
            handleCellAction(cell.row, cell.col);
            return;
          }
          isPaintingRef.current = true;
          lastPaintedRef.current = `${cell.row}-${cell.col}`;
          actions.setIsPainting(true);
          handleCellAction(cell.row, cell.col);
        }
      }
    },
    [appMode, toolMode, panX, panY, getCellFromPoint, handleCellAction, actions, collapseSheet]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && touchStateRef.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchStateRef.current.dist;
        actions.setZoom(zoom * scale);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        actions.setPan(
          panX + cx - touchStateRef.current.cx,
          panY + cy - touchStateRef.current.cy
        );
        touchStateRef.current = { dist, cx, cy };
        return;
      }
      if (e.touches.length === 1 && isPaintingRef.current) {
        const t = e.touches[0];
        const cell = getCellFromPoint(t.clientX, t.clientY);
        if (cell) {
          const key = `${cell.row}-${cell.col}`;
          if (key !== lastPaintedRef.current) {
            lastPaintedRef.current = key;
            handleCellAction(cell.row, cell.col);
          }
        }
      }
    },
    [zoom, panX, panY, getCellFromPoint, handleCellAction, actions]
  );

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPaintedRef.current = null;
      actions.setIsPainting(false);
      actions.commitPaint();
    }
  }, [actions]);

  // ── Wheel zoom (zooms toward cursor position) ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const lxBefore = (cx - panX) / zoom;
      const lyBefore = (cy - panY) / zoom;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(0.3, Math.min(4, zoom * factor));
      const newPanX = cx - lxBefore * newZoom;
      const newPanY = cy - lyBefore * newZoom;
      actions.setZoom(newZoom);
      actions.setPan(newPanX, newPanY);
    },
    [zoom, panX, panY, actions]
  );

  // ── Double-click to center ──
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (appMode === "preview") return;
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const { zoom: fz, panX: px, panY: py } = computeCenter(cw, ch, logicalW, logicalH);
      actions.setZoom(fz);
      actions.setPan(px, py);
      e.preventDefault();
    },
    [appMode, logicalW, logicalH, actions]
  );

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        actions.redo();
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        actions.undo();
      } else if (e.key === "b") actions.setToolMode("paint");
      else if (e.key === "e") actions.setToolMode("erase");
      else if (e.key === "i") actions.setToolMode("eyedropper");
      else if (e.key === "v") actions.setToolMode("select");
      else if (e.key === "g") actions.setToolMode("bucket");
      else if (e.key === "=" || e.key === "+") actions.setZoom(zoom + 0.1);
      else if (e.key === "-") actions.setZoom(zoom - 0.1);
      else if (e.key === "0") {
        const el = containerRef.current;
        if (el) {
          const cw = el.clientWidth;
          const ch = el.clientHeight;
          const { zoom: fz, panX: px, panY: py } = computeCenter(cw, ch, logicalW, logicalH);
          actions.setZoom(fz);
          actions.setPan(px, py);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoom, actions, logicalW, logicalH]);

  // ── Canvas2D render ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = canvasSize(grid.rows, grid.cols, netType);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCanvas(
      ctx,
      dpr,
      grid.rows,
      grid.cols,
      grid.cells,
      netType,
      decorativeSkipInterval,
      hovRef.current?.row ?? -1,
      hovRef.current?.col ?? -1
    );
  }, [grid, netType, decorativeSkipInterval, hoveredCell]);

  const cursorClass =
    appMode === "preview"
      ? "cursor-default"
      : toolMode === "paint"
        ? "cursor-crosshair"
        : toolMode === "erase"
          ? "cursor-cell"
          : toolMode === "eyedropper"
            ? "cursor-copy"
            : toolMode === "bucket"
              ? "cursor-crosshair"
              : "cursor-grab";

  // ── Edge button positions (in screen space) ──
  // These sit just outside the transformed canvas element.
  const btnOff = 22; // offset from the grid edge in px
  const gridScreenW = logicalW * zoom;
  const gridScreenH = logicalH * zoom;

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative bg-background ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onMouseLeave={() => {
        handleMouseUp();
        hovRef.current = null;
        setHovLocal(null);
        actions.setHoveredCell(null);
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Transformed grid layer */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: logicalW,
          height: logicalH,
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* ── Edge add/remove buttons (screen-space positioned) ── */}
      {appMode === "design" && (
        <>
          {/* Top: add row */}
          <EdgeButton
            side="top"
            icon={Plus}
            label="Add row to top"
            onClick={actions.addRowTop}
            style={{
              left: panX + gridScreenW / 2 - 14,
              top: panY - btnOff - 7,
            }}
          />
          <EdgeButton
            side="top"
            icon={Minus}
            label="Remove top row"
            onClick={actions.removeRowTop}
            style={{
              left: panX + gridScreenW / 2 + 14,
              top: panY - btnOff - 7,
            }}
          />

          {/* Bottom: add row */}
          <EdgeButton
            side="bottom"
            icon={Plus}
            label="Add row to bottom"
            onClick={actions.addRowBottom}
            style={{
              left: panX + gridScreenW / 2 - 14,
              top: panY + gridScreenH + btnOff - 7,
            }}
          />
          <EdgeButton
            side="bottom"
            icon={Minus}
            label="Remove bottom row"
            onClick={actions.removeRowBottom}
            style={{
              left: panX + gridScreenW / 2 + 14,
              top: panY + gridScreenH + btnOff - 7,
            }}
          />

          {/* Left: add column */}
          <EdgeButton
            side="left"
            icon={Plus}
            label="Add column to left"
            onClick={actions.addColLeft}
            style={{
              left: panX - btnOff - 7,
              top: panY + gridScreenH / 2 - 14,
            }}
          />
          <EdgeButton
            side="left"
            icon={Minus}
            label="Remove left column"
            onClick={actions.removeColLeft}
            style={{
              left: panX - btnOff - 7,
              top: panY + gridScreenH / 2 + 14,
            }}
          />

          {/* Right: add column */}
          <EdgeButton
            side="right"
            icon={Plus}
            label="Add column to right"
            onClick={actions.addColRight}
            style={{
              left: panX + gridScreenW + btnOff - 7,
              top: panY + gridScreenH / 2 - 14,
            }}
          />
          <EdgeButton
            side="right"
            icon={Minus}
            label="Remove right column"
            onClick={actions.removeColRight}
            style={{
              left: panX + gridScreenW + btnOff - 7,
              top: panY + gridScreenH / 2 + 14,
            }}
          />
        </>
      )}

      {/* Tooltip */}
      {hoveredCell && appMode === "design" && (
        <div className="absolute bottom-3 left-3 bg-card text-card-foreground px-3 py-1.5 rounded-lg text-xs font-mono shadow-md border border-border pointer-events-none">
          R{hoveredCell.row + 1} C{hoveredCell.col + 1}
          {grid.cells[hoveredCell.row]?.[hoveredCell.col] && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-border"
                style={{
                  backgroundColor:
                    grid.cells[hoveredCell.row][hoveredCell.col] || undefined,
                }}
              />
              {grid.cells[hoveredCell.row][hoveredCell.col]}
            </span>
          )}
        </div>
      )}

      {/* Zoom display */}
      <div className="absolute top-3 right-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm rounded-md px-2 py-1 pointer-events-none border border-border/50">
        {Math.round(zoom * 100)}% | Dbl-click to fit
      </div>
    </div>
  );
}
