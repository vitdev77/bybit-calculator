"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Coins,
  Zap,
  Flame,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ListingManagerModalProps {
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

export default function ListingManagerModal({
  isModalOpen,
  setIsModalOpen,
  setAvailableCoinsList,
  onCoinSelect,
  tickerRegistry,
  availableCoinsList,
}: ListingManagerModalProps) {
  const [modalSearch, setModalSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "LIQ" | "MID" | "RISK" | "DELIS"
  >("ALL");
  const [fullCoinsList, setFullCoinsList] = useState<DBAssetCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<Record<string, any>>({});
  const [favLoadingMap, setFavLoadingMap] = useState<Record<string, boolean>>(
    {},
  );

  const [visibleCount, setVisibleCount] = useState(50);
  const [isIncrementalLoading, setIsIncrementalLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isModalOpen) {
      setIsLoading(true);
      setVisibleCount(50);
      fetch("/api/coins?all=true")
        .then((res) => {
          if (!res.ok) throw new Error();
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
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isModalOpen]);

  useEffect(() => {
    setVisibleCount(50);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [modalSearch, filterType]);

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
    if (favLoadingMap[coinName]) return;

    setFavLoadingMap((prev) => ({ ...prev, [coinName]: true }));
    const nextState = !currentFav;

    setFullCoinsList((prev) =>
      prev.map((c) =>
        c.coin === coinName ? { ...c, is_favorite: nextState } : c,
      ),
    );

    try {
      const response = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_FAVORITE", coin: coinName }),
      });

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent("refresh-calculator-coins", {
            detail: { coin: coinName, is_favorite: nextState },
          }),
        );
        if (setAvailableCoinsList) {
          setAvailableCoinsList((prev) =>
            prev.map((c) =>
              c.coin === coinName ? { ...c, is_favorite: nextState } : c,
            ),
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
    setFavLoadingMap((prev) => ({ ...prev, [coinName]: false }));
  };
  let totalLiqCount = 0;
  let totalMidCount = 0;
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

    const isLiq = liveStats.turnover24h >= 50000000;
    const isRisk =
      isMem ||
      asset.decimals >= 4 ||
      (liveStats.turnover24h > 0 && liveStats.turnover24h < 10000000);

    if (isLiq) totalLiqCount++;
    else if (isRisk) totalRiskCount++;
    else totalMidCount++;
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

    const isLiq = !asset.is_delisted && live.turnover24h >= 50000000;
    const isRisk =
      !asset.is_delisted &&
      (isMem ||
        asset.decimals >= 4 ||
        (live.turnover24h > 0 && live.turnover24h < 10000000));
    const isMid = !asset.is_delisted && !isLiq && !isRisk;

    if (filterType === "LIQ") return isLiq;
    if (filterType === "MID") return isMid;
    if (filterType === "RISK") return isRisk;
    if (filterType === "DELIS") return asset.is_delisted;
    return true;
  });

  const renderedCoins = sortedAndFilteredCoins.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 45) {
      if (
        visibleCount < sortedAndFilteredCoins.length &&
        !isIncrementalLoading
      ) {
        setIsIncrementalLoading(true);
        setTimeout(() => {
          setVisibleCount((prev) => prev + 50);
          setIsIncrementalLoading(false);
        }, 250);
      }
    }
  };
  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <AlertDialogContent
        className={cn(
          "w-[calc(100%-0.5rem)] md:max-w-2xl! p-4 rounded-2xl text-xs",
          "border border-border/40 bg-background/90 backdrop-blur-md shadow-2xl",
        )}
      >
        <AlertDialogHeader className="flex flex-row gap-2 items-center border-b justify-between pb-2">
          <AlertDialogTitle className="text-sm font-black uppercase tracking-wider">
            Листинг пар Bybit
          </AlertDialogTitle>
          <AlertDialogCancel
            className={cn(
              "p-1 h-auto w-auto bg-transparent border-none text-muted-foreground",
              "hover:text-foreground shadow-none rounded-md flex items-center justify-end cursor-pointer sm:self-start",
            )}
          >
            <X className="size-4" />
          </AlertDialogCancel>
        </AlertDialogHeader>

        <div className="my-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Поиск..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs bg-muted/20 w-full rounded-lg border-border/40"
            />
          </div>
          <ButtonGroup className="h-8 border p-0.5 border-border/40 rounded-lg bg-muted/20 w-full sm:w-auto overflow-hidden flex items-center">
            <Button
              type="button"
              variant={filterType === "ALL" ? "default" : "ghost"}
              className="h-full px-2 rounded-md"
              onClick={() => setFilterType("ALL")}
            >
              <span className="text-[10px] font-bold uppercase">Все</span>
              <span className="text-[9px] font-semibold opacity-70 ml-0.5">
                ({fullCoinsList.length})
              </span>
            </Button>
            <Button
              type="button"
              variant={filterType === "LIQ" ? "default" : "ghost"}
              className="h-full px-2 rounded-md"
              onClick={() => setFilterType("LIQ")}
            >
              <span className="text-[10px] font-bold uppercase text-emerald-500">
                LIQ
              </span>
              <span className="text-[9px] font-semibold opacity-70 ml-0.5 text-emerald-500">
                ({totalLiqCount})
              </span>
            </Button>
            <Button
              type="button"
              variant={filterType === "MID" ? "default" : "ghost"}
              className="h-full px-2 rounded-md"
              onClick={() => setFilterType("MID")}
            >
              <span className="text-[10px] font-bold uppercase text-blue-500">
                MID
              </span>
              <span className="text-[9px] font-semibold opacity-70 ml-0.5 text-blue-500">
                ({totalMidCount})
              </span>
            </Button>
            <Button
              type="button"
              variant={filterType === "RISK" ? "default" : "ghost"}
              className="h-full px-2 rounded-md"
              onClick={() => setFilterType("RISK")}
            >
              <span className="text-[10px] font-bold uppercase text-amber-500">
                RISK
              </span>
              <span className="text-[9px] font-semibold opacity-70 ml-0.5 text-amber-500">
                ({totalRiskCount})
              </span>
            </Button>
            <Button
              type="button"
              variant={filterType === "DELIS" ? "default" : "ghost"}
              className="h-full px-2 rounded-md"
              onClick={() => setFilterType("DELIS")}
            >
              <span className="text-[10px] font-bold uppercase text-rose-500">
                DEL
              </span>
              <span className="text-[9px] font-semibold text-rose-500/80 ml-0.5">
                ({totalDelistedCount})
              </span>
            </Button>
          </ButtonGroup>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-64 pr-1 overflow-y-auto space-y-1.5 scrollbar-thin touch-pan-y"
        >
          {isLoading ? (
            <div className="flex p-8 gap-2 items-center justify-center text-muted-foreground">
              <Spinner className="text-amber-500" />
              <span>Загрузка листинга...</span>
            </div>
          ) : (
            renderedCoins.map((item, idx) => (
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

          {isIncrementalLoading && (
            <div className="flex p-3 gap-2 items-center justify-center text-muted-foreground text-[11px]">
              <Spinner className="text-amber-500 size-3" />
              <span>Подгрузка монет...</span>
            </div>
          )}

          {!isLoading && sortedAndFilteredCoins.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              Ничего не найдено
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
