"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  X,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Search,
} from "lucide-react";
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
  availableCoinsList,
  isModalOpen,
  setIsModalOpen,
}: ListingManagerModalProps) {
  const [modalSearch, setModalSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LIQ" | "RISK">("ALL");

  // Локальный стейт реестра котировок, защищенный от перезатирания интервалами калькулятора
  const [localRegistry, setLocalRegistry] = useState<
    Record<string, { price24hPcnt: number; turnover24h: number }>
  >({});

  // ВОЗВРАТ К ИСТОКАМ: Принудительно вытягиваем слепок рынка из /api/coins, как это работало изначально!
  useEffect(() => {
    if (isModalOpen) {
      fetch("/api/coins")
        .then((res) => {
          if (!res.ok) throw new Error("API Coins response error");
          return res.json();
        })
        .then((data) => {
          // Если бэкенд отдал сохраненный реестр котировок (слепок) — пишем его в стейт модалки
          if (data && data.tickerRegistry) {
            setLocalRegistry(data.tickerRegistry);
          }
        })
        .catch((err) => {
          console.error("Ошибка при получении слепка котировок из базы:", err);
        });
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

  // Динамический пересчет счетчиков. Теперь ликвидные и волатильные оживут, считывая данные из localRegistry
  availableCoinsList.forEach((asset) => {
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

  const sortedAndFilteredCoins = availableCoinsList.filter((asset) => {
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

    if (filterType === "LIQ") return isHighLiq;
    if (filterType === "RISK") return isHighRisk;

    return true;
  });

  const totalCoinsCount = availableCoinsList.length;

  return (
    <>
      {isModalOpen && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              [data-slot="alert-dialog-overlay"], .fixed.inset-0.bg-black\\/10 {
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
        <AlertDialogTrigger
          render={
            <button
              type="button"
              className={cn(
                "p-0 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer",
                "flex items-center justify-center shrink-0 border border-input rounded-xl",
                "h-9.5 w-9.5 sm:h-9 sm:w-9 transition-colors hover:bg-muted/40 outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
              title="Просмотр статистики пар"
            >
              <Settings className="size-4" />
            </button>
          }
        />
        <AlertDialogContent
          className={cn(
            "max-w-2xl! w-full rounded-2xl p-4 bg-popover/80 border border-border/40 text-xs shadow-2xl",
            "backdrop-blur-md bg-background/90",
          )}
        >
          <AlertDialogHeader
            className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between",
              "border-b pb-2 select-none gap-2",
            )}
          >
            <div className="flex flex-col gap-1">
              <AlertDialogTitle className="text-sm font-black uppercase tracking-wider">
                Справочник листинга пар Bybit
              </AlertDialogTitle>

              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-muted text-muted-foreground border border-border/40">
                  Всего: {totalCoinsCount}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Ликвидные: {totalLiqCount}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Волатильные: {totalRiskCount}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Делистинг: {totalDelistedCount}
                </span>
              </div>
            </div>

            <AlertDialogCancel
              className={cn(
                "p-1 h-auto w-auto bg-transparent border-none sm:self-start",
                "text-muted-foreground hover:text-foreground rounded-md",
                "cursor-pointer shadow-none flex items-center justify-end",
              )}
            >
              <X className="size-4" />
            </AlertDialogCancel>
          </AlertDialogHeader>

          <div className="my-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1 flex items-center group/input">
              <Search
                className={cn(
                  "absolute left-2.5 h-3.5 w-3.5",
                  "text-muted-foreground/60 pointer-events-none",
                )}
              />
              <Input
                type="text"
                placeholder="Быстрый поиск пары по тикеру..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs bg-muted/20 border-border/40 rounded-lg w-full"
              />
              {modalSearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalSearch("")}
                  className={cn(
                    "absolute right-2.5 text-muted-foreground/60",
                    "hover:text-foreground bg-transparent border-none",
                    "p-0 cursor-pointer flex items-center justify-center",
                  )}
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
                Все
              </Button>
              <Button
                type="button"
                variant={filterType === "LIQ" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-emerald-500"
                onClick={() => setFilterType("LIQ")}
              >
                Ликвидные
              </Button>
              <Button
                type="button"
                variant={filterType === "RISK" ? "default" : "ghost"}
                className="h-full px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-amber-500"
                onClick={() => setFilterType("RISK")}
              >
                Волатильные
              </Button>
            </ButtonGroup>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {sortedAndFilteredCoins.map((item, idx) => {
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
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-center shrink-0">
                          <AlertTriangle className="size-2 shrink-0" />
                          RISK
                        </span>
                      )}

                      {isHighLiq && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-center shrink-0">
                          <ShieldCheck className="size-2 shrink-0" />
                          LIQ
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/40 mt-1 pl-6 truncate">
                      Точность: {item.decimals} знаков
                    </span>
                  </div>

                  <div className="col-span-4 flex flex-col items-end justify-center select-none text-right min-w-0">
                    {!item.is_delisted ? (
                      <div className="flex flex-col items-end min-w-0">
                        <span
                          className={cn(
                            "font-bold text-[11px] leading-none",
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
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded">
                        DELISTED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedAndFilteredCoins.length === 0 && (
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
