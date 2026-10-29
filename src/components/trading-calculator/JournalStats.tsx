"use client";
import React from "react";
import {
  WalletIcon,
  FlameIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ActivityIcon,
  TrendingDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const manualClosedDeals = deals.filter((d) => d.status === "CLOSED").length;

  let lossDeals = 0;
  let breakevenDeals = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let totalMarginUsed = 0;
  let closedDealsCount = 0;

  deals.forEach((d) => {
    if (d.status === "OPEN") return;
    closedDealsCount += 1;
    const isLong = d.side === "BUY";
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
    const priceDiff = isLong
      ? targetPrice - d.entry_price
      : d.entry_price - targetPrice;
    const pnlUsdt = priceDiff * cryptoQty - d.volume * totalFeeRate;

    if (pnlUsdt >= 0) {
      totalGrossProfit += pnlUsdt;
    } else {
      totalGrossLoss += Math.abs(pnlUsdt);
    }

    if (d.margin > 0) {
      totalMarginUsed += d.margin;
    }

    if (d.status === "LOSS") {
      const isBe = isLong
        ? targetPrice >= d.entry_price
        : targetPrice <= d.entry_price;
      if (isBe) {
        breakevenDeals += 1;
      } else {
        lossDeals += 1;
      }
    }
  });

  const netPnL = totalGrossProfit - totalGrossLoss;
  const totalMarginPercent =
    totalMarginUsed > 0 ? (netPnL / totalMarginUsed) * 100 : 0;
  const profitFactor =
    totalGrossLoss > 0
      ? totalGrossProfit / totalGrossLoss
      : totalGrossProfit > 0
        ? 99.9
        : 0;

  const winRate =
    closedDealsCount > 0 ? (profitDeals / closedDealsCount) * 100 : 0;
  const avgPnl = closedDealsCount > 0 ? netPnL / closedDealsCount : 0;

  const containerCls = cn(
    "flex items-center p-3 sm:px-4 rounded-2xl border bg-linear-to-br shadow-inner w-full",
    "col-span-2 lg:col-span-2 transition-all duration-300 relative overflow-hidden",
    netPnL > 0.005
      ? "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
      : netPnL < -0.005
        ? "from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/20 text-rose-500 dark:text-rose-400"
        : "from-muted/20 via-muted/5 to-transparent border-border/40 text-muted-foreground",
  );

  const walletCls = cn(
    "size-4.5 shrink-0 transition-colors duration-300",
    netPnL > 0.005
      ? "text-emerald-500 dark:text-emerald-400"
      : netPnL < -0.005
        ? "text-rose-500 dark:text-rose-400"
        : "text-muted-foreground/80",
  );

  const roiTextCls = cn(
    "text-xs tracking-tight shrink-0 block sm:inline mt-0.5 xs:mt-0",
    netPnL > 0.005
      ? "text-emerald-500"
      : netPnL < -0.005
        ? "text-rose-500"
        : "text-muted-foreground/60",
  );

  const subBoxCls =
    "flex items-center gap-3.5 px-4 rounded-2xl bg-muted/30 dark:bg-neutral-900/40 border border-border/20 text-muted-foreground justify-start w-full shadow-xs col-span-2 lg:col-span-2";
  return (
    <div className="w-full select-none text-sm overflow-hidden box-border">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full items-stretch">
        <div className={cn(containerCls, "min-h-16 py-4 px-4")}>
          <ActivityIcon className="absolute right-3.5 top-3.5 size-12 opacity-3 pointer-events-none stroke-[1.5]" />
          <div className="flex items-center w-full justify-between h-full z-10 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
              <WalletIcon className={walletCls} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 leading-none">
                  Чистый доход
                </span>
                <div className="flex items-baseline gap-1 mt-1.5 min-w-0 flex-wrap">
                  <span className="font-black text-base sm:text-lg leading-none tracking-tight flex items-center gap-0.5 truncate">
                    {netPnL > 0.005 ? (
                      <ArrowUpRightIcon className="size-4 shrink-0 text-emerald-500 inline-block align-middle" />
                    ) : netPnL < -0.005 ? (
                      <ArrowDownRightIcon className="size-4 shrink-0 text-rose-500 inline-block align-middle" />
                    ) : null}
                    {netPnL > 0.005 ? "+" : ""}
                    {netPnL.toFixed(2)}
                  </span>
                  <span className="text-xs font-black opacity-60 shrink-0">
                    USDT
                  </span>
                  <span className={cn(roiTextCls, "ml-1")}>
                    ({netPnL > 0.005 ? "+" : ""}
                    {totalMarginPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="h-10 border-l border-border/30 dark:border-white/5 shrink-0 self-center mx-1" />
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-3">
              <TrendingDownIcon className="size-4.5 text-rose-500/70 dark:text-rose-400/70 shrink-0" />
              <div className="flex flex-col min-w-0 w-full">
                <span className="text-xs font-black uppercase tracking-wider text-rose-500/60 dark:text-rose-500/70 leading-none block">
                  Накопленный Убыток
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 min-w-0 justify-between w-full">
                  <span className="font-bold text-sm sm:text-base leading-none text-rose-500 truncate">
                    -{totalGrossLoss.toFixed(2)}{" "}
                    <span className="text-xs font-medium opacity-60">USDT</span>
                  </span>
                  {profitFactor > 0 && (
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-sm bg-neutral-500/10 text-muted-foreground border border-border/20 uppercase tracking-wider hidden md:inline shrink-0"
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
        <div
          className={cn(
            subBoxCls,
            "min-h-16 p-4 bg-background border-border/50",
          )}
        >
          <div className="grid grid-cols-3 gap-3 w-full min-w-0 items-center">
            <div className="flex flex-col min-w-0 h-full justify-between pr-2 border-r border-border/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                Сделки ({totalDeals})
              </span>
              <div className="flex items-baseline gap-1.5 mt-2.5 font-mono text-xs truncate">
                <span
                  className="text-emerald-500 font-bold"
                  title="Take Profit"
                >
                  {profitDeals}
                  <span className="text-[9px] font-normal opacity-50 ml-0.5">
                    TP
                  </span>
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span className="text-cyan-500 font-bold" title="Breakeven">
                  {breakevenDeals}
                  <span className="text-[9px] font-normal opacity-50 ml-0.5">
                    BE
                  </span>
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span className="text-rose-500 font-bold" title="Stop Loss">
                  {lossDeals}
                  <span className="text-[9px] font-normal opacity-50 ml-0.5">
                    SL
                  </span>
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span
                  className="text-violet-500 font-bold"
                  title="Manual Close"
                >
                  {manualClosedDeals}
                  <span className="text-[9px] font-normal opacity-50 ml-0.5">
                    MC
                  </span>
                </span>
              </div>
            </div>
            <div className="flex flex-col min-w-0 h-full justify-between px-1 border-r border-border/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                Эффективность
              </span>
              <div className="flex items-baseline gap-2 mt-2 font-mono truncate">
                <span className="font-black text-sm text-foreground">
                  WR: {winRate.toFixed(0)}%
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    profitFactor >= 1.5 ? "text-emerald-500" : "text-amber-500",
                  )}
                >
                  PF: {profitFactor.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex flex-col min-w-0 h-full justify-between pl-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                Матожидание
              </span>
              <div className="flex items-baseline gap-1.5 mt-2 font-mono truncate">
                <span
                  className={cn(
                    "font-black text-sm",
                    avgPnl >= 0 ? "text-emerald-500" : "text-rose-500",
                  )}
                >
                  {avgPnl >= 0 ? "+" : ""}
                  {avgPnl.toFixed(2)}
                  <span className="text-[9px] font-normal text-muted-foreground/60 ml-0.5">
                    USDT
                  </span>
                </span>
                <span className="text-[10px] font-bold text-violet-400">
                  Р:{" "}
                  {totalDeals > 0
                    ? ((manualClosedDeals / totalDeals) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
