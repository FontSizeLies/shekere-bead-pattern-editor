"use client";

import React from "react";
import {
  Undo2,
  Redo2,
  Paintbrush,
  Eraser,
  Pipette,
  Move,
  PaintBucket,
  ImageUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/use-editor-store";
import { NET_TYPE_META } from "@/lib/shekere-types";
import type { ToolMode, AppMode } from "@/lib/shekere-types";

interface TopBarProps {
  onOpenImport?: () => void;
}

export function TopBar({ onOpenImport }: TopBarProps) {
  const { snapshot, actions } = useEditorStore();

  const tools: { mode: ToolMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { mode: "paint", label: "Paint", icon: <Paintbrush className="h-4 w-4" />, shortcut: "B" },
    { mode: "erase", label: "Erase", icon: <Eraser className="h-4 w-4" />, shortcut: "E" },
    { mode: "bucket", label: "Fill", icon: <PaintBucket className="h-4 w-4" />, shortcut: "G" },
    { mode: "eyedropper", label: "Pick", icon: <Pipette className="h-4 w-4" />, shortcut: "I" },
    { mode: "select", label: "Pan", icon: <Move className="h-4 w-4" />, shortcut: "V" },
  ];

  const modes: { mode: AppMode; label: string }[] = [
    { mode: "design", label: "Design" },
    { mode: "preview", label: "Preview" },
  ];

  return (
    <header className="bg-card border-b border-border flex items-center px-2 py-1.5 gap-2 flex-shrink-0 safe-area-top">
      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-1 flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground text-[10px] font-bold leading-none">
            FSL
          </span>
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-xs font-semibold text-foreground">Beader</span>
          <span className="text-[9px] text-muted-foreground">
            {NET_TYPE_META[snapshot.netType].label}
          </span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-muted rounded-lg p-0.5 gap-0.5 flex-shrink-0">
        {modes.map((m) => (
          <button
            key={m.mode}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              snapshot.appMode === m.mode
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => actions.setAppMode(m.mode)}
            aria-label={`${m.label} mode`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Tool buttons (only in design mode) */}
      {snapshot.appMode === "design" && (
        <div className="flex gap-0.5 flex-shrink-0">
          {tools.map((t) => (
            <Button
              key={t.mode}
              variant={snapshot.toolMode === t.mode ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => actions.setToolMode(t.mode)}
              aria-label={`${t.label} (${t.shortcut})`}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
            </Button>
          ))}

          {/* Import button */}
          {onOpenImport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenImport}
              aria-label="Import image or text"
              title="Import image or text"
            >
              <ImageUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Palette color swatches -- clickable to change draw color */}
      {snapshot.appMode === "design" && (
        <div className="flex items-center gap-1 ml-1 overflow-x-auto flex-shrink min-w-0">
          {snapshot.palette.colors.map((c) => {
            const isActive =
              snapshot.activeColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.id}
                className={`w-6 h-6 rounded-md border-2 flex-shrink-0 transition-all ${
                  isActive
                    ? "border-foreground ring-1 ring-primary scale-110"
                    : "border-border/50 hover:border-foreground/40 active:scale-95"
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => actions.setActiveColor(c.hex)}
                aria-label={`Select ${c.name} color`}
                title={c.name}
              />
            );
          })}
        </div>
      )}

      <div className="flex-1 min-w-0" />

      {/* Undo / Redo */}
      <div className="flex gap-0.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => actions.undo()}
          disabled={!snapshot.canUndo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => actions.redo()}
          disabled={!snapshot.canRedo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
