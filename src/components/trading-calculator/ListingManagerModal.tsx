"use client";

import React, { useState } from "react";
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
    coin: string,
    target: boolean,
    current: boolean,
  ) => void;
}

export default function ListingManagerModal({
  availableCoinsList,
  tickerRegistry,
  isModalOpen,
  setIsModalOpen,
  handleSetActiveStatus,
}: ListingManagerModalProps) {
  const [modalSearch, setModalSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LIQ" | "RISK">("ALL");

  function formatModalCompact(num: number): string {
    if (!num) return "--";
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(0)}K`;
    }
    return num.toFixed(0);
  }
  // Предварительный расчет общего числа категорий, включая делистинг
  let totalLiqCount = 0;
  let totalRiskCount = 0;
  let totalDelistedCount = 0; // ДОБАВЛЕНО: Счетчик делистинга

  availableCoinsList.forEach((asset) => {
    if (asset.is_delisted) {
      totalDelistedCount++;
      return; // Делистинговые монеты исключаем из остальных категорий
    }

    const liveStats = tickerRegistry[asset.coin] || { turnover24h: 0 };
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

  // Фильтрация списка для отображения
  const sortedAndFilteredCoins = availableCoinsList.filter((asset) => {
    const matchesSearch = asset.coin
      .toLowerCase()
      .includes(modalSearch.toLowerCase());
    if (!matchesSearch) return false;

    const liveStats = tickerRegistry[asset.coin] || { turnover24h: 0 };
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
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {isModalOpen && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          [data-slot="alert-dialog-overlay"], .fixed.inset-0.bg-black\\/10 {
            backdrop-filter: none !important; 
            -webkit-backdrop-filter: none !important;
          }
          [data-slot="toast-viewport"], [data-slot="toast-portal"] {
            z-index: 99999 !important; 
            position: fixed !important;
          }
        `,
          }}
        />
      )}

      <AlertDialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "p-1 text-muted-foreground/30 hover:text-foreground/70",
              "bg-transparent border-none cursor-pointer rounded",
              "transition-colors opacity-0 group-hover/select:opacity-100",
              "focus:opacity-100",
            )}
            title="Настройка видимости пар"
          >
            <Settings className="size-3.5" />
          </button>
        }
      />
      <AlertDialogContent
        className={cn(
          "max-w-2xl! w-full rounded-2xl p-4 bg-popover",
          "border border-border/40 text-xs shadow-2xl",
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
              Менеджер листинга пар Bybit
            </AlertDialogTitle>

            {/* ФИКС: Четыре информационных счетчика в заголовке */}
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
            const liveStats = tickerRegistry[item.coin] || {
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
                <div className="col-span-5 flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground/40 min-w-6">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-foreground text-xs leading-none truncate">
                      {item.coin}
                    </span>

                    {isHighRisk && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-center shrink-0"
                        title="Низкая суточная ликвидность или мем-коин"
                      >
                        <AlertTriangle className="size-2 shrink-0" />
                        RISK
                      </span>
                    )}

                    {isHighLiq && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-center shrink-0"
                        title="Высоколиквидная пара (объем > \$100M в сутки)"
                      >
                        <ShieldCheck className="size-2 shrink-0" />
                        LIQ
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground/40 mt-1 pl-6 truncate">
                    Точность: {item.decimals} знаков
                  </span>
                </div>

                <div className="col-span-4 hidden sm:flex flex-row items-center gap-4 select-none min-w-0">
                  {!item.is_delisted ? (
                    <>
                      <div className="flex items-center gap-1 min-w-14 shrink-0">
                        <Activity className="size-3 text-muted-foreground/30" />
                        <span
                          className={cn(
                            "font-bold text-[10px]",
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
                      </div>
                      <div className="flex flex-col min-w-0 truncate">
                        <span className="text-[8px] text-muted-foreground/40 uppercase leading-none">
                          Vol 24h
                        </span>
                        <span className="text-[10px] font-semibold text-foreground/80 mt-1 truncate">
                          {"USD " + formatModalCompact(liveStats.turnover24h)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <div className="col-span-4 sm:hidden" />

                <div className="col-span-3 flex justify-end select-none">
                  {item.is_delisted ? (
                    <span className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md whitespace-nowrap">
                      DELISTED
                    </span>
                  ) : (
                    <ButtonGroup className="h-7 border border-border/50 rounded-lg overflow-hidden bg-muted/20 w-fit shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetActiveStatus(item.coin, true, item.is_active)
                        }
                        className={cn(
                          "h-full px-3 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-r border-border/40 whitespace-nowrap",
                          item.is_active
                            ? "bg-emerald-500 text-white font-black shadow-sm"
                            : "bg-transparent text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground/70",
                        )}
                      >
                        Активна
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSetActiveStatus(
                            item.coin,
                            false,
                            item.is_active,
                          )
                        }
                        className={cn(
                          "h-full px-3 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                          !item.is_active
                            ? "bg-zinc-500 dark:bg-zinc-600 text-white font-black shadow-sm"
                            : "bg-transparent text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground/70",
                        )}
                      >
                        Неактивна
                      </button>
                    </ButtonGroup>
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
  );
}
