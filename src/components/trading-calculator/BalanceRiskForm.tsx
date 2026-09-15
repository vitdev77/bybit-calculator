"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  partsCount: number;
  setPartsCount: (v: number) => void;
}

const ALL_LEVERAGE_OPTIONS = [1, 2, 5, 10, 15, 20, 25, 30, 50, 75, 100];
const PARTS_OPTIONS = [2, 3, 4, 5, 10];

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
    <div className="space-y-3 sm:space-y-3.5">
      {/* Направление позиции - Крупные адаптивные кнопки тапа */}
      <ButtonGroup className="w-full h-9 sm:h-11 flex">
        <Button
          type="button"
          variant={side === "BUY" ? "default" : "outline"}
          className={`flex-1 h-full text-xs sm:text-sm font-extrabold tracking-wider uppercase transition-all shadow-none ${
            side === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
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
              ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSide("SELL")}
        >
          Short (Sell)
        </Button>
      </ButtonGroup>

      {/* Выбор количества частей депозита */}
      <div className="space-y-1">
        <div className="flex justify-between items-center px-0.5">
          <Label className="text-[11px] sm:text-sm">Разделение депозита</Label>
          <span className="text-[9px] sm:text-xs font-bold text-muted-foreground">
            1/{partsCount} • {(balance / partsCount).toFixed(1)} USDT
          </span>
        </div>
        <Tabs
          value={String(partsCount)}
          onValueChange={(val) => setPartsCount(Number(val))}
          className="w-full"
        >
          {/* Адаптированная высота h-7.5 на мобильных устройствах */}
          <TabsList className="w-full h-7.5 sm:h-8 bg-muted/40 dark:bg-muted/10 border border-border/30 rounded-lg flex p-0.5">
            {PARTS_OPTIONS.map((opt) => (
              <TabsTrigger
                key={`part-opt-${opt}`}
                value={String(opt)}
                className="flex-1 text-[11px] sm:text-xs font-bold rounded-md"
              >
                {opt}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {/* ФИКС АДАПТИВНОСТИ: 2 колонки на мобилках, перестроение в 3 колонки со sm брейкпоинта */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="space-y-1">
          <Label htmlFor="balance" className="text-[11px] sm:text-sm px-0.5">
            Депозит (USDT)
          </Label>
          <Input
            id="balance"
            type="number"
            value={balance}
            className="h-8.5 sm:h-9 text-xs sm:text-sm rounded-lg px-2"
            onChange={(e) => setBalance(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="riskPercent"
            className="text-[11px] sm:text-sm px-0.5"
          >
            Риск (%)
          </Label>
          <Input
            id="riskPercent"
            type="number"
            step="0.5"
            value={riskPercent}
            className="h-8.5 sm:h-9 text-xs sm:text-sm rounded-lg px-2"
            onChange={(e) => setRiskPercent(Number(e.target.value))}
          />
        </div>

        {/* На мобильных плечо занимает всю ширину под депозитом и риском (col-span-2) */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label
            htmlFor="leverage-select"
            className="text-[11px] sm:text-sm px-0.5"
          >
            Кредитное плечо
          </Label>
          <Select
            key={`${selectedCoin}-${maxSafeLeverage}-${leverage}`}
            value={String(leverage)}
            onValueChange={(val) => setLeverage(Number(val))}
          >
            <SelectTrigger
              id="leverage-select"
              className="w-full h-8.5! sm:h-9! m-0! text-xs sm:text-sm bg-transparent rounded-lg"
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
