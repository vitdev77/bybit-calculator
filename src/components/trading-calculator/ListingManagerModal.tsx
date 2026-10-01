"use client";

import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { cn } from "cn";
import { DBAssetCoin } from "./TradingCalculator";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { CoinListingRow } from "./CoinListingRow";
interface ListingModalProps {
  availableCoinsList: DBAssetCoin[];
  setAvailableCoinsList?: React.Dispatch<React.SetStateAction<DBAssetCoin[]>>;
  tickerRegistry: Record<
    string,
    {
      price24hPcnt: number;
      turnover24h: number;
    }
  >;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  handleToggleActive: (coin: string) => void;
  handleSetActiveStatus: (
    coinName: string,
    targetStatus: boolean,
    currentStatus: boolean,
  ) => Promise<void>;
  onCoinSelect?: (coin: string) => void;
}

export default function ListingModal({
  isModalOpen,
  setIsModalOpen,
  setAvailableCoinsList,
  onCoinSelect,
}: ListingModalProps) {
  const [modalSearch, setModalSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "LIQ" | "RISK" | "DELIS"
  >("ALL");
  const [fullCoinsList, setFullCoinsList] = useState<DBAssetCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<
    Record<
      string,
      {
        price24hPcnt: number;
        turnover24h: number;
      }
    >
  >({});
  const [favLoadingMap, setFavLoadingMap] = useState<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    if (isModalOpen) {
      setIsLoading(true);
      fetch("/api/coins?all=true")
        .then((res) => {
          if (!res.ok) {
            throw new Error("API Err");
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (Array.isArray(data.coins)) {
              setFullCoinsList(data.coins);
            }
            if (data.tickerRegistry) {
              setLocalRegistry(data.tickerRegistry);
            }
          }
        })
        .catch((err) => console.error("Ошибка листинга:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isModalOpen]);

  const handleSelectCoinRow = (coinName: string, isDelisted: boolean) => {
    if (isDelisted) return;
    if (onCoinSelect) {
      onCoinSelect(coinName);
      setIsModalOpen(false);
      toast.add({
        title: "Пара переключена",
        description: "Выбрана пара " + coinName,
        type: "success",
      });
    }
  };

  const handleToggleFav = async (
    e: React.MouseEvent,
    coinName: string,
    currentFav: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoadingMap[coinName]) {
      return;
    }

    setFavLoadingMap((prev) => ({
      ...prev,
      [coinName]: true,
    }));
    const nextState = !currentFav;

    setFullCoinsList((prev) =>
      prev.map((c) =>
        c.coin === coinName
          ? {
              ...c,
              is_favorite: nextState,
            }
          : c,
      ),
    );

    try {
      const response = await fetch("/api/coins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "TOGGLE_FAVORITE",
          coin: coinName,
        }),
      });

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: {
              coin: coinName,
              is_favorite: nextState,
            },
          }),
        );
        if (setAvailableCoinsList) {
          setAvailableCoinsList((prev) =>
            prev.map((c) =>
              c.coin === coinName
                ? {
                    ...c,
                    is_favorite: nextState,
                  }
                : c,
            ),
          );
        }
      }
    } catch (err) {
      console.error("Ошибка избранного:", err);
    } finally {
      setFavLoadingMap((prev) => ({
        ...prev,
        [coinName]: false,
      }));
    }
  };
  let totalLiqCount = 0;
  let totalRiskCount = 0;
  let totalDelistedCount = 0;

  fullCoinsList.forEach((asset) => {
    if (asset.is_delisted) {
      totalDelistedCount++;
      return;
    }
    const liveStats = localRegistry[asset.coin] || { turnover24h: 0 };
    const isMem =
      asset.coin.includes("DOGE") ||
      asset.coin.includes("SHIB") ||
      asset.coin.includes("PEPE") ||
      asset.coin.includes("BONK");

    const isRisk =
      isMem ||
      asset.decimals >= 4 ||
      (liveStats.turnover24h > 0 && liveStats.turnover24h < 10000000);

    if (liveStats.turnover24h >= 100000000) {
      totalLiqCount++;
    }
    if (isRisk) {
      totalRiskCount++;
    }
  });

  const sortedAndFilteredCoins = fullCoinsList.filter((asset) => {
    const match = asset.coin.toLowerCase().includes(modalSearch.toLowerCase());
    if (!match) return false;

    const live = localRegistry[asset.coin] || { turnover24h: 0 };
    const isMem =
      asset.coin.includes("DOGE") ||
      asset.coin.includes("SHIB") ||
      asset.coin.includes("PEPE") ||
      asset.coin.includes("BONK");

    const isRisk =
      !asset.is_delisted &&
      (isMem ||
        asset.decimals >= 4 ||
        (live.turnover24h > 0 && live.turnover24h < 10000000));

    const isLiq = !asset.is_delisted && live.turnover24h >= 100000000;

    if (filterType === "LIQ") {
      return isLiq;
    }
    if (filterType === "RISK") {
      return isRisk;
    }
    if (filterType === "DELIS") {
      return asset.is_delisted;
    }
    return true;
  });

  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <AlertDialogContent
        className={cn(
          "max-w-2xl! w-full p-4",
          "rounded-2xl text-xs",
          "border border-border/40",
          "bg-background/90",
          "backdrop-blur-md shadow-2xl",
        )}
      >
        <AlertDialogHeader
          className={cn(
            "flex flex-row gap-2",
            "items-center border-b",
            "justify-between pb-2",
          )}
        >
          <AlertDialogTitle
            className={cn("text-sm font-black", "uppercase tracking-wider")}
          >
            Листинг пар Bybit
          </AlertDialogTitle>
          <AlertDialogCancel
            className={cn(
              "p-1 h-auto w-auto",
              "bg-transparent border-none",
              "text-muted-foreground",
              "hover:text-foreground",
              "shadow-none rounded-md",
              "flex items-center",
              "justify-end cursor-pointer",
              "sm:self-start",
            )}
          >
            <X className="size-4" />
          </AlertDialogCancel>
        </AlertDialogHeader>

        <div
          className={cn(
            "my-3 flex flex-col",
            "sm:flex-row gap-2.5",
            "items-stretch",
            "sm:items-center",
          )}
        >
          <div className={cn("relative flex-1 flex", "items-center")}>
            <Search
              className={cn(
                "absolute left-2.5",
                "h-3.5 w-3.5",
                "text-muted-",
                "foreground/60",
              )}
            />
            <Input
              type="text"
              placeholder="Поиск..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className={cn(
                "pl-8 pr-8 h-8 text-xs",
                "bg-muted/20 w-full",
                "border-border/40 rounded-lg",
              )}
            />
          </div>
          <ButtonGroup
            className={cn(
              "h-8 border p-0.5",
              "border-border/40",
              "rounded-lg bg-muted/20",
              "shrink-0 overflow-hidden",
            )}
          >
            <Button
              type="button"
              variant={filterType === "ALL" ? "default" : "ghost"}
              className={cn(
                "h-full px-2 text-[10px]",
                "font-bold uppercase",
                "rounded-md",
              )}
              onClick={() => setFilterType("ALL")}
            >
              Все ({fullCoinsList.length})
            </Button>
            <Button
              type="button"
              variant={filterType === "LIQ" ? "default" : "ghost"}
              className={cn(
                "h-full px-2 text-[10px]",
                "font-bold uppercase",
                "rounded-md",
              )}
              onClick={() => setFilterType("LIQ")}
            >
              Ликвид. ({totalLiqCount})
            </Button>
            <Button
              type="button"
              variant={filterType === "RISK" ? "default" : "ghost"}
              className={cn(
                "h-full px-2 text-[10px]",
                "font-bold uppercase",
                "rounded-md",
              )}
              onClick={() => setFilterType("RISK")}
            >
              Волат. ({totalRiskCount})
            </Button>
            <Button
              type="button"
              variant={filterType === "DELIS" ? "default" : "ghost"}
              className={cn(
                "h-full px-2 text-[10px]",
                "font-bold uppercase",
                "text-rose-500 rounded-md",
                "hover:text-rose-600",
              )}
              onClick={() => setFilterType("DELIS")}
            >
              Делист ({totalDelistedCount})
            </Button>
          </ButtonGroup>
        </div>

        <div
          className={cn(
            "max-h-64 pr-1",
            "overflow-y-auto",
            "space-y-1.5 scrollbar-thin",
          )}
        >
          {isLoading ? (
            <div
              className={cn(
                "flex p-8 gap-2",
                "items-center",
                "justify-center",
                "text-muted-",
                "foreground",
              )}
            >
              <Spinner className="text-amber-500" />
              <span>Загрузка...</span>
            </div>
          ) : (
            sortedAndFilteredCoins.map((item, idx) => (
              <CoinListingRow
                key={item.coin}
                item={item}
                idx={idx}
                liveStats={
                  localRegistry[item.coin] || {
                    price24hPcnt: 0,
                    turnover24h: 0,
                  }
                }
                favLoading={!!favLoadingMap[item.coin]}
                onSelect={handleSelectCoinRow}
                onToggleFav={handleToggleFav}
              />
            ))
          )}
          {!isLoading && sortedAndFilteredCoins.length === 0 && (
            <div className={cn("text-center p-4", "text-muted-foreground")}>
              Ничего не найдено
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
