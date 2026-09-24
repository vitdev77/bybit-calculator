"use client";

import React from "react";
import { LogIn, ShieldCheck, Rocket } from "lucide-react";
import { cn } from "cn";

interface OrderRuntimeMapProps {
  focusedDeal: any;
  livePrice: number;
  precision: number;
  isChangingCoin?: boolean;
  storedPnL?: { pnl: number; roi: number };
}

export function OrderRuntimeMap({
  focusedDeal = null,
  livePrice,
  precision,
  isChangingCoin = false,
  storedPnL = { pnl: 0, roi: 0 },
}: OrderRuntimeMapProps) {
  // ФИКС СКЕЛЕТОНА В КАРТЕ: Если замок лоадера заблокирован родителем, мгновенно разворачиваем скелетон-анимацию!
  if (isChangingCoin) {
    return (
      <div className="w-full space-y-2.5 pt-2 select-none animate-pulse">
        <div className="flex items-center justify-between h-5 w-full">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-muted rounded-full" />
            <div className="h-3.5 bg-muted rounded w-24" />
            <div className="h-3.5 bg-muted rounded w-28 opacity-60" />
            <div className="h-3.5 bg-muted rounded w-16 opacity-40" />
          </div>
        </div>
        <div
          className="relative w-full border border-border/30 rounded-2xl h-52 flex flex-col items-center justify-center p-6 shadow-xs overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, var(--color-muted) 0%, transparent 70%),
              linear-gradient(rgba(120, 119, 198, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(120, 119, 198, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 16px 16px, 16px 16px",
          }}
        >
          <div className="w-full h-0.75 bg-muted rounded-full relative" />
          <div className="flex gap-16 justify-center w-full">
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-20" />
            <div className="h-5 bg-muted rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (
    !focusedDeal ||
    livePrice <= 0 ||
    !focusedDeal.stop_loss ||
    !focusedDeal.take_profit
  ) {
    return null;
  }

  const isLong = focusedDeal.side === "BUY";
  const isSpot = focusedDeal.leverage === 1;
  const isOpen = focusedDeal.status?.toUpperCase() === "OPEN";

  const openFeeRate = isSpot ? 0.001 : 0.0006;
  const closeFeeRate = isSpot ? 0.001 : 0.0006;

  const bPrice = isLong
    ? focusedDeal.entry_price *
      ((1 + openFeeRate) / (1 - closeFeeRate - 0.0001))
    : focusedDeal.entry_price *
      ((1 - openFeeRate) / (1 + closeFeeRate + 0.0001));
  const minScalePrice = Math.min(
    focusedDeal.stop_loss,
    focusedDeal.take_profit,
  );
  const maxScalePrice = Math.max(
    focusedDeal.stop_loss,
    focusedDeal.take_profit,
  );
  const totalRange = maxScalePrice - minScalePrice;

  const getPercent = (p: number) =>
    totalRange <= 0
      ? 50
      : Math.min(Math.max(((p - minScalePrice) / totalRange) * 100, 0), 100);
  const getVisualPercent = (p: number) =>
    isLong ? getPercent(p) : 100 - getPercent(p);

  const slPct = getVisualPercent(focusedDeal.stop_loss);
  const entryPct = getVisualPercent(focusedDeal.entry_price);
  const buPct = getVisualPercent(bPrice);
  const tpPct = getVisualPercent(focusedDeal.take_profit);
  const livePct = getVisualPercent(livePrice);

  let closePct = null;
  let hasManualClosePointer = false;
  if (!isOpen && focusedDeal.closed_at_price) {
    const closedPriceNum = parseFloat(focusedDeal.closed_at_price);
    if (closedPriceNum >= minScalePrice && closedPriceNum <= maxScalePrice) {
      closePct = getVisualPercent(closedPriceNum);
      hasManualClosePointer = true;
    }
  }

  const isTakeProfitBroken = isLong
    ? livePrice > focusedDeal.take_profit
    : livePrice < focusedDeal.take_profit;
  const isStopLossBroken = isLong
    ? livePrice < focusedDeal.stop_loss
    : livePrice > focusedDeal.stop_loss;

  let liveTranslateX = -50;
  if (livePct < 20) liveTranslateX = -50 + (20 - livePct) * 2.5;
  else if (livePct > 80) liveTranslateX = -50 - (livePct - 80) * 2.5;
  const isMovingToProfit = isLong
    ? livePrice > focusedDeal.entry_price
    : livePrice < focusedDeal.entry_price;
  const liveBgClass =
    livePrice >= bPrice
      ? "bg-cyan-500 shadow-md shadow-cyan-500/30"
      : "bg-neutral-500 dark:bg-zinc-400 shadow-md shadow-neutral-500/20";
  const liveTextClass =
    livePrice >= bPrice
      ? "text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
      : "text-zinc-600 dark:text-zinc-300 border-zinc-500/20";

  let watermarkText = "SPREAD";
  let watermarkColorClass = "text-amber-500/4 dark:text-amber-500/7";
  let dynamicMeshGlow = "rgba(245, 158, 11, 0.04)";

  if (isTakeProfitBroken) {
    watermarkText = "TARGET";
    watermarkColorClass = "text-purple-500/5 dark:text-purple-500/8";
    dynamicMeshGlow = "rgba(168, 85, 247, 0.08)";
  } else if (isStopLossBroken) {
    watermarkText = "STOPPED";
    watermarkColorClass = "text-rose-600/5 dark:text-rose-500/8";
    dynamicMeshGlow = "rgba(239, 68, 68, 0.08)";
  } else if (!isMovingToProfit) {
    watermarkText = "DOWN";
    watermarkColorClass = "text-rose-500/4 dark:text-rose-500/7";
    dynamicMeshGlow = "rgba(244, 63, 94, 0.06)";
  } else if (isLong ? livePrice >= bPrice : livePrice <= bPrice) {
    watermarkText = "BREAKEVEN";
    watermarkColorClass = "text-cyan-500/5 dark:text-cyan-500/8";
    dynamicMeshGlow = "rgba(6, 182, 212, 0.08)";
  } else {
    watermarkText = "SPREAD";
    watermarkColorClass = "text-amber-500/4 dark:text-amber-500/7";
    dynamicMeshGlow = "rgba(245, 158, 11, 0.04)";
  }

  if (!isOpen) {
    watermarkText = "ARCHIVE";
    watermarkColorClass = "text-blue-500/4 dark:text-blue-500/6";
    dynamicMeshGlow = "rgba(59, 130, 246, 0.03)";
  }

  const isHeaderProfit = storedPnL.pnl >= 0;
  return (
    <div className="w-full space-y-2.5 pt-2 select-none">
      <div className="flex items-center justify-between h-5 text-xs font-semibold bg-transparent px-0.5">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isOpen ? "bg-cyan-400" : "bg-blue-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-1.5 w-1.5",
                isOpen ? "bg-cyan-500" : "bg-blue-500",
              )}
            />
          </span>
          <span className="font-bold tracking-tight text-foreground/90 flex items-center gap-1.5">
            {focusedDeal.coin}
            <span
              className={cn(
                "text-[9px] font-black px-1 rounded-sm text-white",
                isLong ? "bg-emerald-500" : "bg-rose-500",
              )}
            >
              {isLong ? "LONG" : "SHORT"}
            </span>
            {!isOpen && (
              <span className="text-[9px] font-bold bg-blue-500/15 text-blue-500 px-1 rounded-sm border border-blue-500/10">
                АРХИВ
              </span>
            )}
          </span>
          <span className="text-muted-foreground/50 hidden sm:inline">|</span>
          <span className="text-muted-foreground/80 font-medium">
            Price:{" "}
            <span className="font-bold text-foreground">
              {livePrice.toFixed(precision)}
            </span>
          </span>
          <span className="text-muted-foreground/80 font-medium">
            Vol:{" "}
            <span className="font-bold text-foreground/90">
              {focusedDeal.volume.toFixed(1)} USDT
            </span>
          </span>
          {isOpen && (
            <>
              <span className="text-muted-foreground/50 hidden sm:inline">
                |
              </span>
              <span
                className={cn(
                  "font-black tracking-tight flex items-center",
                  isHeaderProfit ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {isHeaderProfit ? "+" : ""}
                {storedPnL.roi.toFixed(2)}%
                <span className="text-[10px] font-semibold opacity-75 ml-1">
                  ({isHeaderProfit ? "+" : ""}
                  {storedPnL.pnl.toFixed(2)} USDT)
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      <div
        className="relative w-full bg-linear-to-b from-muted/20 to-muted/5 dark:from-neutral-900/60 dark:to-neutral-950/90 border border-border/40 rounded-2xl px-4 pt-20 pb-16 flex flex-col justify-center h-52 shadow-xs overflow-hidden backdrop-blur-md"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, ${dynamicMeshGlow} 0%, transparent 65%), linear-gradient(rgba(120, 119, 198, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 119, 198, 0.04) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 16px 16px, 16px 16px",
        }}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-start justify-center pt-6 pointer-events-none font-black text-4xl sm:text-7xl tracking-tighter uppercase z-0 select-none",
            watermarkColorClass,
          )}
        >
          {watermarkText}
        </div>
        <div className="relative w-full h-0.75 rounded-full flex items-center bg-muted/30 dark:bg-neutral-800 z-10">
          <div
            className="absolute h-full bg-rose-500/80 dark:bg-rose-500/60 rounded-l-full"
            style={{
              left: `${Math.min(slPct, entryPct)}%`,
              width: `${Math.abs(entryPct - slPct)}%`,
            }}
          />
          <div
            className="absolute h-full bg-amber-500/80 dark:bg-amber-500/50"
            style={{
              left: `${Math.min(entryPct, buPct)}%`,
              width: `${Math.abs(buPct - entryPct)}%`,
            }}
          />
          <div
            className="absolute h-full bg-emerald-500/80 dark:bg-emerald-500/60 rounded-r-full"
            style={{
              left: `${Math.min(buPct, tpPct)}%`,
              width: `${Math.abs(tpPct - buPct)}%`,
            }}
          />
          <div
            className="absolute size-2 bg-rose-500 rounded-full border border-background shadow-xs"
            style={{ left: `${slPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-2 bg-foreground rounded-full border border-background shadow-xs"
            style={{ left: `${entryPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-1.5 bg-amber-500 rounded-full border border-background shadow-xs"
            style={{ left: `${buPct}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute size-2 bg-emerald-500 rounded-full border border-background shadow-xs"
            style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
          />

          {!isOpen && hasManualClosePointer && closePct !== null && (
            <div
              className="absolute flex flex-col items-center z-30"
              style={{ left: `${closePct}%`, transform: "translateX(-50%)" }}
            >
              <div className="p-1 bg-blue-500 text-white rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)] border border-background dark:border-neutral-900 animate-bounce">
                <Rocket className="size-3.5 block shrink-0" />
              </div>
              <div className="absolute top-7 bg-blue-600 text-white border border-blue-400/20 font-black rounded-lg px-2 py-0.5 text-[10px] sm:text-xs shadow-[0_4px_12px_rgba(59,130,246,0.3)] whitespace-nowrap">
                EXIT:{" "}
                {parseFloat(focusedDeal.closed_at_price).toFixed(precision)}
              </div>
              <div className="absolute -bottom-4 border-l-2 border-blue-500/50 h-4 border-dashed" />
            </div>
          )}

          {isOpen && !isTakeProfitBroken && !isStopLossBroken && (
            <div
              className="absolute flex flex-col items-center z-20 transition-all duration-700 ease-out"
              style={{
                left: `${livePct}%`,
                transform: `translateX(${liveTranslateX}%)`,
              }}
            >
              <div
                className={cn(
                  "size-2.5 rounded-full border-2 border-background dark:border-neutral-900",
                  liveBgClass,
                )}
              />
              <div
                className={cn(
                  "absolute -top-9 bg-background border border-border/80 rounded-lg overflow-hidden text-[10px] h-5.5 z-30 flex items-center text-xs font-bold px-1.5 py-0.5 shadow-sm",
                  liveTextClass,
                )}
              >
                <span>{livePrice.toFixed(precision)}</span>
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
            className="absolute bottom-11 flex items-center bg-background border border-border/80 rounded-lg overflow-hidden shadow-xs text-[10px] h-5.5 z-10"
            style={{ left: `${slPct}%` }}
          >
            <span className="h-full px-1.5 flex items-center bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider">
              SL
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {focusedDeal.stop_loss.toFixed(precision)}
            </span>
          </div>
          <div
            className="absolute bottom-11 flex items-center bg-background border border-border/80 rounded-lg overflow-hidden shadow-xs text-[10px] h-5.5 z-10"
            style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
          >
            <span className="h-full px-1.5 flex items-center bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider">
              TP
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {focusedDeal.take_profit.toFixed(precision)}
            </span>
          </div>
          <div
            className="absolute top-3.75 flex items-center bg-background border border-border/80 rounded-lg overflow-hidden shadow-xs text-[10px] h-5.5 z-10"
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
            <span className="h-full px-1.5 flex items-center bg-primary text-primary-foreground dark:bg-neutral-800">
              <LogIn className="size-3 shrink-0" />
            </span>
            <span className="px-1.5 font-bold text-foreground/90">
              {focusedDeal.entry_price.toFixed(precision)}
            </span>
          </div>
          <div
            className="absolute top-11.25 flex items-center bg-background border border-border/80 rounded-lg overflow-hidden shadow-xs text-[10px] h-5.5 z-10"
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
            <span className="h-full px-1.5 flex items-center bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider">
              BE
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
