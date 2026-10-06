"use client";
import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DBAssetCoin } from "./TradingCalculator";

interface ItemProps {
  asset: DBAssetCoin;
  selectedCoin: string;
  onToggleFav: (e: React.MouseEvent, coin: string) => void;
}

export function CoinSelectorItem({
  asset,
  selectedCoin,
  onToggleFav,
}: ItemProps) {
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const base = asset.coin.replace("USDT", "").toUpperCase();

  useEffect(() => {
    setIsLoadFailed(false);
  }, [asset.coin]);

  const textClass = cn(
    "truncate",
    asset.is_favorite ? "font-semibold text-amber-500" : "",
  );

  const starClass = cn(
    "p-0.5 bg-transparent border-none cursor-pointer",
    asset.is_favorite
      ? "text-amber-500"
      : "text-muted-foreground/20 hover:text-amber-500",
  );

  const getCoinGradient = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = Math.abs((hash & 0xff0000) >> 16) % 360;
    const c2 = (c1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${c1}, 70%, 45%), hsl(${c2}, 80%, 35%))`;
  };

  // Считываем корень из env, если его нет — берем жесткий фолбэк по умолчанию
  const envRoot = process.env.NEXT_PUBLIC_TV_LOGOS_URL;
  const finalBaseUrl =
    envRoot || "https://s3-symbol-logo.tradingview.com/crypto/XTVC";

  return (
    <div className="flex w-full items-center justify-between font-sans">
      <div className="flex flex-1 items-center gap-2 truncate">
        {!isLoadFailed ? (
          <img
            src={`${finalBaseUrl}${base}.svg`}
            alt={base}
            loading="lazy"
            className="size-4 shrink-0 rounded-full bg-neutral-100 dark:bg-zinc-800"
            onError={() => setIsLoadFailed(true)}
          />
        ) : (
          <div
            className="size-4 rounded-full flex items-center text-white justify-center font-black text-[8px] uppercase shrink-0 select-none"
            style={{ backgroundImage: getCoinGradient(base) }}
          >
            {base.slice(0, 2)}
          </div>
        )}
        <span className={textClass}>{asset.coin}</span>
      </div>
      <div className="flex gap-2 items-center shrink-0 ml-auto">
        <button
          type="button"
          onClick={(e) => onToggleFav(e, asset.coin)}
          className={starClass}
        >
          <Star
            className="size-3"
            fill={asset.is_favorite ? "currentColor" : "none"}
          />
        </button>
      </div>
    </div>
  );
}
