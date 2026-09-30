"use client";

import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { DBAssetCoin } from "./TradingCalculator";

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
  onCoinChange?: (coin: string) => void;
  availableCoinsList: DBAssetCoin[];
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

function getCoinGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = Math.abs((hash & 0xff0000) >> 16) % 360;
  const c2 = (c1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${c1}, 70%, 45%), hsl(${c2}, 80%, 35%))`;
}
export default function MarketTicker({
  data,
  decimals,
  onPriceClick,
  selectedCoin,
}: MarketTickerProps) {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">(
    "stable",
  );
  // Стейт для отслеживания падения загрузки физического SVG-файла
  const [iconImgError, setIconImgError] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  // Сбрасываем ошибку иконки при переключении торговой пары
  useEffect(() => {
    setIconImgError(false);
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

  if (!data || data.lastPrice <= 0) {
    return (
      <div
        className={cn(
          "p-3 border w-full select-none border-border/40 rounded-xl box-border",
          "bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2",
          "md:grid-cols-12 gap-x-3 gap-y-3 sm:gap-4 items-center overflow-hidden h-auto md:h-22.5",
        )}
      >
        <div className="flex items-center gap-2 p-0.5 h-12 md:col-span-3 border-b md:border-b-0 md:border-r border-border/30 pb-2 md:pb-0 pr-3 shrink-0">
          <Skeleton className="size-8 sm:size-10 rounded-full shrink-0" />
          <div className="space-y-1 flex-1 min-w-0">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-2.5 w-20 opacity-60" />
          </div>
        </div>
        <div className="p-0.5 w-full md:col-span-3 h-12 md:h-11 flex flex-col justify-center space-y-1.5 border-b md:border-b-0 border-border/30 pb-2 md:pb-0 pl-1 md:pl-4 text-right md:text-left">
          <Skeleton className="h-2 w-16 opacity-60 ml-auto md:ml-0" />
          <Skeleton className="h-5 sm:h-6 w-32 ml-auto md:ml-0" />
        </div>
        <div className="p-0.5 md:col-span-2 h-10 flex flex-col justify-center pl-1">
          <Skeleton className="h-2 w-16 opacity-60" />
          <Skeleton className="h-4 w-14 mt-1" />
        </div>
        <div className="p-0.5 hidden md:flex md:col-span-2">
          <Skeleton className="h-1.5 w-full mt-4" />
        </div>
        <div className="p-0.5 md:col-span-2 pr-1 text-right">
          <Skeleton className="h-2 w-14 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto mt-1" />
        </div>
      </div>
    );
  }

  const priceRange = data.highPrice24h - data.lowPrice24h;
  const currentPositionPercent =
    priceRange > 0
      ? Math.min(
          Math.max(((data.lastPrice - data.lowPrice24h) / priceRange) * 100, 0),
          100,
        )
      : 50;

  let priceColor = "text-foreground font-black";
  if (tickDirection === "up")
    priceColor = "text-emerald-600 dark:text-emerald-400 font-black";
  if (tickDirection === "down")
    priceColor = "text-rose-600 dark:text-rose-400 font-black";

  const hasRealData = data && data.lastPrice > 0 && data.turnover24h > 0;
  const changeValue = data.price24hPcnt;
  const changeColor = !hasRealData
    ? "text-muted-foreground"
    : changeValue > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : changeValue < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  const coinBaseName = selectedCoin.replace("USDT", "");
  const fullName = COIN_NAMES[coinBaseName] || "Crypto Asset";
  return (
    <div
      className={cn(
        "p-3 border border-border/40 w-full dark:border-black/40 rounded-xl box-border",
        "bg-muted/30 dark:bg-black/40 shadow-inner grid grid-cols-2 md:grid-cols-12",
        "gap-x-3 gap-y-3 sm:gap-4 items-center select-none",
      )}
    >
      <div className="p-0.5 md:col-span-3 border-b h-12 md:border-b-0 md:border-r flex border-border/30 pb-2 md:pb-0 items-center px-1 sm:pr-3 shrink-0 min-w-0 gap-1.5 sm:gap-3">
        {/* ИСПРАВЛЕНО: Бесшовная гибридная подгрузка родных SVG из public/crypto-icons/ */}
        <div className="relative size-8 sm:size-10 overflow-hidden shrink-0 flex items-center justify-center">
          {!iconImgError ? (
            <img
              src={`/crypto-icons/${coinBaseName.toLowerCase()}.svg`}
              alt={coinBaseName}
              className="w-full h-full"
              onError={() => setIconImgError(true)} // Если файла нет — врубаем заглушку
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center rounded-full font-black text-white text-xs uppercase tracking-wider shadow-sm"
              style={{ backgroundImage: getCoinGradient(coinBaseName) }}
            >
              {coinBaseName.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-black truncate text-foreground">
            {coinBaseName}
          </span>
          <span className="text-[9px] opacity-60 truncate">{fullName}</span>
        </div>
      </div>

      <div className="md:col-span-3 overflow-hidden flex flex-col justify-center border-b md:border-b-0 border-border/30 pl-1 md:pl-4 text-right md:text-left h-12 md:h-11 min-w-0">
        <span className="text-[8px] opacity-60 block uppercase">
          Live Price
        </span>
        <div
          className="flex items-center justify-end md:justify-start min-w-0 cursor-pointer"
          onClick={() => onPriceClick?.(data.lastPrice)}
        >
          <span
            className={cn(
              "text-sm sm:text-lg font-black tracking-tight whitespace-nowrap",
              priceColor,
            )}
          >
            {tickDirection === "up"
              ? "▲ "
              : tickDirection === "down"
                ? "▼ "
                : "• "}
            {data.lastPrice.toFixed(decimals)}
          </span>
        </div>
      </div>

      <div className="p-0.5 md:col-span-2 h-10 flex flex-col justify-center pl-1">
        <span className="text-[8px] opacity-60 uppercase block">
          24h Change
        </span>
        <span
          className={cn(
            "text-xs font-bold block mt-0.5 whitespace-nowrap",
            changeColor,
          )}
        >
          {hasRealData && changeValue > 0 ? "+" : ""}
          {hasRealData ? `${changeValue.toFixed(2)}%` : "--.--%"}
        </span>
      </div>

      <div className="p-0.5 hidden md:flex flex-col h-10 justify-center md:col-span-2">
        <span className="text-[8px] opacity-60 uppercase block mb-1">
          24h Range
        </span>
        <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"
            style={{ left: `${currentPositionPercent}%` }}
          />
        </div>
      </div>

      <div className="p-0.5 md:col-span-2 h-10 flex flex-col justify-between pr-1 text-right md:text-left min-w-0">
        <div className="min-w-0">
          <span className="text-[8px] opacity-60 uppercase block">
            Turnover
          </span>
          <span className="text-xs font-bold text-foreground block truncate">
            {formatCompactNumber(data.turnover24h)}
          </span>
        </div>
        <div className="flex items-center justify-end md:justify-start gap-1 whitespace-nowrap">
          <span className="text-[8px] opacity-60 uppercase">Funding:</span>
          <span className="text-[9px] font-bold text-amber-500">
            {((data.fundingRate || 0) * 100).toFixed(4)}%
          </span>
        </div>
      </div>
    </div>
  );
}
