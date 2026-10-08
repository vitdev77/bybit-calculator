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
import { SquareCheckBig } from "lucide-react";
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
        <SquareCheckBig className="text-emerald-500 size-5" />
      ) : (
        <span className="text-muted-foreground/30 font-medium">-</span>
      );
    }
    return String(val);
  };

  return (
    <div className="overflow-x-auto max-h-140 scrollbar-thin touch-pan-x w-full">
      <Table className="text-[11px] font-medium border-collapse min-w-150 w-full">
        <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md border-b">
          <TableRow>
            <TableHead
              className={cn(
                "h-10 px-3 text-center font-black uppercase text-muted-foreground",
                "tracking-wider whitespace-nowrap w-12 border-r border-border/10 bg-muted/5",
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
                  {formatValue(row[col], col, row.precision || 2)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
