"use client";

import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Download,
  Trash2,
  Wallet,
  Target,
  Activity,
  Flame,
  History,
} from "lucide-react";
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
}

interface JournalStatsProps {
  deals: Deal[];
  isClearOpen: boolean;
  setIsClearOpen: (open: boolean) => void;
  exportToCSV: () => void;
  handleClearAllDeals: () => void;
}

export function JournalStats({
  deals = [],
  isClearOpen,
  setIsClearOpen,
  exportToCSV,
  handleClearAllDeals,
}: JournalStatsProps) {
  const totalDeals = deals.length;
  const profitDeals = deals.filter((d) => d.status === "PROFIT").length;
  const lossDeals = deals.filter((d) => d.status === "LOSS").length;
  const manualClosedDeals = deals.filter((d) => d.status === "CLOSED").length;
  const closedCount = profitDeals + lossDeals;

  let totalGrossProfit = 0;
  let totalGrossLoss = 0;

  deals.forEach((d) => {
    if (d.status === "OPEN") return;

    const totalFeeRate = d.leverage === 1 ? 0.0027 : 0.00145;
    const dbPrice = d.closed_at_price
      ? parseFloat(String(d.closed_at_price))
      : 0;

    let targetPrice = dbPrice;
    if (targetPrice <= 0) {
      targetPrice =
        d.status === "PROFIT"
          ? d.take_profit
          : d.status === "LOSS"
            ? d.stop_loss
            : d.entry_price;
    }

    const cryptoQty = d.entry_price > 0 ? d.volume / d.entry_price : 0;
    const priceDiff =
      d.side === "BUY"
        ? targetPrice - d.entry_price
        : d.entry_price - targetPrice;
    const pnlUsdt = priceDiff * cryptoQty - d.volume * totalFeeRate;

    if (pnlUsdt >= 0) totalGrossProfit += pnlUsdt;
    else totalGrossLoss += Math.abs(pnlUsdt);
  });

  const netPnL = totalGrossProfit - totalGrossLoss;
  const winRate =
    closedCount > 0 ? Math.round((profitDeals / closedCount) * 100) : 0;

  // ФИКС ОПРЕДЕЛЕНИЯ ЗНАКА: Сравниваем с учетом погрешности JavaScript
  const isNetProfit = netPnL >= -0.00001;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3.5 w-full select-none text-xs">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 items-center">
        {/* КАРТОЧКА 1: ЧИСТЫЙ ДОХОД (Возвращен красивый стандарт .toFixed(2) безбагового вывода) */}
        <div
          className={cn(
            "flex items-center gap-3.5 px-4 py-3 rounded-2xl justify-start border bg-linear-to-br shadow-inner h-14 w-full",
            netPnL > 0.005
              ? "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
              : netPnL < -0.005
                ? "from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/20 text-rose-500 dark:text-rose-400"
                : "from-muted/20 via-muted/5 to-transparent border-border/40 text-muted-foreground",
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-lg shrink-0",
              netPnL > 0.005
                ? "bg-emerald-500/10"
                : netPnL < -0.005
                  ? "bg-rose-500/10"
                  : "bg-muted",
            )}
          >
            <Wallet className="size-4.5 opacity-90" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none">
              Чистый доход
            </span>
            <span className="font-sans font-bold text-base sm:text-lg leading-none mt-1">
              {netPnL > 0.005 ? "+" : ""}
              {netPnL.toFixed(2)}{" "}
              <span className="text-xs font-bold opacity-75">USDT</span>
            </span>
          </div>
        </div>

        {/* КАРТОЧКА 2: ПРИБЫЛЬНЫЕ СДЕЛКИ */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-linear-to-br from-cyan-500/15 via-cyan-500/5 to-transparent border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 justify-start h-14 w-full shadow-inner">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 shrink-0">
            <Target className="size-4.5 opacity-90" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
              Прибыльные сделки
            </span>
            <span className="font-sans font-black text-base sm:text-lg leading-none mt-1">
              {winRate}%
            </span>
          </div>
        </div>
        {/* КАРТОЧКА 3: ТРИГГЕРЫ СРАБАТЫВАНИЯ */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-muted/30 dark:bg-neutral-900/40 border border-border/20 text-muted-foreground justify-start h-14 w-full shadow-xs">
          <div className="p-1.5 rounded-lg bg-muted/60 dark:bg-neutral-800 shrink-0">
            <Flame className="size-4.5 text-amber-500/80" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
              Срабатывания
            </span>
            <span className="font-sans font-bold text-sm sm:text-base leading-none mt-1 text-foreground/90 flex items-baseline gap-1">
              <span className="text-emerald-500 font-black">
                {profitDeals} TP
              </span>
              <span className="text-muted-foreground/30 font-normal text-xs mx-0.5">
                /
              </span>
              <span className="text-rose-500 font-black">{lossDeals} SL</span>
            </span>
          </div>
        </div>

        {/* КАРТОЧКА 4: ВСЕГО ЗАПИСЕЙ */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-muted/30 dark:bg-neutral-900/40 border border-border/20 text-muted-foreground justify-start h-14 w-full shadow-xs">
          <div className="p-1.5 rounded-lg bg-muted/60 dark:bg-neutral-800 shrink-0">
            <History className="size-4.5 text-violet-500/80" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
              Всего записей
            </span>
            <span className="font-sans font-black text-sm sm:text-base leading-none mt-1 text-foreground/90">
              {totalDeals}{" "}
              <span className="text-xs font-semibold text-muted-foreground/60">
                (Ручные: {manualClosedDeals})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ПАНЕЛЬ УПРАВЛЕНИЯ КНОПКАМИ */}
      <div className="flex items-center justify-end gap-1.5 md:pl-2 border-t md:border-t-0 md:border-l border-border/20 pt-2 md:pt-0 shrink-0 w-full md:w-auto h-14">
        {totalDeals > 0 && (
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="icon"
            className="size-9 rounded-xl text-muted-foreground border-border/60 bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors shadow-none shrink-0"
            title="Выгрузить журнал в формате CSV"
          >
            <Download className="size-4 shrink-0" />
          </Button>
        )}

        {totalDeals > 0 && (
          <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <AlertDialogTrigger
              className={buttonVariants({
                variant: "outline",
                size: "icon",
                className:
                  "size-9 text-rose-600 border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-xl p-0 transition-colors shadow-none bg-transparent shrink-0",
              })}
              title="Полная очистка облачной базы данных"
            >
              <Trash2 className="size-4 shrink-0" />
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl max-w-xs sm:max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm sm:text-base">
                  Очистить весь журнал?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] sm:text-xs">
                  Это действие безвозвратно удалит всю историю Вашей торговли из
                  облачной базы данных Neon DB.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-1.5 sm:gap-2">
                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllDeals}
                  className={buttonVariants({
                    variant: "destructive",
                    className:
                      "rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white border-none cursor-pointer flex items-center justify-center",
                  })}
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
