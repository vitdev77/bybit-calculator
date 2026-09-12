"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PriceLevelsProps {
  entryPrice: number;
  setEntryPrice: (v: number) => void;
  stopLossPercent: number;
  setStopLossPercent: (v: number) => void;
  riskRewardRatio: number;
  setRiskRewardRatio: (v: number) => void;
}

export default function PriceLevelsForm({
  entryPrice,
  setEntryPrice,
  stopLossPercent,
  setStopLossPercent,
  riskRewardRatio,
  setRiskRewardRatio,
}: PriceLevelsProps) {
  return (
    <div className="space-y-4">
      {/* Цена входа */}
      <div className="space-y-2">
        <Label htmlFor="entryPrice">Цена входа (USDT)</Label>
        <Input
          id="entryPrice"
          type="number"
          placeholder="0.00"
          value={entryPrice || ""}
          onChange={(e) => setEntryPrice(Number(e.target.value))}
        />
      </div>

      {/* Сетка: Дистанция SL и Соотношение R:R */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slPercent">Дистанция SL (%)</Label>
          <Input
            id="slPercent"
            type="number"
            step="0.1"
            value={stopLossPercent}
            onChange={(e) => setStopLossPercent(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rrRatio">Соотношение R:R</Label>
          <Input
            id="rrRatio"
            type="number"
            value={riskRewardRatio}
            onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
