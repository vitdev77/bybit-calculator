"use client";

import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
}

interface MarketTickerProps {
  data: TickerData | null;
  loading: boolean;
  decimals: number;
  onPriceClick?: (price: number) => void;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export default function MarketTicker({
  data,
  loading,
  decimals,
  onPriceClick,
}: MarketTickerProps) {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">(
    "stable",
  );
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (data?.lastPrice) {
      if (prevPriceRef.current !== null) {
        if (data.lastPrice > prevPriceRef.current) setTickDirection("up");
        else if (data.lastPrice < prevPriceRef.current)
          setTickDirection("down");
      }
      prevPriceRef.current = data.lastPrice;
    }
  }, [data?.lastPrice]);

  // Скелетон загрузки
  if (!data) {
    return (
      <div className="p-4 border border-border/40 dark:border-black/40 rounded-xl bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full items-center min-h-22.5">
        <div className="md:col-span-2 space-y-1">
          <Skeleton className="h-3 w-14 bg-muted-foreground/20 dark:bg-muted/20 pl-7" />
          <div className="h-11 flex items-center">
            <Skeleton className="h-7 w-32 bg-muted-foreground/20 dark:bg-muted/20" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${i}`} className="space-y-1">
            <Skeleton className="h-3 w-14 bg-muted-foreground/20 dark:bg-muted/20" />
            <div className="h-11 flex items-center">
              <Skeleton className="h-7 w-24 bg-muted-foreground/20 dark:bg-muted/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const is24hPositive = data.price24hPcnt >= 0;

  const priceRange = data.highPrice24h - data.lowPrice24h;
  const currentPositionPercent =
    priceRange > 0
      ? Math.min(
          Math.max(((data.lastPrice - data.lowPrice24h) / priceRange) * 100, 0),
          100,
        )
      : 50;

  let priceColor = "text-foreground";
  if (tickDirection === "up")
    priceColor = "text-emerald-600 dark:text-emerald-400 font-black";
  if (tickDirection === "down")
    priceColor = "text-rose-600 dark:text-rose-400 font-black";

  return (
    <div className="p-4 border border-border/40 dark:border-black/40 rounded-xl bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full items-center min-h-22.5">
      {/* 1. Живая цена */}
      <div className="space-y-1 p-1 w-full overflow-hidden bg-transparent md:col-span-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block pl-7 select-none">
          Live Price
        </span>
        <div className="h-11 flex items-center">
          <div
            className="relative pl-7 flex items-center min-h-9 cursor-copy group select-none w-full whitespace-nowrap"
            onClick={() => onPriceClick?.(data.lastPrice)}
            title="Добавить цену в калькулятор"
          >
            <div className="absolute left-0 flex items-center justify-center w-6 h-6">
              {tickDirection === "up" && (
                <span className="text-xl text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-100">
                  ▲
                </span>
              )}
              {tickDirection === "down" && (
                <span className="text-xl text-rose-600 dark:text-rose-400 animate-in fade-in duration-100">
                  ▼
                </span>
              )}
              {tickDirection === "stable" && (
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full" />
              )}
            </div>
            <span
              className={`text-3xl font-black tracking-tight transition-all duration-300 group-hover:opacity-80 ${priceColor}`}
            >
              {data.lastPrice.toFixed(decimals)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Изменение за 24ч */}
      <div className="space-y-1 p-1 md:col-span-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block select-none">
          24h Change
        </span>
        <div className="h-11 flex items-center">
          <span
            className={`text-lg font-bold block tracking-tight whitespace-nowrap ${is24hPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {is24hPositive ? "+" : ""}
            {data.price24hPcnt.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 3. Шкала волатильности (24h Range) */}
      <div className="space-y-1.5 p-1 flex flex-col justify-center min-w-27.5 md:col-span-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block select-none">
          24h Range
        </span>
        <div className="h-11 flex flex-col justify-center space-y-0.5">
          <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full">
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-background shadow-sm transition-all duration-500 ${
                is24hPositive ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ left: `${currentPositionPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground/90 font-mono whitespace-nowrap">
            <span>{data.lowPrice24h.toFixed(decimals)}</span>
            <span>{data.highPrice24h.toFixed(decimals)}</span>
          </div>
        </div>
      </div>

      {/* 4. Суточный торговый оборот */}
      <div className="space-y-1 p-1 md:col-span-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block select-none">
          24h Turnover
        </span>
        <div className="h-11 flex items-center">
          <span className="text-base font-bold text-foreground font-mono block tracking-tight whitespace-nowrap">
            {formatCompactNumber(data.turnover24h)}{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              USDT
            </span>
          </span>
        </div>
      </div>

      {/* 5. Ставка фандинга */}
      <div className="space-y-1 p-1 md:col-span-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block select-none">
          Funding
        </span>
        <div className="h-11 flex items-center">
          <div className="flex items-center gap-1 min-h-6">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${data.fundingRate >= 0 ? "bg-amber-400" : "bg-violet-400"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${data.fundingRate >= 0 ? "bg-amber-500" : "bg-violet-500"}`}
              ></span>
            </span>
            <span
              className={`text-sm font-bold block font-mono whitespace-nowrap ${data.fundingRate >= 0 ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"}`}
            >
              {data.fundingRate.toFixed(4)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
