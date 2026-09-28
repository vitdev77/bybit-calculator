"use client";

import React, { useState } from "react";
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
import { Star, Check } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { OrderType, DBAssetCoin } from "./TradingCalculator";
import ListingManagerModal from "./ListingManagerModal";

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

  const currentCoinData = availableCoinsList.find(
    (c) => c.coin === selectedCoin,
  );
  const isCurrentFavorite = currentCoinData
    ? currentCoinData.is_favorite
    : false;
  const handleToggleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isStarToggling || !selectedCoin) return;
    setIsStarToggling(true);
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
        window.dispatchEvent(new Event("refresh-calculator-coins"));
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
      // ИСПРАВЛЕНО: Заменено ошибочное "finaly" на корректное "finally"
      setIsStarToggling(false);
    }
  };

  const handleToggleFavInMenu = async (
    e: React.MouseEvent,
    coinName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const itemData = availableCoinsList.find((c) => c.coin === coinName);
    const wasFav = itemData ? itemData.is_favorite : false;

    try {
      const response = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: coinName,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("refresh-calculator-coins"));
        toast.add({
          title: wasFav ? "Удалено" : "Добавлено",
          description: wasFav
            ? `Пара ${coinName} удалена из избранного.`
            : `Пара ${coinName} добавлена в избранное.`,
          type: "with-icon",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetActiveStatus = async (
    coinName: string,
    targetStatus: boolean,
    currentStatus: boolean,
  ) => {
    if (targetStatus === currentStatus) return;
    try {
      const response = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_ACTIVE",
          coin: coinName,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("refresh-calculator-coins"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const groupedCoins: GroupedCoins = {};
  const favoriteCoins: DBAssetCoin[] = [];
  const filteredActiveCoins = availableCoinsList.filter((c) => c.is_active);

  filteredActiveCoins.forEach((asset) => {
    if (asset.is_favorite) favoriteCoins.push(asset);
    else {
      const firstLetter = asset.coin.charAt(0).toUpperCase();
      if (!groupedCoins[firstLetter]) groupedCoins[firstLetter] = [];
      groupedCoins[firstLetter].push(asset);
    }
  });

  const sortedLetters = Object.keys(groupedCoins).sort();
  return (
    <div className="space-y-1.5 w-full">
      <div className="grid grid-cols-2 gap-2.5 w-full items-center">
        {/* ЛЕВАЯ КОЛОНКА: Выбор торговой пары */}
        <div className="space-y-1 w-full min-w-0">
          <Label
            htmlFor="coin-select"
            className={cn(
              "text-[10px] sm:text-xs text-muted-foreground",
              "truncate block font-bold uppercase tracking-wider",
            )}
          >
            Торговая пара
          </Label>

          <div className="relative flex items-center w-full group/select">
            <Select
              value={selectedCoin}
              onValueChange={(value) => {
                if (value) onCoinChange(value);
              }}
            >
              <SelectTrigger
                id="coin-select"
                className={cn(
                  "w-full bg-background border border-input",
                  "shadow-none text-[11px] sm:text-sm pl-2",
                  "pr-14 h-9! md:h-8!",
                )}
              >
                <SelectValue placeholder="Монета" />
              </SelectTrigger>
              <SelectContent className="w-64! min-w-64! max-w-64! overflow-x-hidden p-1">
                {favoriteCoins.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-amber-500 font-black text-[10px]">
                      ★ ИЗБРАННОЕ
                    </SelectLabel>
                    {favoriteCoins.map((asset) => {
                      const isSel = selectedCoin === asset.coin;
                      return (
                        <SelectItem
                          key={asset.coin}
                          value={asset.coin}
                          className="text-xs sm:text-sm pr-2! flex items-center w-full justify-between [&>span:last-child]:hidden"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate font-semibold">
                              {asset.coin}
                            </span>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {isSel && (
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
                      );
                    })}
                  </SelectGroup>
                )}
                {sortedLetters.map((letter) => (
                  <SelectGroup key={letter}>
                    <SelectLabel className="text-muted-foreground font-bold text-[10px] border-b border-border/10 pb-0.5 mt-1">
                      {letter}
                    </SelectLabel>
                    {groupedCoins[letter].map((asset) => {
                      const isSel = selectedCoin === asset.coin;
                      return (
                        <SelectItem
                          key={asset.coin}
                          value={asset.coin}
                          className="text-xs sm:text-sm pr-2! flex items-center w-full justify-between [&>span:last-child]:hidden"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{asset.coin}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {isSel && (
                                <Check className="size-3 text-muted-foreground/60" />
                              )}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleFavInMenu(e, asset.coin)
                                }
                                className="p-0.5 text-muted-foreground/20 hover:text-amber-500 bg-transparent border-none cursor-pointer"
                              >
                                <Star className="size-3" fill="none" />
                              </button>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <div className="absolute right-7 flex items-center h-full z-20">
              <ListingManagerModal
                availableCoinsList={availableCoinsList}
                tickerRegistry={tickerRegistry}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                handleToggleActive={() => {}}
                handleSetActiveStatus={handleSetActiveStatus}
              />
            </div>

            <button
              type="button"
              disabled={isStarToggling}
              onClick={handleToggleFavoriteClick}
              className={cn(
                "absolute right-1.5 p-1 rounded-md border-none",
                "bg-transparent flex items-center justify-center",
                "cursor-pointer transition-colors z-25",
                isCurrentFavorite
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-muted-foreground/40 hover:text-foreground",
              )}
              title={isCurrentFavorite ? "Из избранного" : "В избранное"}
            >
              <Star
                className="size-3.5 shrink-0"
                fill={isCurrentFavorite ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Выбор типа ордера */}
        <div className="space-y-1 w-full min-w-0">
          <Label className="text-[10px] sm:text-xs text-muted-foreground truncate block font-bold uppercase tracking-wider">
            Тип ордера
          </Label>
          <ButtonGroup className="w-full flex h-9 md:h-8 mb-1">
            <Button
              type="button"
              variant={orderType === "MARKET" ? "default" : "outline"}
              className={cn(
                "flex-1 h-full text-[11px] sm:text-xs px-1",
                "font-semibold shadow-none border border-input",
                orderType === "MARKET" ? "font-bold" : "",
              )}
              onClick={() => setOrderType("MARKET")}
            >
              Market
            </Button>
            <Button
              type="button"
              variant={orderType === "LIMIT" ? "default" : "outline"}
              className={cn(
                "flex-1 h-full text-[11px] sm:text-xs px-1",
                "font-semibold shadow-none border border-input",
                orderType === "LIMIT" ? "font-bold" : "",
              )}
              onClick={() => setOrderType("LIMIT")}
            >
              Limit
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}
