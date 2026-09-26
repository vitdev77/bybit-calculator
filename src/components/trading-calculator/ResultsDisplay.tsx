"use client";

import React, { useState } from "react";
import { Copy, Check, PlusCircle, Loader } from "lucide-react";
import { toast } from "@/components/ui/toast";

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
    allocatedMarginMax: number;
    decimals: number;
    totalFeeUsdt: number;
    netProfitUsdt: number;
    riskRewardRatio: number;
    liquidationPrice: number;
  };
  coin: string;
  entryPrice: number;
  orderType: "MARKET" | "LIMIT";
  side: "BUY" | "SELL";
}

export default function ResultsDisplay({
  results,
  coin,
  entryPrice,
  orderType,
  side,
}: ResultsDisplayProps) {
  const isLong = side === "BUY";
  const coinBase = coin.replace("USDT", "");
  const [isSaving, setIsSaving] = useState(false);

  const [copiedEntry, setCopiedEntry] = useState(false);
  const [copiedVolume, setCopiedVolume] = useState(false);
  const [copiedTP, setCopiedTP] = useState(false);
  const [copiedSL, setCopiedSL] = useState(false);

  const openFeeRate = 0.0006;
  const closeFeeRate = 0.0006;

  const breakevenPrice = isLong
    ? entryPrice * ((1 + openFeeRate) / (1 - closeFeeRate - 0.0001))
    : entryPrice * ((1 - openFeeRate) / (1 + closeFeeRate + 0.0001));

  const cryptoPrecision =
    results.decimals === 2 ? 3 : results.decimals === 5 ? 1 : 2;

  const roiPercent =
    results.marginUsed > 0
      ? (results.netProfitUsdt / results.marginUsed) * 100
      : 0;

  const maxLossPercent = (results.riskAmount / (results.marginUsed || 1)) * 100;

  const handleCopy = (
    value: number,
    type: "entry" | "volume" | "tp" | "sl",
    precisionOverride?: number,
  ) => {
    const activePrecision =
      precisionOverride !== undefined ? precisionOverride : results.decimals;
    const textToCopy = value.toFixed(activePrecision);
    navigator.clipboard.writeText(textToCopy);

    if (type === "entry") {
      setCopiedEntry(true);
      setTimeout(() => setCopiedEntry(false), 2000);
    } else if (type === "volume") {
      setCopiedVolume(true);
      setTimeout(() => setCopiedVolume(false), 2000);
    } else if (type === "tp") {
      setCopiedTP(true);
      setTimeout(() => setCopiedTP(false), 2000);
    } else if (type === "sl") {
      setCopiedSL(true);
      setTimeout(() => setCopiedSL(false), 2000);
    }
  };
  const handleSaveToJournal = async () => {
    if (entryPrice <= 0 || results.positionSizeUsdt <= 0 || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin,
          side,
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

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Ошибка");
      }

      toast.add({
        title: "Сделка зафиксирована",
        description: `Ордер по паре ${coin} добавлен.`,
        type: "success",
      });

      window.dispatchEvent(new Event("refresh-trading-journal"));
    } catch (err: any) {
      console.warn("Дублирование:", err.message);
      toast.add({
        title: "Ордер не добавлен",
        description:
          err.message === "Duplicate detected"
            ? "Эта открытая сделка уже есть в журнале."
            : err.message,
        type: "warning",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="space-y-4 flex flex-col h-full justify-between">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center items-center text-center min-h-21">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 block mb-1">
            Ожидаемый профит
          </span>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-500 leading-none">
                +{results.netProfitUsdt.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-emerald-500/80 leading-none">
                USDT
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-500/80 block mt-1">
              (+{roiPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-center items-center text-center min-h-21">
          {/* ФИКС: Оставлено только фиксированное лаконичное название для всех экранов */}
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500/70 block mb-1">
            Макс. убыток
          </span>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-500 leading-none">
                -{results.riskAmount.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-rose-500/80 leading-none">
                USDT
              </span>
            </div>
            <span className="text-xs font-bold text-rose-500/80 block mt-1">
              (-{maxLossPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2.5">
        <div className="flex items-center justify-between border-b pb-1.5 select-none">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            Панель ордера
          </span>
          <div className="flex items-center gap-1.5">
            <span
              style={{ padding: "0px 4px" }}
              className="font-bold bg-muted text-foreground border border-border/40 text-[10px] rounded shadow-sm"
            >
              {coin}
            </span>
            <span
              style={{ padding: "0px 4px" }}
              className={`text-[10px] font-black text-white rounded tracking-wide ${isLong ? "bg-emerald-500" : "bg-rose-500"}`}
            >
              {isLong ? "LONG" : "SHORT"}
            </span>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium">
              Тип ордера:
            </span>
            <span
              style={{ padding: "1px 5px" }}
              className={`rounded text-[9px] font-black border ${orderType === "LIMIT" ? "bg-violet-500/10 text-violet-500 border-violet-500/15" : "bg-blue-500/10 text-blue-500 border-blue-500/15"}`}
            >
              {orderType}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium">
              Цена входа:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground bg-muted/40 px-1.5 py-0.5 rounded text-sm">
                {entryPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(entryPrice, "entry")}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground rounded border-none bg-transparent cursor-pointer"
              >
                {copiedEntry ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium">
              Объем (USDT):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-bold bg-muted/40 text-foreground border text-sm shadow-sm rounded"
              >
                {results.positionSizeUsdt.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(results.positionSizeUsdt, "volume", 1)
                }
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground rounded border-none bg-transparent cursor-pointer"
              >
                {copiedVolume ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium">
              Take Profit (TP):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-black bg-emerald-500 text-white rounded border text-sm shadow-sm"
              >
                {results.takeProfitPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(results.takeProfitPrice, "tp")}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-emerald-500 rounded border-none bg-transparent cursor-pointer"
              >
                {copiedTP ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium">
              Stop Loss (SL):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-black bg-rose-500 text-white rounded border text-sm shadow-sm"
              >
                {results.stopLossPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(results.stopLossPrice, "sl")}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-rose-500 rounded border-none bg-transparent cursor-pointer"
              >
                {copiedSL ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-border/30 pt-2 mt-1">
            <span className="text-muted-foreground/60 font-medium">
              Безубыток (Fee+):
            </span>
            <div className="flex items-center gap-2 pr-7.5">
              <span
                style={{ padding: "0px 4px" }}
                className="font-normal bg-amber-500 text-white rounded border text-sm shadow-sm"
              >
                {breakevenPrice.toFixed(results.decimals)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              Ликвидация (Iso):
            </span>
            <div className="flex items-center gap-2 pr-7.5">
              <span
                style={{ padding: "0px 4px" }}
                className="font-normal bg-rose-600 text-white rounded text-sm shadow-sm"
              >
                {results.liquidationPrice > 0
                  ? results.liquidationPrice.toFixed(results.decimals)
                  : "0.00"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border/30 pt-2.5 text-center">
        <div className="flex flex-col justify-center min-h-10.5">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase block mb-0.5">
            Объем ({coinBase})
          </span>
          <span className="text-sm font-black text-foreground truncate leading-none">
            {results.positionSizeCrypto.toFixed(cryptoPrecision)}
          </span>
        </div>
        <div className="flex flex-col justify-center min-h-10.5 border-l px-1">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase block mb-0.5">
            Итого плечо
          </span>
          <span className="text-sm font-black text-foreground truncate leading-none">
            x{results.selectedLeverage}
          </span>
        </div>
        <div className="flex flex-col justify-center min-h-10.5 border-l pl-1">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase block mb-0.5">
            Маржа (USDT)
          </span>
          <span className="text-sm font-black text-amber-500 truncate leading-none">
            {results.marginUsed.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="w-full pt-1">
        <button
          type="button"
          disabled={
            isSaving || entryPrice <= 0 || results.positionSizeUsdt <= 0
          }
          onClick={handleSaveToJournal}
          className={`w-full h-11 sm:h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm border border-transparent transition-all tracking-wide select-none ${isSaving || entryPrice <= 0 || results.positionSizeUsdt <= 0 ? "bg-muted/30 text-muted-foreground/30 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/10 cursor-pointer active:scale-[0.98]"}`}
        >
          {isSaving ? (
            <Loader className="size-4 shrink-0 animate-spin" />
          ) : (
            <PlusCircle className="size-4 shrink-0" />
          )}
          <span>{isSaving ? "Сохранение..." : "Зафиксировать в журнал"}</span>
        </button>
      </div>
    </div>
  );
}
