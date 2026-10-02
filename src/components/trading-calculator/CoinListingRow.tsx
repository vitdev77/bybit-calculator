"use client";
import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DBAssetCoin } from "./TradingCalculator";

interface RowProps {
  item: DBAssetCoin;
  idx: number;
  liveStats: {
    price24hPcnt: number;
    turnover24h: number;
  };
  favLoading: boolean;
  onSelect: (coin: string, del: boolean) => void;
  onToggleFav: (e: React.MouseEvent, coin: string, fav: boolean) => void;
}

export function CoinListingRow({
  item,
  idx,
  liveStats,
  favLoading,
  onSelect,
  onToggleFav,
}: RowProps) {
  const isUp = liveStats.price24hPcnt > 0;
  const isDown = liveStats.price24hPcnt < 0;

  const isMem =
    item.coin.includes("DOGE") ||
    item.coin.includes("SHIB") ||
    item.coin.includes("PEPE") ||
    item.coin.includes("BONK");

  const isHighRisk =
    !item.is_delisted &&
    (isMem ||
      item.decimals >= 4 ||
      (liveStats.turnover24h > 0 && liveStats.turnover24h < 10000000));

  const isHighLiq = !item.is_delisted && liveStats.turnover24h >= 100000000;

  function formatCompact(num: number): string {
    if (!num) return "--";
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1) + "B";
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + "M";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(0) + "K";
    }
    return num.toFixed(0);
  }

  const renderBadge = (type: "LIQ" | "RISK") => {
    const isR = type === "RISK";
    return (
      <span
        className={cn(
          "flex px-1 text-center py-0.5 shrink-0",
          "font-black tracking-wider rounded border text-[9px] font-sans",
          isR
            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
        )}
      >
        {type}
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect(item.coin, item.is_delisted)}
      className={cn(
        "grid grid-cols-12 p-2 gap-2 items-center rounded-xl border bg-background/50 transition-all",
        item.is_delisted
          ? "border-rose-500/10 opacity-56 bg-rose-500/2 cursor-not-allowed"
          : "border-border/30 cursor-pointer hover:bg-muted/30 hover:border-amber-500/30",
      )}
    >
      <div
        className={cn("col-span-8 flex items-center", "gap-1.5 min-w-0 pr-2")}
      >
        <button
          type="button"
          disabled={favLoading || item.is_delisted}
          onClick={(e) => onToggleFav(e, item.coin, item.is_favorite)}
          className={cn(
            "p-1 bg-transparent border-none outline-none transition-colors shrink-0",
            item.is_delisted
              ? "hidden"
              : "cursor-pointer text-muted-foreground/30 hover:text-amber-500",
            item.is_favorite ? "text-amber-500!" : "",
          )}
        >
          <Star
            className="size-3.5"
            fill={item.is_favorite ? "currentColor" : "none"}
          />
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          {/* ЯРУС 1: Название пары */}
          <div className={cn("flex gap-1 items-center min-w-0 flex-nowrap")}>
            <span
              className={cn(
                "text-[10px] font-bold min-w-6",
                "text-muted-foreground/40",
              )}
            >
              {idx + 1}.
            </span>
            <span
              className={cn(
                "font-bold text-xs text-foreground",
                "leading-none truncate",
              )}
            >
              {item.coin}
            </span>
            {/* На десктопе бейджи остаются в основном ряду */}
            <div className="hidden sm:flex gap-1 items-center">
              {isHighLiq && renderBadge("LIQ")}
              {isHighRisk && renderBadge("RISK")}
            </div>
          </div>

          {/* ЯРУС 2 (Мобильный): Бейджи переносятся под название пары на смартфонах */}
          <div className="flex sm:hidden gap-1 items-center mt-1 pl-7">
            {isHighLiq && renderBadge("LIQ")}
            {isHighRisk && renderBadge("RISK")}
          </div>

          <span
            className={cn(
              "text-[9px] mt-1 pl-7 truncate text-muted-foreground/40 block",
            )}
          >
            Разрядность:{" "}
            <span className="font-bold text-muted-foreground/80">
              {item.decimals}
            </span>
          </span>
        </div>
      </div>

      <div
        className={cn(
          "col-span-4 flex flex-col items-end",
          "justify-center text-right min-w-0",
        )}
      >
        {!item.is_delisted ? (
          <div className="flex flex-col items-end min-w-0">
            <span
              className={cn(
                "font-bold leading-none",
                isUp
                  ? "text-emerald-500"
                  : isDown
                    ? "text-rose-500"
                    : "text-muted-foreground/60",
              )}
            >
              {isUp ? "+" : ""}
              {liveStats.price24hPcnt !== 0
                ? `${liveStats.price24hPcnt.toFixed(2)}%`
                : "0.00%"}
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold",
                "text-muted-foreground/50 mt-1 truncate",
              )}
            >
              {formatCompact(liveStats.turnover24h)}
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "px-2 py-0.5 font-black text-[9px]",
              "uppercase tracking-wider bg-rose-500/10",
              "text-rose-500 border border-rose-500/20 rounded",
            )}
          >
            DELISTED
          </span>
        )}
      </div>
    </div>
  );
}
