"use client";

import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Check, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

// Функция генерации уникального цвета, если нет SVG-иконки
function getCoinGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = Math.abs((hash & 0xff0000) >> 16) % 360;
  const c2 = (c1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${c1}, 70%, 45%), hsl(${c2}, 80%, 35%))`;
}

interface GroupedCoins {
  [key: string]: DBAssetCoin[];
}

export default function MarketTicker({
  data,
  loading,
  decimals,
  onPriceClick,
  selectedCoin,
  onCoinChange,
  availableCoinsList = [],
}: MarketTickerProps) {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">(
    "stable",
  );
  const [iconErrorMap, setIconErrorMap] = useState<Record<string, boolean>>({});
  const [isStarToggling, setIsStarToggling] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (data?.lastPrice) {
      if (prevPriceRef.current !== null) {
        if (data.lastPrice > prevPriceRef.current) {
          setTickDirection("up");
        } else if (data.lastPrice < prevPriceRef.current) {
          setTickDirection("down");
        }
      }
      prevPriceRef.current = data.lastPrice;
    }
  }, [data?.lastPrice]);
  const handleStarToggleInMenu = async (
    e: React.MouseEvent,
    coinName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (isStarToggling) return;
    setIsStarToggling(true);
    try {
      const response = await fetch("/api/journal", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: coinName,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("refresh-calculator-coins"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarToggling(false);
    }
  };

  // Группировка монет для выпадающего меню информера
  const groupedCoins: GroupedCoins = {};
  const favoriteCoins: DBAssetCoin[] = [];

  availableCoinsList.forEach((asset) => {
    if (asset.is_favorite) {
      favoriteCoins.push(asset);
    } else {
      const firstLetter = asset.coin.charAt(0).toUpperCase();
      if (!groupedCoins[firstLetter]) {
        groupedCoins[firstLetter] = [];
      }
      groupedCoins[firstLetter].push(asset);
    }
  });

  const sortedLetters = Object.keys(groupedCoins).sort();

  if (loading || !data) {
    return (
      <div
        className={cn(
          "p-3 border w-full select-none",
          "border-border/40 rounded-xl",
          "dark:border-black/40 box-border",
          "bg-muted/30 dark:bg-black/40",
          "shadow-inner grid grid-cols-2",
          "md:grid-cols-6 gap-x-2 gap-y-3",
          "sm:gap-4 items-center overflow-hidden",
          "h-auto md:h-22.5",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 p-0.5 h-12",
            "md:col-span-1 border-b md:border-b-0",
            "md:border-r border-border/30 pb-2",
            "md:pb-0 pr-1 sm:pr-3 shrink-0",
          )}
        >
          <Skeleton className="size-8 sm:size-10 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-2.5 w-16 opacity-60" />
          </div>
        </div>
        <div
          className={cn(
            "p-0.5 w-full md:col-span-2 h-12",
            "md:h-11 flex flex-col justify-center",
            "space-y-1.5 border-b md:border-b-0",
            "border-border/30 pb-2 md:pb-0 pl-1",
            "md:pl-5 text-right md:text-left",
          )}
        >
          <Skeleton className="h-2 w-14 opacity-60 ml-auto" />
          <Skeleton className="h-5 sm:h-6 w-28 ml-auto" />
        </div>
        <div className="p-0.5 md:col-span-1 h-10 pl-1">
          <Skeleton className="h-2 w-16 opacity-60" />
          <Skeleton className="h-4 w-12 mt-1" />
        </div>
        <div className="p-0.5 hidden md:flex col-span-1">
          <Skeleton className="h-1.5 w-full mt-4" />
        </div>
        <div className="p-0.5 md:col-span-1 pr-1 text-right">
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
  if (tickDirection === "up") {
    priceColor = "text-emerald-600 dark:text-emerald-400 font-black";
  }
  if (tickDirection === "down") {
    priceColor = "text-rose-600 dark:text-rose-400 font-black";
  }

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
  const localIconUrl = `/crypto-icons/${coinBaseName.toLowerCase()}.svg`;
  const fullName = COIN_NAMES[coinBaseName] || "Crypto Asset";
  return (
    <div
      className={cn(
        "p-3 border border-border/40 w-full",
        "dark:border-black/40 rounded-xl box-border",
        "bg-muted/30 dark:bg-black/40 shadow-inner",
        "grid grid-cols-2 md:grid-cols-6 gap-x-2",
        "gap-y-3 sm:gap-4 items-center select-none",
      )}
    >
      <div
        className={cn(
          "p-0.5 md:col-span-1 border-b h-12",
          "md:border-b-0 md:border-r flex",
          "border-border/30 pb-2 md:pb-0",
          "items-center pr-1 sm:pr-3 shrink-0",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-1.5 sm:gap-3",
              "text-left p-1 rounded-xl w-full",
              "border border-transparent outline-none",
              "transition-all duration-200 cursor-pointer",
              "hover:bg-muted/60 dark:hover:bg-muted/20",
              "active:scale-[0.98] group/trigger",
            )}
          >
            <div className="relative shrink-0">
              {!iconErrorMap[selectedCoin] ? (
                <img
                  src={localIconUrl}
                  alt={coinBaseName}
                  className="size-8 sm:size-10 rounded-full"
                  onError={() =>
                    setIconErrorMap((p) => ({
                      ...p,
                      [selectedCoin]: true,
                    }))
                  }
                />
              ) : (
                <div
                  className="size-8 sm:size-10 rounded-full flex items-center justify-center font-black text-white text-xs sm:text-sm uppercase tracking-wider"
                  style={{ backgroundImage: getCoinGradient(coinBaseName) }}
                >
                  {coinBaseName.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-black">{coinBaseName}</span>
                <ChevronDown className="size-3" />
              </div>
              <span className="text-[9px] opacity-60 truncate">{fullName}</span>
            </div>
          </DropdownMenuTrigger>
          {/* ФИКС ШИРИНЫ ОКНА ИНФОРМЕРА: w-64! min-w-64! */}
          <DropdownMenuContent
            className={cn(
              "z-50 bg-popover/75 backdrop-blur-md",
              "rounded-xl p-1 shadow-xl border w-64! min-w-64!",
              "border-border/40 dark:border-white/10",
            )}
          >
            <div className="max-h-60 overflow-y-auto scrollbar-thin">
              {/* 1. Секция Избранного */}
              {favoriteCoins.length > 0 && (
                <div className="px-2 py-1 text-[10px] font-black text-amber-500 tracking-wider">
                  ★ ИЗБРАННОЕ
                </div>
              )}
              {favoriteCoins.map((asset) => {
                const base = asset.coin.replace("USDT", "");
                const isSel = selectedCoin === asset.coin;
                return (
                  <DropdownMenuItem
                    key={asset.coin}
                    onClick={() => onCoinChange?.(asset.coin)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs",
                      isSel ? "text-amber-500 font-bold" : "text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      {!iconErrorMap[asset.coin] ? (
                        <img
                          src={`/crypto-icons/${base.toLowerCase()}.svg`}
                          alt={base}
                          className="size-4 rounded-full"
                          onError={() =>
                            setIconErrorMap((p) => ({
                              ...p,
                              [asset.coin]: true,
                            }))
                          }
                        />
                      ) : (
                        <div
                          className="size-4 rounded-full flex items-center justify-center font-black text-white text-[8px] uppercase"
                          style={{ backgroundImage: getCoinGradient(base) }}
                        >
                          {base.slice(0, 2)}
                        </div>
                      )}
                      <span className="truncate font-semibold">
                        {asset.coin}
                      </span>
                    </div>
                    {/* ФИКС ВЫРАВНИВАНИЯ: Прижато в самый правый край */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {isSel && <Check className="size-3 text-amber-500" />}
                      <button
                        type="button"
                        onClick={(e) => handleStarToggleInMenu(e, asset.coin)}
                        className="p-0.5 text-amber-500 bg-transparent border-none cursor-pointer"
                      >
                        <Star className="size-3" fill="currentColor" />
                      </button>
                    </div>
                  </DropdownMenuItem>
                );
              })}

              {/* 2. Алфавитные группы */}
              {sortedLetters.map((letter) => (
                <React.Fragment key={letter}>
                  <div className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground border-b border-border/10 mt-1.5 pb-0.5">
                    {letter}
                  </div>
                  {groupedCoins[letter].map((asset) => {
                    const base = asset.coin.replace("USDT", "");
                    const isSel = selectedCoin === asset.coin;
                    return (
                      <DropdownMenuItem
                        key={asset.coin}
                        onClick={() => onCoinChange?.(asset.coin)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs",
                          isSel
                            ? "text-foreground font-bold bg-muted/20"
                            : "text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2 truncate flex-1">
                          {!iconErrorMap[asset.coin] ? (
                            <img
                              src={`/crypto-icons/${base.toLowerCase()}.svg`}
                              alt={base}
                              className="size-4 rounded-full"
                              onError={() =>
                                setIconErrorMap((p) => ({
                                  ...p,
                                  [asset.coin]: true,
                                }))
                              }
                            />
                          ) : (
                            <div
                              className="size-4 rounded-full flex items-center justify-center font-black text-white text-[8px] uppercase"
                              style={{ backgroundImage: getCoinGradient(base) }}
                            >
                              {base.slice(0, 2)}
                            </div>
                          )}
                          <span className="truncate">{asset.coin}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {isSel && (
                            <Check className="size-3 text-muted-foreground/60" />
                          )}
                          <button
                            type="button"
                            onClick={(e) =>
                              handleStarToggleInMenu(e, asset.coin)
                            }
                            className="p-0.5 text-muted-foreground/20 hover:text-amber-500 bg-transparent border-none cursor-pointer"
                          >
                            <Star className="size-3" fill="none" />
                          </button>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className={cn(
          "w-full overflow-hidden flex flex-col justify-center",
          "border-b md:border-b-0 border-border/30 pl-1 md:pl-5",
          "text-right md:text-left h-12 md:h-11",
        )}
      >
        <span className="text-[8px] opacity-60 block uppercase">
          Live Price
        </span>
        <div
          className="flex items-center justify-end md:justify-start"
          onClick={() => onPriceClick?.(data.lastPrice)}
        >
          <span className={cn("text-base sm:text-xl truncate", priceColor)}>
            {tickDirection === "up"
              ? "▲ "
              : tickDirection === "down"
                ? "▼ "
                : "• "}
            {data.lastPrice.toFixed(decimals)}
          </span>
        </div>
      </div>
      <div className="p-0.5 md:col-span-1 h-10 flex flex-col justify-center pl-1">
        <span className="text-[8px] opacity-60 uppercase block">
          24h Change
        </span>
        <span className={cn("text-xs font-bold block mt-0.5", changeColor)}>
          {hasRealData && changeValue > 0 ? "+" : ""}
          {hasRealData ? `${changeValue.toFixed(2)}%` : "--.--%"}
        </span>
      </div>
      <div className="p-0.5 hidden md:flex flex-col h-10 justify-center">
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
      <div className="p-0.5 md:col-span-1 h-10 flex flex-col justify-between pr-1 text-right md:text-left">
        <div>
          <span className="text-[8px] opacity-60 uppercase block">
            Turnover
          </span>
          <span className="text-xs font-bold text-foreground block truncate">
            {formatCompactNumber(data.turnover24h)}
          </span>
        </div>
        <div className="flex items-center justify-end md:justify-start gap-1">
          <span className="text-[8px] opacity-60 uppercase">Funding:</span>
          <span className="text-[9px] font-bold text-amber-500">
            {(data.fundingRate * 100).toFixed(4)}%
          </span>
        </div>
      </div>
    </div>
  );
}
