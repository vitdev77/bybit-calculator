"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionSide } from "./TradingCalculator";

interface BalanceRiskProps {
  balance: number;
  setBalance: (v: number) => void;
  riskPercent: number;
  setRiskPercent: (v: number) => void;
  leverage: number;
  setLeverage: (v: number) => void;
  side: PositionSide;
  setSide: (v: PositionSide) => void;
  maxSafeLeverage: number;
  selectedCoin: string;
}

const ALL_LEVERAGE_OPTIONS = [1, 2, 5, 10, 15, 20, 25, 30, 50, 75, 100];

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
}: BalanceRiskProps) {
  const allowedOptions = ALL_LEVERAGE_OPTIONS.filter(
    (opt) => opt <= maxSafeLeverage,
  );

  useEffect(() => {
    if (leverage > maxSafeLeverage) {
      setLeverage(maxSafeLeverage);
    }
  }, [maxSafeLeverage, leverage, setLeverage]);

  return (
    <div className="space-y-3.5">
      <ButtonGroup className="w-full h-10 sm:h-11 flex">
        <Button
          type="button"
          variant={side === "BUY" ? "default" : "outline"}
          className={`flex-1 h-full text-xs sm:text-sm font-extrabold tracking-wider uppercase transition-all shadow-none ${
            side === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSide("BUY")}
        >
          Long (Buy)
        </Button>
        <Button
          type="button"
          variant={side === "SELL" ? "default" : "outline"}
          className={`flex-1 h-full text-xs sm:text-sm font-extrabold tracking-wider uppercase transition-all shadow-none ${
            side === "SELL"
              ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSide("SELL")}
        >
          Short (Sell)
        </Button>
      </ButtonGroup>

      {/* 🔥 ИСПРАВЛЕНО: grid-cols-1 для смартфонов, чтобы поля ввода не сдавливались в кашу и цифры влезали целиком */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="balance" className="text-xs sm:text-sm">
            Депозит (USDT)
          </Label>
          <Input
            id="balance"
            type="number"
            value={balance}
            className="h-9 text-xs sm:text-sm"
            onChange={(e) => setBalance(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="riskPercent" className="text-xs sm:text-sm">
            Риск (%)
          </Label>
          <Input
            id="riskPercent"
            type="number"
            step="0.5"
            value={riskPercent}
            className="h-9 text-xs sm:text-sm"
            onChange={(e) => setRiskPercent(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="leverage-select" className="text-xs sm:text-sm">
            Плечо
          </Label>
          <Select
            key={`${selectedCoin}-${maxSafeLeverage}-${leverage}`}
            value={String(leverage)}
            onValueChange={(val) => setLeverage(Number(val))}
          >
            <SelectTrigger
              id="leverage-select"
              className="w-full h-9 text-xs sm:text-sm"
            >
              <SelectValue placeholder="x10" />
            </SelectTrigger>
            <SelectContent>
              {allowedOptions.map((lev) => (
                <SelectItem
                  key={`lev-${lev}`}
                  value={String(lev)}
                  className="text-xs sm:text-sm"
                >
                  x{lev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
