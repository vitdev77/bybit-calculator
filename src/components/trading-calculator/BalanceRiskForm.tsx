"use client";

import React from "react";
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
}

const LEVERAGE_OPTIONS = [1, 2, 5, 10, 15, 20, 25, 30, 50, 75, 100];

export default function BalanceRiskForm({
  balance,
  setBalance,
  riskPercent,
  setRiskPercent,
  leverage,
  setLeverage,
  side,
  setSide,
}: BalanceRiskProps) {
  return (
    <div className="space-y-4">
      <ButtonGroup className="w-full h-11 flex">
        <Button
          type="button"
          variant={side === "BUY" ? "default" : "outline"}
          className={`flex-1 h-full text-sm font-extrabold tracking-wider uppercase transition-all shadow-none ${
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
          className={`flex-1 h-full text-sm font-extrabold tracking-wider uppercase transition-all shadow-none ${
            side === "SELL"
              ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSide("SELL")}
        >
          Short (Sell)
        </Button>
      </ButtonGroup>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="balance">Депозит (USDT)</Label>
          <Input
            id="balance"
            type="number"
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="riskPercent">Риск (%)</Label>
          <Input
            id="riskPercent"
            type="number"
            step="0.5"
            value={riskPercent}
            onChange={(e) => setRiskPercent(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leverage-select">Плечо</Label>
          <Select
            value={String(leverage)}
            onValueChange={(val) => setLeverage(Number(val))}
          >
            <SelectTrigger id="leverage-select" className="w-full">
              <SelectValue placeholder="x10" />
            </SelectTrigger>
            <SelectContent>
              {LEVERAGE_OPTIONS.map((lev) => (
                <SelectItem key={`lev-${lev}`} value={String(lev)}>
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
