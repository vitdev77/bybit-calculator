"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

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
  selectedCoin,
  partsCount,
  setPartsCount,
  onAutoLeverage,
  isLeverageModified,
}: BalanceRiskFormProps) {
  return (
    <div className="space-y-4">
      {/* КНОПКИ НАПРАВЛЕНИЯ ПОЗИЦИИ (Увеличены до h-11 sm:h-12, text-sm sm:text-base) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`h-11 sm:h-12 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer select-none tracking-wider ${
            side === "BUY"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          LONG (BUY)
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`h-11 sm:h-12 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer select-none tracking-wider ${
            side === "SELL"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          SHORT (SELL)
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Депозит (USDT)
          </label>
          <Input
            type="number"
            value={balance || ""}
            onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
            className="h-9 text-xs bg-muted/20 border-border/40 font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Риск на сделку (%)
          </label>
          <Input
            type="number"
            step="0.1"
            value={riskPercent || ""}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
            className="h-9 text-xs bg-muted/20 border-border/40 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-end">
        <div className="space-y-1 relative">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
              Плечо (x1-{maxSafeLeverage})
            </label>
            {isLeverageModified && (
              <Button
                type="button"
                variant="ghost"
                onClick={onAutoLeverage}
                className="h-4 px-1 text-[9px] font-bold text-amber-500 hover:text-amber-600 bg-transparent p-0 flex items-center gap-0.5"
                title="Вернуть расчетное идеальное плечо"
              >
                <Shield className="size-2.5" />
                <span>Авто</span>
              </Button>
            )}
          </div>
          <Input
            type="number"
            min="1"
            max={maxSafeLeverage}
            value={leverage || ""}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 1;
              if (val > maxSafeLeverage) val = maxSafeLeverage;
              setLeverage(val);
            }}
            className={`h-9 text-xs font-bold bg-muted/20 border-border/40 ${
              isLeverageModified ? "border-amber-500/40 text-amber-500" : ""
            }`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Разбить депо на (частей)
          </label>
          <Input
            type="number"
            min="1"
            max="100"
            value={partsCount || ""}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 1;
              if (val > 100) val = 100;
              setPartsCount(val);
            }}
            className="h-9 text-xs bg-muted/20 border-border/40 font-bold"
          />
        </div>
      </div>
    </div>
  );
}
