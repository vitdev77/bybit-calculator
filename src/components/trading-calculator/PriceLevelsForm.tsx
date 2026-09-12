"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PriceLevelsProps {
  entryPrice: number;
  setEntryPrice: (v: number) => void;
  stopLossPercent: number;
  setStopLossPercent: (v: number) => void;
  riskRewardRatio: number;
  setRiskRewardRatio: (v: number) => void;
  onReset: () => void;
}

export default function PriceLevelsForm({
  entryPrice,
  setEntryPrice,
  stopLossPercent,
  setStopLossPercent,
  riskRewardRatio,
  setRiskRewardRatio,
  onReset,
}: PriceLevelsProps) {
  // Функция-обертка с защитным диалоговым окном (Alert) перед сбросом
  const handleResetWithAlert = () => {
    const isConfirmed = window.confirm(
      "Вы уверены, что хотите сбросить все настройки калькулятора?",
    );
    if (isConfirmed) {
      onReset();
    }
  };

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

      {/* ИСПРАВЛЕНО: Увеличен отступ до pt-5, добавлен cursor-pointer и защитный alert */}
      <div className="flex justify-center pt-5 w-full">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[10px] font-medium text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors select-none shadow-none no-underline hover:no-underline cursor-pointer"
          onClick={handleResetWithAlert}
        >
          Сбросить настройки
        </Button>
      </div>
    </div>
  );
}
