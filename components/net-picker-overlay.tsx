"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/use-editor-store";
import { NET_TYPE_META, SKIP_INTERVALS } from "@/lib/shekere-types";
import type { NetType } from "@/lib/shekere-types";

/**
 * Full-screen overlay shown on first load until the user selects a net type.
 * This implements the "net-first workflow" requirement: users MUST choose
 * a net construction method before placing beads.
 */
export function NetPickerOverlay() {
  const { snapshot, actions } = useEditorStore();
  const [selected, setSelected] = useState<NetType>(snapshot.netType);
  const netTypes = Object.entries(NET_TYPE_META) as [NetType, typeof NET_TYPE_META[NetType]][];

  const handleConfirm = () => {
    actions.setNetType(selected);
    actions.confirmNetChoice();
  };

  // Small inline SVG previews for each net type
  const netPreview: Record<NetType, React.ReactNode> = {
    "single-diagonal": (
      <svg viewBox="0 0 60 50" className="w-full h-full" fill="none">
        {/* Single diagonal lines */}
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => {
            const x = 6 + c * 12 + (r % 2) * 6;
            const y = 6 + r * 12;
            return (
              <React.Fragment key={`${r}-${c}`}>
                {r < 3 && c < 4 && (
                  <line x1={x} y1={y} x2={6 + c * 12 + ((r + 1) % 2) * 6} y2={y + 12}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.6} opacity={0.5} />
                )}
                <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" opacity={0.7} />
              </React.Fragment>
            );
          })
        )}
      </svg>
    ),
    "double-diagonal": (
      <svg viewBox="0 0 60 50" className="w-full h-full" fill="none">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => {
            const x = 6 + c * 12 + (r % 2) * 6;
            const y = 6 + r * 12;
            return (
              <React.Fragment key={`${r}-${c}`}>
                {r < 3 && (
                  <>
                    <line x1={x} y1={y} x2={x - 6 + ((r + 1) % 2) * 12} y2={y + 12}
                      stroke="hsl(var(--muted-foreground))" strokeWidth={0.6} opacity={0.5} />
                    <line x1={x} y1={y} x2={x + 6 - ((r + 1) % 2) * 0} y2={y + 12}
                      stroke="hsl(var(--muted-foreground))" strokeWidth={0.6} opacity={0.5} />
                  </>
                )}
                <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" opacity={0.7} />
              </React.Fragment>
            );
          })
        )}
      </svg>
    ),
    intersection: (
      <svg viewBox="0 0 60 50" className="w-full h-full" fill="none">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => {
            const x = 6 + c * 11 + (r % 2) * 5.5;
            const y = 6 + r * 10;
            return (
              <React.Fragment key={`${r}-${c}`}>
                {c < 4 && (
                  <line x1={x} y1={y} x2={x + 11} y2={y}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} opacity={0.5} />
                )}
                {r < 3 && (
                  <line x1={x} y1={y} x2={x + ((r + 1) % 2 === 0 ? 0 : -5.5)} y2={y + 10}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} opacity={0.5} />
                )}
                <circle cx={x} cy={y} r={3.5} fill="hsl(var(--primary))" opacity={0.7} />
              </React.Fragment>
            );
          })
        )}
      </svg>
    ),
    decorative: (
      <svg viewBox="0 0 60 50" className="w-full h-full" fill="none">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => {
            const x = 6 + c * 12 + (r % 2) * 6;
            const y = 6 + r * 12;
            const isBeadable = (r + c) % 3 === 0;
            return (
              <React.Fragment key={`${r}-${c}`}>
                {r < 3 && c < 4 && (
                  <line x1={x} y1={y} x2={6 + c * 12 + ((r + 1) % 2) * 6} y2={y + 12}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.4}
                    strokeDasharray="2 2" opacity={0.4} />
                )}
                {isBeadable ? (
                  <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" opacity={0.7} />
                ) : (
                  <circle cx={x} cy={y} r={1.2} fill="hsl(var(--muted-foreground))" opacity={0.3} />
                )}
              </React.Fragment>
            );
          })
        )}
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold leading-none">FSL</span>
            </div>
            <span className="text-lg font-semibold text-foreground">Beader</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground text-balance">
            Choose Your Net Structure
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-balance">
            The net type determines bead placement, weaving instructions, and material
            calculations. You can change this later in the Net tab.
          </p>
        </div>

        {/* Net type cards */}
        <div className="grid grid-cols-2 gap-3">
          {netTypes.map(([type, meta]) => (
            <button
              key={type}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                selected === type
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30 active:scale-[0.98]"
              }`}
              onClick={() => setSelected(type)}
            >
              {/* Mini preview */}
              <div className="h-12 mb-2 rounded-md bg-muted/40 overflow-hidden">
                {netPreview[type]}
              </div>
              <div className="text-xs font-semibold text-foreground leading-tight">
                {meta.label}
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                {meta.description}
              </div>
            </button>
          ))}
        </div>

        {/* Decorative skip selector */}
        {selected === "decorative" && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground flex-shrink-0">Skip interval:</span>
            <div className="flex gap-1.5 flex-1">
              {SKIP_INTERVALS.map((interval) => (
                <Button
                  key={interval}
                  variant={snapshot.decorativeSkipInterval === interval ? "default" : "outline"}
                  size="sm" className="h-9 flex-1"
                  onClick={() => actions.setDecorativeSkipInterval(interval)}
                >
                  {interval}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm */}
        <Button size="lg" className="w-full h-12 text-sm font-semibold" onClick={handleConfirm}>
          Start Designing
        </Button>
      </div>
    </div>
  );
}
