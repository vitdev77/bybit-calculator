"use client";

import React from "react";
import {
  Wallet,
  Flame,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingDown,
} from "lucide-react";
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
  let totalMarginUsed = 0;

  deals.forEach((d) => {
    if (d.status === "OPEN") return;

    // СИНХРОНИЗАЦИЯ КОМИССИЙ: Параметры твоего фьючерсного аккаунта Bybit (0.0006 + 0.0006 + 0.0001)
    const totalFeeRate = 0.0013;
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

    if (d.margin > 0) {
      totalMarginUsed += d.margin;
    }
  });

  const netPnL = totalGrossProfit - totalGrossLoss;

  // Расчет общего процента ROI от маржи
  const totalRoiPercent =
    totalMarginUsed > 0 ? (netPnL / totalMarginUsed) * 100 : 0;

  // Расчет Профит-Фактора (Profit Factor)
  const profitFactor =
    totalGrossLoss > 0
      ? totalGrossProfit / totalGrossLoss
      : totalGrossProfit > 0
        ? 99.9
        : 0;

  // Пропорция для визуальной шкалы эффективности
  const combinedVolume = totalGrossProfit + totalGrossLoss;
  const profitRatioPercent =
    combinedVolume > 0 ? (totalGrossProfit / combinedVolume) * 100 : 50;
  return (
    <div className="w-full select-none text-xs overflow-hidden box-border">
      {/* СЕТКА СТАТИСТИКИ: На мобилках 2 колонки (grid-cols-2), на десктопе 4 (lg:grid-cols-4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full items-center">
        {/* КАРТОЧКА 1: ПРОФЕССИОНАЛЬНЫЙ СУПЕР-ИНФОРМЕР (Растянут на 2 колонки через lg:col-span-2) */}
        <div
          className={cn(
            "flex items-center p-3 sm:px-4 rounded-2xl border bg-linear-to-br shadow-inner min-h-14 w-full col-span-2 lg:col-span-2 transition-all duration-300 relative overflow-hidden",
            netPnL > 0.005
              ? "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
              : netPnL < -0.005
                ? "from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/20 text-rose-500 dark:text-rose-400"
                : "from-muted/20 via-muted/5 to-transparent border-border/40 text-muted-foreground",
          )}
        >
          {/* ФОНОВАЯ ИКОНКА ДЛЯ ГЛУБИНЫ ИНТЕРФЕЙСА */}
          <Activity className="absolute right-3.5 top-3.5 size-12 opacity-3 pointer-events-none stroke-[1.5]" />

          <div className="flex items-center w-full justify-between h-full z-10 min-w-0">
            {/* ЛЕВАЯ ЧАСТЬ: ЧИСТЫЙ ДОХОД И ДИНАМИЧЕСКАЯ ИКОНКА КОШЕЛЬКА */}
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
              {/* СВЕТОВАЯ ИНДИКАЦИЯ: Иконка Wallet теперь сочно красится в цвет твоего текущего PnL */}
              <Wallet
                className={cn(
                  "size-4.5 shrink-0 transition-colors duration-300",
                  netPnL > 0.005
                    ? "text-emerald-500 dark:text-emerald-400"
                    : netPnL < -0.005
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-muted-foreground/80",
                )}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none">
                  Чистый доход
                </span>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0 flex-wrap">
                  <span className="font-sans font-black text-sm sm:text-base leading-none tracking-tight flex items-center gap-0.5 truncate">
                    {netPnL > 0.005 ? (
                      <ArrowUpRight className="size-3.5 shrink-0 text-emerald-500 inline-block align-middle" />
                    ) : netPnL < -0.005 ? (
                      <ArrowDownRight className="size-3.5 shrink-0 text-rose-500 inline-block align-middle" />
                    ) : null}
                    {netPnL > 0.005 ? "+" : ""}
                    {netPnL.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-black opacity-60 shrink-0">
                    USDT
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-black tracking-tight shrink-0 block sm:inline mt-0.5 xs:mt-0",
                      netPnL > 0.005
                        ? "text-emerald-500"
                        : netPnL < -0.005
                          ? "text-rose-500"
                          : "text-muted-foreground/60",
                    )}
                  >
                    ({netPnL > 0.005 ? "+" : ""}
                    {totalRoiPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* ВЕРТИКАЛЬНЫЙ РАЗДЕЛИТЕЛЬ */}
            <div className="h-8 border-l border-border/30 dark:border-white/5 shrink-0 self-center mx-1" />

            {/* ПРАВАЯ ЧАСТЬ: НАКОПЛЕННЫЙ УБЫТОК И ИКОНКА ТРЕНДА DOWN */}
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-3">
              <TrendingDown className="size-4.5 text-rose-500/70 dark:text-rose-400/70 shrink-0" />
              <div className="flex flex-col min-w-0 w-full">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-500/60 dark:text-rose-500/70 leading-none block">
                  Накопленный Убыток
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0 justify-between w-full">
                  <span className="font-sans font-bold text-xs sm:text-sm leading-none text-rose-500 truncate">
                    -{totalGrossLoss.toFixed(2)}{" "}
                    <span className="text-[9px] font-medium opacity-60">
                      USDT
                    </span>
                  </span>
                  {profitFactor > 0 && (
                    <span
                      className="text-[8px] font-black px-1 py-px rounded-sm bg-neutral-500/10 text-muted-foreground border border-border/20 uppercase tracking-wider hidden md:inline shrink-0"
                      title="Коэффициент прибыльности системы"
                    >
                      PF: {profitFactor.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* КАРТОЧКА 2: СРАБАТЫВАНИЯ УРОВНЕЙ (Оригинальный чистый стиль) */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-muted/30 dark:bg-neutral-900/40 border border-border/20 text-muted-foreground justify-start h-14 sm:h-14 w-full shadow-xs col-span-1 lg:col-span-1">
          <Flame className="size-4.5 text-amber-500/80 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none truncate">
              Срабатывания
            </span>
            <span className="font-sans font-bold text-sm sm:text-base leading-none mt-1 text-foreground/90 flex items-baseline gap-1 truncate">
              <span className="text-emerald-500 font-black">
                {profitDeals}{" "}
                <span className="text-[9px] opacity-60 font-semibold">TP</span>
              </span>
              <span className="text-muted-foreground/30 font-normal text-xs mx-0.5">
                /
              </span>
              <span className="text-rose-500 font-black">
                {lossDeals}{" "}
                <span className="text-[9px] opacity-60 font-semibold">SL</span>
              </span>
            </span>
          </div>
        </div>

        {/* КАРТОЧКА 3: ВСЕГО В ЖУРНАЛЕ (Оригинальный чистый стиль) */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-muted/30 dark:bg-neutral-900/40 border border-border/20 text-muted-foreground justify-start h-14 sm:h-14 w-full shadow-xs col-span-1 lg:col-span-1">
          <History className="size-4.5 text-violet-500/80 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none truncate">
              Всего записей
            </span>
            <span className="font-sans font-black text-sm sm:text-base leading-none mt-1 text-foreground/90 truncate">
              {totalDeals}
              <span className="text-[10px] font-semibold text-muted-foreground/60 hidden sm:inline ml-1">
                (Ручные: {manualClosedDeals})
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
