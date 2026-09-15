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
  selectedCoin: string;
}

const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  MNT: "Mantle",
  ZEC: "Zcash",
  XAUT: "Tether Gold",
  SOL: "Solana",
  GRAM: "Gram",
  XRP: "Ripple",
  DOGE: "Dogecoin",
  SUI: "Sui",
  HYPE: "Hyperliquid",
  NEAR: "Near Protocol",
  LINK: "Chainlink",
};

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
  selectedCoin,
}: MarketTickerProps) {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">(
    "stable",
  );
  const [iconError, setIconError] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    setIconError(false);
  }, [selectedCoin]);

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

  if (!data) {
    return (
      <div className="p-3 sm:p-4 border border-border/40 dark:border-black/40 rounded-xl bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 w-full items-center min-h-20 sm:min-h-22.5">
        <div className="flex items-center gap-2 sm:gap-3 p-0.5 md:col-span-1 border-r border-border/30 pr-1 sm:pr-2 h-10 sm:h-11 min-w-0">
          <Skeleton className="size-5 sm:size-6 rounded-full bg-muted-foreground/20 dark:bg-muted/20 shrink-0" />
          <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-3 w-10 sm:w-12 bg-muted-foreground/20 dark:bg-muted/20" />
            <Skeleton className="h-2 w-14 sm:w-16 bg-muted-foreground/10 dark:bg-muted/10" />
          </div>
        </div>

        <div className="p-0.5 w-full md:col-span-2 h-10 sm:h-11 flex flex-col justify-center space-y-1">
          <Skeleton className="h-2 w-12 sm:w-14 bg-muted-foreground/20 dark:bg-muted/20 ml-5 sm:ml-7" />
          <Skeleton className="h-5 sm:h-6 w-28 sm:w-36 bg-muted-foreground/20 dark:bg-muted/20 ml-5 sm:ml-7" />
        </div>

        <div className="p-0.5 md:col-span-1 h-10 sm:h-11 flex flex-col justify-center space-y-1">
          <Skeleton className="h-2 w-14 sm:w-16 bg-muted-foreground/20 dark:bg-muted/20" />
          <Skeleton className="h-3.5 w-10 sm:w-12 bg-muted-foreground/20 dark:bg-muted/20" />
        </div>

        <div className="p-0.5 hidden sm:flex flex-col justify-center min-w-24 md:col-span-1 h-10 sm:h-11 space-y-1.5">
          <Skeleton className="h-2 w-12 bg-muted-foreground/20 dark:bg-muted/20" />
          <Skeleton className="h-1 w-full bg-muted-foreground/20 dark:bg-muted/20 rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-1 w-6 bg-muted-foreground/10 dark:bg-muted/10" />
            <Skeleton className="h-1 w-6 bg-muted-foreground/10 dark:bg-muted/10" />
          </div>
        </div>

        <div className="p-0.5 md:col-span-1 h-10 sm:h-11 flex flex-col justify-between py-0.5">
          <div className="space-y-0.5 sm:space-y-1">
            <Skeleton className="h-1.5 w-10 bg-muted-foreground/20 dark:bg-muted/20" />
            <Skeleton className="h-2.5 w-14 bg-muted-foreground/20 dark:bg-muted/20" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-1.5 w-8 bg-muted-foreground/20 dark:bg-muted/20" />
            <Skeleton className="h-2 w-10 bg-muted-foreground/20 dark:bg-muted/20" />
          </div>
        </div>
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

  // ФИКС: Базовое состояние цены теперь по умолчанию имеет плотный шрифт font-black
  let priceColor = "text-foreground font-black";
  if (tickDirection === "up")
    priceColor = "text-emerald-600 dark:text-emerald-400 font-black";
  if (tickDirection === "down")
    priceColor = "text-rose-600 dark:text-rose-400 font-black";

  const coinBaseName = selectedCoin.replace("USDT", "");
  const localIconUrl = `/crypto-icons/${coinBaseName.toLowerCase()}.svg`;
  const fullName = COIN_NAMES[coinBaseName] || "Crypto Asset";

  return (
    <div className="p-3 sm:p-4 border border-border/40 dark:border-black/40 rounded-xl bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 w-full items-center min-h-20 sm:min-h-22.5">
      {/* 1. Название монеты */}
      <div className="flex items-center gap-2 sm:gap-3 p-0.5 md:col-span-1 select-none border-r border-border/30 pr-1 sm:pr-2 h-10 sm:h-11 min-w-0">
        {!iconError ? (
          <img
            src={localIconUrl}
            alt={coinBaseName}
            className="size-5 sm:size-6 rounded-full shrink-0"
            onError={() => setIconError(true)}
          />
        ) : (
          <div className="size-5 sm:size-6 rounded-full bg-emerald-600/10 dark:bg-emerald-400/10 flex items-center justify-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0 uppercase">
            {coinBaseName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-black tracking-tight text-foreground leading-none">
            {coinBaseName}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/70 truncate mt-0.5 sm:mt-1 leading-none">
            {fullName}
          </span>
        </div>
      </div>

      {/* 2. Живая цена с фиксированным font-black */}
      <div className="p-0.5 w-full overflow-hidden bg-transparent md:col-span-2 h-10 sm:h-11 flex flex-col justify-center">
        <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-wider text-muted-foreground block pl-5 sm:pl-7 select-none leading-none mb-0.5 sm:mb-1">
          Live Price
        </span>
        <div className="flex items-center">
          <div
            className="relative pl-5 sm:pl-7 flex items-center cursor-copy group select-none w-full whitespace-nowrap"
            onClick={() => onPriceClick?.(data.lastPrice)}
            title="Добавить цену в калькулятор"
          >
            <div className="absolute left-0 flex items-center justify-center w-4 sm:w-6 h-full top-0">
              {tickDirection === "up" && (
                <span className="text-lg sm:text-2xl text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-100 leading-none">
                  ▲
                </span>
              )}
              {tickDirection === "down" && (
                <span className="text-lg sm:text-2xl text-rose-600 dark:text-rose-400 animate-in fade-in duration-100 leading-none">
                  ▼
                </span>
              )}
              {tickDirection === "stable" && (
                <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-muted-foreground/40 rounded-full" />
              )}
            </div>
            {/* Шрифт теперь всегда монолитно-жирный с первой миллисекунды */}
            <span
              className={`text-lg sm:text-2xl tracking-tight transition-all duration-300 group-hover:opacity-80 ${priceColor} leading-none`}
            >
              {data.lastPrice.toFixed(decimals)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Изменение за 24ч */}
      <div className="space-y-0.5 p-0.5 md:col-span-1 h-10 sm:h-11 flex flex-col justify-center">
        <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-wider text-muted-foreground block select-none leading-none">
          24h Change
        </span>
        <span
          className={`text-sm sm:text-base font-bold block tracking-tight whitespace-nowrap mt-0.5 sm:mt-1 leading-none ${is24hPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
        >
          {is24hPositive ? "+" : ""}
          {data.price24hPcnt.toFixed(2)}%
        </span>
      </div>

      {/* 4. Шкала волатильности */}
      <div className="p-0.5 hidden sm:flex flex-col justify-center min-w-24 md:col-span-1 h-10 sm:h-11">
        <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-wider text-muted-foreground block select-none leading-none mb-1">
          24h Range
        </span>
        <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full">
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-background shadow-sm transition-all duration-500 ${is24hPositive ? "bg-emerald-500" : "bg-rose-500"}`}
            style={{ left: `${currentPositionPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground/80 whitespace-nowrap mt-1 leading-none">
          <span>{data.lowPrice24h.toFixed(decimals)}</span>
          <span>{data.highPrice24h.toFixed(decimals)}</span>
        </div>
      </div>

      {/* 5. Суточный торговый оборот и Фандинг */}
      <div className="p-0.5 md:col-span-1 h-10 sm:h-11 flex flex-col justify-between overflow-hidden">
        <div>
          <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground block select-none leading-none">
            Turnover
          </span>
          <span className="text-xs font-bold text-foreground block tracking-tight whitespace-nowrap leading-none mt-0.5">
            {formatCompactNumber(data.turnover24h)}{" "}
            <span className="text-[8px] font-normal text-muted-foreground">
              USDT
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 min-h-3 mt-0.5">
          <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground block select-none leading-none">
            Funding:
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-bold block whitespace-nowrap leading-none ${data.fundingRate >= 0 ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"}`}
          >
            {data.fundingRate.toFixed(4)}%
          </span>
        </div>
      </div>
    </div>
  );
}
