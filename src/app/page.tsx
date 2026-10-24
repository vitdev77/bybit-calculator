"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronUpIcon, DatabaseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import TradingCalculator from "@/components/trading-calculator/TradingCalculatorWS";
import TradingViewChart from "@/components/trading-calculator/TradingViewChart";
import TradingJournal from "@/components/trading-calculator/TradingJournal";
import MarketSessionsRadar from "@/components/trading-calculator/MarketSessionsRadar";
import { ModeToggle } from "@/components/ModeToggle";

const STORAGE_KEY_LAYOUT = "bybit_calculator_layout_v1";

interface DealsCount {
  open: number;
  closed: number;
}

export default function Home() {
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");
  const [currentBalance, setCurrentBalance] = useState(100);
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [currentCoinPrice, setCurrentCoinPrice] = useState(0);
  const [partsCount, setPartsCount] = useState(5);
  const [isDbSyncing, setIsDbSyncing] = useState(false);

  const [isRadarExpanded, setIsRadarExpanded] = useState(true);
  const [isCalcExpanded, setIsCalcExpanded] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isJournalExpanded, setIsJournalExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const handleSyncStatusChange = useCallback((status: boolean) => {
    setIsDbSyncing((prev) => (prev !== status ? status : prev));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.isRadarExpanded !== undefined) {
            setIsRadarExpanded(parsed.isRadarExpanded);
          }
          if (parsed.isCalcExpanded !== undefined) {
            setIsCalcExpanded(parsed.isCalcExpanded);
          }
          if (parsed.isChartExpanded !== undefined) {
            setIsChartExpanded(parsed.isChartExpanded);
          }
          if (parsed.isJournalExpanded !== undefined) {
            setIsJournalExpanded(parsed.isJournalExpanded);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const layoutState = {
      isRadarExpanded,
      isCalcExpanded,
      isChartExpanded,
      isJournalExpanded,
    };
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layoutState));
  }, [
    isRadarExpanded,
    isCalcExpanded,
    isChartExpanded,
    isJournalExpanded,
    isMounted,
  ]);

  const handleDealsCountChange = (summary: DealsCount) => {
    setOpenCount(summary.open || 0);
    setClosedCount(summary.closed || 0);
  };

  const badgeClass = cn(
    "inline-flex items-center gap-1.5 bg-neutral-500/10 border px-2 py-0.5",
    "border-border/40 rounded-md text-[10px] sm:text-xs text-foreground/90",
  );
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {isDbSyncing && (
        <div
          className={cn(
            "fixed inset-0 z-9999 flex flex-col items-center justify-center",
            "bg-background/70 backdrop-blur-md pointer-events-auto select-none transition-all duration-300",
          )}
        >
          <div className="size-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="text-base font-black uppercase tracking-widest text-foreground">
            Синхронизация СУБД...
          </span>
          <span className="text-xs text-muted-foreground mt-1.5">
            Платформа заблокирована
          </span>
        </div>
      )}
      <header
        className={cn(
          "sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl",
          "border-b border-white/5 shadow-xs py-3 select-none",
        )}
      >
        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
              Bybit Futures{" "}
              <span className="text-muted-foreground font-normal">
                / Calculator
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <p className={badgeClass}>
                Изолированная маржа 1/{partsCount} •{" "}
                <span className="font-bold text-amber-500">
                  {(currentBalance / partsCount).toFixed(2)}
                </span>{" "}
                USDT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <Link
              href="/admin/db"
              className={cn(
                "inline-flex items-center justify-center h-9 w-9 rounded-md",
                "text-violet-500 transition-all cursor-pointer hover:bg-violet-500/10",
              )}
              title="Открыть проводник СУБД"
            >
              <DatabaseIcon className="h-[1.2rem] w-[1.2rem]" />
            </Link>
            <div className="h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="max-w-[2000px] mx-auto pt-4 pb-6 relative px-2 sm:px-6 w-full flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full overflow-hidden h-auto">
          <div className="xl:col-span-5 order-first xl:order-last w-full h-auto">
            <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all h-auto">
              <div
                onClick={() => setIsCalcExpanded(!isCalcExpanded)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer select-none",
                )}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Калькулятор Позиций
                  </h2>
                </div>
                <div className="text-muted-foreground">
                  <ChevronUpIcon
                    className={cn(
                      "size-4 transition-all duration-300",
                      !isCalcExpanded && "rotate-180",
                    )}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden h-auto min-h-0",
                  isCalcExpanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 w-full overflow-hidden">
                  <TradingCalculator
                    selectedCoin={selectedCoin}
                    setSelectedCoin={setSelectedCoin}
                    onBalanceChange={setCurrentBalance}
                    onPriceUpdate={setCurrentCoinPrice}
                    externalPartsCount={partsCount}
                    setExternalPartsCount={setPartsCount}
                    onSyncStatusChange={handleSyncStatusChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-7 grid grid-cols-1 gap-6 w-full min-w-0 h-auto">
            <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all h-auto">
              <div
                onClick={() => setIsRadarExpanded(!isRadarExpanded)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Мониторинг рыночных сессий и активности
                  </h2>
                </div>
                <div className="text-muted-foreground">
                  <ChevronUpIcon
                    className={cn(
                      "size-4 transition-all duration-300",
                      !isRadarExpanded && "rotate-180",
                    )}
                  />
                </div>
              </div>
              {/* Настроили строгое соответствие: если приложение еще не смонтировано на клиенте, Grid изначально скрыт */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden h-auto min-h-0",
                  isMounted && isRadarExpanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 w-full overflow-hidden">
                  <MarketSessionsRadar />
                </div>
              </div>
            </div>

            <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all h-auto">
              <div
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer select-none",
                )}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Интерактивный Живой График
                  </h2>
                </div>
                <div className="text-muted-foreground">
                  <ChevronUpIcon
                    className={cn(
                      "size-4 transition-all duration-300",
                      !isChartExpanded && "rotate-180",
                    )}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden h-auto min-h-0",
                  isMounted && isChartExpanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 w-full overflow-hidden">
                  <TradingViewChart coin={selectedCoin} />
                </div>
              </div>
            </div>
            <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all h-auto">
              <div
                onClick={() => setIsJournalExpanded(!isJournalExpanded)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer select-none",
                )}
              >
                <div className="flex flex-col min-w-0 pr-2 flex-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Журнал сделок
                  </h2>
                </div>
                <div className="text-muted-foreground">
                  <ChevronUpIcon
                    className={cn(
                      "size-4 transition-all duration-300",
                      !isJournalExpanded && "rotate-180",
                    )}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden h-auto min-h-0",
                  isMounted && isJournalExpanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 w-full overflow-hidden">
                  <TradingJournal
                    onDealsCountChange={handleDealsCountChange}
                    livePrice={currentCoinPrice}
                    activeCoin={selectedCoin}
                    onCoinSelect={setSelectedCoin}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
