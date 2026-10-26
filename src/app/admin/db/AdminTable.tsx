"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StarIcon,
  ExternalLinkIcon,
  CheckIcon,
  CopyIcon,
  CircleSmallIcon,
} from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";

interface TableProps {
  activeTable: "deals" | "coins";
  activeHeaders: string[];
  displayedRows: any[];
  getRowStyles: (row: any) => string;
  isNumericColumn: (col: string) => boolean;
  topGainers?: string[];
  topLosers?: string[];
}

const STORAGE_KEY = "bybit_calculator_state_v14";

export function AdminTable({
  activeTable,
  activeHeaders,
  displayedRows = [],
  getRowStyles,
  isNumericColumn,
  topGainers = [],
  topLosers = [],
}: TableProps) {
  const [copiedCoin, setCopiedCoin] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(50);
  const [isIncrementalLoading, setIsIncrementalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(50);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeTable, displayedRows]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (visibleCount < displayedRows.length && !isIncrementalLoading) {
        setIsIncrementalLoading(true);
        setTimeout(() => {
          setVisibleCount((prev) => prev + 50);
          setIsIncrementalLoading(false);
        }, 200);
      }
    }
  };

  const handleCopyCoin = (e: React.MouseEvent, coinName: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(coinName);
    setCopiedCoin(coinName);
    setTimeout(() => setCopiedCoin(null), 2000);
  };

  const handleNavigateToMain = (e: React.MouseEvent, coinName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      let currentState: any = {};
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          currentState = JSON.parse(saved);
        } catch (err) {
          console.error(err);
        }
      }
      currentState.selectedCoin = coinName;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      window.open("/", "_blank", "noopener,noreferrer");
    }
  };

  const formatValue = (val: any, col: string, decimals: number = 2) => {
    if (val === null || val === undefined) return "--";
    const c = col.toLowerCase();
    if (c === "created_at" || c === "listed_at") {
      try {
        const d = new Date(val);
        const dateStr =
          `${String(d.getDate()).padStart(2, "0")}.` +
          `${String(d.getMonth() + 1).padStart(2, "0")}.` +
          `${String(d.getFullYear())}`;
        const timeStr =
          `${String(d.getHours()).padStart(2, "0")}:` +
          `${String(d.getMinutes()).padStart(2, "0")}:` +
          `${String(d.getSeconds()).padStart(2, "0")}`;
        return (
          <div
            className={cn(
              "flex flex-col text-[10px] text-muted-foreground",
              "leading-tight",
            )}
          >
            <span className="font-semibold text-foreground/80">{dateStr}</span>
            <span className="opacity-60">{timeStr}</span>
          </div>
        );
      } catch (e) {
        return "--";
      }
    }
    if (["price", "entry_price", "closed_at_price"].includes(c)) {
      const num = parseFloat(val);
      return isNaN(num) ? val : num.toFixed(decimals);
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
      const isLong = row.side === "BUY";
      return (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            {activeTable === "deals" && (
              <span
                className={cn(
                  "px-1 py-px rounded text-[8px] font-black border",
                  "uppercase tracking-wide mr-1",
                  isLong
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20",
                )}
              >
                {isLong ? "L" : "S"}
              </span>
            )}
            {activeTable === "coins" && (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleCopyCoin(e, row.coin)}
                  disabled={row.is_delisted}
                  className={cn(
                    "p-1 hover:bg-muted rounded text-muted-foreground/40",
                    "hover:text-foreground cursor-pointer transition-colors",
                    row.is_delisted &&
                      "cursor-not-allowed hover:text-muted-foreground/40 hover:bg-inherit",
                  )}
                  title="Копировать тикер"
                >
                  {copiedCoin === row.coin ? (
                    <CheckIcon className="size-3 text-emerald-500 shrink-0" />
                  ) : (
                    <CopyIcon className="size-3 shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleNavigateToMain(e, row.coin)}
                  disabled={row.is_delisted}
                  className={cn(
                    "p-1 hover:bg-muted rounded text-muted-foreground/40",
                    "hover:text-foreground cursor-pointer transition-colors",
                    row.is_delisted &&
                      "cursor-not-allowed hover:text-muted-foreground/40 hover:bg-inherit",
                  )}
                  title="Открыть в калькуляторе"
                >
                  <ExternalLinkIcon className="size-3 shrink-0" />
                </button>
              </span>
            )}
            <span className="font-bold text-foreground text-xs">{val}</span>
            {activeTable === "coins" && isGainer && (
              <span
                className={cn(
                  "px-1 py-0.5 rounded text-[8px] font-black border",
                  "bg-emerald-500/10 text-emerald-500",
                  "border-emerald-500/20 tracking-wider ml-1",
                )}
              >
                GAINER
              </span>
            )}
            {activeTable === "coins" && isLoser && (
              <span
                className={cn(
                  "px-1 py-0.5 rounded text-[8px] font-black border",
                  "bg-rose-500/10 text-rose-500",
                  "border-rose-500/20 tracking-wider ml-1",
                )}
              >
                LOSER
              </span>
            )}
          </div>
          {activeTable === "coins" && row.fullname && (
            <span
              className={cn(
                "text-[10px] text-muted-foreground/60",
                "font-medium mt-0.5 pl-12.5",
              )}
            >
              {row.fullname}
            </span>
          )}
        </div>
      );
    }
    if (c === "order_type" && activeTable === "deals") {
      return (
        <span
          className={cn(
            "px-1 py-0.5 rounded text-[8px] font-black border",
            "uppercase tracking-wide",
            val === "LIMIT"
              ? "bg-violet-500/10 text-violet-500 border-violet-500/15"
              : "bg-blue-500/10 text-blue-500 border-blue-500/15",
          )}
        >
          {val === "LIMIT" ? "ЛИМИТ" : "РЫНОК"}
        </span>
      );
    }

    if (c === "volume" && activeTable === "deals") {
      return (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-foreground">
            {(row.volume || 0).toFixed(1)}
          </span>
          <span className="text-[9px] text-muted-foreground/70">
            М: {(row.margin || 0).toFixed(1)} (x{row.leverage})
          </span>
        </div>
      );
    }

    if (c === "tp_sl" && activeTable === "deals") {
      return (
        <div className="flex flex-col text-[10px] leading-tight gap-0.5">
          <span className="text-emerald-500 font-semibold">
            TP: {(row.take_profit || 0).toFixed(currentPrecision)}
          </span>
          <span className="text-rose-500 font-semibold">
            SL: {(row.stop_loss || 0).toFixed(currentPrecision)}
          </span>
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

    if (c === "status") {
      const s = String(val).toUpperCase();
      let badgeCls =
        "bg-muted/40 text-muted-foreground border-muted-foreground/20";
      if (s === "PROFIT")
        badgeCls =
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold";
      else if (s === "LOSS")
        badgeCls = "bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold";
      else if (s === "OPEN")
        badgeCls =
          "bg-amber-500/10 text-amber-400 border-amber-500/20 font-black animate-pulse";
      return (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[8px] uppercase border",
            "tracking-wider",
            badgeCls,
          )}
        >
          {s}
        </span>
      );
    }

    if (
      typeof val === "boolean" ||
      [
        "is_favorite",
        "is_active",
        "is_delisted",
        "tp_touched",
        "sl_touched",
      ].includes(c)
    ) {
      if (c === "is_favorite") {
        return val ? (
          <StarIcon className="size-4 text-amber-500 fill-amber-500" />
        ) : (
          <StarIcon className="text-muted-foreground/10 size-4" />
        );
      }
      if (c === "is_active") {
        return val ? (
          <CircleSmallIcon className="text-emerald-500 fill-emerald-500 size-4" />
        ) : (
          <CircleSmallIcon className="text-muted-foreground/10 size-4" />
        );
      }
      if (c === "is_delisted") {
        return val ? (
          <CircleSmallIcon className="text-rose-500 fill-rose-500 size-4" />
        ) : (
          <CircleSmallIcon className="text-muted-foreground/10 size-4" />
        );
      }
      return val ? (
        <span
          className={cn(
            "px-1 py-px text-[7px] font-black rounded border border-solid",
            "uppercase tracking-tight",
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

  const slicedRows = displayedRows.slice(0, visibleCount);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-x-auto scrollbar-thin touch-pan-x w-full relative min-h-32"
    >
      <Table className="text-[11px] font-medium border-collapse min-w-150 w-full font-mono">
        <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md border-b">
          <TableRow>
            <TableHead
              className={cn(
                "h-10 px-3 text-center font-black uppercase text-muted-foreground/80",
                "whitespace-nowrap w-12 border-r border-border/10 bg-muted/5",
              )}
            >
              #
            </TableHead>
            {activeHeaders.map((col) => {
              let displayHeader = col;
              if (col === "id") displayHeader = "ID";
              if (col === "created_at") displayHeader = "Date";
              if (col === "coin") displayHeader = "Pair";
              if (col === "order_type") displayHeader = "Type";
              if (col === "volume") displayHeader = "Volume";
              if (col === "entry_price") displayHeader = "Enter";
              if (col === "tp_sl") displayHeader = "TP / SL";
              if (col === "status") displayHeader = "Status";
              if (col === "closed_at_price") displayHeader = "Exit";
              if (col === "tp_touched") displayHeader = "by TP";
              if (col === "sl_touched") displayHeader = "by SL";
              if (col === "logo_slug") displayHeader = "Logo";
              if (col === "decimals") displayHeader = "Decimals";
              if (col === "is_favorite") displayHeader = "Favorites";
              if (col === "is_active") displayHeader = "Active";
              if (col === "is_delisted") displayHeader = "Archive";
              if (col === "listed_at") displayHeader = "Listed at";
              return (
                <TableHead
                  key={col}
                  className={cn(
                    "h-10 px-3 text-left font-black uppercase tracking-wider text-muted-foreground/80",
                  )}
                >
                  {displayHeader}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slicedRows.map((row, idx) => (
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
                    "p-3 max-w-44 truncate text-foreground/90 whitespace-nowrap",
                    isNumericColumn(col) ? "font-semibold" : "",
                  )}
                >
                  {renderCustomCell(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {isIncrementalLoading && (
        <div className="flex p-2.5 gap-2 items-center justify-center text-muted-foreground bg-background/70 backdrop-blur-md text-[10px] select-none font-medium sticky bottom-0 left-0 right-0 z-40">
          <Spinner className="text-amber-500 size-3" />
          <span>Loading data...</span>
        </div>
      )}
    </div>
  );
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
            detail: { coin: coin, is_favorite: false, logo_slug: val.trim() },
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

  const handleConfirmSaveWrapper = () => {
    handleConfirmSave();
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
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        disabled={isSaving || isDelisted}
        className={cn(
          "w-full h-7 text-[11px] bg-muted/40",
          "border border-border/40 rounded px-1.5 outline-hidden",
          "focus:bg-background focus:border-amber-500/50",
          "transition-all",
          isDelisted ? "opacity-40 cursor-not-allowed select-none" : "",
        )}
        placeholder={isDelisted ? "НЕДОСТУПНО" : "Напр. BTC"}
      />
      {isSaving && <Spinner className="size-3 text-amber-500 shrink-0" />}
      {isSuccess && <CheckIcon className="size-3 text-emerald-500 shrink-0" />}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-mono">
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
              className={cn("rounded-xl text-xs h-9 cursor-pointer")}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSaveWrapper}
              className={cn(
                "rounded-xl text-xs h-9 bg-amber-600 hover:bg-amber-500",
                "text-white font-bold",
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
