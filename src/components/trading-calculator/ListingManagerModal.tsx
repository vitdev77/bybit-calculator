"use client";
import React, { useEffect, useState, useRef } from "react";
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
  tickerRegistry: Record<string, { price24hPcnt: number; turnover24h: number }>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  handleToggleActive: (coin: string) => void;
  handleSetActiveStatus: (
    coinName: string,
    targetStatus: boolean,
    currentStatus: boolean,
  ) => Promise<void>;
  onCoinSelect?: (coin: string) => void;
  selectedCoin: string;
}

export default function ListingManagerModal({
  isModalOpen,
  setIsModalOpen,
  setAvailableCoinsList,
  onCoinSelect,
  selectedCoin,
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
            if (Array.isArray(data.coins)) setFullCoinsList(data.coins);
            if (data.tickerRegistry) setLocalRegistry(data.tickerRegistry);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isModalOpen]);

  useEffect(() => {
    setVisibleCount(50);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
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

  const processDistribution = () => {
    const liqRows: DBAssetCoin[] = [];
    const midRows: DBAssetCoin[] = [];
    const riskRows: DBAssetCoin[] = [];
    const delisRows: DBAssetCoin[] = [];
    const allRows: DBAssetCoin[] = [];

    fullCoinsList.forEach((asset) => {
      const match = asset.coin
        .toLowerCase()
        .includes(modalSearch.toLowerCase());
      if (!match) return;

      allRows.push(asset);

      if (asset.is_delisted) {
        delisRows.push(asset);
        return;
      }

      const live = localRegistry[asset.coin] || { turnover24h: 0 };
      const isMem =
        asset.coin.includes("DOGE") ||
        asset.coin.includes("SHIB") ||
        asset.coin.includes("PEPE") ||
        asset.coin.includes("BONK");
      const isLiq = live.turnover24h >= 50000000;
      const isRisk = !isLiq && (isMem || live.turnover24h < 10000000);

      if (isLiq) liqRows.push(asset);
      else if (isRisk) riskRows.push(asset);
      else midRows.push(asset);
    });

    let filtered = allRows;
    if (filterType === "LIQ") filtered = liqRows;
    else if (filterType === "MID") filtered = midRows;
    else if (filterType === "RISK") filtered = riskRows;
    else if (filterType === "DELIS") filtered = delisRows;

    return { liqRows, midRows, riskRows, delisRows, allRows, filtered };
  };

  const {
    liqRows,
    midRows,
    riskRows,
    delisRows,
    allRows,
    filtered: filteredCoins,
  } = processDistribution();

  const renderedCoins = filteredCoins.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 45) {
      if (visibleCount < filteredCoins.length && !isIncrementalLoading) {
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
          "w-[calc(100%-1rem)] max-w-sm sm:max-w-md md:max-w-2xl!",
          "p-4 rounded-2xl text-xs border border-border/40",
          "bg-background/90 backdrop-blur-md shadow-2xl",
          "mx-auto my-auto fixed left-1/2 top-1/2 -translate-x-1/2",
          "-translate-y-1/2 max-h-[calc(100dvh-2rem)] flex flex-col",
        )}
      >
        <AlertDialogHeader
          className={cn(
            "flex flex-row gap-2 items-center border-b justify-between",
            "pb-2 shrink-0",
          )}
        >
          <AlertDialogTitle className="text-sm font-black uppercase tracking-wider">
            Листинг пар Bybit
          </AlertDialogTitle>
          <AlertDialogCancel
            className={cn(
              "p-1 h-auto w-auto bg-transparent border-none text-muted-foreground",
              "hover:text-foreground shadow-none rounded-md flex items-center",
              "justify-end cursor-pointer sm:self-start",
            )}
          >
            <X className="size-4" />
          </AlertDialogCancel>
        </AlertDialogHeader>

        <div
          className={cn(
            "my-3 flex flex-col md:flex-row md:items-center justify-between gap-3",
            "shrink-0",
          )}
        >
          <div className="relative w-full md:w-64 flex items-center group shrink-0">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Поиск..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs bg-muted/20 w-full rounded-lg border-border/40"
            />
            {modalSearch.length > 0 && (
              <button
                onClick={() => setModalSearch("")}
                className="absolute right-2.5 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div
            className={cn(
              "grid grid-cols-5 gap-1 w-full bg-background border border-input",
              "p-0.5 rounded-lg overflow-hidden flex-1",
              "*:h-7 *:text-[10px] *:font-black *:rounded-md *:flex-1",
            )}
          >
            <Button
              type="button"
              variant={filterType === "ALL" ? "default" : "ghost"}
              onClick={() => setFilterType("ALL")}
            >
              <span className="md:hidden flex items-center gap-0.5">
                <Coins className="size-3" />({allRows.length})
              </span>
              <span className="hidden md:inline">Все ({allRows.length})</span>
            </Button>
            <Button
              type="button"
              variant={filterType === "LIQ" ? "default" : "ghost"}
              className="text-emerald-500"
              onClick={() => setFilterType("LIQ")}
            >
              <span className="md:hidden flex items-center gap-0.5">
                <Zap className="size-3" />({liqRows.length})
              </span>
              <span className="hidden md:inline">LIQ ({liqRows.length})</span>
            </Button>
            <Button
              type="button"
              variant={filterType === "MID" ? "default" : "ghost"}
              className="text-blue-500"
              onClick={() => setFilterType("MID")}
            >
              <span className="md:hidden flex items-center gap-0.5">
                <Activity className="size-3" />({midRows.length})
              </span>
              <span className="hidden md:inline">MID ({midRows.length})</span>
            </Button>
            <Button
              type="button"
              variant={filterType === "RISK" ? "default" : "ghost"}
              className="text-amber-500"
              onClick={() => setFilterType("RISK")}
            >
              <span className="md:hidden flex items-center gap-0.5">
                <AlertTriangle className="size-3" />({riskRows.length})
              </span>
              <span className="hidden md:inline">RISK ({riskRows.length})</span>
            </Button>
            <Button
              type="button"
              variant={filterType === "DELIS" ? "default" : "ghost"}
              className="text-rose-500"
              onClick={() => setFilterType("DELIS")}
            >
              <span className="md:hidden flex items-center gap-0.5">
                <Flame className="size-3" />({delisRows.length})
              </span>
              <span className="hidden md:inline">DEL ({delisRows.length})</span>
            </Button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin touch-pan-y"
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
                isActiveCoin={item.coin === selectedCoin}
              />
            ))
          )}
          {isIncrementalLoading && (
            <div className="flex p-3 gap-2 items-center justify-center text-muted-foreground text-[11px]">
              <Spinner className="text-amber-500 size-3" />
              <span>Подгрузка монет...</span>
            </div>
          )}
          {!isLoading && filteredCoins.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              Ничего не найдено
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
