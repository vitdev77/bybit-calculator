"use client";
import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DBAssetCoin } from "./TradingCalculator";

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
}

interface FGData {
  value: number;
  sentiment: string;
  color: string;
  rawColor: string;
}

interface SuperTickerProps {
  data: TickerData | null;
  loading: boolean;
  decimals: number;
  onPriceClick?: (p: number) => void;
  selectedCoin: string;
  onCoinChange?: (c: string) => void;
  availableCoinsList: DBAssetCoin[];
  marginUsed: number;
  allocatedMarginMax: number;
}
const COIN_NAMES: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  MNTUSDT: "Mantle",
  ZECUSDT: "Zcash",
  XAUTUSDT: "Tether Gold",
  SOLUSDT: "Solana",
  GRAMUSDT: "Gram",
  XRPUSDT: "Ripple",
  DOGEUSDT: "Dogecoin",
  SUIUSDT: "Sui",
  HYPEUSDT: "Hyperliquid",
  NEARUSDT: "Near Protocol",
  LINKUSDT: "Chainlink",
};

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toFixed(0);
}

function getCoinGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = Math.abs((hash & 0xff0000) >> 16) % 360;
  const c2 = (c1 + 40) % 360;
  return (
    "linear-gradient(135deg, " +
    `hsl(${c1}, 70%, 45%), ` +
    `hsl(${c2}, 80%, 35%))`
  );
}
export default function MarketTicker({
  data,
  decimals,
  onPriceClick,
  selectedCoin,
  marginUsed,
  allocatedMarginMax,
}: SuperTickerProps) {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">(
    "stable",
  );
  const [iconImgError, setIconImgError] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  const [fng, setFng] = useState<FGData | null>(null);
  const [fngLoading, setFngLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [fundProgress, setFundProgress] = useState(100);

  useEffect(() => {
    setIconImgError(false);
  }, [selectedCoin]);

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

  useEffect(() => {
    fetch("/api/fng")
      .then((r) => r.json())
      .then((res) => {
        const f = res.data;
        if (!f) return;
        const val = parseInt(f.value) || 50;
        let sent = "Neutral";
        let col = "text-amber-500";
        let rCol = "#f59e0b";
        if (val <= 25) {
          sent = "Extreme Fear";
          col = "text-rose-500";
          rCol = "#f43f5e";
        } else if (val < 45) {
          sent = "Fear";
          col = "text-rose-400";
          rCol = "#fb7185";
        } else if (val > 55 && val <= 75) {
          sent = "Greed";
          col = "text-emerald-400";
          rCol = "#34d399";
        } else if (val > 75) {
          sent = "Extreme Greed";
          col = "text-emerald-500";
          rCol = "#10b981";
        }
        setFng({
          value: val,
          sentiment: sent,
          color: col,
          rawColor: rCol,
        });
      })
      .catch((e) => console.error(e))
      .finally(() => setFngLoading(false));
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const currentUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
      );
      const h = now.getUTCHours();
      const intervals = [0, 8, 16];
      const nextHour = intervals.find((i) => i > h) ?? 24;
      const nextFundingUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        nextHour === 24 ? now.getUTCDate() + 1 : now.getUTCDate(),
        nextHour === 24 ? 0 : nextHour,
        0,
        0,
      );
      const diff = nextFundingUtc - currentUtc;
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setFundProgress(0);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");

      setTimeLeft(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      setFundProgress((diff / (8 * 3600000)) * 100);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);
  if (!data || data.lastPrice <= 0) {
    return (
      <div
        className={cn(
          "p-4 border w-full rounded-xl",
          "bg-muted/30 border-border/40 h-20",
          "flex items-center justify-center",
        )}
      >
        <Spinner className="text-amber-500" />
      </div>
    );
  }

  const ratio =
    allocatedMarginMax > 0 ? Math.min(marginUsed / allocatedMarginMax, 1) : 0;
  const activeBlocks = Math.round(ratio * 10);
  const isHighMargin = ratio > 0.85;
  const isFundingHigh = Math.abs(data.fundingRate) >= 0.01;

  const fngPercent = fng ? fng.value : 50;
  const radius = 10;
  const stroke = 2;
  const circum = 2 * Math.PI * radius;
  const strokeDashoffset = circum - (fundProgress / 100) * circum;

  let priceColor = "text-foreground font-black";
  if (tickDirection === "up") {
    priceColor = "text-emerald-600 dark:text-emerald-400";
  }
  if (tickDirection === "down") {
    priceColor = "text-rose-600 dark:text-rose-400";
  }

  const changeValue = data.price24hPcnt;
  const changeColor =
    changeValue > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : changeValue < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  const coinBaseName = selectedCoin;
  const coinIconName = selectedCoin.replace("USDT", "");
  const fullName = COIN_NAMES[selectedCoin] || "Crypto Asset";
  return (
    <div
      className={cn(
        "p-3 border border-border/40 w-full",
        "rounded-xl bg-muted/30 select-none",
        "dark:bg-black/40 grid grid-cols-1",
        "md:grid-cols-12 gap-4 items-stretch",
      )}
    >
      <div
        className={cn(
          "md:col-span-5 flex flex-row md:flex-col justify-between",
          "items-center md:items-start min-w-0 md:border-r border-border/30 pr-2 py-0.5",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 max-w-[50%] md:max-w-full">
          <div className="relative size-9 shrink-0 flex items-center justify-center">
            {!iconImgError ? (
              <img
                src={"/crypto-icons/" + coinIconName.toLowerCase() + ".svg"}
                alt={coinBaseName}
                className="w-full h-full"
                onError={() => setIconImgError(true)}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full flex text-white",
                  "items-center font-black",
                  "justify-center text-xs uppercase rounded-full",
                )}
                style={{
                  backgroundImage: getCoinGradient(coinIconName),
                }}
              >
                {coinIconName.slice(0, 2)}
              </div>
            )}
          </div>
          {/* Фикс: Адаптивный лимит ширины на мобилке для вызова truncate с 3 точками */}
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <span className="text-sm sm:text-base font-black text-foreground truncate block max-w-30 xs:max-w-none">
              {coinBaseName}
            </span>
            <span className="text-[9px] font-bold opacity-30 truncate mt-0.5">
              {fullName}
            </span>
          </div>
        </div>

        {/* Фикс: Сделали разделительную полоску повиднее через bg-border/60 */}
        <div className="block md:hidden w-px h-8 bg-border/60 mx-1.5 shrink-0" />

        {/* Фикс: На мобилке цена увеличена до text-3xl */}
        <div
          className="cursor-pointer w-auto md:w-full text-right md:text-left mt-0 md:mt-2"
          onClick={() => onPriceClick?.(data.lastPrice)}
        >
          <span
            className={cn(
              "text-3xl font-black tracking-tight whitespace-nowrap inline-block leading-none",
              priceColor,
            )}
          >
            {tickDirection === "up"
              ? "▲ "
              : tickDirection === "down"
                ? "▼ "
                : "• "}
            {data.lastPrice}
          </span>
        </div>
      </div>

      <div className="md:col-span-7 flex flex-col gap-2 justify-center w-full min-w-0">
        <div className="grid grid-cols-3 gap-2 w-full">
          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex flex-col justify-center min-w-0">
            <span className="text-[8px] opacity-50 uppercase font-bold">
              24h Изменение
            </span>
            <span
              className={cn("text-xs font-bold truncate mt-0.5", changeColor)}
            >
              {changeValue > 0 ? "+" : ""}
              {changeValue.toFixed(2)}%
            </span>
          </div>
          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex flex-col justify-center min-w-0">
            <span className="text-[8px] opacity-50 uppercase font-bold">
              Суточный Оборот
            </span>
            <span className="text-xs font-bold text-foreground truncate mt-0.5">
              {formatCompactNumber(data.turnover24h)}
            </span>
          </div>
          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex flex-col justify-center min-w-0">
            <span className="text-[8px] opacity-50 uppercase font-bold">
              Ставка Bybit
            </span>
            <span className="text-xs font-bold text-amber-500 truncate mt-0.5">
              {((data.fundingRate || 0) * 100).toFixed(4)}%
            </span>
          </div>
        </div>

        {/* Фикс: На мобилке ровно 50% на 50% (grid-cols-2), а Margin Load занимает всю ширину под ними */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex flex-col justify-center min-w-0 relative col-span-1">
            <span className="text-[8px] opacity-50 uppercase font-bold">
              Fear & Greed
            </span>
            {fngLoading ? (
              <div className="h-4 flex items-center">
                <Spinner className="text-amber-500" />
              </div>
            ) : fng ? (
              <span
                className={cn(
                  "text-[10px] font-black truncate mt-0.5",
                  fng.color,
                )}
              >
                {fng.sentiment}{" "}
                <span className="text-muted-foreground font-bold">
                  ({fng.value})
                </span>
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                --
              </span>
            )}
          </div>

          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex items-center justify-between min-w-0 gap-1 col-span-1">
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] opacity-50 uppercase font-bold">
                Countdown
              </span>
              <span
                className={cn(
                  "text-[10px] font-black text-foreground block mt-0.5",
                  isFundingHigh ? "text-amber-500 animate-pulse" : "",
                )}
              >
                {timeLeft}
              </span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="transform -rotate-90 shrink-0"
            >
              <circle
                cx="12"
                cy="12"
                r={radius}
                stroke="currentColor"
                strokeWidth={stroke}
                fill="transparent"
                className="text-muted-foreground/10 dark:text-neutral-800"
              />
              <circle
                cx="12"
                cy="12"
                r={radius}
                stroke="#f59e0b"
                strokeWidth={stroke}
                fill="transparent"
                strokeDasharray={circum}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="bg-background/40 dark:bg-neutral-900/40 p-1.5 rounded-lg border border-border/10 flex flex-col justify-center min-w-0 col-span-2 sm:col-span-1">
            <div className="flex justify-between items-center w-full">
              <span className="text-[8px] opacity-50 uppercase font-bold">
                Margin Load
              </span>
              <span
                className={cn(
                  "text-[9px] font-black",
                  isHighMargin ? "text-rose-500" : "text-amber-500",
                )}
              >
                {(ratio * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-10 gap-0.5 mt-1 w-full">
              {Array.from({ length: 10 }).map((_, i) => {
                const blockRatio = (i + 1) * 0.1;
                const isBlockActive = ratio >= blockRatio - 0.05;
                return (
                  <div
                    key={`led-${i}`}
                    className={cn(
                      "h-1 rounded-xs transition-all duration-300",
                      isBlockActive
                        ? isHighMargin || i >= 8
                          ? "bg-rose-500 shadow-xs"
                          : "bg-amber-500 shadow-xs"
                        : "bg-muted-foreground/10 dark:bg-neutral-800",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
