"use client";

import React, { useState } from "react";
import { Copy, PlusCircle } from "lucide-react";
// Импортируем менеджер toast напрямую из вашего файла компонентов
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

  // Расчет цены безубытка с учетом комиссий Bybit на вход и выход
  const totalFeeRate = (orderType === "LIMIT" ? 0.0002 : 0.00055) + 0.00055;
  const breakevenPrice = isLong
    ? entryPrice * (1 + totalFeeRate)
    : entryPrice * (1 - totalFeeRate);

  const cryptoPrecision =
    results.decimals === 2 ? 3 : results.decimals === 5 ? 1 : 2;
  const roiPercent =
    results.marginUsed > 0
      ? (results.netProfitUsdt / results.marginUsed) * 100
      : 0;

  // Уведомление Copied при копировании
  const handleCopy = (value: number, precisionOverride?: number) => {
    const activePrecision =
      precisionOverride !== undefined ? precisionOverride : results.decimals;
    const textToCopy = value.toFixed(activePrecision);
    navigator.clipboard.writeText(textToCopy);
    try {
      toast.add({
        title: "Copied",
        type: "success",
      });
    } catch (e) {
      console.log("Toast error:", e);
    }
  };

  // ФИКС ПОДСВЕТКИ: Асинхронное сохранение сделки напрямую в Neon DB через API роут
  const handleSaveToJournal = async () => {
    if (entryPrice <= 0 || results.positionSizeUsdt <= 0) return;
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

      if (!response.ok) throw new Error("API error");

      toast.add({
        title: "Сделка зафиксирована",
        description: `Ордер по паре ${coin} успешно добавлен в Ваш журнал сделок.`,
        type: "success",
      });

      // ФИКС ТИПОВ: Используем директиву, чтобы TS перестал ругаться на кастомное событие
      // @ts-ignore
      window.dispatchEvent(new Event("refresh-trading-journal"));
    } catch (err) {
      console.error("Save error:", err);
      toast.add({
        title: "Ошибка сохранения",
        description: "Не удалось отправить сделку в облачную базу данных.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-full justify-between">
      {/* СЕКЦИЯ 1: Финансовая сводка */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 select-none">
            Ожидаемый профит
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-emerald-500 leading-none">
              +{roiPercent.toFixed(2)}%
            </span>
            <span className="text-[10px] font-bold text-emerald-500/90 block mt-0.5 whitespace-nowrap">
              (+{results.netProfitUsdt.toFixed(2)} USDT)
            </span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500/70 select-none">
            Максимальный убыток
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-rose-500 leading-none">
              -
              {((results.riskAmount / (results.marginUsed || 1)) * 100).toFixed(
                2,
              )}
              %
            </span>
            <span className="text-[10px] font-bold text-rose-500/90 block mt-0.5 whitespace-nowrap">
              (-{results.riskAmount.toFixed(2)} USDT)
            </span>
          </div>
        </div>
      </div>
      {/* СЕКЦИЯ 2: Блок ценовых уровней на прозрачном подложке по Вашему дизайну */}
      <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/30 pb-1.5 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Параметры для ордера Bybit
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
              className={`text-[10px] font-black text-white rounded tracking-wide ${
                isLong ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
              }`}
            >
              {isLong ? "LONG" : "SHORT"}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          {/* 1. Цена входа */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium select-none">
              Цена входа:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground bg-muted/40 px-1.5 py-0.5 rounded text-sm border border-transparent">
                {entryPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(entryPrice)}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground rounded transition-colors cursor-pointer border-none bg-transparent"
                title="Скопировать цену входа"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Объем (USDT) */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium select-none">
              Объем ордера (USDT):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-bold bg-muted/40 text-foreground border border-border/40 text-sm shadow-sm rounded"
              >
                {results.positionSizeUsdt.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(results.positionSizeUsdt, 1)}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground rounded transition-colors cursor-pointer border-none bg-transparent"
                title="Скопировать объем в USDT для Bybit"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Take Profit */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium select-none">
              Take Profit (TP):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-black bg-emerald-500 text-white rounded border border-emerald-400/20 text-sm shadow-sm"
              >
                {results.takeProfitPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(results.takeProfitPrice)}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-emerald-500 rounded transition-colors cursor-pointer border-none bg-transparent"
                title="Скопировать Take Profit"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Stop Loss */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground/80 font-medium select-none">
              Stop Loss (SL):
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ padding: "0px 4px" }}
                className="font-black bg-rose-500 text-white rounded border border-rose-400/20 text-sm shadow-sm animate-pulse"
              >
                {results.stopLossPrice.toFixed(results.decimals)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(results.stopLossPrice)}
                className="p-1 hover:bg-muted/60 text-muted-foreground/60 hover:text-rose-500 rounded transition-colors cursor-pointer border-none bg-transparent"
                title="Скопировать Stop Loss"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 5. Цена безубытка */}
          <div className="flex justify-between items-center border-t border-border/30 pt-2 mt-1">
            <span className="text-muted-foreground/60 font-medium select-none">
              Безубыток (Fee+):
            </span>
            <div className="flex items-center gap-2 pr-7.5">
              <span
                style={{ padding: "0px 4px" }}
                className="font-normal bg-amber-500 text-white rounded border border-amber-400/20 text-sm shadow-sm"
              >
                {breakevenPrice.toFixed(results.decimals)}
              </span>
            </div>
          </div>

          {/* 6. Цена ликвидации */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-rose-400 font-bold flex items-center gap-1 select-none">
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

      {/* СЕКЦИЯ 3: Параметры маржинального объема позиции (Информационный подвал) */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/30 pt-2.5">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight select-none">
            Объем ({coinBase})
          </span>
          <span className="text-xs font-bold text-foreground mt-0.5 truncate">
            {results.positionSizeCrypto.toFixed(cryptoPrecision)}
          </span>
        </div>

        <div className="flex flex-col border-l border-border/40 pl-2">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight select-none">
            Итоговое плечо
          </span>
          <span className="text-xs font-bold text-foreground mt-0.5 truncate">
            x{results.selectedLeverage}
          </span>
        </div>

        <div className="flex flex-col border-l border-border/40 pl-2">
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight select-none">
            Маржа (USDT)
          </span>
          <span className="text-xs font-black text-amber-500 mt-0.5 truncate">
            {results.marginUsed.toFixed(2)}
          </span>
        </div>
      </div>

      {/* СЕКЦИЯ 4: Кнопка фиксации сделки */}
      <div className="w-full pt-1">
        <button
          type="button"
          disabled={
            isSaving || entryPrice <= 0 || results.positionSizeUsdt <= 0
          }
          onClick={handleSaveToJournal}
          className={`w-full h-9 sm:h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border border-transparent transition-all tracking-wide select-none ${
            isSaving || entryPrice <= 0 || results.positionSizeUsdt <= 0
              ? "bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
              : "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/10 cursor-pointer active:scale-[0.98]"
          }`}
        >
          <PlusCircle className="size-4" />
          <span>{isSaving ? "Сохранение..." : "Зафиксировать в журнал"}</span>
        </button>
      </div>
    </div>
  );
}
