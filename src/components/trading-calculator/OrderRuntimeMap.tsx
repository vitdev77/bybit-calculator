"use client";

import React from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Rocket,
  AlertTriangle,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { cn } from "cn";

interface OrderRuntimeMapProps {
  activeOpenDeal: any;
  livePrice: number;
  precision: number;
}
export function OrderRuntimeMap({
  activeOpenDeal,
  livePrice,
  precision,
}: OrderRuntimeMapProps) {
  if (
    !activeOpenDeal ||
    livePrice <= 0 ||
    !activeOpenDeal.stop_loss ||
    !activeOpenDeal.take_profit
  ) {
    return null;
  }

  const isLong = activeOpenDeal.side === "BUY";
  const isSpot = activeOpenDeal.leverage === 1;
  const openFeeRate = isSpot
    ? activeOpenDeal.order_type === "LIMIT"
      ? 0.00075
      : 0.00135
    : activeOpenDeal.order_type === "LIMIT"
      ? 0.000324
      : 0.0009;
  const closeFeeRate = isSpot ? 0.00135 : 0.0009;

  const bPrice = isLong
    ? activeOpenDeal.entry_price * ((1 + openFeeRate) / (1 - closeFeeRate))
    : activeOpenDeal.entry_price * ((1 - openFeeRate) / (1 + closeFeeRate));
  const isBuPassed = isLong ? livePrice >= bPrice : livePrice <= bPrice;
  const minScalePrice = Math.min(
    activeOpenDeal.stop_loss,
    activeOpenDeal.take_profit,
  );
  const maxScalePrice = Math.max(
    activeOpenDeal.stop_loss,
    activeOpenDeal.take_profit,
  );
  const totalRange = maxScalePrice - minScalePrice;

  const getPercent = (p: number) =>
    totalRange <= 0
      ? 50
      : Math.min(Math.max(((p - minScalePrice) / totalRange) * 100, 0), 100);
  const getVisualPercent = (p: number) =>
    isLong ? getPercent(p) : 100 - getPercent(p);

  const slPct = getVisualPercent(activeOpenDeal.stop_loss);
  const entryPct = getVisualPercent(activeOpenDeal.entry_price);
  const buPct = getVisualPercent(bPrice);
  const tpPct = getVisualPercent(activeOpenDeal.take_profit);
  const livePct = getVisualPercent(livePrice);

  const isTakeProfitBroken = isLong
    ? livePrice > activeOpenDeal.take_profit
    : livePrice < activeOpenDeal.take_profit;
  const isStopLossBroken = isLong
    ? livePrice < activeOpenDeal.stop_loss
    : livePrice > activeOpenDeal.stop_loss;

  let liveTranslateX = -50;
  if (livePct < 20) liveTranslateX = -50 + (20 - livePct) * 2.5;
  else if (livePct > 80) liveTranslateX = -50 - (livePct - 80) * 2.5;
  const isMovingToProfit = isLong
    ? livePrice > activeOpenDeal.entry_price
    : livePrice < activeOpenDeal.entry_price;
  const liveBgClass = isBuPassed ? "bg-cyan-500" : "bg-zinc-500";
  const liveTextClass = isBuPassed
    ? "text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
    : "text-zinc-600 dark:text-zinc-300 border-zinc-500/20";

  let StatusTopIcon = Activity;
  let statusTopBadgeClass = "bg-amber-500/10 text-amber-500";
  let statusText = "В СПРЕДЕ КОМИССИЙ";

  if (isTakeProfitBroken) {
    StatusTopIcon = Rocket;
    statusTopBadgeClass = "bg-purple-500/10 text-purple-500";
    statusText = "ЦЕЛЬ ДОСТИГНУТА";
  } else if (isStopLossBroken) {
    StatusTopIcon = AlertTriangle;
    statusTopBadgeClass = "bg-rose-500/10 text-rose-500";
    statusText = "STOP LOSS ПРОБИТ";
  } else if (!isMovingToProfit) {
    StatusTopIcon = TrendingDown;
    statusTopBadgeClass = "bg-rose-500/10 text-rose-500";
    statusText = "В ЗОНЕ УБЫТКА";
  } else if (isBuPassed) {
    StatusTopIcon = ShieldCheck;
    statusTopBadgeClass = "bg-cyan-500/10 text-cyan-500";
    statusText = "В БЕЗУБЫТКЕ";
  }

  return (
    <div className="w-full space-y-2.5 pt-2 select-none">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
        <span>Рантайм-карта ордера</span>
        <span
          className={`px-2 py-0.5 rounded flex items-center gap-1 font-black tracking-wide ${statusTopBadgeClass}`}
        >
          <StatusTopIcon
            className={cn(
              "size-3 shrink-0",
              !isMovingToProfit && "scale-x-[-1]",
            )}
          />
          <span>{statusText}</span>
        </span>
      </div>
      <div
        className="relative w-full bg-muted/10 dark:bg-black/40 border border-border/30 rounded-xl px-4 pt-20 pb-16 flex flex-col justify-center h-52 shadow-inner overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(120, 119, 198, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(120, 119, 198, 0.05) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "center center",
        }}
      >
        <div className="relative w-full h-0.75 rounded-full flex items-center">
          <div
            className="absolute h-full bg-rose-500 border border-rose-500/10 rounded-l-full"
            style={{
              left: `${Math.min(slPct, entryPct)}%`,
              width: `${Math.abs(entryPct - slPct)}%`,
            }}
          />
          <div
            className="absolute h-full bg-amber-500 border border-amber-500/10"
            style={{
              left: `${Math.min(entryPct, buPct)}%`,
              width: `${Math.abs(buPct - entryPct)}%`,
            }}
          />
          <div
            className="absolute h-full bg-emerald-500 border border-emerald-500/10 rounded-r-full"
            style={{
              left: `${Math.min(buPct, tpPct)}%`,
              width: `${Math.abs(tpPct - buPct)}%`,
            }}
          />
          <div
            className="absolute size-2 bg-rose-500 rounded-full border border-background shadow-sm"
            style={{ left: `${slPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-2 bg-foreground rounded-full border border-background shadow-sm"
            style={{ left: `${entryPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-1.5 bg-amber-500 rounded-full border border-background shadow-sm"
            style={{ left: `${buPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-2 bg-emerald-500 rounded-full border border-background shadow-sm"
            style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
          />

          {!isTakeProfitBroken && !isStopLossBroken && (
            <div
              className="absolute flex flex-col items-center z-20 transition-all duration-700 ease-out"
              style={{
                left: `${livePct}%`,
                transform: `translateX(${liveTranslateX}%)`,
              }}
            >
              <div
                className={`size-2.5 rounded-full border border-background shadow-md ${liveBgClass}`}
              />
              <div
                className={`absolute -top-9 bg-background border rounded overflow-hidden shadow-sm text-[10px] h-5 z-30 flex items-center ${liveTextClass}`}
              >
                <span
                  className={`h-full px-2 flex items-center text-white ${liveBgClass}`}
                >
                  <Activity className="size-3 shrink-0" />
                </span>
                <span className="pl-1.5 pr-1.5 font-bold flex items-center gap-1.5">
                  {!isMovingToProfit && (
                    <TrendingDown className="size-3 text-rose-500 shrink-0 scale-x-[-1]" />
                  )}
                  <span>{livePrice.toFixed(precision)}</span>
                  {isMovingToProfit && (
                    <TrendingUp className="size-3 text-cyan-500 shrink-0" />
                  )}
                </span>
              </div>
              <div className="absolute -top-3 border-l border-muted-foreground/30 h-3 border-dashed" />
            </div>
          )}
          <div
            className="absolute bottom-0 border-l border-rose-500/20 h-10 border-dashed -translate-x-1/2"
            style={{ left: `${slPct}%` }}
          />
          <div
            className="absolute bottom-0 border-l border-emerald-500/20 h-10 border-dashed -translate-x-1/2"
            style={{ left: `${tpPct}%` }}
          />
          <div
            className="absolute top-0 border-l border-muted-foreground/30 h-3.5 border-dashed -translate-x-1/2"
            style={{ left: `${entryPct}%` }}
          />
          <div
            className="absolute top-0 border-l border-amber-500/20 h-11 border-dashed -translate-x-1/2"
            style={{ left: `${buPct}%` }}
          />

          <div
            className="absolute bottom-11 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
            style={{ left: `${slPct}%` }}
          >
            <span className="h-full px-1.5 flex items-center bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider">
              SL
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {activeOpenDeal.stop_loss.toFixed(precision)}
            </span>
          </div>
          {isStopLossBroken && (
            <div
              className="absolute bottom-17 flex items-center bg-background border border-rose-500/30 rounded overflow-hidden shadow-sm text-[10px] h-5 z-40"
              style={{ left: `${slPct}%` }}
            >
              <span className="h-full px-2 flex items-center bg-rose-600 text-white">
                <AlertTriangle className="size-3 shrink-0" />
              </span>
              <span className="px-2 font-black text-rose-600 dark:text-rose-400">
                {livePrice.toFixed(precision)}
              </span>
            </div>
          )}
          <div
            className="absolute bottom-11 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
            style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
          >
            <span className="h-full px-1.5 flex items-center bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider">
              TP
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {activeOpenDeal.take_profit.toFixed(precision)}
            </span>
          </div>
          {isTakeProfitBroken && (
            <div
              className="absolute bottom-17 flex items-center bg-background border border-purple-500/30 rounded overflow-hidden shadow-sm text-[10px] h-5 z-40"
              style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
            >
              <span className="px-2 font-black text-purple-600 dark:text-purple-400">
                {livePrice.toFixed(precision)}
              </span>
              <span className="h-full px-2 flex items-center bg-purple-600 text-white">
                <Rocket className="size-3 shrink-0" />
              </span>
            </div>
          )}
          <div
            className="absolute top-3.75 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
            style={{
              left: `${entryPct}%`,
              transform:
                entryPct < 15
                  ? "translateX(0%)"
                  : entryPct > 85
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <span className="h-full px-2 flex items-center bg-primary text-primary-foreground">
              <LogIn className="size-3 shrink-0" />
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {activeOpenDeal.entry_price.toFixed(precision)}
            </span>
          </div>
          <div
            className="absolute top-11.25 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
            style={{
              left: `${buPct}%`,
              transform:
                buPct < 15
                  ? "none"
                  : buPct > 85
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <span className="h-full px-2 flex items-center bg-amber-500 text-white">
              <ShieldCheck className="size-3 shrink-0" />
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {bPrice.toFixed(precision)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
