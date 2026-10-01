"use client";
import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import TradingCalculator from "@/components/trading-calculator/TradingCalculator";
import TradingViewChart from "@/components/trading-calculator/TradingViewChart";
import TradingJournal from "@/components/trading-calculator/TradingJournal";
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

  const [isCalcExpanded, setIsCalcExpanded] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isJournalExpanded, setIsJournalExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
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
      isCalcExpanded,
      isChartExpanded,
      isJournalExpanded,
    };
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layoutState));

    const updateAttr = (attr: string, cond: boolean) => {
      if (cond) {
        document.documentElement.removeAttribute(attr);
      } else {
        document.documentElement.setAttribute(attr, "true");
      }
    };
    updateAttr("data-hide-calc", isCalcExpanded);
    updateAttr("data-hide-chart", isChartExpanded);
    updateAttr("data-hide-journal", isJournalExpanded);
  }, [isCalcExpanded, isChartExpanded, isJournalExpanded, isMounted]);

  const handleDealsCountChange = (summary: DealsCount) => {
    setOpenCount(summary.open || 0);
    setClosedCount(summary.closed || 0);
  };
  // Липкая шапка в самом верху страницы
  const headClass = cn(
    "sticky top-0 z-50 w-full px-4 sm:px-6",
    "bg-background/60 backdrop-blur-xl",
    "border-b border-white/5 shadow-xs py-3",
    "mb-4 select-none flex items-center",
    "justify-between gap-4",
  );

  const badgeClass = cn(
    "inline-flex items-center gap-1.5",
    "bg-neutral-500/10 border px-2 py-0.5",
    "border-border/40 rounded-md font-mono",
    "text-[10px] sm:text-xs text-foreground/90",
  );

  return (
    <main className="min-h-screen pt-0 pb-6 max-w-[2000px] mx-auto px-2 sm:px-6">
      <div className={headClass}>
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
        <div className="flex items-center shrink-0">
          <ModeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* ФИКС: Свойство xl:sticky полностью удалено. Колонка стоит в статичном естественном потоке */}
        <div className="xl:col-span-5 order-first xl:order-last w-full">
          <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all">
            <div
              onClick={() => setIsCalcExpanded(!isCalcExpanded)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Калькулятор Позиций
                </h2>
              </div>
              <div className="text-muted-foreground">
                {isCalcExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "calc-container-grid grid transition-all duration-300 ease-in-out overflow-hidden",
                isCalcExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 w-full">
                <TradingCalculator
                  selectedCoin={selectedCoin}
                  setSelectedCoin={setSelectedCoin}
                  onBalanceChange={setCurrentBalance}
                  onPriceUpdate={setCurrentCoinPrice}
                  externalPartsCount={partsCount}
                  setExternalPartsCount={setPartsCount}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 grid grid-cols-1 gap-6 min-w-0">
          <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all">
            <div
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Интерактивный Живой График
                </h2>
              </div>
              <div className="text-muted-foreground">
                {isChartExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "chart-container-grid grid transition-all duration-300 ease-in-out overflow-hidden",
                isChartExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 w-full">
                <TradingViewChart coin={selectedCoin} />
              </div>
            </div>
          </div>

          <div className="border border-border/40 bg-background rounded-2xl p-1 transition-all">
            <div
              onClick={() => setIsJournalExpanded(!isJournalExpanded)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
            >
              <div className="flex flex-col min-w-0 pr-2 flex-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Журнал сделок
                </h2>
              </div>
              <div className="text-muted-foreground">
                {isJournalExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "journal-container-grid grid transition-all duration-300 ease-in-out overflow-hidden",
                isJournalExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 w-full">
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
  );
}
