"use client";

import React, { useState } from "react";
import { Copy, Check, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { OrderType, PositionSide } from "./TradingCalculator";

interface ResultsDisplayProps {
  results: {
    riskAmount: number;
    positionSizeCrypto: number;
    positionSizeUsdt: number;
    selectedLeverage: number;
    maxSafeLeverage: number;
    marginUsed: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    decimals: number;
    totalFeeUsdt: number;
    netProfitUsdt: number;
    riskRewardRatio: number;
    liquidationPrice: number;
  };
  coin: string;
  entryPrice: number;
  orderType: OrderType;
  side: PositionSide;
}

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={`h-7 w-7 p-0 rounded-md shrink-0 border border-border/60 transition-all duration-200 cursor-pointer shadow-none ${
        isCopied
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          : "bg-muted/60 hover:bg-muted dark:bg-muted/20 dark:hover:bg-muted/40 text-muted-foreground hover:text-foreground hover:scale-105"
      }`}
      onClick={handleCopy}
      title="Копировать значение"
    >
      {isCopied ? (
        <Check className="h-3.5 w-3.5 animate-in fade-in zoom-in-95 duration-150" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
export default function ResultsDisplay({
  results,
  coin,
  entryPrice,
  orderType,
  side,
}: ResultsDisplayProps) {
  const assetName = coin.replace("USDT", "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const formattedCryptoQty = results.positionSizeCrypto.toFixed(5);
  const formattedMargin = results.marginUsed.toFixed(2);
  const formattedVolUsdt = results.positionSizeUsdt.toFixed(2);
  const formattedTP =
    results.takeProfitPrice > 0
      ? results.takeProfitPrice.toFixed(results.decimals)
      : "0.00";
  const formattedSL =
    results.stopLossPrice > 0
      ? results.stopLossPrice.toFixed(results.decimals)
      : "0.00";
  const formattedLiq =
    results.liquidationPrice > 0
      ? results.liquidationPrice.toFixed(results.decimals)
      : "0.00";

  const isLeverageTooHigh = results.selectedLeverage > results.maxSafeLeverage;

  const tpRoiPcnt =
    results.marginUsed > 0
      ? (results.netProfitUsdt / results.marginUsed) * 100
      : 0;
  const slLossUsdt = results.riskAmount;
  const slRoiPcnt =
    results.marginUsed > 0 ? (-slLossUsdt / results.marginUsed) * 100 : 0;

  const handleSaveDeal = async () => {
    if (results.positionSizeUsdt <= 0 || isSaving || isLeverageTooHigh) return;
    try {
      setIsSaving(true);
      setDuplicateWarning(false);

      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin: coin,
          side: side,
          order_type: orderType,
          entry_price: entryPrice,
          stop_loss: results.stopLossPrice,
          take_profit: results.takeProfitPrice,
          volume: results.positionSizeUsdt,
          margin: results.marginUsed,
          leverage: results.selectedLeverage,
          status: "OPEN",
        }),
      });

      if (response.status === 409) {
        setDuplicateWarning(true);
        toast.add({
          title: "Позиция уже существует",
          description: `Ордер по паре ${coin} с такими же параметрами уже зафиксирован в журнале.`,
          type: "warning",
        });
        setTimeout(() => setDuplicateWarning(false), 3000);
        return;
      }

      if (!response.ok) throw new Error("Save error");

      setSaveSuccess(true);
      toast.add({
        title: "Трейд зафиксирован!",
        description: `Позиция ${side === "BUY" ? "Long" : "Short"} по ${coin} успешно добавлена в облачный журнал сделок.`,
        type: "success",
      });
      setTimeout(() => setSaveSuccess(false), 2000);

      window.dispatchEvent(new Event("refresh-trading-journal"));
    } catch (err) {
      console.error("Не удалось сохранить сделку в базу данных:", err);
      toast.add({
        title: "Критическая ошибка",
        description:
          "Не удалось подключиться к базе данных. Проверьте конфигурацию DATABASE_URL.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="flex flex-col h-full space-y-3.5 sm:space-y-4 justify-between">
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-muted-foreground">Итоговый Риск:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm sm:text-base font-semibold text-rose-500">
              {results.riskAmount.toFixed(2)}{" "}
              <span className="text-[10px] sm:text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-muted-foreground">Объем позиции:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formattedVolUsdt}{" "}
              <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                USDT
              </span>
            </span>
            <CopyButton
              key={`usdt-vol-${formattedVolUsdt}`}
              text={formattedVolUsdt}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-muted-foreground">Размер позиции:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm sm:text-base font-semibold text-muted-foreground">
              {formattedCryptoQty}{" "}
              <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                {assetName}
              </span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div
          className={`transition-all duration-300 rounded-lg ${isLeverageTooHigh ? "bg-red-500/10 border border-red-500/30 p-2 -mx-1 space-y-1" : ""}`}
        >
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span
              className={
                isLeverageTooHigh
                  ? "text-red-500 dark:text-red-400 font-medium"
                  : "text-muted-foreground"
              }
            >
              Плечо (выбр. / макс):
            </span>
            <div className="flex items-center justify-end gap-1.5 text-right">
              <span
                className={`text-xs sm:text-sm font-bold transition-colors ${isLeverageTooHigh ? "text-red-500 dark:text-red-400 font-black" : "text-foreground"}`}
              >
                x{results.selectedLeverage}
                <span
                  className={`text-[10px] sm:text-xs font-medium ml-1 ${isLeverageTooHigh ? "text-red-500/70" : "text-muted-foreground"}`}
                >
                  (max: x{results.maxSafeLeverage})
                </span>
              </span>
              <div className="w-7 shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-muted-foreground">Выделяемая маржа:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm sm:text-base font-semibold text-muted-foreground">
              {formattedMargin}{" "}
              <span className="text-[10px] sm:text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm text-amber-600 dark:text-amber-400">
          <span className="font-medium">Цена ликвидации:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm sm:text-base font-black">
              {formattedLiq}{" "}
              <span className="text-[10px] sm:text-xs font-normal">USDT</span>
            </span>
            <CopyButton key={`liq-${formattedLiq}`} text={formattedLiq} />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm border-t pt-2 mt-1">
          <span className="text-muted-foreground">Комиссия Bybit:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
              {results.totalFeeUsdt.toFixed(3)}{" "}
              <span className="text-[9px] sm:text-xs">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-muted-foreground">Чистая прибыль:</span>
          <div className="flex items-center justify-end gap-1.5 text-right">
            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              +{results.netProfitUsdt.toFixed(2)}{" "}
              <span className="text-[10px] sm:text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t w-full">
        <div className="space-y-0.5">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Take Profit (1:{results.riskRewardRatio})
            </span>
            <div className="flex items-center justify-end gap-1.5 text-right">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formattedTP}{" "}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                  USDT
                </span>
              </span>
              <CopyButton key={`tp-${formattedTP}`} text={formattedTP} />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-muted-foreground">Ожидаемый Net ROI:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-8.5">
              +{tpRoiPcnt.toFixed(1)}% (+{results.netProfitUsdt.toFixed(1)}{" "}
              USDT)
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stop Loss
            </span>
            <div className="flex items-center justify-end gap-1.5 text-right">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                {formattedSL}{" "}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                  USDT
                </span>
              </span>
              <CopyButton key={`sl-${formattedSL}`} text={formattedSL} />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-muted-foreground">Ожидаемый Net ROI:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 mr-8.5">
              {slRoiPcnt.toFixed(1)}% (-{slLossUsdt.toFixed(1)} USDT)
            </span>
          </div>
        </div>

        {/* Адаптированная высота h-9.5 для комфортного нажатия пальцем */}
        <Button
          type="button"
          disabled={
            results.positionSizeUsdt <= 0 || isSaving || isLeverageTooHigh
          }
          onClick={handleSaveDeal}
          className={`w-full mt-4 h-9.5 sm:h-10 text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-sm cursor-pointer rounded-xl flex items-center justify-center gap-2 ${
            isLeverageTooHigh
              ? "bg-red-500/10 text-red-500/60 border border-solid border-red-500/20 cursor-not-allowed"
              : saveSuccess
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : duplicateWarning
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Фиксация...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4 animate-bounce" />
              Сохранено!
            </>
          ) : duplicateWarning ? (
            <>
              <FolderPlus className="h-4 w-4" />
              Позиция открыта
            </>
          ) : isLeverageTooHigh ? (
            <>Уменьшите плечо</>
          ) : (
            <>
              <FolderPlus className="h-4 w-4" />
              Зафиксировать в журнал
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
