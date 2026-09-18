"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Settings2, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface BalanceRiskFormProps {
  balance: number;
  setBalance: (v: number) => void;
  riskPercent: number;
  setRiskPercent: (v: number) => void;
  leverage: number;
  setLeverage: (v: number) => void;
  side: "BUY" | "SELL";
  setSide: (v: "BUY" | "SELL") => void;
  maxSafeLeverage: number;
  selectedCoin: string;
  partsCount: number;
  setPartsCount: (v: number) => void;
  onAutoLeverage: () => void;
  isLeverageModified: boolean;
  orderType: "MARKET" | "LIMIT";
  futTaker: number;
  setFutTaker: (v: number) => void;
  futMaker: number;
  setFutMaker: (v: number) => void;
  spotTaker: number;
  setSpotTaker: (v: number) => void;
  spotMaker: number;
  setSpotMaker: (v: number) => void;
}

export default function BalanceRiskForm({
  balance,
  setBalance,
  riskPercent,
  setRiskPercent,
  leverage,
  setLeverage,
  side,
  setSide,
  maxSafeLeverage,
  partsCount,
  setPartsCount,
  onAutoLeverage,
  isLeverageModified,
  orderType,
  futTaker,
  setFutTaker,
  futMaker,
  setFutMaker,
  spotTaker,
  setSpotTaker,
  spotMaker,
  setSpotMaker,
}: BalanceRiskFormProps) {
  const partsPresets = [1, 2, 3, 5, 10];
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Буферные стейты для редактирования полей в диалоге
  const [tFutTaker, setTempFutTaker] = useState(futTaker);
  const [tFutMaker, setTempFutMaker] = useState(futMaker);
  const [tSpotTaker, setTempSpotTaker] = useState(spotTaker);
  const [tSpotMaker, setTempSpotMaker] = useState(spotMaker);

  const isSpotMode = leverage === 1;

  const handleOpenModal = () => {
    setTempFutTaker(futTaker);
    setTempFutMaker(futMaker);
    setTempSpotTaker(spotTaker);
    setTempSpotMaker(spotMaker);
    setIsOpen(true);
  };

  // Проверка: изменились ли данные по сравнению с базой
  const isDataChanged =
    tFutTaker !== futTaker ||
    tFutMaker !== futMaker ||
    tSpotTaker !== spotTaker ||
    tSpotMaker !== spotMaker;
  const handleSaveToDb = async () => {
    if (!isDataChanged) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futTaker: tFutTaker,
          futMaker: tFutMaker,
          spotTaker: tSpotTaker,
          spotMaker: tSpotMaker,
        }),
      });
      if (!res.ok) throw new Error();

      setFutTaker(tFutTaker);
      setFutMaker(tFutMaker);
      setSpotTaker(tSpotTaker);
      setSpotMaker(tSpotMaker);

      toast.add({
        title: "Данные сохранены",
        description: "Тарифная сетка обновлена в таблице fee_settings.",
        type: "success",
      });
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* КНОПКИ LONG / SHORT */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`h-11 sm:h-12 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer select-none tracking-wider ${
            side === "BUY"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          LONG (BUY)
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`h-11 sm:h-12 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer select-none tracking-wider ${
            side === "SELL"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          SHORT (SELL)
        </button>
      </div>

      {/* ТРЕХКОЛОНОЧНЫЙ РЯД КЛЮЧЕВЫХ ПАРАМЕТРОВ ОРДЕРА */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 items-start">
        {/* ДЕПОЗИТ */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Депозит
          </label>
          <Input
            type="number"
            min="0"
            value={balance === 0 ? "0" : balance || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setBalance(isNaN(val) || val < 0 ? 0 : val);
            }}
            onWheel={(e) => {
              e.preventDefault();
              const step = e.deltaY < 0 ? 10 : -10;
              setBalance(Math.max(0, balance + step));
            }}
            className={`h-9 text-xs font-bold transition-all ${
              balance <= 0
                ? "border-rose-500/60 ring-2 ring-rose-500/20 text-rose-500 bg-rose-500/5"
                : "bg-muted/20 border-border/40"
            }`}
          />
        </div>

        {/* РИСК */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Риск (%)
          </label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={riskPercent === 0 ? "0" : riskPercent || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRiskPercent(isNaN(val) || val < 0 ? 0 : val);
            }}
            onWheel={(e) => {
              e.preventDefault();
              const step = e.deltaY < 0 ? 0.1 : -0.1;
              const next = parseFloat((riskPercent + step).toFixed(1));
              setRiskPercent(Math.max(0, Math.min(100, next)));
            }}
            className={`h-9 text-xs font-bold transition-all ${
              riskPercent > 5
                ? "border-rose-500/60 ring-2 ring-rose-500/20 text-rose-500 bg-rose-500/5"
                : riskPercent === 0
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 text-amber-500 bg-amber-500/5"
                  : "bg-muted/20 border-border/40"
            }`}
          />
        </div>

        {/* ПЛЕЧО */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Плечо
          </label>
          <div className="relative flex items-center w-full">
            <Input
              type="number"
              min="1"
              max={maxSafeLeverage}
              value={leverage || ""}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 1;
                if (val > maxSafeLeverage) val = maxSafeLeverage;
                setLeverage(val);
              }}
              onWheel={(e) => {
                e.preventDefault();
                const step = e.deltaY < 0 ? 1 : -1;
                setLeverage(
                  Math.max(1, Math.min(maxSafeLeverage, leverage + step)),
                );
              }}
              className={`h-9 text-xs font-bold transition-all bg-muted/20 border-border/40 ${
                isLeverageModified
                  ? "border-amber-500/60 ring-2 ring-amber-500/20 text-amber-500 pr-7"
                  : "pr-2"
              }`}
            />
            {isLeverageModified && (
              <Button
                type="button"
                variant="ghost"
                onClick={onAutoLeverage}
                className="absolute right-0.5 h-7 w-7 p-0 text-amber-500 hover:text-amber-600 bg-transparent flex items-center justify-center rounded-md hover:bg-amber-500/10 transition-colors"
                title="Вернуть расчетное идеальное плечо"
              >
                <RotateCcw className="size-3.5 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* РАСПРЕДЕЛЕНИЕ ДЕПОЗИТА */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
            Распределение депозита
          </label>

          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger
              onClick={handleOpenModal}
              render={
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-amber-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
                />
              }
            >
              <Settings2 className="size-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl max-w-sm p-5 bg-popover border border-border/40 shadow-2xl">
              <AlertDialogHeader className="text-left space-y-1 pb-2 border-b border-border/20">
                <AlertDialogTitle className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                  Тарифная сетка аккаунта
                </AlertDialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {isSpotMode
                    ? "Сейчас активен СПОТ рынок (Плечо x1)"
                    : "Сейчас активны ФЬЮЧЕРСЫ"}
                </p>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                {/* БЛОК ФЬЮЧЕРСОВ */}
                <div className="space-y-2 p-2 rounded-xl bg-muted/20 border border-border/20">
                  <span className="text-[9px] font-black text-amber-500 block uppercase px-1">
                    Фьючерсы
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Taker (Маркет)</span>
                        {!isSpotMode && orderType === "MARKET" && (
                          <CheckCircle2 className="size-2.5 text-emerald-500" />
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={tFutTaker}
                        onChange={(e) =>
                          setTempFutTaker(parseFloat(e.target.value) || 0)
                        }
                        className={`h-8 text-xs font-bold ${!isSpotMode && orderType === "MARKET" ? "border-amber-500/80 bg-amber-500/5 text-amber-500" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Maker (Лимит)</span>
                        {!isSpotMode && orderType === "LIMIT" && (
                          <CheckCircle2 className="size-2.5 text-emerald-500" />
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={tFutMaker}
                        onChange={(e) =>
                          setTempFutMaker(parseFloat(e.target.value) || 0)
                        }
                        className={`h-8 text-xs font-bold ${!isSpotMode && orderType === "LIMIT" ? "border-amber-500/80 bg-amber-500/5 text-amber-500" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* БЛОК СПОТА */}
                <div className="space-y-2 p-2 rounded-xl bg-muted/20 border border-border/20">
                  <span className="text-[9px] font-black text-violet-500 block uppercase px-1">
                    Спот рынок
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Taker (Маркет)</span>
                        {isSpotMode && orderType === "MARKET" && (
                          <CheckCircle2 className="size-2.5 text-emerald-500" />
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={tSpotTaker}
                        onChange={(e) =>
                          setTempSpotTaker(parseFloat(e.target.value) || 0)
                        }
                        className={`h-8 text-xs font-bold ${isSpotMode && orderType === "MARKET" ? "border-amber-500/80 bg-amber-500/5 text-amber-500" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Maker (Лимит)</span>
                        {isSpotMode && orderType === "LIMIT" && (
                          <CheckCircle2 className="size-2.5 text-emerald-500" />
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.0001"
                        value={tSpotMaker}
                        onChange={(e) =>
                          setTempSpotMaker(parseFloat(e.target.value) || 0)
                        }
                        className={`h-8 text-xs font-bold ${isSpotMode && orderType === "LIMIT" ? "border-amber-500/80 bg-amber-500/5 text-amber-500" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <AlertDialogFooter className="gap-2 pt-2 border-t border-border/20">
                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer border border-border/60">
                  Отмена
                </AlertDialogCancel>
                <Button
                  type="button"
                  disabled={!isDataChanged || isSaving}
                  onClick={handleSaveToDb}
                  className={`rounded-xl text-xs h-9 font-bold px-4 shadow-md transition-all ${
                    isDataChanged
                      ? "bg-violet-600 hover:bg-violet-700 text-white cursor-pointer active:scale-[0.98]"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  }`}
                >
                  {isSaving ? "Сохранение..." : "Сохранить в базу"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Tabs
          value={String(partsCount)}
          onValueChange={(val) => setPartsCount(Number(val) || 1)}
          className="w-full"
        >
          <TabsList className="w-full h-9 grid grid-cols-5 p-0.5 bg-muted/40 dark:bg-muted/10 border border-border/40 rounded-xl shadow-inner">
            {partsPresets.map((preset) => (
              <TabsTrigger
                key={`preset-${preset}`}
                value={String(preset)}
                className="text-xs font-normal tracking-wider rounded-lg transition-all cursor-pointer select-none py-1 text-muted-foreground
                  hover:bg-muted/60 dark:hover:bg-white/5 hover:text-foreground
                  data-active:bg-amber-500 data-active:text-white data-active:font-black data-active:shadow-md data-active:scale-[1.01] data-active:border-none
                  data-active:hover:bg-amber-500 data-active:hover:text-white
                  dark:data-active:bg-amber-500 dark:data-active:text-white dark:data-active:font-black dark:data-active:border-none
                  dark:data-active:hover:bg-amber-500"
              >
                1/{preset}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
