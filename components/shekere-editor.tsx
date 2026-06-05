"use client";

import React, { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/top-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { BeadCanvas } from "@/components/bead-canvas";
import { GourdPreview } from "@/components/gourd-preview";
import { NetPickerOverlay } from "@/components/net-picker-overlay";
import { ImageImportDialog } from "@/components/image-import-dialog";
import { useEditorStore, useEditorActions } from "@/lib/use-editor-store";

function ActiveColorBar() {
  const { snapshot } = useEditorStore();
  if (snapshot.appMode !== "design") return null;

  return (
    <div className="bg-card border-b border-border px-3 py-1 flex items-center gap-2 flex-shrink-0">
      <div
        className="w-4 h-4 rounded border border-border flex-shrink-0"
        style={{ backgroundColor: snapshot.activeColor }}
      />
      <span className="text-[10px] font-mono text-muted-foreground">
        {snapshot.activeColor}
      </span>
      <span className="text-[10px] text-muted-foreground ml-auto">
        {snapshot.grid.rows}x{snapshot.grid.cols} net
      </span>
    </div>
  );
}

export function ShekereEditor() {
  const { snapshot } = useEditorStore();
  const storeActions = useEditorActions();
  const [importOpen, setImportOpen] = useState(false);

  // Load saved project on mount
  useEffect(() => {
    storeActions.loadLocal();
  }, [storeActions]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      storeActions.saveLocal();
    }, 30000);
    return () => clearInterval(interval);
  }, [storeActions]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-background">
        {/* Net selection gate */}
        {!snapshot.netChosen && <NetPickerOverlay />}

        <TopBar onOpenImport={() => setImportOpen(true)} />
        <ActiveColorBar />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {snapshot.appMode === "design" ? <BeadCanvas /> : <GourdPreview />}
        </main>
        <BottomSheet />

        {/* Image / text import dialog */}
        <ImageImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}
