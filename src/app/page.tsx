"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
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
      const savedLayout = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (savedLayout) {
        try {
          const parsed = JSON.parse(savedLayout);
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
          console.error("Ошибка настроек лейаута:", e);
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

    const updateAttr = (attr: string, condition: boolean) => {
      if (condition) {
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
  return (
    <main className="min-h-screen py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-[2000px] mx-auto px-2 sm:px-6 xl:px-8">
      {/* --- ГЛОБАЛЬНАЯ ШАПКА ПРИЛОЖЕНИЯ --- */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 border-b border-border/20 pb-4 select-none">
        <div className="space-y-1 min-w-0">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
            Bybit Futures{" "}
            <span className="text-muted-foreground font-normal">
              / Calculator
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-normal truncate">
            Изолированная маржа 1/{partsCount} •{" "}
            <span className="font-semibold text-foreground/90">
              {(currentBalance / partsCount).toFixed(2)} USDT
            </span>{" "}
            на позицию
          </p>
        </div>
        <div className="flex justify-end pt-0.5">
          <ModeToggle />
        </div>
      </div>

      {/* --- СЕТКА GRID --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        {/* БЛОК 1: КАЛЬКУЛЯТОР ПОЗИЦИЙ 
            ФИКС: Фон изменен на bg-background для идеального слияния */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 order-first xl:order-last">
          <div className="border border-border/40 bg-background rounded-2xl sm:rounded-[2rem] p-1 sm:p-2 transition-all duration-300">
            <div
              onClick={() => setIsCalcExpanded(!isCalcExpanded)}
              className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors truncate">
                  Калькулятор Позиций
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground/70 truncate">
                  Расчёт маржи, рисков и параметров ордера
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl text-muted-foreground shrink-0">
                {isCalcExpanded ? (
                  <ChevronUp className="size-3.5 sm:size-4" />
                ) : (
                  <ChevronDown className="size-3.5 sm:size-4" />
                )}
              </div>
            </div>

            <div
              className={`calc-container-grid grid transition-all duration-300 ease-in-out ${isCalcExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"}`}
            >
              <div className="overflow-hidden">
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

        {/* БЛОК 2 И 3: ГРАФИК И ЖУРНАЛ СДЕЛКОК */}
        <div className="xl:col-span-7 space-y-4 sm:space-y-6 min-w-0">
          {/* БЛОК ГРАФИКА */}
          <div className="border border-border/40 bg-background rounded-2xl sm:rounded-[2rem] p-1 sm:p-2 transition-all duration-300">
            <div
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors truncate">
                  Интерактивный Живой График
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground/70 truncate">
                  Поток котировок Bybit для пары {selectedCoin}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl text-muted-foreground shrink-0">
                {isChartExpanded ? (
                  <ChevronUp className="size-3.5 sm:size-4" />
                ) : (
                  <ChevronDown className="size-3.5 sm:size-4" />
                )}
              </div>
            </div>

            <div
              className={`chart-container-grid grid transition-all duration-300 ease-in-out ${isChartExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"}`}
            >
              <div className="overflow-hidden">
                <TradingViewChart coin={selectedCoin} />
              </div>
            </div>
          </div>

          {/* БЛОК ЖУРНАЛА СДЕЛОК */}
          <div className="border border-border/40 bg-background rounded-2xl sm:rounded-[2rem] p-1 sm:p-2 transition-all duration-300">
            <div
              onClick={() => setIsJournalExpanded(!isJournalExpanded)}
              className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
            >
              <div className="flex flex-col min-w-0 pr-2 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors truncate">
                    Журнал сделок и Аналитика
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    {openCount > 0 && (
                      <span className="inline-flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md animate-pulse whitespace-nowrap">
                        {openCount} OPEN
                      </span>
                    )}
                    {closedCount > 0 && (
                      <span className="inline-flex items-center justify-center bg-muted text-muted-foreground border border-border/60 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        {closedCount} CLOSE
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground/70 truncate">
                  История торгов из облачной базы
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl text-muted-foreground shrink-0">
                {isJournalExpanded ? (
                  <ChevronUp className="size-3.5 sm:size-4" />
                ) : (
                  <ChevronDown className="size-3.5 sm:size-4" />
                )}
              </div>
            </div>

            <div
              className={`journal-container-grid grid transition-all duration-300 ease-in-out ${isJournalExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"}`}
            >
              <div className="overflow-hidden">
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
