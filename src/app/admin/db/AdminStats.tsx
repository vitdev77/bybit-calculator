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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card className="border border-border/30 bg-muted/10 rounded-xl">
        <CardHeader className="py-2 px-3 border-b border-border/10">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
            Структура СУБД
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 flex items-center gap-3">
          <Layers className="size-5 text-violet-500 shrink-0" />
          <div>
            <span className="text-xs font-black uppercase text-foreground leading-tight">
              table: {activeTable}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-semibold mt-0.5 block">
              Строк: {displayedRowsCount} из {totalRowsCount}
            </span>
          </div>
        </CardContent>
      </Card>
      {activeTable === "deals" ? (
        <>
          <Card className="border border-border/30 bg-muted/10 rounded-xl">
            <CardHeader className="py-2 px-3 border-b border-border/10">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                Net PnL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex items-center gap-3">
              {dm.totalPnl >= 0 ? (
                <TrendingUp className="size-5 text-emerald-500 shrink-0" />
              ) : (
                <TrendingDown className="size-5 text-rose-500 shrink-0" />
              )}
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
                  Винрейт: {dm.winRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/30 bg-muted/10 rounded-xl">
            <CardHeader className="py-2 px-3 border-b border-border/10">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                Позиции
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex items-center gap-3">
              <Activity className="size-5 text-amber-500 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-black text-foreground">
                  {dm.openCount}{" "}
                  <span className="text-[10px] text-muted-foreground/60 font-bold">
                    открыто
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                  Маржа: {dm.totalMargin.toFixed(1)} USDT
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="border border-border/30 bg-muted/10 rounded-xl">
            <CardHeader className="py-2 px-3 border-b border-border/10">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                Трекинг
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex items-center gap-3">
              <Star className="size-5 text-amber-400 shrink-0 fill-amber-400" />
              <div>
                <span className="text-sm font-black text-foreground">
                  {favCount}{" "}
                  <span className="text-[10px] text-muted-foreground/60 font-bold">
                    избранное
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/30 bg-muted/10 rounded-xl">
            <CardHeader className="py-2 px-3 border-b border-border/10">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                Статус
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex items-center gap-3">
              <AlertOctagon className="size-5 text-rose-500 shrink-0" />
              <span className="text-sm font-black text-rose-500">
                {delistedCount}{" "}
                <span className="text-[10px] text-muted-foreground/60 font-bold">
                  архив (Активно: {activeCount})
                </span>
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
