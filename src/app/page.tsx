"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import TradingCalculator from "@/components/trading-calculator/TradingCalculator";
import TradingViewChart from "@/components/trading-calculator/TradingViewChart";
import TradingJournal from "@/components/trading-calculator/TradingJournal";
import { ModeToggle } from "@/components/ModeToggle";

const STORAGE_KEY_LAYOUT = "bybit_calculator_layout_v1";
const PARTS_COUNT = 5;

export default function Home() {
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");
  const [currentBalance, setCurrentBalance] = useState(100);
  const [dealsSummary, setDealsCount] = useState({ open: 0, closed: 0 });

  // Стейты сворачивания блоков
  const [isCalcExpanded, setIsCalcExpanded] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isJournalExpanded, setIsJournalExpanded] = useState(true);

  const [isMounted, setIsMounted] = useState(false);

  // Извлекаем настройки лейаута из памяти при монтировании
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLayout = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (savedLayout) {
        try {
          const parsed = JSON.parse(savedLayout);
          if (parsed.isCalcExpanded !== undefined)
            setIsCalcExpanded(parsed.isCalcExpanded);
          if (parsed.isChartExpanded !== undefined)
            setIsChartExpanded(parsed.isChartExpanded);
          if (parsed.isJournalExpanded !== undefined)
            setIsJournalExpanded(parsed.isJournalExpanded);
        } catch (e) {
          console.error("Ошибка чтения настроек лейаута:", e);
        }
      }
      setIsMounted(true);
    }
  }, []);

  // Сохраняем изменения положения блоков в localStorage
  useEffect(() => {
    if (!isMounted) return;

    const layoutState = { isCalcExpanded, isChartExpanded, isJournalExpanded };
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layoutState));

    const updateAttr = (attr: string, condition: boolean) => {
      if (condition) document.documentElement.removeAttribute(attr);
      else document.documentElement.setAttribute(attr, "true");
    };

    updateAttr("data-hide-calc", isCalcExpanded);
    updateAttr("data-hide-chart", isChartExpanded);
    updateAttr("data-hide-journal", isJournalExpanded);
  }, [isCalcExpanded, isChartExpanded, isJournalExpanded, isMounted]);

  return (
    <main className="min-h-screen py-8 space-y-6 max-w-5xl mx-auto px-4">
      {/* --- ГЛОБАЛЬНАЯ ШАПКА ПРИЛОЖЕНИЯ --- */}
      <div className="flex items-center justify-between px-2 select-none border-b border-border/20 pb-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Bybit Futures{" "}
            <span className="text-muted-foreground font-normal">
              / Calculator
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Изолированная маржа 1/{PARTS_COUNT} •{" "}
            {(currentBalance / PARTS_COUNT).toFixed(2)} USDT на позицию
          </p>
        </div>
        <ModeToggle />
      </div>

      {/* --- БЛОК 1: КАЛЬКУЛЯТОР ПАРАМЕТРОВ --- */}
      <div className="border border-border/40 bg-muted/30 dark:bg-muted/10 rounded-[2rem] p-2 transition-all duration-300">
        <div
          onClick={() => setIsCalcExpanded(!isCalcExpanded)}
          className="flex items-center justify-between px-6 py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors">
              Калькулятор Позиций
            </h2>
            <p className="text-xs text-muted-foreground/70">
              {" "}
              Расчёт маржи, рисков и параметров ордера{" "}
            </p>
          </div>
          <div className="p-2 rounded-xl text-muted-foreground group-hover/header:text-foreground group-hover/header:bg-muted/50 dark:group-hover/header:bg-muted/20 transition-all">
            {isCalcExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
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
            />
          </div>
        </div>
      </div>

      {/* --- БЛОК 2: ЖИВОЙ ГРАФИК TRADINGVIEW --- */}
      <div className="border border-border/40 bg-background rounded-[2rem] p-2 transition-all duration-300">
        <div
          onClick={() => setIsChartExpanded(!isChartExpanded)}
          className="flex items-center justify-between px-6 py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors">
              Интерактивный Живой График
            </h2>
            <p className="text-xs text-muted-foreground/70">
              {" "}
              Поток котировок Bybit для пары {selectedCoin}{" "}
            </p>
          </div>
          <div className="p-2 rounded-xl text-muted-foreground group-hover/header:text-foreground group-hover/header:bg-muted/50 dark:group-hover/header:bg-muted/20 transition-all">
            {isChartExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
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

      {/* --- БЛОК 3: ОБЛАЧНЫЙ ЖУРНАЛ СДЕЛОК --- */}
      <div className="border border-border/40 bg-background rounded-[2rem] p-2 transition-all duration-300">
        <div
          onClick={() => setIsJournalExpanded(!isJournalExpanded)}
          className="flex items-center justify-between px-6 py-3 select-none cursor-pointer group/header hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground transition-colors">
                Журнал сделок и Аналитика
              </h2>
              {dealsSummary.open > 0 && (
                <span className="inline-flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                  {dealsSummary.open} OPEN
                </span>
              )}
              {dealsSummary.closed > 0 && (
                <span className="inline-flex items-center justify-center bg-muted text-muted-foreground border border-border/60 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {dealsSummary.closed} CLOSE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70">
              {" "}
              История торгов и статистика WinRate из облачной базы{" "}
            </p>
          </div>
          <div className="p-2 rounded-xl text-muted-foreground group-hover/header:text-foreground group-hover/header:bg-muted/50 dark:group-hover/header:bg-muted/20 transition-all">
            {isJournalExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </div>

        <div
          className={`journal-container-grid grid transition-all duration-300 ease-in-out ${isJournalExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"}`}
        >
          <div className="overflow-hidden">
            <TradingJournal onDealsCountChange={setDealsCount} />
          </div>
        </div>
      </div>
    </main>
  );
}
