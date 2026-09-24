"use client";

import React from "react";
import { Wallet, Target, Flame, History } from "lucide-react";
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
}

export function JournalStats({ deals = [] }: JournalStatsProps) {
  const totalDeals = deals.length;
  const profitDeals = deals.filter((d) => d.status === "PROFIT").length;
  const lossDeals = deals.filter((d) => d.status === "LOSS").length;
  const manualClosedDeals = deals.filter((d) => d.status === "CLOSED").length;
  const closedCount = profitDeals + lossDeals;

  let totalGrossProfit = 0;
  let totalGrossLoss = 0;

  deals.forEach((d) => {
    if (d.status === "OPEN") return;

    // Рассчитываем суммарную комиссию Bybit (VIP 0 фьючерсы: 0.0006 * 2 + проскальзывание)
    const totalFeeRate = d.leverage === 1 ? 0.0027 : 0.00145;
    const dbPrice = d.closed_at_price
      ? parseFloat(String(d.closed_at_price))
      : 0;

    // ИСПРАВЛЕНИЕ МАТЕМАТИКИ БЕЗУБЫТКА:
    // Мы жестко смотрим на фактическую зафиксированную цену закрытия из базы (dbPrice).
    // Если она по какой-то причине отсутствует в старых логах, мы берем d.stop_loss,
    // в котором при переносе в БУ уже лежит правильная откорректированная цена!
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

    // Рассчитываем разницу хода цены с учетом направления Long / Short
    const priceDiff =
      d.side === "BUY"
        ? targetPrice - d.entry_price
        : d.entry_price - targetPrice;

    // Итоговый PnL сделки с вычетом всех торговых сборов
    const pnlUsdt = priceDiff * cryptoQty - d.volume * totalFeeRate;

    if (pnlUsdt >= 0) totalGrossProfit += pnlUsdt;
    else totalGrossLoss += Math.abs(pnlUsdt);
  });

  const netPnL = totalGrossProfit - totalGrossLoss;
  const winRate =
    closedCount > 0 ? Math.round((profitDeals / closedCount) * 100) : 0;
  return (
    <div className="w-full select-none text-xs">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full items-center">
        {/* КАРТОЧКА 1: ЧИСТЫЙ ДОХОД */}
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

        {/* КАРТОЧКА 3: ТРИГГЕРЫ СРАБАТЫВАНИЯ УРОВНЕЙ */}
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

        {/* КАРТОЧКА 4: ВСЕГО В ЖУРНАЛЕ */}
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
    </div>
  );
}
