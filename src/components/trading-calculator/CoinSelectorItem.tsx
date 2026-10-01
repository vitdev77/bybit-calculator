"use client";
import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DBAssetCoin } from "./TradingCalculator";

interface ItemProps {
  asset: DBAssetCoin;
  selectedCoin: string;
  onToggleFav: (e: React.MouseEvent, coin: string) => void;
  IconComponent: React.ComponentType<{
    symbol: string;
  }>;
}

export function CoinSelectorItem({
  asset,
  selectedCoin,
  onToggleFav,
  IconComponent,
}: ItemProps) {
  const textClass = cn(
    "truncate",
    asset.is_favorite ? "font-semibold " + "text-amber-500" : "",
  );

  const starClass = cn(
    "p-0.5 bg-transparent",
    "border-none",
    "cursor-pointer",
    asset.is_favorite
      ? "text-amber-500"
      : "text-muted-foreground/20 " + "hover:text-amber-500",
  );
  return (
    <div className={cn("flex w-full", "items-center", "justify-between")}>
      <div className={cn("flex flex-1", "items-center", "gap-2", "truncate")}>
        <IconComponent symbol={asset.coin} />
        <span className={textClass}>{asset.coin}</span>
      </div>
      <div className={cn("flex gap-2", "items-center", "shrink-0", "ml-auto")}>
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
