"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
}: BalanceRiskFormProps) {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Кнопки переключения направления BUY/SELL */}
      <div className="grid grid-cols-2 gap-2 select-none">
        <Button
          type="button"
          onClick={() => setSide("BUY")}
          className={`h-8 sm:h-9 font-bold text-xs rounded-lg transition-all border ${side === "BUY" ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : "bg-transparent text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/5"}`}
        >
          LONG (BUY)
        </Button>
        <Button
          type="button"
          onClick={() => setSide("SELL")}
          className={`h-8 sm:h-9 font-bold text-xs rounded-lg transition-all border ${side === "SELL" ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent" : "bg-transparent text-rose-500 border-rose-500/20 hover:bg-rose-500/5"}`}
        >
          SHORT (SELL)
        </Button>
      </div>

      {/* МOБИЛЬНЫЙ ФИКС: Депозит, Риск и Плечо жестко зафиксированы в одну строчку через grid-cols-3 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            Депозит
          </label>
          <div className="relative flex items-center">
            <Input
              type="number"
              value={balance || ""}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              className="h-8.5 text-xs bg-muted/20 border-border/40 focus-visible:ring-ring/30 rounded-lg pr-9 font-semibold"
            />
            <span className="absolute right-2 text-[9px] font-bold text-muted-foreground/60 select-none">
              USDT
            </span>
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            Риск
          </label>
          <div className="relative flex items-center">
            <Input
              type="number"
              value={riskPercent || ""}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
              className="h-8.5 text-xs bg-muted/20 border-border/40 focus-visible:ring-ring/30 rounded-lg pr-7 font-semibold"
            />
            <span className="absolute right-2 text-[9px] font-bold text-muted-foreground/60 select-none">
              %
            </span>
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            Плечо
          </label>
          <div className="relative flex items-center">
            <Input
              type="number"
              value={leverage || ""}
              max={maxSafeLeverage}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 1;
                if (val > maxSafeLeverage) val = maxSafeLeverage;
                setLeverage(val);
              }}
              className="h-8.5 text-xs bg-muted/20 border-border/40 focus-visible:ring-ring/30 rounded-lg pr-7 font-semibold"
            />
            <span className="absolute right-1 text-[9px] font-bold text-muted-foreground/60 select-none">
              x{maxSafeLeverage}
            </span>
          </div>
        </div>
      </div>
      {/* Выбор количества частей капитала */}
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
          Разделение депо (Долей: {partsCount})
        </label>
        <div className="grid grid-cols-5 gap-1 select-none">
          {[2, 3, 4, 5, 10].map((num) => (
            <Button
              key={num}
              type="button"
              variant="outline"
              onClick={() => setPartsCount(num)}
              className={`h-7 text-[10px] font-black rounded-md transition-all ${partsCount === num ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/15" : "bg-muted/10 border-border/30 hover:bg-muted/30 text-muted-foreground"}`}
            >
              1/{num}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
