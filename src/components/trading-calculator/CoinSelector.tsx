"use client";
import React, { useState, useEffect, useRef } from "react";
import { Star, Settings, ClipboardPaste } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { OrderType } from "./TradingCalculator";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { CoinSelectorDrop } from "./CoinSelectorDrop";

export interface DBAssetCoin {
  coin: string;
  decimals: number;
  is_favorite: boolean;
  is_active: boolean;
  is_delisted: boolean;
  fullname?: string;
  logo_slug?: string;
}

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
  fullname?: string;
  logo_slug?: string;
}

interface SelectorProps {
  selectedCoin: string;
  onCoinChange: (v: string) => void;
  orderType: OrderType;
  setOrderType: (v: OrderType) => void;
  availableCoinsList: DBAssetCoin[];
  tickerRegistry?: Record<string, any>;
  setIsModalOpen?: (v: boolean) => void;
  liveTickerData?: TickerData | null;
  setSide?: (v: "BUY" | "SELL") => void;
  setEntryPrice?: (v: number) => void;
}

interface GroupedCoins {
  [key: string]: DBAssetCoin[];
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

function CoinIcon({
  symbol,
  logoSlug,
  liveSlug,
}: {
  symbol: string;
  logoSlug?: string;
  liveSlug?: string;
}) {
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const dbSlug = liveSlug || logoSlug || "";
  const fallbackTicker = symbol.replace("USDT", "");

  let finalImgUrl = "";
  const envRoot = process.env.TRADINGVIEW_LOGOS_URL;
  const defaultCryptoBase =
    envRoot || "https://s3-symbol-logo.tradingview.com/crypto/XTVC";

  if (dbSlug.startsWith("http://") || dbSlug.startsWith("https://")) {
    finalImgUrl = dbSlug;
  } else if (dbSlug.startsWith("/")) {
    finalImgUrl = `https://s3-symbol-logo.tradingview.com${dbSlug}`;
  } else {
    const activeSlug = (dbSlug || fallbackTicker).toUpperCase();
    finalImgUrl = `${defaultCryptoBase}${activeSlug}.svg`;
  }

  useEffect(() => {
    setIsLoadFailed(false);
  }, [symbol, logoSlug, liveSlug]);

  const displaySeed = (dbSlug || fallbackTicker).toUpperCase();

  if (isLoadFailed) {
    return (
      <div
        className={cn(
          "size-4 rounded-full flex items-center text-white",
          "justify-center font-black text-[8px] uppercase shrink-0 select-none",
        )}
        style={{ backgroundImage: getCoinGradient(displaySeed) }}
      >
        {displaySeed.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={finalImgUrl}
      alt={displaySeed}
      loading="lazy"
      className="size-4 shrink-0 rounded-full bg-neutral-100 dark:bg-zinc-800"
      onError={() => setIsLoadFailed(true)}
    />
  );
}
export default function CoinSelector({
  selectedCoin,
  onCoinChange,
  orderType,
  setOrderType,
  availableCoinsList = [],
  setIsModalOpen,
  liveTickerData,
  setSide,
  setEntryPrice,
}: SelectorProps) {
  const [isStarToggling, setIsStarToggling] = useState(false);
  const [inpValue, setInpValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DBAssetCoin[]>([]);
  const [isSearching, setSearchResultsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const currentCoinData =
    availableCoinsList.find((c) => c.coin === selectedCoin) ||
    searchResults.find((c) => c.coin === selectedCoin);

  const isCurrentFavorite = currentCoinData
    ? currentCoinData.is_favorite
    : false;

  const currentLogoSlug = currentCoinData?.logo_slug;

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(inpValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inpValue]);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      setSearchResults([]);
      setSearchResultsLoading(false);
      return;
    }
    setSearchResultsLoading(true);
    fetch("/api/coins?search=" + encodeURIComponent(query))
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.coins)) {
          setSearchResults(data.coins);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setSearchResultsLoading(false));
  }, [debouncedSearch]);

  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.add({
          title: "Буфер пуст",
          description: "Скопируйте строку позиции из Bybit.",
          type: "warning",
        });
        return;
      }

      const coinRegex = /([A-Z0-9]+USDT)/i;
      const coinMatch = text.match(coinRegex);
      if (!coinMatch || !coinMatch[0]) {
        toast.add({
          title: "Ошибка импорта",
          description: "Не найден тикер пары (например, BTCUSDT).",
          type: "error",
        });
        return;
      }
      const detectedCoin = coinMatch[0].toUpperCase();

      const isLong = /LONG|BUY/i.test(text);
      const isShort = /SHORT|SELL/i.test(text);

      const entryRegex = /Entry\s*Price:\s*([0-9.,]+)/i;
      const entryMatch = text.match(entryRegex);
      let detectedPrice = 0;
      if (entryMatch && entryMatch[1]) {
        detectedPrice = parseFloat(entryMatch[1].replace(/,/g, ""));
      }

      onCoinChange(detectedCoin);
      if (setSide) {
        if (isLong) setSide("BUY");
        if (isShort) setSide("SELL");
      }
      if (setEntryPrice && detectedPrice > 0) {
        setEntryPrice(detectedPrice);
      }

      const descText =
        "Пара: " +
        detectedCoin +
        (detectedPrice > 0 ? ", Вход: " + detectedPrice : "");

      toast.add({
        title: "Позиция импортирована",
        description: descText,
        type: "success",
      });
    } catch (err) {
      toast.add({
        title: "Нет доступа",
        description: "Предоставьте доступ к буферу обмена.",
        type: "error",
      });
    }
  };

  const handleToggleFavClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isStarToggling || !selectedCoin) return;

    setIsStarToggling(true);
    const nextState = !isCurrentFavorite;

    setSearchResults((prev) =>
      prev.map((c) =>
        c.coin === selectedCoin ? { ...c, is_favorite: nextState } : c,
      ),
    );

    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: selectedCoin,
        }),
      });
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: {
              coin: selectedCoin,
              is_favorite: nextState,
              logo_slug: currentCoinData?.logo_slug,
            },
          }),
        );
        toast.add({
          title: "Избранное",
          description: nextState
            ? "Пара добавлена в избранное."
            : "Пара удалена из избранного.",
          type: nextState ? "success" : "error",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarToggling(false);
    }
  };

  const handleToggleFavInMenu = async (
    e: React.MouseEvent,
    coinName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const targetCoin =
      availableCoinsList.find((c) => c.coin === coinName) ||
      searchResults.find((c) => c.coin === coinName);
    const nextState = targetCoin ? !targetCoin.is_favorite : true;

    setSearchResults((prev) =>
      prev.map((c) =>
        c.coin === coinName ? { ...c, is_favorite: nextState } : c,
      ),
    );

    try {
      const res = await fetch("api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_FAVORITE", coin: coinName }),
      });
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: {
              coin: coinName,
              is_favorite: nextState,
              logo_slug: targetCoin?.logo_slug,
            },
          }),
        );
        toast.add({
          title: "Избранное",
          description: nextState
            ? `Пара ${coinName} добавлена в избранное.`
            : `Пара ${coinName} удалена из избранного.`,
          type: nextState ? "success" : "error",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const favoriteCoins = availableCoinsList.filter((c) => c.is_favorite);
  const groupedCoins: GroupedCoins = {};
  let baseSourceList = debouncedSearch.trim()
    ? searchResults
    : availableCoinsList;

  baseSourceList.forEach((asset: DBAssetCoin) => {
    if (!debouncedSearch.trim() && asset.is_favorite) return;
    const firstLetter = asset.coin.charAt(0).toUpperCase();
    if (!groupedCoins[firstLetter]) {
      groupedCoins[firstLetter] = [];
    }
    if (!groupedCoins[firstLetter].some((c) => c.coin === asset.coin)) {
      groupedCoins[firstLetter].push(asset);
    }
  });

  const sortedLetters = Object.keys(groupedCoins).sort();

  const lblCls = cn(
    "text-[10px] font-bold sm:text-xs uppercase",
    "text-muted-foreground tracking-wider block",
  );

  const btnFavClass = cn(
    "p-0 border flex bg-transparent items-center shrink-0",
    "justify-center h-9.5 w-9.5 border-input rounded-xl",
    "outline-none transition-colors hover:bg-muted/40 cursor-pointer",
    "text-muted-foreground/40 hover:text-foreground",
    isCurrentFavorite ? "text-amber-500! hover:text-amber-600!" : "",
  );

  const btnSetClass = cn(
    "p-0 border flex bg-transparent items-center shrink-0",
    "justify-center h-9.5 w-9.5 border-input rounded-xl",
    "outline-none transition-colors hover:bg-muted/40 cursor-pointer",
    "text-muted-foreground hover:text-foreground",
  );
  return (
    <div className="space-y-3.5 w-full font-sans">
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-1 flex-1">
          <Label className={lblCls}>Тип ордера</Label>
          <ButtonGroup className="w-full flex h-9.5">
            <Button
              type="button"
              variant={orderType === "MARKET" ? "default" : "outline"}
              className={cn(
                "flex-1 h-full px-1 font-semibold text-[11px] sm:text-xs",
                "shadow-none border border-input",
                orderType === "MARKET" ? "font-bold" : "",
              )}
              onClick={() => setOrderType("MARKET")}
            >
              Рыночный
            </Button>
            <Button
              type="button"
              variant={orderType === "LIMIT" ? "default" : "outline"}
              className={cn(
                "flex-1 h-full px-1 font-semibold text-[11px] sm:text-xs",
                "shadow-none border border-input",
                orderType === "LIMIT" ? "font-bold" : "",
              )}
              onClick={() => setOrderType("LIMIT")}
            >
              Лимитный
            </Button>
          </ButtonGroup>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleImportFromClipboard}
          className="h-9.5 text-[10px] font-black uppercase tracking-wider rounded-xl border-dashed border-input flex items-center gap-1 bg-muted/10 hover:bg-muted/30"
          title="Импортировать открытую позицию из Bybit"
        >
          <ClipboardPaste className="size-3.5 shrink-0" />
          Импорт
        </Button>
      </div>
      <div className="space-y-1 w-full min-w-0">
        <Label
          htmlFor="coin-select"
          className={cn(
            "text-[10px] sm:text-xs font-bold truncate",
            "text-muted-foreground block uppercase tracking-wider",
          )}
        >
          Торговая пара
        </Label>
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 min-w-0">
            <Select
              key={selectedCoin}
              value={selectedCoin}
              onValueChange={(val) => {
                if (val) {
                  onCoinChange(val);
                  setInpValue("");
                  setDebouncedSearch("");
                }
              }}
            >
              <SelectTrigger
                id="coin-select"
                className={cn(
                  "w-full bg-background pr-3 border border-input pl-2",
                  "shadow-none text-[11px] sm:text-sm h-9.5!",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <CoinIcon
                    symbol={selectedCoin}
                    logoSlug={currentLogoSlug}
                    liveSlug={liveTickerData?.logo_slug}
                  />
                  <SelectValue placeholder="Монета" />
                </div>
              </SelectTrigger>
              <CoinSelectorDrop
                isSearching={isSearching}
                inpValue={inpValue}
                setInpValue={setInpValue}
                setDebouncedSearch={setDebouncedSearch}
                favoriteCoins={favoriteCoins}
                sortedLetters={sortedLetters}
                groupedCoins={groupedCoins}
                selectedCoin={selectedCoin}
                handleToggleFavInMenu={handleToggleFavInMenu}
                popupCls="w-64! min-w-64! max-w-64! overflow-x-hidden p-1"
                searchBoxCls={cn(
                  "p-1 border-b sticky z-30 border-border/40 gap-1.5",
                  "top-0 bg-popover flex items-center",
                )}
                inpCls={cn(
                  "w-full text-xs p-0 bg-transparent h-6",
                  "outline-none text-foreground",
                )}
                scrollCls="max-h-56 mt-1 overflow-y-auto scrollbar-thin"
              />
            </Select>
          </div>
          <button
            type="button"
            disabled={isStarToggling}
            onClick={handleToggleFavClick}
            className={btnFavClass}
            title={isCurrentFavorite ? "Из избранного" : "В избранное"}
          >
            <Star
              className="size-4 shrink-0"
              fill={isCurrentFavorite ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen?.(true)}
            className={btnSetClass}
            title="Просмотр статистики"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
