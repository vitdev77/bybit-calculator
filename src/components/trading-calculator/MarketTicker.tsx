"use client";

import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_COINS } from "./CoinSelector";
import { cn } from "cn";

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
  onCoinChange,
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

  if (loading || !data) {
    return (
      <div
        className={cn(
          "p-3 border border-border/40",
          "dark:border-black/40 rounded-xl",
          "bg-muted/30 dark:bg-black/40 shadow-inner",
          "grid grid-cols-2 md:grid-cols-6 gap-x-2",
          "gap-y-3 sm:gap-4 w-full items-center",
          "h-auto md:h-22.5 select-none box-border",
          "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 p-0.5",
            "md:col-span-1 border-b h-12",
            "md:border-b-0 md:border-r",
            "border-border/30 pb-2 md:pb-0",
            "pr-1 sm:pr-3 shrink-0 min-w-fit",
          )}
        >
          <Skeleton className="size-8 sm:size-10 rounded-full shrink-0" />
          <div className="space-y-1 flex-1 min-w-0">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-2.5 w-16 opacity-60" />
          </div>
        </div>

        <div
          className={cn(
            "p-0.5 w-full md:col-span-2 h-12 md:h-11",
            "flex flex-col justify-center space-y-1.5",
            "border-b md:border-b-0 border-border/30",
            "pb-2 md:pb-0 pl-1 md:pl-5 text-right",
            "md:text-left",
          )}
        >
          <Skeleton className="h-2 w-14 opacity-60 ml-auto md:ml-7" />
          <Skeleton className="h-5 sm:h-6 w-28 sm:w-36 ml-auto md:ml-7" />
        </div>

        <div
          className={cn(
            "p-0.5 md:col-span-1 h-10 flex",
            "flex-col justify-center space-y-1.5",
            "pl-1 md:pl-0",
          )}
        >
          <Skeleton className="h-2 w-16 opacity-60" />
          <Skeleton className="h-4 w-12" />
        </div>

        <div
          className={cn(
            "p-0.5 hidden md:flex flex-col",
            "justify-center min-w-24 md:col-span-1",
            "h-10 space-y-2",
          )}
        >
          <Skeleton className="h-2 w-12 opacity-60" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>

        <div
          className={cn(
            "p-0.5 md:col-span-1 h-10 flex",
            "flex-col justify-center space-y-1.5",
            "text-right md:text-left pr-1 md:pr-0",
          )}
        >
          <Skeleton className="h-2 w-14 opacity-60 ml-auto md:ml-0" />
          <Skeleton className="h-3 w-16 ml-auto md:ml-0" />
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
          "border-border/30 pb-2 md:pb-0 items-center",
          "pr-1 sm:pr-3 min-w-fit shrink-0",
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
              {!iconError ? (
                <img
                  src={localIconUrl}
                  alt={coinBaseName}
                  className={cn(
                    "size-8 sm:size-10 rounded-full",
                    "block object-contain shrink-0",
                  )}
                  onError={() => setIconError(true)}
                />
              ) : (
                <div
                  className={cn(
                    "size-8 sm:size-10 rounded-full",
                    "bg-emerald-600/10 text-xs",
                    "dark:bg-emerald-400/10 flex",
                    "items-center justify-center font-black",
                    "text-emerald-600 dark:text-emerald-400",
                    "shrink-0 uppercase",
                  )}
                >
                  {coinBaseName.charAt(0)}
                </div>
              )}
            </div>
            <div
              className={cn(
                "flex flex-col min-w-0 flex-1",
                "pr-1 relative h-7 Hong-center",
                "justify-center",
              )}
            >
              <div className="flex items-center gap-0.5 h-4">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-black",
                    "tracking-tight text-foreground",
                    "leading-none transition-colors",
                    "group-hover/trigger:text-amber-500",
                  )}
                >
                  {coinBaseName}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground/60",
                    "transition-colors shrink-0",
                    "group-hover/trigger:text-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[9px] font-semibold h-3",
                  "text-muted-foreground/70 truncate",
                  "leading-none mt-0.5 block",
                )}
              >
                {fullName}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "z-50 bg-popover/75 dark:bg-zinc-950/75",
              "backdrop-blur-md rounded-xl p-1 shadow-xl",
              "border border-border/40 dark:border-white/10",
              "min-w-48 overflow-hidden",
            )}
          >
            <div
              className={cn(
                "max-h-60 overflow-y-auto overflow-x-hidden",
                "scrollbar-thin rounded-lg",
              )}
            >
              {AVAILABLE_COINS.map((coin) => {
                const base = coin.replace("USDT", "");
                const iconPath = `/crypto-icons/${base.toLowerCase()}.svg`;
                const isSelected = selectedCoin === coin;
                return (
                  <DropdownMenuItem
                    key={coin}
                    onClick={() => onCoinChange?.(coin)}
                    className={cn(
                      "flex items-center justify-between",
                      "gap-2 px-2.5 py-1.5 rounded-lg",
                      "text-xs sm:text-sm cursor-pointer",
                      "transition-colors focus:bg-accent",
                      "focus:text-accent-foreground",
                      isSelected
                        ? "bg-amber-500/10 text-amber-500 font-bold"
                        : "text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={iconPath}
                        alt={base}
                        className={cn(
                          "size-4 object-contain",
                          "rounded-full shrink-0",
                        )}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="truncate">{coin}</span>
                    </div>
                    {isSelected && (
                      <Check
                        className={cn(
                          "size-3.5 sm:size-4 text-amber-500",
                          "shrink-0 ml-auto",
                        )}
                      />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className={cn(
          "p-0.5 w-full overflow-hidden bg-transparent",
          "md:col-span-2 h-12 md:h-11 flex flex-col",
          "justify-center border-b md:border-b-0",
          "border-border/30 pb-2 md:pb-0 pl-1",
          "md:pl-5 text-right md:text-left",
        )}
      >
        <span
          className={cn(
            "text-[8px] font-medium uppercase h-2",
            "tracking-wider text-muted-foreground",
            "block md:pl-7 select-none leading-none mb-1",
          )}
        >
          Live Price
        </span>
        <div className="flex items-center justify-end md:justify-start h-6">
          <div
            className={cn(
              "relative md:pl-7 flex items-center",
              "justify-end md:justify-start cursor-copy",
              "group select-none w-full whitespace-nowrap",
            )}
            onClick={() => onPriceClick?.(data.lastPrice)}
            title="Добавить цену в калькулятор"
          >
            <span
              className={cn(
                "text-base sm:text-xl md:text-2xl",
                "tracking-tight transition-all h-6",
                "duration-300 leading-none",
                "group-hover:opacity-80",
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
      </div>

      <div
        className={cn(
          "space-y-0.5 p-0.5 md:col-span-1 h-10 flex",
          "flex-col justify-center pl-1 md:pl-0",
        )}
      >
        <span
          className={cn(
            "text-[8px] font-medium uppercase h-2",
            "tracking-wider text-muted-foreground",
            "block select-none leading-none",
          )}
        >
          24h Change
        </span>
        <span
          className={cn(
            "text-xs sm:text-sm md:text-base font-bold",
            "block tracking-tight whitespace-nowrap mt-1",
            "leading-none h-4",
            changeColor,
          )}
        >
          {hasRealData ? (changeValue > 0 ? "+" : "") : ""}
          {hasRealData ? `${changeValue.toFixed(2)}%` : "--.--%"}
        </span>
      </div>

      <div
        className={cn(
          "p-0.5 hidden md:flex flex-col h-10",
          "justify-center min-w-24 md:col-span-1",
        )}
      >
        <span
          className={cn(
            "text-[8px] font-medium uppercase h-2",
            "tracking-wider text-muted-foreground",
            "block select-none leading-none mb-1",
          )}
        >
          24h Range
        </span>
        <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full">
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              "-translate-x-1/2 w-1.5 h-1.5 rounded-full",
              "border border-background shadow-xs",
              "transition-all duration-500",
              changeValue >= 0 ? "bg-emerald-500" : "bg-rose-500",
            )}
            style={{ left: `${currentPositionPercent}%` }}
          />
        </div>
        <div
          className={cn(
            "flex justify-between text-[8px] h-2",
            "text-muted-foreground/80 whitespace-nowrap mt-1",
            "leading-none",
          )}
        >
          <span>{data.lowPrice24h.toFixed(decimals)}</span>
          <span>{data.highPrice24h.toFixed(decimals)}</span>
        </div>
      </div>

      <div
        className={cn(
          "p-0.5 md:col-span-1 h-10 flex flex-col",
          "justify-between overflow-hidden pr-1 md:pr-0",
          "text-right md:text-left",
        )}
      >
        <div className="h-5">
          <span
            className={cn(
              "text-[8px] font-medium uppercase h-1.5",
              "tracking-wider text-muted-foreground",
              "block select-none leading-none",
            )}
          >
            Turnover
          </span>
          <span
            className={cn(
              "text-xs font-bold text-foreground block",
              "tracking-tight whitespace-nowrap leading-none mt-0.5",
            )}
          >
            {formatCompactNumber(data.turnover24h)}{" "}
            <span className="text-[8px] font-normal text-muted-foreground">
              USDT
            </span>
          </span>
        </div>
        <div
          className={cn(
            "flex items-center justify-end h-3",
            "md:justify-start gap-1 min-h-3 mt-0.5",
          )}
        >
          <span
            className={cn(
              "text-[8px] font-medium uppercase h-3",
              "tracking-wider text-muted-foreground",
              "block select-none leading-none",
            )}
          >
            Funding:
          </span>
          <span
            className={cn(
              "text-[9px] font-bold block whitespace-nowrap",
              "leading-none",
              data.fundingRate >= 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-violet-600 dark:text-violet-400",
            )}
          >
            {(data.fundingRate * 100).toFixed(4)}%
          </span>
        </div>
      </div>
    </div>
  );
}
