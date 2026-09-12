"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PriceLevelsProps {
  entryPrice: number;
  setEntryPrice: (v: number) => void;
  stopLossPercent: number;
  setStopLossPercent: (v: number) => void;
  riskRewardRatio: number;
  setRiskRewardRatio: (v: number) => void;
  onReset: () => void;
}

// Готовые пресеты соотношения Risk/Reward
const RR_PRESETS = [
  { label: "SL 1% | TP 1% (1:1)", sl: 1, rr: 1 },
  { label: "SL 1% | TP 2% (1:2)", sl: 1, rr: 2 },
  { label: "SL 1% | TP 3% (1:3)", sl: 1, rr: 3 },
  { label: "SL 1% | TP 4% (1:4)", sl: 1, rr: 4 },
  { label: "SL 1% | TP 5% (1:5)", sl: 1, rr: 5 },
];

export default function PriceLevelsForm({
  entryPrice,
  setEntryPrice,
  stopLossPercent,
  setStopLossPercent,
  riskRewardRatio,
  setRiskRewardRatio,
  onReset,
}: PriceLevelsProps) {
  const handleResetWithAlert = () => {
    const isConfirmed = window.confirm(
      "Вы уверены, что хотите сбросить все настройки калькулятора?",
    );
    if (isConfirmed) onReset();
  };

  // Технический ключ (константа в стейте, например "1-3")
  const currentPresetValue = `${stopLossPercent}-${riskRewardRatio}`;

  // Обработчик смены пресета для Base UI
  const handlePresetChange = (value: any): void => {
    if (typeof value !== "string") return;
    const [slStr, rrStr] = value.split("-");
    setStopLossPercent(Number(slStr));
    setRiskRewardRatio(Number(rrStr));
  };

  return (
    <div className="space-y-4">
      {/* Горизонтальный ряд параметров */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Левая колонка: Цена входа */}
        <div className="space-y-2">
          <Label htmlFor="entryPrice">Цена входа (USDT)</Label>
          <Input
            id="entryPrice"
            type="number"
            placeholder="0.00"
            value={entryPrice || ""}
            className="h-9"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEntryPrice(Number(e.target.value))
            }
          />
        </div>

        {/* Правая колонка: Селектор пресетов */}
        <div className="space-y-2">
          <Label htmlFor="rr-preset-select">Режим торговли (R:R)</Label>
          <Select value={currentPresetValue} onValueChange={handlePresetChange}>
            <SelectTrigger
              id="rr-preset-select"
              className="w-full !h-9 bg-background"
            >
              {/* ИСПРАВЛЕНО: Теперь на экране отображается строго чистый вид "1:3" вместо длинной записи */}
              <SelectValue placeholder="1:3">
                {(value: any) => {
                  if (!value || typeof value !== "string") return "1:3";
                  const [, rr] = value.split("-");
                  return `1:${rr}`;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RR_PRESETS.map((preset) => {
                const valKey = `${preset.sl}-${preset.rr}`;
                return (
                  <SelectItem key={valKey} value={valKey}>
                    {preset.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ссылка на полный сброс параметров */}
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
