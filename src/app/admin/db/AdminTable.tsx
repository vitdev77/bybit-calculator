"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SquareCheckBig, Star, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TableProps {
  activeTable: "deals" | "coins";
  activeHeaders: string[];
  displayedRows: any[];
  getRowStyles: (row: any) => string;
  isNumericColumn: (col: string) => boolean;
  topGainers?: string[];
  topLosers?: string[];
}

function LogoSlugCell({
  coin,
  initialValue,
  isDelisted,
}: {
  coin: string;
  initialValue: string;
  isDelisted: boolean;
}) {
  const [val, setVal] = useState(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleTriggerSave = () => {
    if (isDelisted) return;
    if (val.trim() === (initialValue || "")) return;
    setIsAlertOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsAlertOpen(false);
    setIsSaving(true);
    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LOGO_SLUG",
          coin: coin,
          logo_slug: val.trim(),
        }),
      });
      if (res.ok) {
        setIsSuccess(true);

        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: {
              coin: coin,
              is_favorite: false,
              logo_slug: val.trim(),
            },
          }),
        );

        toast.add({
          title: "Слаг сохранен",
          description: `Для ${coin} задан слаг ${val}`,
          type: "success",
        });
        setTimeout(() => setIsSuccess(false), 2000);
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.add({
        title: "Ошибка",
        description: "Не удалось сохранить слаг",
        type: "error",
      });
      setVal(initialValue || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setIsAlertOpen(false);
    setVal(initialValue || "");
  };

  return (
    <div className="flex items-center gap-1 w-full max-w-32">
      <input
        id={`slug-input-${coin}`}
        name={`logo_slug_${coin}`}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleTriggerSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        disabled={isSaving || isDelisted}
        className={cn(
          "w-full h-7 text-[11px] font-mono bg-muted/40",
          "border border-border/40 rounded px-1.5 outline-hidden",
          "focus:bg-background focus:border-amber-500/50",
          "transition-all",
          isDelisted ? "opacity-40 cursor-not-allowed select-none" : "",
        )}
        placeholder={isDelisted ? "НЕДОСТУПНО" : "Напр. BTC"}
      />
      {isSaving && (
        <Loader2 className="size-3 animate-spin text-amber-500 shrink-0" />
      )}
      {isSuccess && <Check className="size-3 text-emerald-500 shrink-0" />}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Изменить слаг иконки?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Вы действительно хотите перезаписать слаг логотипа для пары{" "}
              <b>{coin}</b> на значение <b>{val}</b>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1.5">
            <AlertDialogCancel
              onClick={handleCancelSave}
              className="rounded-xl text-xs h-9 cursor-pointer"
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className={cn(
                "rounded-xl text-xs h-9 bg-amber-500 border-none",
                "text-white font-bold cursor-pointer",
              )}
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export function AdminTable({
  activeTable,
  activeHeaders,
  displayedRows,
  getRowStyles,
  isNumericColumn,
  topGainers = [],
  topLosers = [],
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
    const currentPrecision = row.precision !== undefined ? row.precision : 2;

    if (c === "coin") {
      const isGainer = topGainers.includes(row.coin);
      const isLoser = topLosers.includes(row.coin);
      return (
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground font-mono">{val}</span>
          {activeTable === "coins" && isGainer && (
            <span className="px-1 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-wider">
              GAINER
            </span>
          )}
          {activeTable === "coins" && isLoser && (
            <span className="px-1 py-0.5 rounded text-[8px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 tracking-wider">
              LOSER
            </span>
          )}
        </div>
      );
    }

    if (c === "logo_slug" && activeTable === "coins") {
      return (
        <LogoSlugCell
          coin={row.coin}
          initialValue={val}
          isDelisted={!!row.is_delisted}
        />
      );
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
                "h-10 px-3 text-center font-black uppercase text-muted-foreground",
                "whitespace-nowrap w-12 border-r border-border/10 bg-muted/5",
              )}
            >
              #
            </TableHead>
            {activeHeaders.map((col) => (
              <TableHead
                key={col}
                className="h-10 px-3 text-left font-black uppercase tracking-wider"
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
              <TableCell className="p-3 text-center text-muted-foreground/55 w-12 border-r">
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
