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
import {
  Settings,
  X,
  Activity,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
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

interface GroupedCoins {
  [key: string]: DBAssetCoin[];
}

export default function ListingManagerModal({
  availableCoinsList,
  tickerRegistry,
  isModalOpen,
  setIsModalOpen,
  handleSetActiveStatus,
}: ListingManagerModalProps) {
  const [modalSearch, setModalSearch] = useState("");

  function formatModalCompact(num: number): string {
    if (!num) return "--";
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
  }

  const modalFilteredCoins = availableCoinsList.filter((c) =>
    c.coin.toLowerCase().includes(modalSearch.toLowerCase()),
  );

  const modalGroupedCoins: GroupedCoins = {};
  modalFilteredCoins.forEach((asset) => {
    const firstLetter = asset.coin.charAt(0).toUpperCase();
    if (!modalGroupedCoins[firstLetter]) modalGroupedCoins[firstLetter] = [];
    modalGroupedCoins[firstLetter].push(asset);
  });

  const modalSortedLetters = Object.keys(modalGroupedCoins).sort();
  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {isModalOpen && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          [data-slot="alert-dialog-overlay"], .fixed.inset-0.bg-black\\/10 {
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
          }
          [data-slot="toast-viewport"], [data-slot="toast-portal"] {
            z-index: 99999 !important; position: fixed !important;
          }
        `,
          }}
        />
      )}

      <AlertDialogTrigger
        render={
          <button
            type="button"
            className="p-1 text-muted-foreground/30 hover:text-foreground/70 bg-transparent border-none cursor-pointer rounded transition-colors opacity-0 group-hover/select:opacity-100 focus:opacity-100"
            title="Настройка видимости пар"
          >
            <Settings className="size-3.5" />
          </button>
        }
      />
      <AlertDialogContent className="max-w-2xl! w-full rounded-2xl p-4 bg-popover border border-border/40 text-xs shadow-2xl">
        <AlertDialogHeader className="flex flex-row items-center justify-between border-b pb-2 select-none">
          <AlertDialogTitle className="text-sm font-black uppercase tracking-wider">
            Менеджер листинга пар Bybit
          </AlertDialogTitle>
          <AlertDialogCancel className="p-1 h-auto w-auto bg-transparent border-none text-muted-foreground hover:text-foreground rounded-md cursor-pointer shadow-none">
            <X className="size-4" />
          </AlertDialogCancel>
        </AlertDialogHeader>

        <div className="my-2.5 relative flex items-center">
          <input
            type="text"
            placeholder="Быстрый поиск пары по тикеру..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-muted/20 px-2.5 outline-none focus:border-ring text-xs"
          />
        </div>

        <div className="max-h-64 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
          {modalSortedLetters.map((letter) => (
            <div key={`modal-group-${letter}`} className="space-y-1.5">
              <div className="text-[10px] font-black text-muted-foreground/70 border-b border-border/20 pb-0.5 uppercase px-1 tracking-wider">
                {letter}
              </div>
              {modalGroupedCoins[letter].map((item) => {
                const liveStats = tickerRegistry[item.coin] || {
                  price24hPcnt: 0,
                  turnover24h: 0,
                };
                const isUp = liveStats.price24hPcnt > 0;
                const isDown = liveStats.price24hPcnt < 0;

                // ВЫЧИСЛЕНИЕ МАРКЕРОВ:
                // 1. Риск (turnover < \$10M в сутки ИЛИ мем-токены ИЛИ высокая точностьdecimals >= 4)
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

                // 2. Высокая ликвидность (turnover >= \$100M в сутки)
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
                        <span className="font-bold text-foreground text-xs leading-none truncate">
                          {item.coin}
                        </span>

                        {/* ИСПРАВЛЕНО: Вывод бейджа HIGH RISK */}
                        {isHighRisk && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-center shrink-0"
                            title="Низкая суточная ликвидность или мем-коин"
                          >
                            <AlertTriangle className="size-2 shrink-0" />
                            RISK
                          </span>
                        )}

                        {/* ИСПРАВЛЕНО: Вывод бейджа HIGH LIQUIDITY */}
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
                      <span className="text-[9px] text-muted-foreground/40 mt-1 truncate">
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
                              {"USD " +
                                formatModalCompact(liveStats.turnover24h)}
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
                              handleSetActiveStatus(
                                item.coin,
                                true,
                                item.is_active,
                              )
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
            </div>
          ))}
          {modalSortedLetters.length === 0 && (
            <div className="text-center p-4 text-muted-foreground font-medium">
              Ничего не найдено
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
