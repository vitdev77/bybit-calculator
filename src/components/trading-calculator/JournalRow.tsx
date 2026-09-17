"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Check,
  X,
  LogOut,
  Pause,
  Clock,
} from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";

interface Deal {
  id: number;
  created_at: string;
  coin: string;
  side: "BUY" | "SELL";
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  volume: number;
  margin: number;
  leverage: number;
  status: "OPEN" | "PROFIT" | "LOSS" | "CLOSED";
  closed_at_price?: number | string | null;
}

interface JournalRowProps {
  deal: Deal;
  livePrice: number;
  activeCoin: string;
  precision: number;
  frozenPnL: any;
  setFrozenPnL: React.Dispatch<React.SetStateAction<any>>;
  activeDeleteId: number | null;
  setActiveDeleteId: (id: number | null) => void;
  onCoinSelect?: (coin: string) => void;
  handleUpdateStatus: (id: number, status: any) => Promise<void>;
  handleDeleteDeal: (id: number) => Promise<void>;
}
export function JournalRow({
  deal,
  livePrice,
  activeCoin,
  precision,
  frozenPnL,
  setFrozenPnL,
  activeDeleteId,
  setActiveDeleteId,
  onCoinSelect,
  handleUpdateStatus,
  handleDeleteDeal,
}: JournalRowProps) {
  const isLong = deal.side === "BUY";
  const isOpen = deal.status?.toUpperCase() === "OPEN";
  const totalFeeRate =
    (deal.order_type === "LIMIT" ? 0.0002 : 0.00055) + 0.00055;

  const breakevenPrice = isLong
    ? deal.entry_price * (1 + totalFeeRate)
    : deal.entry_price * (1 - totalFeeRate);

  let pnlDisplay = null;
  const isCurrentActiveCoin = activeCoin === deal.coin;
  const isPriceValid =
    livePrice > 0 &&
    livePrice / deal.entry_price < 2.5 &&
    deal.entry_price / livePrice < 2.5;

  let isSlTriggered = false;
  let isTpTriggered = false;
  let isBreakevenPassed = false;
  if (isOpen && isCurrentActiveCoin && isPriceValid) {
    isSlTriggered = isLong
      ? livePrice <= deal.stop_loss
      : livePrice >= deal.stop_loss;
    isTpTriggered = isLong
      ? livePrice >= deal.take_profit
      : livePrice <= deal.take_profit;
    isBreakevenPassed = isLong
      ? livePrice >= breakevenPrice
      : livePrice <= breakevenPrice;

    const cryptoQty = deal.volume / deal.entry_price;
    const priceDiff = isLong
      ? livePrice - deal.entry_price
      : deal.entry_price - livePrice;

    const livePnlUsdt = priceDiff * cryptoQty - deal.volume * totalFeeRate;
    const liveRoi = deal.margin > 0 ? (livePnlUsdt / deal.margin) * 100 : 0;
    const isProfit = livePnlUsdt >= 0;

    if (frozenPnL[deal.id]?.pnl !== livePnlUsdt) {
      setTimeout(() => {
        setFrozenPnL((prev: any) => ({
          ...prev,
          [deal.id]: { pnl: livePnlUsdt, roi: liveRoi },
        }));
      }, 0);
    }

    pnlDisplay = (
      <div className="flex flex-col text-right select-none relative w-full pl-5 sm:pl-6">
        <span className="absolute left-1 top-1.5 flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isProfit ? "bg-emerald-500" : "bg-rose-500"
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              isProfit ? "bg-emerald-500" : "bg-rose-500"
            }`}
          ></span>
        </span>
        <span
          className={`font-black text-[11px] sm:text-xs ${
            isProfit
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isProfit ? "+" : ""}
          {liveRoi.toFixed(2)}%
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-bold ${
            isProfit ? "text-emerald-500/80" : "text-rose-500/80"
          }`}
        >
          {isProfit ? "+" : ""}
          {livePnlUsdt.toFixed(3)}{" "}
          <span className="text-[8px] font-normal opacity-60 text-muted-foreground">
            USDT
          </span>
        </span>
      </div>
    );
  }
  if (!pnlDisplay) {
    const lastKnown = frozenPnL[deal.id] || { pnl: 0, roi: 0 };
    if (isOpen) {
      pnlDisplay = (
        <div className="flex flex-col text-right select-none opacity-45 relative w-full pl-5 sm:pl-6">
          <Pause className="size-2 text-muted-foreground absolute left-0.5 top-1.5" />
          <span
            className={`text-[11px] sm:text-xs font-bold ${
              lastKnown.pnl >= 0
                ? "text-emerald-600/80 dark:text-emerald-400/80"
                : "text-rose-600/80 dark:text-rose-400/80"
            }`}
          >
            {lastKnown.pnl >= 0 ? "+" : ""}
            {lastKnown.roi.toFixed(2)}%
          </span>
          <span
            className={`text-[10px] font-bold ${
              lastKnown.pnl >= 0 ? "text-emerald-500/60" : "text-rose-500/60"
            }`}
          >
            {lastKnown.pnl >= 0 ? "+" : ""}
            {lastKnown.pnl.toFixed(3)}{" "}
            <span className="text-[8px] font-normal text-muted-foreground opacity-60">
              USDT
            </span>
          </span>
        </div>
      );
    } else {
      const statusUpper = deal.status?.toUpperCase();
      let targetPrice =
        statusUpper === "PROFIT"
          ? deal.take_profit
          : statusUpper === "LOSS"
            ? deal.stop_loss
            : deal.entry_price;

      if (statusUpper === "CLOSED") {
        const parsedPrice = deal.closed_at_price
          ? parseFloat(String(deal.closed_at_price))
          : 0;
        targetPrice =
          parsedPrice > 0
            ? parsedPrice
            : livePrice > 0
              ? livePrice
              : deal.entry_price;
      }

      const cryptoQty =
        deal.entry_price > 0 ? deal.volume / deal.entry_price : 0;

      const priceDiff = isLong
        ? targetPrice - deal.entry_price
        : deal.entry_price - targetPrice;

      const finalPnlUsdt = priceDiff * cryptoQty - deal.volume * totalFeeRate;
      const finalRoi =
        deal.margin > 0.01 ? (finalPnlUsdt / deal.margin) * 100 : 0;

      pnlDisplay = (
        <div className="flex flex-col text-right opacity-65 select-none w-full">
          <span
            className={`font-black text-[11px] sm:text-xs ${
              finalPnlUsdt >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {finalPnlUsdt >= 0 ? "+" : ""}
            {finalRoi.toFixed(2)}%
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-bold ${
              finalPnlUsdt >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
            }`}
          >
            {finalPnlUsdt >= 0 ? "+" : ""}
            {finalPnlUsdt.toFixed(3)}{" "}
            <span className="text-[8px] font-normal opacity-60 text-muted-foreground">
              USDT
            </span>
          </span>
        </div>
      );
    }
  }

  let dStr = "--.--.--",
    tStr = "--:--";
  if (deal.created_at) {
    try {
      const d = new Date(deal.created_at);
      dStr = `${String(d.getDate()).padStart(2, "0")}.${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
      tStr = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`;
    } catch (e) {}
  }

  const rowClass =
    isCurrentActiveCoin && isOpen
      ? "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/15"
      : !isOpen
        ? "opacity-55 hover:bg-muted/40 dark:hover:bg-muted/10 hover:opacity-100"
        : "hover:bg-muted/40 dark:hover:bg-muted/10";
  return (
    <TableRow
      className={`transition-all border-b border-border/10 ${rowClass}`}
    >
      <TableCell className="py-2 px-1.5 sm:px-3 relative pl-3.5 sm:pl-5">
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
            isLong ? "w-1 bg-emerald-500" : "w-1 bg-rose-500"
          } ${isCurrentActiveCoin && isOpen ? "w-1.5" : ""}`}
        />
        <div className="flex items-start gap-1">
          {deal.status?.toUpperCase() === "PROFIT" ||
          (isTpTriggered && isOpen) ? (
            <CheckCircle2
              className={`size-3 text-emerald-500 mt-0.5 ${
                isTpTriggered ? "animate-bounce" : ""
              }`}
            />
          ) : deal.status?.toUpperCase() === "LOSS" ||
            (isSlTriggered && isOpen) ? (
            <XCircle
              className={`size-3 text-rose-500 mt-0.5 ${
                isSlTriggered ? "animate-pulse" : ""
              }`}
            />
          ) : deal.status?.toUpperCase() === "CLOSED" ? (
            <Clock className="size-3 text-muted-foreground mt-0.5 opacity-60" />
          ) : (
            <span className="relative flex h-1.5 w-1.5 mt-1.5 mx-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          )}
          <div className="flex flex-col text-[9px] sm:text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">{dStr}</span>
            <span className="opacity-60">{tStr}</span>
          </div>
        </div>
      </TableCell>
      <TableCell
        onClick={() => onCoinSelect?.(deal.coin)}
        className="py-2 px-1.5 sm:px-3 font-bold cursor-pointer select-none group/coin text-[11px] sm:text-xs"
      >
        <span className="border-b border-dotted border-muted-foreground/40 group-hover/coin:border-amber-500/80 transition-colors text-foreground">
          {deal.coin}
        </span>
      </TableCell>
      <TableCell className="py-2 px-1 sm:px-2">
        <span
          className={`px-0.5 py-0.5 rounded text-[8px] font-black border ${
            deal.order_type === "LIMIT"
              ? "bg-violet-500/10 text-violet-500 border-violet-500/15"
              : "bg-blue-500/10 text-blue-500 border-blue-500/15"
          }`}
        >
          {deal.order_type}
        </span>
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 text-muted-foreground text-[11px] sm:text-xs">
        <span className="font-semibold text-foreground">
          {(deal.volume || 0).toFixed(1)}
        </span>
        <div className="text-[9px] sm:text-[10px] opacity-70">
          М: {(deal.margin || 0).toFixed(1)} (x{deal.leverage})
        </div>
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 font-semibold text-[11px] sm:text-xs">
        {(deal.entry_price || 0).toFixed(precision)}
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 text-[11px] sm:text-xs select-none">
        <span
          style={isBreakevenPassed ? { padding: "0px 3px" } : undefined}
          className={`inline-block transition-all duration-300 ${
            isBreakevenPassed
              ? "bg-amber-500 text-white font-normal rounded border border-amber-400/20 shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {breakevenPrice.toFixed(precision)}
        </span>
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 select-none">
        <div className="flex flex-col gap-1 text-[11px] sm:text-xs items-start">
          <span
            style={isTpTriggered ? { padding: "0px 3px" } : undefined}
            className={`inline-block transition-all duration-300 ${
              isTpTriggered
                ? "bg-emerald-500 text-white font-normal rounded border border-emerald-400/20 shadow-sm"
                : "text-muted-foreground/40"
            }`}
          >
            {(deal.take_profit ?? 0).toFixed(precision)}
          </span>
          <span
            style={isSlTriggered ? { padding: "0px 3px" } : undefined}
            className={`inline-block transition-all duration-300 ${
              isSlTriggered
                ? "bg-rose-500 text-white font-normal rounded border border-rose-400/20 shadow-sm"
                : "text-muted-foreground/40"
            }`}
          >
            {(deal.stop_loss ?? 0).toFixed(precision)}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 relative min-w-22 sm:min-w-26.25">
        {pnlDisplay}
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-0.5">
          {isOpen && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleUpdateStatus(deal.id, "PROFIT")}
                className="h-7 w-7 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md"
                title="Закрыть по тейку"
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleUpdateStatus(deal.id, "LOSS")}
                className="h-7 w-7 text-rose-600 hover:bg-rose-600 hover:text-white rounded-md"
                title="Закрыть по стопу"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleUpdateStatus(deal.id, "CLOSED")}
                className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md"
                title="Закрыть вручную"
              >
                <LogOut className="size-3" />
              </Button>
            </>
          )}
          <AlertDialog
            open={activeDeleteId === deal.id}
            onOpenChange={(o) => setActiveDeleteId(o ? deal.id : null)}
          >
            <AlertDialogTrigger
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "h-7 w-7 text-muted-foreground hover:text-rose-500",
              })}
            >
              <Trash2 className="size-3" />
            </AlertDialogTrigger>
            <AlertDialogContent size="default">
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы действительно хотите удалить сделку по паре {deal.coin} из
                  журнала?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl text-xs h-9">
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteDeal(deal.id)}
                  variant="destructive"
                  className="rounded-xl text-white bg-rose-600 border-none text-xs h-9"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
