"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { cn } from "cn";
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
  livePrice: number;
  decimals: number;
  side: "BUY" | "SELL";
}

export default function PriceLevelsForm({
  entryPrice,
  setEntryPrice,
  stopLossPercent,
  setStopLossPercent,
  riskRewardRatio,
  setRiskRewardRatio,
  onReset,
  livePrice,
  decimals,
  side,
}: PriceLevelsProps) {
  const currentRRValue = String(riskRewardRatio);
  const rrPresets = [1, 1.5, 2, 3, 4, 5];
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: any): void => {
    if (typeof value !== "string") return;
    setRiskRewardRatio(Number(value));
  };

  // Безопасная проверка: сравниваем отформатированные строки для обхода проблем с плавающей точкой JavaScript
  const formattedEntry =
    entryPrice && !isNaN(entryPrice) ? entryPrice.toFixed(decimals) : "";
  const formattedLive =
    livePrice && !isNaN(livePrice) ? livePrice.toFixed(decimals) : "";

  // Обводка включается, если строки не равны, и обе цены физически существуют
  const hasSignificantDeviation =
    formattedEntry !== "" &&
    formattedLive !== "" &&
    formattedEntry !== formattedLive;

  // Считаем направление отклонения для выбора цвета подсветки
  const isPriceHigherThanMarket = entryPrice > livePrice;
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 items-start">
        {/* Поле цены входа с надежной текстовой обводкой */}
        <div className="space-y-1">
          <Label
            htmlFor="entryPrice"
            className="text-[11px] sm:text-sm px-0.5 font-bold uppercase tracking-wider text-muted-foreground/90"
          >
            Цена (USDT)
          </Label>
          <div className="relative flex items-center w-full">
            <Input
              id="entryPrice"
              type="number"
              placeholder="0.00"
              value={entryPrice === 0 ? "" : entryPrice || ""}
              className={cn(
                "h-9.5 sm:h-9 text-xs sm:text-sm rounded-lg pl-2 transition-all duration-300 outline-none",
                hasSignificantDeviation ? "pr-8 ring-2" : "pr-2 border-input",
                // Если цена выше рынка — включаем сочную изумрудную обводку
                hasSignificantDeviation && isPriceHigherThanMarket
                  ? "border-emerald-500 ring-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-emerald-500/5 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "",
                // Если цена ниже рынка — включаем сочную оранжевую обводку
                hasSignificantDeviation && !isPriceHigherThanMarket
                  ? "border-amber-500 ring-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] bg-amber-500/5 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold"
                  : "",
              )}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = parseFloat(e.target.value);
                setEntryPrice(isNaN(val) ? 0 : val);
              }}
            />
            {hasSignificantDeviation && (
              <button
                type="button"
                onClick={() => setEntryPrice(livePrice)}
                className={cn(
                  "absolute right-1.5 h-6 w-6 p-0 bg-transparent flex items-center justify-center rounded-md transition-all cursor-pointer hover:bg-muted/40 z-20",
                  isPriceHigherThanMarket
                    ? "text-emerald-500 hover:text-emerald-600"
                    : "text-amber-500 hover:text-amber-600",
                )}
                title={`Рынок: ${formattedLive}. Нажмите для выравнивания цене.`}
              >
                <Zap className="size-3.5 fill-current" />
              </button>
            )}
          </div>
        </div>

        {/* Выбор Risk:Reward режима */}
        <div className="space-y-1">
          <Label
            htmlFor="rr-preset-select"
            className="text-[11px] sm:text-sm px-0.5 font-bold uppercase tracking-wider text-muted-foreground/90"
          >
            Режим (R:R)
          </Label>
          <Select
            key={`${stopLossPercent}-${riskRewardRatio}`}
            value={currentRRValue}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger
              id="rr-preset-select"
              className="w-full h-9.5! sm:h-9! m-0! bg-transparent text-xs sm:text-sm rounded-lg"
            >
              <SelectValue placeholder="1:3">{`1:${riskRewardRatio}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rrPresets.map((rr) => {
                const targetTPPercent = (stopLossPercent * rr).toFixed(1);
                return (
                  <SelectItem
                    key={`rr-${rr}`}
                    value={String(rr)}
                    className="text-xs sm:text-sm"
                  >
                    {`SL ${stopLossPercent}% | TP ${targetTPPercent}% (1:${rr})`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Кнопка полного сброса параметров калькулятора */}
      <div className="flex justify-center pt-2 sm:pt-4 w-full">
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger
            className={buttonVariants({
              variant: "link",
              className:
                "h-auto p-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors select-none shadow-none no-underline hover:no-underline cursor-pointer",
            })}
          >
            Сбросить настройки
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl max-w-xs sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm sm:text-base">
                Сбросить калькулятор?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] sm:text-xs">
                Это действие вернет все параметры торговли к дефолтным
                значениям.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-1.5 sm:gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  onReset();
                  setIsOpen(false);
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
