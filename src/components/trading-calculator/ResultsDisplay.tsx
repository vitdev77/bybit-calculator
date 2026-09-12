"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

// ИСПРАВЛЕНО: Кнопка стала выразительной, заметной, со стильной подложкой и четким ховер-эффектом
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
export default function ResultsDisplay({ results, coin }: ResultsDisplayProps) {
  const assetName = coin.replace("USDT", "");

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

  const isLeverageTooLow = results.selectedLeverage < results.maxSafeLeverage;

  const tpRoiPcnt =
    results.marginUsed > 0
      ? (results.netProfitUsdt / results.marginUsed) * 100
      : 0;

  const slLossUsdt = results.riskAmount;
  const slRoiPcnt =
    results.marginUsed > 0 ? (-slLossUsdt / results.marginUsed) * 100 : 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Верхний блок расчётов */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Итоговый Риск (с ком.):</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-base font-semibold text-rose-500">
              {results.riskAmount.toFixed(2)}{" "}
              <span className="text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        {/* Объем позиции в USDT с новой сочной кнопкой */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Объем позиции:</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formattedVolUsdt}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                USDT
              </span>
            </span>
            <CopyButton
              key={`usdt-vol-${formattedVolUsdt}`}
              text={formattedVolUsdt}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Размер позиции:</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-base font-semibold text-muted-foreground">
              {formattedCryptoQty}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {assetName}
              </span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Плечо (выбр. / макс):</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span
              className={`text-sm font-bold ${isLeverageTooLow ? "text-amber-500 font-extrabold" : "text-foreground"}`}
            >
              x{results.selectedLeverage}
              <span className="text-xs font-medium text-muted-foreground ml-1">
                (макс: x{results.maxSafeLeverage})
              </span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Выделяемая маржа:</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-base font-semibold text-muted-foreground">
              {formattedMargin}{" "}
              <span className="text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        {/* Цена ликвидации позиции */}
        <div className="flex justify-between items-center text-sm text-amber-600 dark:text-amber-400">
          <span className="font-medium">Цена liquidationPrice:</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-base font-black">
              {formattedLiq} <span className="text-xs font-normal">USDT</span>
            </span>
            <CopyButton key={`liq-${formattedLiq}`} text={formattedLiq} />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm border-t pt-2 mt-1">
          <span className="text-muted-foreground">Комиссия Bybit (круг):</span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-xs font-medium text-muted-foreground">
              {results.totalFeeUsdt.toFixed(3)}{" "}
              <span className="text-xs">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Чистая прибыль (1:{results.riskRewardRatio}):
          </span>
          <div className="w-45 flex items-center justify-end gap-1.5 text-right">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              +{results.netProfitUsdt.toFixed(2)}{" "}
              <span className="text-xs font-normal">USDT</span>
            </span>
            <div className="w-7 shrink-0" />
          </div>
        </div>
      </div>

      {/* Нижний блок ордеров с ROI */}
      <div className="space-y-3 pt-3 border-t w-full">
        {/* Блок Take Profit */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Take Profit (1:{results.riskRewardRatio})
            </span>
            <div className="w-45 flex items-center justify-end gap-1.5 text-right">
              <span className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formattedTP}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  USDT
                </span>
              </span>
              <CopyButton key={`tp-${formattedTP}`} text={formattedTP} />
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Ожидаемый Net ROI:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-8.5">
              +{tpRoiPcnt.toFixed(2)}% (+{results.netProfitUsdt.toFixed(2)}{" "}
              USDT)
            </span>
          </div>
        </div>

        {/* Блок Stop Loss */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stop Loss
            </span>
            <div className="w-45 flex items-center justify-end gap-1.5 text-right">
              <span className="text-xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                {formattedSL}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  USDT
                </span>
              </span>
              <CopyButton key={`sl-${formattedSL}`} text={formattedSL} />
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Ожидаемый Net ROI:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 mr-8.5">
              {slRoiPcnt.toFixed(2)}% (-{slLossUsdt.toFixed(2)} USDT)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
