"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "cn";
import { DBAssetCoin } from "./TradingCalculator";

interface ListingManagerModalProps {
  availableCoinsList: DBAssetCoin[];
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
}

export default function ListingManagerModal({
  isModalOpen,
  setIsModalOpen,
}: ListingManagerModalProps) {
  const [modalSearch, setModalSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "LIQ" | "RISK" | "DELIS"
  >("ALL");
  const [fullCoinsList, setFullCoinsList] = useState<DBAssetCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<
    Record<string, { price24hPcnt: number; turnover24h: number }>
  >({});

  useEffect(() => {
    if (isModalOpen) {
      setIsLoading(true);
      fetch("/api/coins?all=true")
        .then((res) => {
          if (!res.ok) throw new Error("API Error");
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (Array.isArray(data.coins)) setFullCoinsList(data.coins);
            if (data.tickerRegistry) setLocalRegistry(data.tickerRegistry);
          }
        })
        .catch((err) => console.error("Ошибка листинга:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isModalOpen]);

  function formatModalCompact(num: number): string {
    if (!num) return "--";
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
  }
  let totalLiqCount = 0;
  let totalRiskCount = 0;
  let totalDelistedCount = 0;

  fullCoinsList.forEach((asset) => {
    if (asset.is_delisted) {
      totalDelistedCount++;
      return;
    }
    const liveStats = localRegistry[asset.coin] || { turnover24h: 0 };
    const isMemCoin =
      asset.coin.includes("DOGE") ||
      asset.coin.includes("SHIB") ||
      asset.coin.includes("PEPE") ||
      asset.coin.includes("BONK");

    const isHighRisk =
      isMemCoin ||
      asset.decimals >= 4 ||
      (liveStats.turnover24h > 0 && liveStats.turnover24h < 10000000);

    const isHighLiq = liveStats.turnover24h >= 100000000;

    if (isHighLiq) totalLiqCount++;
    if (isHighRisk) totalRiskCount++;
  });

  const sortedAndFilteredCoins = fullCoinsList.filter((asset) => {
    const matchesSearch = asset.coin
      .toLowerCase()
      .includes(modalSearch.toLowerCase());
    if (!matchesSearch) return false;

    const liveStats = localRegistry[asset.coin] || { turnover24h: 0 };
    const isMemCoin =
      asset.coin.includes("DOGE") ||
      asset.coin.includes("SHIB") ||
      asset.coin.includes("PEPE") ||
      asset.coin.includes("BONK");

    const isHighRisk =
      !asset.is_delisted &&
      (isMemCoin ||
        asset.decimals >= 4 ||
        (liveStats.turnover24h > 0 && liveStats.turnover24h < 10000000));

    const isHighLiq = !asset.is_delisted && liveStats.turnover24h >= 100000000;

    const isDelisted = asset.is_delisted;

    if (filterType === "LIQ") return isHighLiq;
    if (filterType === "RISK") return isHighRisk;
    if (filterType === "DELIS") return isDelisted;
    return true;
  });

  const totalCoinsCount = fullCoinsList.length;
  return (
    <>
      {isModalOpen && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              [data-slot="alert-dialog-overlay"], 
              .fixed.inset-0.bg-black\\/10 {
                z-index: 40 !important;
              }
              [data-slot="alert-dialog-content"] {
                z-index: 45 !important;
              }
            `,
          }}
        />
      )}

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent
          className={cn(
            "max-w-2xl! w-full rounded-2xl p-4 bg-popover/80",
            "border border-border/40 text-xs shadow-2xl",
            "backdrop-blur-md bg-background/90",
          )}
        >
          <AlertDialogHeader className="flex flex-row items-center justify-between border-b pb-2 select-none gap-2">
            <AlertDialogTitle className="text-sm font-black uppercase tracking-wider">
              Листинг пар Bybit
            </AlertDialogTitle>
            <AlertDialogCancel
              className={cn(
                "p-1 h-auto w-auto bg-transparent border-none sm:self-start",
                "text-muted-foreground hover:text-foreground rounded-md shadow-none",
                "cursor-pointer flex items-center justify-end",
              )}
            >
              <X className="size-4" />
            </AlertDialogCancel>
          </AlertDialogHeader>

          <div className="my-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1 flex items-center group/input">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              <Input
                type="text"
                placeholder="Поиск пары..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs bg-muted/20 border-border/40 rounded-lg w-full"
              />
              {modalSearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalSearch("")}
                  className="absolute right-2.5 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0 cursor-pointer flex items-center justify-center"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <ButtonGroup className="h-8 border border-border/40 rounded-lg overflow-hidden p-0.5 bg-muted/20 shrink-0">
              <Button
                type="button"
                variant={filterType === "ALL" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                onClick={() => setFilterType("ALL")}
              >
                Все ({totalCoinsCount || "0"})
              </Button>
              <Button
                type="button"
                variant={filterType === "LIQ" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                onClick={() => setFilterType("LIQ")}
              >
                Ликвидные ({totalLiqCount || "0"})
              </Button>
              <Button
                type="button"
                variant={filterType === "RISK" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                onClick={() => setFilterType("RISK")}
              >
                Волатильные ({totalRiskCount || "0"})
              </Button>
              <Button
                type="button"
                variant={filterType === "DELIS" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-rose-500 hover:text-rose-600"
                onClick={() => setFilterType("DELIS")}
              >
                Делистинг ({totalDelistedCount || "0"})
              </Button>
            </ButtonGroup>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-amber-500" />
                <span>Загрузка листинга...</span>
              </div>
            ) : (
              sortedAndFilteredCoins.map((item, idx) => {
                const liveStats = localRegistry[item.coin] || {
                  price24hPcnt: 0,
                  turnover24h: 0,
                };
                const isUp = liveStats.price24hPcnt > 0;
                const isDown = liveStats.price24hPcnt < 0;
                const isMemCoin =
                  item.coin.includes("DOGE") ||
                  item.coin.includes("SHIB") ||
                  item.coin.includes("PEPE") ||
                  item.coin.includes("BONK");
                const isHighRisk =
                  !item.is_delisted &&
                  (isMemCoin ||
                    item.decimals >= 4 ||
                    (liveStats.turnover24h > 0 &&
                      liveStats.turnover24h < 10000000));
                const isHighLiq =
                  !item.is_delisted && liveStats.turnover24h >= 100000000;

                return (
                  <div
                    key={`manage-${item.coin}`}
                    className={cn(
                      "grid grid-cols-12 items-center p-2 rounded-xl border bg-background/50 gap-2",
                      item.is_delisted
                        ? "border-rose-500/10 opacity-56 bg-rose-500/2"
                        : "border-border/30",
                    )}
                  >
                    <div className="col-span-8 flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="text-[10px] font-bold text-muted-foreground/40 min-w-6">
                          {idx + 1}.
                        </span>
                        <span className="font-bold text-foreground text-xs leading-none truncate">
                          {item.coin}
                        </span>
                        {isHighRisk && (
                          <span className="flex items-center px-1 py-0.5 font-black tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-center shrink-0">
                            RISK
                          </span>
                        )}
                        {isHighLiq && (
                          <span className="flex items-center px-1 py-0.5 font-black tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-center shrink-0">
                            LIQ
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground/40 mt-1 pl-7 truncate">
                        Знаков после запятой:{" "}
                        <span className="font-bold text-muted-foreground/80">
                          {item.decimals}
                        </span>
                      </span>
                    </div>
                    <div className="col-span-4 flex flex-col items-end justify-center text-right min-w-0">
                      {!item.is_delisted ? (
                        <div className="flex flex-col items-end min-w-0">
                          <span
                            className={cn(
                              "font-bold leading-none",
                              isUp
                                ? "text-emerald-500"
                                : isDown
                                  ? "text-rose-500"
                                  : "text-muted-foreground/60",
                            )}
                          >
                            {isUp ? "+" : ""}
                            {liveStats.price24hPcnt !== 0
                              ? `${liveStats.price24hPcnt.toFixed(2)}%`
                              : "0.00%"}
                          </span>
                          <span className="text-[9px] font-semibold text-muted-foreground/50 mt-1 truncate">
                            {formatModalCompact(liveStats.turnover24h)}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded">
                          DELISTED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {!isLoading && sortedAndFilteredCoins.length === 0 && (
              <div className="text-center p-4 text-muted-foreground font-medium">
                Ничего не найдено
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
