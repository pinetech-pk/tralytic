"use client";

import { useEffect, useRef } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRADE_COLUMNS } from "./trade-columns";

interface ColumnPickerProps {
  visible: string[];
  onChange: (next: string[]) => void;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnPicker({
  visible,
  onChange,
  onReset,
  open,
  onOpenChange,
}: ColumnPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onOpenChange]);

  const toggle = (id: string) => {
    // Keep the order of TRADE_COLUMNS rather than click order, so the table
    // layout does not shuffle as columns are turned on.
    const next = visible.includes(id)
      ? visible.filter((c) => c !== id)
      : TRADE_COLUMNS.filter((c) => c.id === id || visible.includes(c.id)).map(
          (c) => c.id
        );
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(!open)}
        className="gap-2"
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <span className="text-xs text-muted-foreground">
          {visible.length}/{TRADE_COLUMNS.length}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-background-card border border-border rounded-md shadow-lg z-20 p-1">
          <div className="max-h-80 overflow-auto">
            {TRADE_COLUMNS.map((col) => {
              const checked = visible.includes(col.id);
              // One column must remain, or the table has nothing to render.
              const locked = checked && visible.length === 1;
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted/50 ${
                    locked ? "opacity-50" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-border"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggle(col.id)}
                  />
                  {col.label}
                </label>
              );
            })}
          </div>
          <div className="border-t mt-1 pt-1">
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-muted/50 text-muted-foreground"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
