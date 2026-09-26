"use client";

import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw } from "lucide-react";

interface BalanceRiskFormProps {
  balance: number;
  setBalance: (v: number) => void;
  riskPercent: number;
  setRiskPercent: (v: number) => void;
  leverage: number;
  setLeverage: (v: number) => void;
  side: "BUY" | "SELL";
  setSide: (v: "BUY" | "SELL") => void;
  maxSafeLeverage: number;
  selectedCoin: string;
  partsCount: number;
  setPartsCount: (v: number) => void;
  onAutoLeverage: () => void;
  isLeverageModified: boolean;
}

export default function BalanceRiskForm({
  balance,
  setBalance,
  riskPercent,
  setRiskPercent,
  leverage,
  setLeverage,
  side,
  setSide,
  maxSafeLeverage,
  partsCount,
  setPartsCount,
  onAutoLeverage,
  isLeverageModified,
}: BalanceRiskFormProps) {
  const partsPresets = [1, 2, 3, 5, 10];

  const balanceRef = useRef<HTMLInputElement>(null);
  const riskRef = useRef<HTMLInputElement>(null);
  const leverageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBalanceWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 10 : -10;
      setBalance(Math.max(0, balance + step));
    };

    const handleRiskWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      const next = parseFloat((riskPercent + step).toFixed(1));
      setRiskPercent(Math.max(0, Math.min(100, next)));
    };

    const handleLeverageWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 1 : -1;
      setLeverage(Math.max(1, Math.min(maxSafeLeverage, leverage + step)));
    };

    const bEl = balanceRef.current;
    const rEl = riskRef.current;
    const lEl = leverageRef.current;

    if (bEl)
      bEl.addEventListener("wheel", handleBalanceWheel, { passive: false });
    if (rEl) rEl.addEventListener("wheel", handleRiskWheel, { passive: false });
    if (lEl)
      lEl.addEventListener("wheel", handleLeverageWheel, { passive: false });

    return () => {
      if (bEl) bEl.removeEventListener("wheel", handleBalanceWheel);
      if (rEl) rEl.removeEventListener("wheel", handleRiskWheel);
      if (lEl) lEl.removeEventListener("wheel", handleLeverageWheel);
    };
  }, [
    balance,
    riskPercent,
    leverage,
    maxSafeLeverage,
    setBalance,
    setRiskPercent,
    setLeverage,
  ]);
  return (
    <div className="space-y-4">
      {/* КНОПКИ НАПРАВЛЕНИЯ ПОЗИЦИИ (LONG / SHORT крупнее, BUY / SELL под ними мелким) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`h-12 sm:h-11 rounded-xl transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-0.5 ${
            side === "BUY"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <span className="text-sm sm:text-base font-black tracking-wider uppercase leading-none">
            LONG
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium opacity-80 uppercase leading-none">
            BUY
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`h-12 sm:h-11 rounded-xl transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-0.5 ${
            side === "SELL"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <span className="text-sm sm:text-base font-black tracking-wider uppercase leading-none">
            SHORT
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium opacity-80 uppercase leading-none">
            SELL
          </span>
        </button>
      </div>

      {/* ТРЕХКОЛОНОЧНЫЙ РЯД КЛЮЧЕВЫХ ПАРАМЕТРОВ ОРДЕРА */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 items-start">
        {/* ДЕПОЗИТ */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Депозит
          </label>
          <Input
            ref={balanceRef}
            type="number"
            min="0"
            value={balance === 0 ? "0" : balance || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setBalance(isNaN(val) || val < 0 ? 0 : val);
            }}
            className={`h-9.5 sm:h-9 text-xs font-bold transition-all ${
              balance <= 0
                ? "border-rose-500/60 ring-2 ring-rose-500/20 text-rose-500 bg-rose-500/5"
                : "bg-muted/20 border-border/40"
            }`}
          />
        </div>

        {/* РИСК НА СДЕЛКУ */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Риск (%)
          </label>
          <Input
            ref={riskRef}
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={riskPercent === 0 ? "0" : riskPercent || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRiskPercent(isNaN(val) || val < 0 ? 0 : val);
            }}
            className={`h-9.5 sm:h-9 text-xs font-bold transition-all ${
              riskPercent > 5
                ? "border-rose-500/60 ring-2 ring-rose-500/20 text-rose-500 bg-rose-500/5"
                : riskPercent === 0
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 text-amber-500 bg-amber-500/5"
                  : "bg-muted/20 border-border/40"
            }`}
          />
        </div>

        {/* КРЕДИТНОЕ ПЛЕЧО */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Плечо
          </label>
          <div className="relative flex items-center w-full">
            <Input
              ref={leverageRef}
              type="number"
              min="1"
              max={maxSafeLeverage}
              value={leverage || ""}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 1;
                if (val > maxSafeLeverage) val = maxSafeLeverage;
                setLeverage(val);
              }}
              className={`h-9.5 sm:h-9 text-xs font-bold transition-all bg-muted/20 border-border/40 ${
                isLeverageModified
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 text-amber-500 pr-7"
                  : "pr-2"
              }`}
            />
            {isLeverageModified && (
              <Button
                type="button"
                variant="ghost"
                onClick={onAutoLeverage}
                className="absolute right-0.5 h-8 w-7 p-0 text-amber-500 hover:text-amber-600 bg-transparent flex items-center justify-center rounded-md hover:bg-amber-500/10 transition-colors"
                title="Вернуть расчетное идеальное плечо"
              >
                <RotateCcw className="size-3.5 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* РАСПРЕДЕЛЕНИЕ ДЕПОЗИТА */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
          Распределение депозита
        </label>
        <Tabs
          value={String(partsCount)}
          onValueChange={(val) => setPartsCount(Number(val) || 1)}
          className="w-full"
        >
          <TabsList className="w-full h-9.5 sm:h-9 grid grid-cols-5 p-0.5 bg-muted/40 dark:bg-muted/10 border border-border/40 rounded-xl shadow-inner">
            {partsPresets.map((preset) => (
              <TabsTrigger
                key={`preset-${preset}`}
                value={String(preset)}
                className="text-xs font-normal tracking-wider rounded-lg transition-all cursor-pointer select-none py-1 text-muted-foreground hover:bg-muted/60 dark:hover:bg-white/5 hover:text-foreground data-active:bg-amber-500 data-active:text-white data-active:font-black data-active:shadow-md data-active:scale-[1.01]"
              >
                1/{preset}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
