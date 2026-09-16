"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

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
  onAutoLeverage?: () => void;
  isLeverageModified?: boolean;
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
  isLeverageModified = false,
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
          <div className="flex items-stretch w-full group/leverage-box">
            <div className="relative flex items-center flex-1 min-w-0">
              <Input
                type="number"
                value={leverage || ""}
                max={maxSafeLeverage}
                onChange={(e) => {
                  let val = parseInt(e.target.value) || 1;
                  if (val > maxSafeLeverage) val = maxSafeLeverage;
                  setLeverage(val);
                }}
                className={`h-8.5 text-xs bg-muted/20 border-border/40 focus-visible:ring-ring/30 font-semibold pr-7 ${onAutoLeverage ? "rounded-l-lg rounded-r-none border-r-0" : "rounded-lg"}`}
              />
              <span className="absolute right-1 text-[9px] font-bold text-muted-foreground/60 select-none">
                x{maxSafeLeverage}
              </span>
            </div>
            {onAutoLeverage && (
              <button
                type="button"
                disabled={!isLeverageModified}
                onClick={onAutoLeverage}
                title={
                  isLeverageModified
                    ? "Вернуть оптимальное плечо по риску"
                    : "Плечо соответствует риску"
                }
                className={`h-8.5 w-8.5 rounded-r-lg border flex items-center justify-center transition-all shrink-0 select-none border-l-0 ${
                  isLeverageModified
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/30 scale-100 hover:bg-violet-700 active:scale-95 cursor-pointer font-bold"
                    : "bg-muted/10 border-border/20 text-muted-foreground/20 cursor-not-allowed opacity-50"
                }`}
              >
                <Wand2
                  className={`size-3.5 ${isLeverageModified ? "animate-pulse" : ""}`}
                />
              </button>
            )}
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
