"use client"

import { useRef } from "react"
import {
  Undo2,
  Redo2,
  Save,
  FileDown,
  FileUp,
  FileJson,
  Image as ImageIcon,
  FileText,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ShekereStore } from "@/hooks/use-shekere-store"

interface TopBarProps {
  store: ShekereStore
  onExportPNG: () => void
  onExportSVG: () => void
  onExportPDF: () => void
  onExportCSV: () => void
}

export function TopBar({ store, onExportPNG, onExportSVG, onExportPDF, onExportCSV }: TopBarProps) {
  const importRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const json = ev.target?.result as string
      store.importJSON(json)
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ""
  }

  const handleExportJSON = () => {
    const json = store.exportJSON()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${store.state.name.replace(/\s+/g, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    store.saveToStorage()
  }

  return (
    <header className="flex items-center gap-2 border-b bg-card px-3 py-2" role="toolbar" aria-label="Main toolbar">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <span className="text-sm font-semibold text-foreground hidden sm:inline">Shekere</span>
      </div>

      <Input
        value={store.state.name}
        onChange={(e) => store.setName(e.target.value)}
        className="h-8 w-48 text-sm bg-secondary border-none"
        aria-label="Pattern name"
      />

      <div className="flex items-center gap-1 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0"
              aria-label="Save pattern"
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={store.undo}
              disabled={!store.canUndo}
              className="h-8 w-8 p-0"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={store.redo}
              disabled={!store.canRedo}
              className="h-8 w-8 p-0"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <FileDown className="h-3.5 w-3.5" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF Guide
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPNG}>
            <ImageIcon className="h-4 w-4 mr-2" />
            PNG Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportSVG}>
            <FileDown className="h-4 w-4 mr-2" />
            SVG Vector
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            JSON Pattern
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV Materials
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => importRef.current?.click()}
      >
        <FileUp className="h-3.5 w-3.5" />
        Import
      </Button>
      <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={store.clearGrid}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            aria-label="Clear grid"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear grid</TooltipContent>
      </Tooltip>
    </header>
  )
}
