"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { X, Upload, Type } from "lucide-react";
import { useEditorStore } from "@/lib/use-editor-store";

interface ImageImportDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Renders an SVG/image or text onto an offscreen canvas at the grid resolution,
 * then maps each pixel to the nearest palette color by RGB Euclidean distance.
 * Transparent pixels become empty (no bead).
 */
export function ImageImportDialog({ open, onClose }: ImageImportDialogProps) {
  const { snapshot, actions } = useEditorStore();
  const [mode, setMode] = useState<"image" | "text">("image");
  const [textValue, setTextValue] = useState("HELLO");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("transparent");
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { grid, palette } = snapshot;
  const paletteHexes = palette.colors.map((c) => c.hex);

  const rasterizeAndApply = useCallback(
    (source: HTMLImageElement | HTMLCanvasElement) => {
      setProcessing(true);

      // Draw source onto a canvas at grid resolution
      const offscreen = document.createElement("canvas");
      offscreen.width = grid.cols;
      offscreen.height = grid.rows;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        setProcessing(false);
        return;
      }

      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.clearRect(0, 0, grid.cols, grid.rows);

      // Scale source to fit grid while maintaining aspect ratio
      const srcW =
        source instanceof HTMLImageElement
          ? source.naturalWidth
          : source.width;
      const srcH =
        source instanceof HTMLImageElement
          ? source.naturalHeight
          : source.height;
      const scale = Math.min(grid.cols / srcW, grid.rows / srcH);
      const dw = srcW * scale;
      const dh = srcH * scale;
      const dx = (grid.cols - dw) / 2;
      const dy = (grid.rows - dh) / 2;

      ctx.drawImage(source, dx, dy, dw, dh);

      const imageData = ctx.getImageData(0, 0, grid.cols, grid.rows);
      actions.importImageData(imageData, paletteHexes);

      setProcessing(false);
      onClose();
    },
    [grid.rows, grid.cols, paletteHexes, actions, onClose]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Preview
      const url = URL.createObjectURL(file);
      setPreview(url);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imgRef.current = img;
      };
      img.src = url;
    },
    []
  );

  const handleApplyImage = useCallback(() => {
    if (imgRef.current) {
      rasterizeAndApply(imgRef.current);
    }
  }, [rasterizeAndApply]);

  const handleApplyText = useCallback(() => {
    if (!textValue.trim()) return;

    // Render text to canvas
    const measure = document.createElement("canvas");
    const mctx = measure.getContext("2d");
    if (!mctx) return;

    mctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = mctx.measureText(textValue);
    const tw = Math.ceil(metrics.width) + 10;
    const th = fontSize + 10;

    const textCanvas = document.createElement("canvas");
    textCanvas.width = tw;
    textCanvas.height = th;
    const tctx = textCanvas.getContext("2d");
    if (!tctx) return;

    // Fill background
    if (bgColor !== "transparent") {
      tctx.fillStyle = bgColor;
      tctx.fillRect(0, 0, tw, th);
    } else {
      tctx.clearRect(0, 0, tw, th);
    }

    // Draw text in selected color
    tctx.fillStyle = textColor;
    tctx.font = `bold ${fontSize}px sans-serif`;
    tctx.textBaseline = "top";
    tctx.fillText(textValue, 5, 5);

    rasterizeAndApply(textCanvas);
  }, [textValue, fontSize, textColor, bgColor, rasterizeAndApply]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Import Design
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3">
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mode === "image"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setMode("image")}
            >
              <Upload className="h-3.5 w-3.5" /> Image / SVG
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mode === "text"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setMode("text")}
            >
              <Type className="h-3.5 w-3.5" /> Text
            </button>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          {mode === "image" ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload an SVG, PNG, or JPG. The image will be downsampled to the
                current grid size ({grid.rows}x{grid.cols}) and each pixel
                mapped to the nearest palette color.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                variant="outline"
                className="h-12 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" /> Choose File
              </Button>

              {preview && (
                <div className="border border-border rounded-lg p-2 bg-muted/30 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Import preview"
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
              )}

              <Button
                className="h-12 text-sm"
                disabled={!imgRef.current || processing}
                onClick={handleApplyImage}
              >
                {processing ? "Processing..." : "Apply to Grid"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Type text to pixelize into beads. Choose text and background
                colors, then each pixel maps to the nearest palette color.
              </p>

              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Text
                </Label>
                <Input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  className="h-10 text-sm font-bold"
                  placeholder="Type something..."
                  aria-label="Text to import"
                />
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Font Size ({fontSize}px)
                </Label>
                <Slider
                  min={16}
                  max={128}
                  step={4}
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  className="py-2"
                  aria-label="Font size"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Text Color
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                      aria-label="Text color"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{textColor}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Background
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      className={`w-8 h-8 rounded border-2 cursor-pointer text-[8px] flex items-center justify-center ${
                        bgColor === "transparent"
                          ? "border-primary bg-transparent text-muted-foreground"
                          : "border-border"
                      }`}
                      style={bgColor !== "transparent" ? { backgroundColor: bgColor } : undefined}
                      onClick={() => setBgColor(bgColor === "transparent" ? "#ffffff" : "transparent")}
                      aria-label="Toggle background"
                      title="Click to toggle transparent / colored"
                    >
                      {bgColor === "transparent" ? "none" : ""}
                    </button>
                    {bgColor !== "transparent" && (
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                        aria-label="Background color"
                      />
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      {bgColor === "transparent" ? "none" : bgColor}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="h-12 text-sm"
                disabled={!textValue.trim() || processing}
                onClick={handleApplyText}
              >
                {processing ? "Processing..." : "Apply to Grid"}
              </Button>
            </>
          )}

          <Separator />

          <div>
            <Label className="text-[10px] text-muted-foreground">
              Current Palette ({palette.colors.length} colors)
            </Label>
            <div className="flex gap-1.5 mt-1.5">
              {palette.colors.map((c) => (
                <div
                  key={c.id}
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Pixels are mapped to the nearest color in your active palette.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
