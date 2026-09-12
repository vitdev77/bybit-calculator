"use client";

import React, { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PriceLevelsProps {
  entryPrice: number;
  setEntryPrice: (v: number) => void;
  stopLossPercent: number;
  setStopLossPercent: (v: number) => void;
  riskRewardRatio: number;
  setRiskRewardRatio: (v: number) => void;
  onReset: () => void;
}

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
  const currentPresetValue = `${stopLossPercent}-${riskRewardRatio}`;

  // ИСПРАВЛЕНО ПОД BASE UI: Стейт контроля открытия, чтобы кнопки не слипались и окно закрывалось вовремя
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: any): void => {
    if (typeof value !== "string") return;
    const [slStr, rrStr] = value.split("-");
    setStopLossPercent(Number(slStr));
    setRiskRewardRatio(Number(rrStr));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 items-start">
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

        <div className="space-y-2">
          <Label htmlFor="rr-preset-select">Режим торговли (R:R)</Label>
          <Select value={currentPresetValue} onValueChange={handlePresetChange}>
            <SelectTrigger
              id="rr-preset-select"
              className="w-full !h-9 bg-background"
            >
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

      <div className="flex justify-center pt-5 w-full">
        {/* НАСТРОЕНО: open привязан к нашему стейту контроля */}
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger
            className={buttonVariants({
              variant: "link",
              className:
                "h-auto p-0 text-[10px] font-medium text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors select-none shadow-none no-underline hover:no-underline cursor-pointer",
            })}
          >
            Сбросить настройки
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2rem] max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Сбросить калькулятор?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Это действие вернет все параметры торговли, включая депозит,
                риски и цену входа, к дефолтным значениям.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                Отмена
              </AlertDialogCancel>
              {/* ЖЕЛЕЗОБЕТОННЫЙ ФИКС: Вернули AlertDialogAction, чтобы восстановить стили gap-2 в футере shadcn, а закрытие делаем руками */}
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault(); // Гарантируем, что Base UI не перехватит клик раньше времени
                  onReset();
                  setIsOpen(false); // Принудительно захлопываем модалку
                }}
                variant="destructive"
                className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer border-none flex items-center justify-center"
              >
                Сбросить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
