"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
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

export default function PriceLevelsForm({
  entryPrice,
  setEntryPrice,
  stopLossPercent,
  setStopLossPercent,
  riskRewardRatio,
  setRiskRewardRatio,
  onReset,
}: PriceLevelsProps) {
  const currentRRValue = String(riskRewardRatio);
  const rrPresets = [1, 1.5, 2, 3, 4, 5];
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: any): void => {
    if (typeof value !== "string") return;
    setRiskRewardRatio(Number(value));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div className="space-y-1">
          <Label htmlFor="entryPrice" className="text-xs sm:text-sm">
            Цена входа (USDT)
          </Label>
          <Input
            id="entryPrice"
            type="number"
            placeholder="0.00"
            value={entryPrice || ""}
            className="h-9 text-xs sm:text-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEntryPrice(Number(e.target.value))
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rr-preset-select" className="text-xs sm:text-sm">
            Режим торговли (R:R)
          </Label>
          <Select
            key={`${stopLossPercent}-${riskRewardRatio}`}
            value={currentRRValue}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger
              id="rr-preset-select"
              className="w-full h-9! m-0! bg-background text-xs sm:text-sm"
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

      <div className="flex justify-center pt-3 w-full">
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
          <AlertDialogContent className="rounded-2xl max-w-xs sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm sm:text-base">
                Сбросить калькулятор?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] sm:text-xs">
                Это действие вернет все параметры торговли, включая депозит,
                риски и цену входа, к дефолтным значениям.
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
