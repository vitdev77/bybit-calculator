"use client";
import React from "react";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { CoinSelectorItem } from "./CoinSelectorItem";
import { DBAssetCoin } from "./TradingCalculator";
import { cn } from "@/lib/utils";

interface DropProps {
  isSearching: boolean;
  inpValue: string;
  setInpValue: (v: string) => void;
  setDebouncedSearch: (v: string) => void;
  favoriteCoins: DBAssetCoin[];
  sortedLetters: string[];
  groupedCoins: Record<string, DBAssetCoin[]>;
  selectedCoin: string;
  handleToggleFavInMenu: (e: React.MouseEvent, coinName: string) => void;
  popupCls: string;
  searchBoxCls: string;
  inpCls: string;
  scrollCls: string;
}

export function CoinSelectorDrop({
  isSearching,
  inpValue,
  setInpValue,
  setDebouncedSearch,
  favoriteCoins,
  sortedLetters,
  groupedCoins,
  selectedCoin,
  handleToggleFavInMenu,
  popupCls,
  searchBoxCls,
  inpCls,
  scrollCls,
}: DropProps) {
  const hasFavs = favoriteCoins.length > 0;

  return (
    <SelectContent className={popupCls}>
      <div className={searchBoxCls}>
        {isSearching ? (
          <Spinner className="text-amber-500" />
        ) : (
          <Search className="size-3 text-muted-foreground/60 ml-1" />
        )}
        <input
          id="coin-search-input"
          name="coin_search"
          type="text"
          placeholder="Поиск..."
          value={inpValue}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => setInpValue(e.target.value)}
          className={inpCls}
        />
        {inpValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInpValue("");
              setDebouncedSearch("");
            }}
            className={cn(
              "p-0.5 border-none bg-transparent",
              "text-muted-foreground cursor-pointer",
            )}
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <div className={scrollCls}>
        {hasFavs && (
          <SelectGroup>
            <SelectLabel
              className={cn(
                "text-amber-500 font-black text-[10px]",
                "select-none",
              )}
            >
              ★ ИЗБРАННОЕ
            </SelectLabel>
            {favoriteCoins.map((asset) => (
              <SelectItem
                key={asset.coin}
                value={asset.coin}
                className={cn(
                  "text-xs sm:text-sm flex items-center",
                  "w-full relative pr-9!",
                )}
              >
                <CoinSelectorItem
                  asset={asset}
                  selectedCoin={selectedCoin}
                  onToggleFav={handleToggleFavInMenu}
                />
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {sortedLetters.map((char) => (
          <SelectGroup key={char}>
            <SelectLabel
              className={cn(
                "text-muted-foreground pb-0.5 font-bold",
                "mt-1 text-[10px] border-b border-border/10",
                "select-none",
              )}
            >
              {char}
            </SelectLabel>
            {groupedCoins[char].map((asset) => (
              <SelectItem
                key={asset.coin}
                value={asset.coin}
                className={cn(
                  "text-xs sm:text-sm flex items-center",
                  "w-full relative pr-9!",
                )}
              >
                <CoinSelectorItem
                  asset={asset}
                  selectedCoin={selectedCoin}
                  onToggleFav={handleToggleFavInMenu}
                />
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </div>
    </SelectContent>
  );
}
