"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  AlertOctagon,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsProps {
  activeTable: "deals" | "coins";
  displayedRowsCount: number;
  totalRowsCount: number;
  dm: {
    totalPnl: number;
    winRate: number;
    openCount: number;
    totalMargin: number;
  };
  favCount: number;
  delistedCount: number;
  activeCount: number;
}

export function AdminStats({
  activeTable,
  displayedRowsCount,
  totalRowsCount,
  dm,
  favCount,
  delistedCount,
  activeCount,
}: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
      {/* КАРТОЧКА 1: СТРУКТУРА СУБД */}
      <div
        className={cn(
          "flex flex-col rounded-2xl border bg-linear-to-br p-3 relative",
          "overflow-hidden transition-all duration-300 shadow-inner",
          "from-violet-500/10 via-violet-500/2 to-transparent border-violet-500/20",
        )}
      >
        <Layers
          className={cn(
            "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
            "stroke-[1.5] text-violet-500",
          )}
        />
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-widest leading-none",
            "text-violet-500/70",
          )}
        >
          Структура СУБД
        </span>
        <div className="flex items-center gap-3 mt-2.5 z-10">
          <Layers className="size-5 text-violet-500 shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs font-black uppercase text-foreground truncate">
              table: {activeTable}
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
              Строк:{" "}
              <span className="text-foreground font-bold">
                {displayedRowsCount}
              </span>{" "}
              из {totalRowsCount}
            </span>
          </div>
        </div>
      </div>

      {activeTable === "deals" ? (
        <>
          {/* КАРТОЧКА 2 ДЛЯ ЖУРНАЛА: NET PNL */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border bg-linear-to-br p-3 relative",
              "overflow-hidden transition-all duration-300 shadow-inner",
              dm.totalPnl >= 0
                ? "from-emerald-500/12 via-emerald-500/2 to-transparent border-emerald-500/20"
                : "from-rose-500/12 via-rose-500/2 to-transparent border-rose-500/20",
            )}
          >
            {dm.totalPnl >= 0 ? (
              <TrendingUp
                className={cn(
                  "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
                  "stroke-[1.5] text-emerald-500",
                )}
              />
            ) : (
              <TrendingDown
                className={cn(
                  "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
                  "stroke-[1.5] text-rose-500",
                )}
              />
            )}
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-widest leading-none",
                dm.totalPnl >= 0 ? "text-emerald-500/70" : "text-rose-500/70",
              )}
            >
              Финансовый результат
            </span>
            <div className="flex items-center gap-3 mt-2.5 z-10">
              <Wallet
                className={cn(
                  "size-5 shrink-0",
                  dm.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500",
                )}
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span
                  className={cn(
                    "text-sm font-black truncate",
                    dm.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500",
                  )}
                >
                  {dm.totalPnl >= 0 ? "+" : ""}
                  {dm.totalPnl.toFixed(2)}
                  <span className="text-[9px] font-bold opacity-60 ml-0.5">
                    USDT
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                  Винрейт системы:{" "}
                  <span className="text-foreground font-bold">
                    {dm.winRate.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* КАРТОЧКА 3 ДЛЯ ЖУРНАЛА: ПОЗИЦИИ */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border bg-linear-to-br p-3 relative",
              "overflow-hidden transition-all duration-300 shadow-inner",
              "from-amber-500/12 via-amber-500/2 to-transparent border-amber-500/20",
            )}
          >
            <Activity
              className={cn(
                "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
                "stroke-[1.5] text-amber-500",
              )}
            />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-amber-500/70">
              Торговая активность
            </span>
            <div className="flex items-center gap-3 mt-2.5 z-10">
              <Activity className="size-5 text-amber-500 shrink-0" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-black text-foreground">
                  {dm.openCount}{" "}
                  <span className="text-[10px] text-muted-foreground/60 font-bold">
                    активных ордеров
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                  Занято маржи:{" "}
                  <span className="text-amber-500 font-bold">
                    {dm.totalMargin.toFixed(1)}
                  </span>{" "}
                  USDT
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* КАРТОЧКА 2 ДЛЯ ЛИСТИНГА: ТРЕКИНГ */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border bg-linear-to-br p-3 relative",
              "overflow-hidden transition-all duration-300 shadow-inner",
              "from-amber-500/12 via-amber-500/2 to-transparent border-amber-500/20",
            )}
          >
            <Star
              className={cn(
                "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
                "stroke-[1.5] text-amber-400 fill-amber-400/20",
              )}
            />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-amber-500/70">
              Мониторинг пар
            </span>
            <div className="flex items-center gap-3 mt-2.5 z-10">
              <Star className="size-5 text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-black text-foreground">
                  {favCount}{" "}
                  <span className="text-[10px] text-muted-foreground/60 font-bold">
                    в избранном
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                  Помечено звёздочкой для селектора
                </span>
              </div>
            </div>
          </div>

          {/* КАРТОЧКА 3 ДЛЯ ЛИСТИНГА: СТАТУС АРХИВА */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border bg-linear-to-br p-3 relative",
              "overflow-hidden transition-all duration-300 shadow-inner",
              "from-rose-500/12 via-rose-500/2 to-transparent border-rose-500/20",
            )}
          >
            <AlertOctagon
              className={cn(
                "absolute right-3.5 top-3.5 size-14 opacity-5 pointer-events-none",
                "stroke-[1.5] text-rose-500",
              )}
            />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-rose-500/70">
              Статус инструментов
            </span>
            <div className="flex items-center gap-3 mt-2.5 z-10">
              <AlertOctagon className="size-5 text-rose-500 shrink-0" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-black text-rose-500">
                  {delistedCount}{" "}
                  <span className="text-[10px] text-muted-foreground/60 font-bold">
                    в архиве
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                  Доступно к торгам (активно):{" "}
                  <span className="text-foreground font-bold">
                    {activeCount}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
