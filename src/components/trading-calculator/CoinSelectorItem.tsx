"use client";
import React, { useState, useEffect } from "react";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface DBAssetCoin {
  coin: string;
  decimals: number;
  is_favorite: boolean;
  is_active: boolean;
  is_delisted: boolean;
  fullname?: string;
  logo_slug?: string;
}

interface ItemProps {
  asset: DBAssetCoin;
  selectedCoin: string;
  onToggleFav: (e: React.MouseEvent, coinName: string) => void;
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

export function CoinSelectorItem({
  asset,
  selectedCoin,
  onToggleFav,
}: ItemProps) {
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const isCurrent = asset.coin === selectedCoin;
  const fallbackTicker = asset.coin.replace("USDT", "");
  const dbSlug = asset.logo_slug || "";

  useEffect(() => {
    setIsLoadFailed(false);
  }, [asset.coin, asset.logo_slug]);

  const displaySeed = (dbSlug || fallbackTicker).toUpperCase();

  let finalImgUrl = "";
  const defaultCryptoBase =
    process.env.TRADINGVIEW_LOGOS_URL_BASE ||
    "https://s3-symbol-logo.tradingview.com";

  if (dbSlug.startsWith("http://") || dbSlug.startsWith("https://")) {
    finalImgUrl = dbSlug;
  } else if (dbSlug.startsWith("/")) {
    finalImgUrl = `${defaultCryptoBase}${dbSlug}`;
  } else {
    const activeSlug = (dbSlug || fallbackTicker).toUpperCase();
    finalImgUrl = `${defaultCryptoBase}/crypto/XTVC${activeSlug}.svg`;
  }
  return (
    <div className="flex items-center justify-between w-full font-sans pr-8 relative">
      <div className="flex items-center gap-2 min-w-0">
        {isLoadFailed ? (
          <div
            className={cn(
              "size-4 rounded-full flex items-center text-white",
              "justify-center font-black text-[8px] uppercase shrink-0 select-none",
            )}
            style={{ backgroundImage: getCoinGradient(displaySeed) }}
          >
            {displaySeed.slice(0, 2)}
          </div>
        ) : (
          <Image
            src={finalImgUrl}
            alt={displaySeed.toLowerCase()}
            width={16}
            height={16}
            loading="lazy"
            className="size-4 shrink-0 rounded-full bg-neutral-100 dark:bg-zinc-800"
            onError={() => setIsLoadFailed(true)}
          />
        )}
        <span
          className={cn(
            "truncate text-xs sm:text-sm transition-colors max-w-32",
            isCurrent
              ? "font-black text-amber-500"
              : "font-medium text-foreground",
          )}
          title={asset.coin}
        >
          {asset.coin}
        </span>
        {asset.fullname && (
          <span className="text-[9px] font-medium opacity-30 truncate hidden xs:inline max-w-24">
            {asset.fullname}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => onToggleFav(e, asset.coin)}
        className={cn(
          "absolute right-1 p-1 border-none bg-transparent outline-none",
          "transition-colors cursor-pointer text-muted-foreground/30",
          "hover:text-amber-500 z-30",
          asset.is_favorite ? "text-amber-500!" : "",
        )}
        title={asset.is_favorite ? "Из избранного" : "В избранное"}
      >
        <StarIcon
          className="size-3.5 shrink-0"
          fill={asset.is_favorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
