"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SquareCheckBig,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TableProps {
  activeTable: "deals" | "coins";
  activeHeaders: string[];
  displayedRows: any[];
  getRowStyles: (row: any) => string;
  isNumericColumn: (col: string) => boolean;
}

export function AdminTable({
  activeTable,
  activeHeaders,
  displayedRows,
  getRowStyles,
  isNumericColumn,
}: TableProps) {
  const formatValue = (val: any, col: string, decimals: number = 2) => {
    if (val === null || val === undefined) return "--";
    const c = col.toLowerCase();

    if (c === "created_at") {
      return new Date(val).toLocaleString("ru-RU");
    }
    if (
      [
        "price",
        "entry_price",
        "stop_loss",
        "take_profit",
        "closed_at_price",
      ].includes(c)
    ) {
      const num = parseFloat(val);
      return isNaN(num) ? val : num.toFixed(decimals);
    }
    if (typeof val === "boolean") {
      return val ? (
        <SquareCheckBig className="text-emerald-500 size-4" />
      ) : (
        <span className="text-muted-foreground/20 font-medium">-</span>
      );
    }
    return String(val);
  };

  const renderCustomCell = (row: any, col: string) => {
    const c = col.toLowerCase();
    const val = row[col];

    // Рассчитываем точную разрядность: приоритет у бэкенда, иначе системный фолбэк
    const currentPrecision = row.precision !== undefined ? row.precision : 2;

    if (c === "coin") {
      return <span className="font-bold text-foreground font-mono">{val}</span>;
    }

    if (c === "side") {
      const isBuy = String(val).toUpperCase() === "BUY";
      return (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-black border tracking-wider",
            isBuy
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-500 border-rose-500/20",
          )}
        >
          {isBuy ? "LONG" : "SHORT"}
        </span>
      );
    }

    if (c === "status") {
      const s = String(val).toUpperCase();
      let badgeCls =
        "bg-muted/40 text-muted-foreground border-muted-foreground/20";
      if (s === "PROFIT") {
        badgeCls =
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold";
      } else if (s === "LOSS") {
        badgeCls = "bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold";
      } else if (s === "OPEN") {
        badgeCls =
          "bg-amber-500/10 text-amber-400 border-amber-500/20 font-black animate-pulse";
      }
      return (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider border",
            badgeCls,
          )}
        >
          {s}
        </span>
      );
    }

    if (c === "is_favorite" && typeof val === "boolean") {
      return val ? (
        <Star className="size-3.5 text-amber-500 fill-amber-500" />
      ) : (
        <span className="text-muted-foreground/10">-</span>
      );
    }

    if (
      (c === "tp_touched" || c === "sl_touched") &&
      typeof val === "boolean"
    ) {
      return val ? (
        <span
          className={cn(
            "px-1 py-px text-[8px] font-black rounded border uppercase tracking-tight",
            c === "tp_touched"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-500 border-rose-500/20",
          )}
        >
          touch
        </span>
      ) : (
        <span className="text-muted-foreground/20">-</span>
      );
    }

    return formatValue(val, col, currentPrecision);
  };

  return (
    <div className="overflow-x-auto max-h-140 scrollbar-thin touch-pan-x w-full">
      <Table className="text-[11px] font-medium border-collapse min-w-150 w-full">
        <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md border-b">
          <TableRow>
            <TableHead
              className={cn(
                "h-10 px-3 text-center font-black uppercase text-muted-foreground tracking-wider",
                "whitespace-nowrap w-12 border-r border-border/10 bg-muted/5",
              )}
            >
              #
            </TableHead>
            {activeHeaders.map((col) => (
              <TableHead
                key={col}
                className="h-10 px-3 text-left font-black uppercase text-muted-foreground tracking-wider whitespace-nowrap"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedRows.map((row, idx) => (
            <TableRow
              key={row.id || row.coin || idx}
              className={cn(
                "transition-colors border-b border-border/20",
                getRowStyles(row),
              )}
            >
              <TableCell className="p-3 text-center text-muted-foreground/50 font-mono font-bold w-12 border-r border-border/10">
                {idx + 1}
              </TableCell>
              {activeHeaders.map((col) => (
                <TableCell
                  key={col}
                  className={cn(
                    "p-3 max-w-44 truncate text-foreground/90 font-sans whitespace-nowrap",
                    isNumericColumn(col) ? "font-mono font-semibold" : "",
                  )}
                >
                  {renderCustomCell(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
