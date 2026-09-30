"use client";

import React, { useState, useEffect, useRef } from "react";
import { Star, Check, Search, X, Settings } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { OrderType, DBAssetCoin } from "./TradingCalculator";
import ListingManagerModal from "./ListingManagerModal";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

interface CoinSelectorProps {
  selectedCoin: string;
  onCoinChange: (value: string) => void;
  orderType: OrderType;
  setOrderType: (value: OrderType) => void;
  availableCoinsList: DBAssetCoin[];
  tickerRegistry?: Record<
    string,
    {
      price24hPcnt: number;
      turnover24h: number;
    }
  >;
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

function CoinIcon({ symbol }: { symbol: string }) {
  const [error, setError] = useState(false);
  const base = symbol.replace("USDT", "");

  if (!error) {
    return (
      <img
        src={`/crypto-icons/${base.toLowerCase()}.svg`}
        alt={base}
        className="size-4 shrink-0"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div
      className="size-4 rounded-full flex items-center justify-center font-black text-white text-[8px] uppercase shrink-0"
      style={{ backgroundImage: getCoinGradient(base) }}
    >
      {base.slice(0, 2)}
    </div>
  );
}
export default function CoinSelector({
  selectedCoin,
  onCoinChange,
  orderType,
  setOrderType,
  availableCoinsList = [],
  tickerRegistry = {},
}: CoinSelectorProps) {
  const [isStarToggling, setIsStarToggling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DBAssetCoin[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const currentCoinData =
    availableCoinsList.find((c) => c.coin === selectedCoin) ||
    searchResults.find((c) => c.coin === selectedCoin);

  const isCurrentFavorite = currentCoinData
    ? currentCoinData.is_favorite
    : false;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(inputValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const executeSearch = async () => {
      try {
        const u = `/api/coins?search=${encodeURIComponent(query)}`;
        const res = await fetch(u);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.coins)) {
            setSearchResults(data.coins);
          }
        }
      } catch (err) {
        console.error("Ошибка поиска:", err);
      } finally {
        setIsSearching(false);
      }
    };
    executeSearch();
  }, [debouncedSearch]);
  const handleToggleFavoriteClick = async (e: React.MouseEvent) => {
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
      const response = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: selectedCoin,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: { coin: selectedCoin, is_favorite: nextState },
          }),
        );
        toast.add({
          title: isCurrentFavorite ? "Удалено" : "Добавлено",
          description: isCurrentFavorite
            ? `Пара ${selectedCoin} удалена из избранного.`
            : `Пара ${selectedCoin} добавлена в избранное.`,
          type: "with-icon",
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
      await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: coinName,
        }),
      });
      window.dispatchEvent(
        new CustomEvent("refresh-calculator-coins", {
          detail: { coin: coinName, is_favorite: nextState },
        }),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const favoriteCoins = availableCoinsList.filter((c) => c.is_favorite);
  const groupedCoins: GroupedCoins = {};
  let baseSourceList = debouncedSearch.trim()
    ? searchResults
    : availableCoinsList;

  baseSourceList.forEach((asset) => {
    if (!debouncedSearch.trim() && asset.is_favorite) return;
    const firstLetter = asset.coin.charAt(0).toUpperCase();
    if (!groupedCoins[firstLetter]) groupedCoins[firstLetter] = [];
    if (!groupedCoins[firstLetter].some((c) => c.coin === asset.coin)) {
      groupedCoins[firstLetter].push(asset);
    }
  });

  const sortedLetters = Object.keys(groupedCoins).sort();
  return (
    <div className="space-y-3.5 w-full">
      <div className="space-y-1 w-full">
        <Label className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider block">
          Тип ордера
        </Label>
        <ButtonGroup className="w-full flex h-9.5 sm:h-9">
          <Button
            type="button"
            variant={orderType === "MARKET" ? "default" : "outline"}
            className={cn(
              "flex-1 h-full text-[11px] sm:text-xs px-1 font-semibold shadow-none border border-input",
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
              "flex-1 h-full text-[11px] sm:text-xs px-1 font-semibold shadow-none border border-input",
              orderType === "LIMIT" ? "font-bold" : "",
            )}
            onClick={() => setOrderType("LIMIT")}
          >
            Лимитный
          </Button>
        </ButtonGroup>
      </div>

      <div className="space-y-1 w-full min-w-0">
        <Label
          htmlFor="coin-select"
          className="text-[10px] sm:text-xs text-muted-foreground truncate block font-bold uppercase tracking-wider"
        >
          Торговая пара
        </Label>
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 min-w-0">
            <Select
              value={selectedCoin}
              onValueChange={(value) => {
                if (value) {
                  onCoinChange(value);
                  setInputValue("");
                  setDebouncedSearch("");
                }
              }}
            >
              <SelectTrigger
                id="coin-select"
                className="w-full bg-background border border-input shadow-none text-[11px] sm:text-sm pl-2 pr-3 h-9.5! sm:h-9!"
              >
                <SelectValue placeholder="Монета" />
              </SelectTrigger>
              <SelectContent className="w-64! min-w-64! max-w-64! overflow-x-hidden p-1">
                <div className="p-1 border-b border-border/40 sticky top-0 bg-popover z-30 flex items-center gap-1.5">
                  {isSearching ? (
                    <Spinner className="text-amber-500 shrink-0 ml-1" />
                  ) : (
                    <Search className="size-3 text-muted-foreground/60 shrink-0 ml-1" />
                  )}
                  <input
                    type="text"
                    placeholder="Поиск по всей базе..."
                    value={inputValue}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full text-xs bg-transparent outline-none h-6 p-0 text-foreground"
                  />
                  {inputValue && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInputValue("");
                        setDebouncedSearch("");
                      }}
                      className="p-0.5 bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin mt-1">
                  {favoriteCoins.length > 0 && !debouncedSearch.trim() && (
                    <SelectGroup>
                      <SelectLabel className="text-amber-500 font-black text-[10px] tracking-wide">
                        ★ ИЗБРАННОЕ ({favoriteCoins.length})
                      </SelectLabel>
                      {favoriteCoins.map((asset) => (
                        <SelectItem
                          key={asset.coin}
                          value={asset.coin}
                          className="text-xs sm:text-sm pr-2! flex items-center w-full justify-between [&>span:last-child]:hidden"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <CoinIcon symbol={asset.coin} />
                              <span className="truncate font-semibold">
                                {asset.coin}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {selectedCoin === asset.coin && (
                                <Check className="size-3 text-amber-500" />
                              )}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleFavInMenu(e, asset.coin)
                                }
                                className="p-0.5 text-amber-500 bg-transparent border-none cursor-pointer"
                              >
                                <Star className="size-3" fill="currentColor" />
                              </button>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {sortedLetters.map((letter) => (
                    <SelectGroup key={letter}>
                      <SelectLabel className="text-muted-foreground font-bold text-[10px] border-b border-border/10 pb-0.5 mt-1">
                        {debouncedSearch.trim()
                          ? `РЕЗУЛЬТАТЫ (${letter})`
                          : letter}
                      </SelectLabel>
                      {groupedCoins[letter].map((asset) => (
                        <SelectItem
                          key={asset.coin}
                          value={asset.coin}
                          className="text-xs sm:text-sm pr-2! flex items-center w-full justify-between [&>span:last-child]:hidden"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <CoinIcon symbol={asset.coin} />
                              <span
                                className={cn(
                                  "truncate",
                                  asset.is_favorite
                                    ? "font-semibold text-amber-500"
                                    : "",
                                )}
                              >
                                {asset.coin}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {selectedCoin === asset.coin && (
                                <Check
                                  className={cn(
                                    "size-3",
                                    asset.is_favorite
                                      ? "text-amber-500"
                                      : "text-muted-foreground/60",
                                  )}
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleFavInMenu(e, asset.coin)
                                }
                                className="p-0.5 bg-transparent border-none cursor-pointer text-muted-foreground/20 hover:text-amber-500"
                                data-fav={asset.is_favorite}
                              >
                                <Star
                                  className="size-3"
                                  fill={
                                    asset.is_favorite ? "currentColor" : "none"
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            disabled={isStarToggling}
            onClick={handleToggleFavoriteClick}
            className={cn(
              "p-0 text-muted-foreground/40 hover:text-foreground bg-transparent border border-input rounded-xl flex items-center justify-center shrink-0 h-9.5 w-9.5 sm:h-9 sm:w-9 transition-colors hover:bg-muted/40 outline-none cursor-pointer",
              isCurrentFavorite ? "text-amber-500! hover:text-amber-600!" : "",
            )}
            title={isCurrentFavorite ? "Из избранного" : "В избранное"}
          >
            <Star
              className="size-4 shrink-0"
              fill={isCurrentFavorite ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-0 text-muted-foreground hover:text-foreground bg-transparent border border-input rounded-xl flex items-center justify-center shrink-0 h-9.5 w-9.5 sm:h-9 sm:w-9 transition-colors hover:bg-muted/40 outline-none cursor-pointer"
            title="Просмотр статистики листинга"
          >
            <Settings className="size-4" />
          </button>

          {/* ИСПРАВЛЕНО: Полное возвращение к оригинальному вызову модалки без лишних пропсов */}
          <ListingManagerModal
            availableCoinsList={availableCoinsList}
            tickerRegistry={tickerRegistry}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            handleToggleActive={() => {}}
            handleSetActiveStatus={async () => {}}
          />
        </div>
      </div>
    </div>
  );
}
