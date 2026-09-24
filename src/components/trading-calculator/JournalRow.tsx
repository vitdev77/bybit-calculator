"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Check,
  X,
  LogOut,
  Pause,
  Clock,
  ShieldAlert,
  ShieldCheck,
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
import { toast } from "@/components/ui/toast";
import { cn } from "cn";

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
  tp_touched?: boolean;
  sl_touched?: boolean;
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
  handleUpdateStatus: (
    id: number,
    status: any,
    customPrice?: number,
  ) => Promise<void>;
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
  const [isMovingToBu, setIsMovingToBu] = useState(false);
  const [isManualCloseModalOpen, setIsManualCloseModalOpen] = useState(false);

  // ЖЕСТКИЙ ФЬЮЧЕРСНЫЙ РЕГЛАМЕНТ: Исключаем спот, фиксируем комиссии твоего аккаунта Bybit
  const openFeeRate = 0.0006;
  const closeFeeRate = 0.0006;
  const totalFeeRate = 0.0013; // 0.0006 + 0.0006 + 0.0001 (спред)

  const breakevenPrice = isLong
    ? deal.entry_price * ((1 + openFeeRate) / (1 - closeFeeRate - 0.0001))
    : deal.entry_price * ((1 - openFeeRate) / (1 + closeFeeRate + 0.0001));

  let pnlDisplay = null;
  const isCurrentActiveCoin = activeCoin === deal.coin;

  // Улучшенная валидация цен для предотвращения скачков при переключении токенов
  const isPriceValid =
    livePrice > 0 &&
    livePrice / deal.entry_price < 2.5 &&
    deal.entry_price / livePrice < 2.5;

  const cryptoQty = deal.entry_price > 0 ? deal.volume / deal.entry_price : 0;
  const currentPriceDiff = isLong
    ? livePrice - deal.entry_price
    : deal.entry_price - livePrice;
  const livePnlUsdt = currentPriceDiff * cryptoQty - deal.volume * totalFeeRate;
  const liveRoi = deal.margin > 0 ? (livePnlUsdt / deal.margin) * 100 : 0;
  const isLiveProfit = livePnlUsdt >= 0;

  if (isOpen && isCurrentActiveCoin && isPriceValid) {
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
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveProfit ? "bg-emerald-500" : "bg-rose-500"}`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLiveProfit ? "bg-emerald-500" : "bg-rose-500"}`}
          />
        </span>
        <span
          className={`font-black text-[11px] sm:text-xs ${isLiveProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
        >
          {isLiveProfit ? "+" : ""}
          {liveRoi.toFixed(2)}%
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-bold ${isLiveProfit ? "text-emerald-500/80" : "text-rose-500/80"}`}
        >
          {isLiveProfit ? "+" : ""}
          {livePnlUsdt.toFixed(3)}{" "}
          <span className="text-[8px] font-normal opacity-60 text-muted-foreground">
            USDT
          </span>
        </span>
      </div>
    );
  }
  if (!pnlDisplay) {
    if (isOpen) {
      const lastKnown = frozenPnL[deal.id] || { pnl: 0, roi: 0 };
      pnlDisplay = (
        <div className="flex flex-col text-right select-none opacity-45 relative w-full pl-5 sm:pl-6">
          <Pause className="size-2 text-muted-foreground absolute left-0.5 top-1.5" />
          <span
            className={`text-[11px] sm:text-xs font-bold ${lastKnown.pnl >= 0 ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-rose-600/80 dark:text-rose-400/80"}`}
          >
            {lastKnown.pnl >= 0 ? "+" : ""}
            {lastKnown.roi.toFixed(2)}%
          </span>
          <span
            className={`text-[10px] font-bold ${lastKnown.pnl >= 0 ? "text-emerald-500/60" : "text-rose-500/60"}`}
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
      const dbClosedPrice = deal.closed_at_price
        ? parseFloat(String(deal.closed_at_price))
        : 0;
      let targetPrice =
        dbClosedPrice <= 0
          ? statusUpper === "PROFIT"
            ? deal.take_profit
            : statusUpper === "LOSS"
              ? deal.stop_loss
              : deal.entry_price
          : dbClosedPrice;
      const priceDiff = isLong
        ? targetPrice - deal.entry_price
        : deal.entry_price - targetPrice;
      const finalPnlUsdt = priceDiff * cryptoQty - deal.volume * totalFeeRate;
      const finalRoi = deal.margin > 0 ? (finalPnlUsdt / deal.margin) * 100 : 0;

      pnlDisplay = (
        <div className="flex flex-col text-right opacity-65 select-none w-full">
          <span
            className={`font-black text-[11px] sm:text-xs ${finalPnlUsdt >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {finalPnlUsdt >= 0 ? "+" : ""}
            {finalRoi.toFixed(2)}%
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-bold ${finalPnlUsdt >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}`}
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

  const handleMoveToBreakevenClick = async () => {
    if (isMovingToBu || Math.abs(deal.stop_loss - breakevenPrice) < 0.00001)
      return;
    setIsMovingToBu(true);
    try {
      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deal.id,
          action: "MOVE_TO_BREAKEVEN",
          stop_loss: breakevenPrice,
        }),
      });
      if (!res.ok) throw new Error();
      toast.add({
        title: "Риск снят",
        description: `Stop Loss перенесен в безопасный БУ.`,
        type: "success",
      });
      // @ts-ignore
      window.dispatchEvent(new Event("refresh-trading-journal"));
    } catch (e) {
      console.error(e);
    } finally {
      setIsMovingToBu(false);
    }
  };

  const handleConfirmManualClose = () => {
    setIsManualCloseModalOpen(false);
    handleUpdateStatus(deal.id, "CLOSED", livePrice).catch((err) => {
      console.error("Manual close error:", err);
    });
  };

  let dStr = "--.--.--",
    tStr = "--:--";
  if (deal.created_at) {
    try {
      const d = new Date(deal.created_at);
      dStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
      tStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch (e) {}
  }
  const isAlreadyInBreakeven =
    Math.abs(deal.stop_loss - breakevenPrice) < 0.00001;
  const rowClass =
    isCurrentActiveCoin && isOpen
      ? "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/15"
      : !isOpen
        ? "opacity-55 hover:bg-muted/40 hover:opacity-100"
        : "hover:bg-muted/40";

  return (
    <TableRow
      className={`transition-all border-b border-border/10 ${rowClass}`}
    >
      <TableCell className="py-2 px-1.5 sm:px-3 relative pl-3.5 sm:pl-5">
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${isLong ? "bg-emerald-500" : "bg-rose-500"}`}
          style={{ width: isCurrentActiveCoin && isOpen ? "6px" : "4px" }}
        />
        <div className="flex items-start gap-1">
          {deal.status?.toUpperCase() === "PROFIT" ? (
            <CheckCircle2 className="size-3 text-emerald-500 mt-0.5" />
          ) : deal.status?.toUpperCase() === "LOSS" ? (
            <XCircle className="size-3 text-rose-500 mt-0.5" />
          ) : deal.status?.toUpperCase() === "CLOSED" ? (
            <Clock className="size-3 text-muted-foreground mt-0.5 opacity-60" />
          ) : (
            <span className="relative flex h-1.5 w-1.5 mt-1.5 mx-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
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
          className={`px-0.5 py-0.5 rounded text-[8px] font-black border ${deal.order_type === "LIMIT" ? "bg-violet-500/10 text-violet-500 border-violet-500/15" : "bg-blue-500/10 text-blue-500 border-blue-500/15"}`}
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
      <TableCell className="py-2 px-1.5 sm:px-3 text-muted-foreground text-[11px] sm:text-xs select-none">
        {breakevenPrice.toFixed(precision)}
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 select-none max-w-28 sm:max-w-none">
        <div className="flex flex-col gap-1.5 text-[11px] sm:text-xs items-start">
          <div className="flex flex-col gap-0.5 items-start">
            <span
              className={
                deal.tp_touched
                  ? "text-emerald-500 font-bold leading-none"
                  : "text-muted-foreground/40 leading-none"
              }
            >
              {(deal.take_profit ?? 0).toFixed(precision)}
            </span>
            {deal.tp_touched && (
              <span className="inline-block mt-0.5 px-1 py-px bg-emerald-500/15 text-emerald-500 text-[7px] sm:text-[8px] font-black tracking-wider rounded-sm uppercase scale-90 origin-left">
                touch
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 items-start">
            <span
              className={
                deal.sl_touched
                  ? "text-rose-500 font-bold leading-none"
                  : "text-muted-foreground/40 leading-none"
              }
            >
              {(deal.stop_loss ?? 0).toFixed(precision)}
            </span>
            {deal.sl_touched && (
              <span className="inline-block mt-0.5 px-1 py-px bg-rose-500/15 text-rose-500 text-[7px] sm:text-[8px] font-black tracking-wider rounded-sm uppercase scale-90 origin-left">
                touch
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 relative min-w-22 sm:min-w-26.25">
        {pnlDisplay}
      </TableCell>
      <TableCell className="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-0.5">
          {isOpen && (
            <>
              {livePrice > 0 &&
                isCurrentActiveCoin &&
                (isLong
                  ? livePrice >= breakevenPrice
                  : livePrice <= breakevenPrice) &&
                !isAlreadyInBreakeven && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isMovingToBu}
                    onClick={handleMoveToBreakevenClick}
                    className="h-7 w-7 text-amber-500 hover:bg-amber-500 hover:text-white rounded-md"
                    title="Перенести Stop Loss в безубыток"
                  >
                    <ShieldAlert className="size-3.5" />
                  </Button>
                )}
              {isAlreadyInBreakeven && isOpen && (
                <div
                  className="h-7 w-7 flex items-center justify-center text-emerald-500"
                  title="Позиция защищена (в БУ)"
                >
                  <ShieldCheck className="size-3.5" />
                </div>
              )}
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

              <AlertDialog
                open={isManualCloseModalOpen}
                onOpenChange={setIsManualCloseModalOpen}
              >
                <AlertDialogTrigger
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className:
                      "h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md cursor-pointer",
                  })}
                  title="Закрыть вручную с предпросмотром PnL"
                >
                  <LogOut className="size-3" />
                </AlertDialogTrigger>
                <AlertDialogContent size="default">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Закрыть сделку вручную?</AlertDialogTitle>
                    <AlertDialogDescription
                      render={<div />}
                      className="space-y-2 pt-1 text-xs text-balance text-muted-foreground"
                    >
                      <div>
                        Вы фиксируете текущую рыночную цену для пары{" "}
                        <b>{deal.coin}</b>.
                      </div>
                      <div className="p-3 bg-muted/40 border border-border/30 rounded-xl space-y-1.5 text-center select-none">
                        <div className="text-[10px] text-muted-foreground uppercase font-black">
                          Ожидаемый финансовый результат
                        </div>
                        <div
                          className={cn(
                            "text-base font-black tracking-tight",
                            isLiveProfit ? "text-emerald-500" : "text-rose-500",
                          )}
                        >
                          {isLiveProfit ? "+" : ""}
                          {livePnlUsdt.toFixed(3)} USDT (
                          {isLiveProfit ? "+" : ""}
                          {liveRoi.toFixed(2)}%)
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">
                          Текущая цена тикера: {livePrice.toFixed(precision)}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                      Отмена
                    </AlertDialogCancel>
                    <Button
                      onClick={handleConfirmManualClose}
                      className="rounded-xl text-white bg-blue-600 hover:bg-blue-700 border-none text-xs h-9 font-bold cursor-pointer"
                    >
                      Подтвердить закрытие
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
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
