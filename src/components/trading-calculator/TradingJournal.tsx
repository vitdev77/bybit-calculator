"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { JournalStats } from "./JournalStats";
import { JournalFilters } from "./JournalFilters";
import { JournalTable } from "./JournalTable";
import { JournalRow } from "./JournalRow";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  LogIn,
  ShieldCheck,
  Rocket,
  AlertTriangle,
} from "lucide-react";

interface Deal {
  id: number;
  created_at: string;
  coin: string;
  side: "BUY" | "SELL";
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  volume: number;
  margin: number;
  leverage: number;
  status: "OPEN" | "PROFIT" | "LOSS" | "CLOSED";
  closed_at_price?: number | string | null;
}

interface TradingJournalProps {
  onDealsCountChange?: (summary: { open: number; closed: number }) => void;
  livePrice?: number;
  activeCoin?: string;
  onCoinSelect?: (coin: string) => void;
}

const JOURNAL_PRECISION_MAP: Record<string, number> = {
  BTCUSDT: 2,
  ETHUSDT: 2,
  XAUTUSDT: 2,
  ZECUSDT: 2,
  SOLUSDT: 2,
  HYPEUSDT: 2,
  LINKUSDT: 3,
  NEARUSDT: 3,
  GRAMUSDT: 3,
  MNTUSDT: 4,
  XRPUSDT: 4,
  SUIUSDT: 4,
  DOGEUSDT: 5,
};
export default function TradingJournal({
  onDealsCountChange,
  livePrice = 0,
  activeCoin = "",
  onCoinSelect,
}: TradingJournalProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frozenPnL, setFrozenPnL] = useState<
    Record<number, { pnl: number; roi: number }>
  >({});

  const openDealsCount = deals.filter(
    (d) => d.status?.toUpperCase() === "OPEN",
  ).length;

  useEffect(() => {
    document.title = `Журнал сделок и аналитика (${openDealsCount})`;
  }, [openDealsCount]);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/journal", {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Load error");
      const data = await res.json();
      const cleanArray = Array.isArray(data)
        ? data
        : data.data && Array.isArray(data.data)
          ? data.data
          : [];
      setDeals(cleanArray);

      const openCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() === "OPEN",
      ).length;
      const closedCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() !== "OPEN",
      ).length;
      onDealsCountChange?.({ open: openCount, closed: closedCount });
    } catch (err) {
      console.error("Не удалось подгрузить журнал:", err);
    } finally {
      setLoading(false);
    }
  }, [onDealsCountChange]);

  useEffect(() => {
    fetchJournal();
    window.addEventListener("refresh-trading-journal", fetchJournal);
    return () =>
      window.removeEventListener("refresh-trading-journal", fetchJournal);
  }, [fetchJournal]);
  const exportToCSV = () => {
    if (!deals || deals.length === 0) return;
    const headers = [
      "ID",
      "Дата создания",
      "Торговая пара",
      "Тип ордера",
      "Объем (USDT)",
      "Маржа (USDT)",
      "Плечо",
      "Цена входа",
      "Stop Loss",
      "Take Profit",
      "Статус",
    ];
    const rows = deals.map((d) => [
      String(d.id || ""),
      d.created_at
        ? String(new Date(d.created_at).toLocaleString("ru-RU"))
        : "",
      String(d.coin || ""),
      String(d.order_type || ""),
      String(d.volume || 0),
      String(d.margin || 0),
      `x${d.leverage || 0}`,
      String(d.entry_price || 0),
      String(d.stop_loss ?? 0),
      String(d.take_profit ?? 0),
      String(d.status || ""),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `journal_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateStatus = async (
    id: number,
    status: "PROFIT" | "LOSS" | "CLOSED",
  ) => {
    try {
      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, closed_at_price: livePrice }),
      });
      if (!res.ok) throw new Error();

      const statusRu =
        status === "PROFIT"
          ? "в плюс"
          : status === "LOSS"
            ? "в минус"
            : "вручную";
      toast.add({
        title: "Статус изменен",
        description: `Позиция успешно закрыта ${statusRu}.`,
        type: "success",
      });
      fetchJournal();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeal = async (id: number) => {
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.add({
        title: "Сделка удалена",
        description: "Запись успешно удалена.",
        type: "success",
      });
      fetchJournal();
      setActiveDeleteId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllDeals = async () => {
    try {
      const res = await fetch("/api/journal", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.add({
        title: "Журнал очищен",
        description: "Все сделки удалены.",
        type: "success",
      });
      fetchJournal();
      setIsClearOpen(false);
    } catch (e) {
      console.error(e);
    }
  };
  const activeOpenDeal = deals.find(
    (d) => d.status?.toUpperCase() === "OPEN" && d.coin === activeCoin,
  );

  let monitorStatusBar = null;

  if (
    activeOpenDeal &&
    livePrice > 0 &&
    activeOpenDeal.stop_loss &&
    activeOpenDeal.take_profit
  ) {
    const isLong = activeOpenDeal.side === "BUY";
    const openFeeRate =
      activeOpenDeal.leverage === 1
        ? activeOpenDeal.order_type === "LIMIT"
          ? 0.00075
          : 0.00135
        : activeOpenDeal.order_type === "LIMIT"
          ? 0.000324
          : 0.0009;
    const closeFeeRate = activeOpenDeal.leverage === 1 ? 0.00135 : 0.0009;
    const totalFeeRate = openFeeRate + closeFeeRate;

    const bPrice = isLong
      ? activeOpenDeal.entry_price * (1 + totalFeeRate)
      : activeOpenDeal.entry_price * (1 - totalFeeRate);

    const isBuPassed = isLong ? livePrice >= bPrice : livePrice <= bPrice;
    const pr = JOURNAL_PRECISION_MAP[activeCoin] ?? 4;

    const minScalePrice = Math.min(
      activeOpenDeal.stop_loss,
      activeOpenDeal.take_profit,
    );
    const maxScalePrice = Math.max(
      activeOpenDeal.stop_loss,
      activeOpenDeal.take_profit,
    );
    const totalRange = maxScalePrice - minScalePrice;

    const getPercent = (targetPrice: number) => {
      if (totalRange <= 0) return 50;
      const pct = ((targetPrice - minScalePrice) / totalRange) * 100;
      return Math.min(Math.max(pct, 0), 100);
    };

    const getVisualPercent = (targetPrice: number) => {
      const absPct = getPercent(targetPrice);
      return isLong ? absPct : 100 - absPct;
    };

    const slPct = getVisualPercent(activeOpenDeal.stop_loss);
    const entryPct = getVisualPercent(activeOpenDeal.entry_price);
    const buPct = getVisualPercent(bPrice);
    const tpPct = getVisualPercent(activeOpenDeal.take_profit);
    const livePct = getVisualPercent(livePrice);

    const isTakeProfitBroken = isLong
      ? livePrice > activeOpenDeal.take_profit
      : livePrice < activeOpenDeal.take_profit;
    const isStopLossBroken = isLong
      ? livePrice < activeOpenDeal.stop_loss
      : livePrice > activeOpenDeal.stop_loss;

    let liveTranslateX = -50;
    if (livePct < 20) {
      liveTranslateX = -50 + (20 - livePct) * 2.5;
    } else if (livePct > 80) {
      liveTranslateX = -50 - (livePct - 80) * 2.5;
    }

    const isMovingToProfit = isLong
      ? livePrice > activeOpenDeal.entry_price
      : livePrice < activeOpenDeal.entry_price;
    let liveBgClass = "bg-zinc-500";
    let liveTextClass = "text-zinc-600 dark:text-zinc-300 border-zinc-500/20";
    if (isBuPassed) {
      liveBgClass = "bg-cyan-500";
      liveTextClass = "text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    }

    // СЕТКА СТАТИЧНЫХ ТЕКСТОВ И ИКОНОК
    let StatusTopIcon = Activity;
    let statusTopBadgeClass = "bg-amber-500/10 text-amber-500";
    let statusText = "В СПРЕДЕ КОМИССИЙ";

    if (isTakeProfitBroken) {
      StatusTopIcon = Rocket;
      statusTopBadgeClass = "bg-purple-500/10 text-purple-500";
      statusText = "ЦЕЛЬ ПЕРЕВЫПОЛНЕНА";
    } else if (isStopLossBroken) {
      StatusTopIcon = AlertTriangle;
      statusTopBadgeClass = "bg-rose-500/10 text-rose-500";
      statusText = "РИСК ФИКСИРОВАН";
    } else if (isBuPassed) {
      StatusTopIcon = ShieldCheck;
      statusTopBadgeClass = "bg-cyan-500/10 text-cyan-500";
      statusText = "СБОРЫ ОКУПЛЕНЫ";
    }

    monitorStatusBar = (
      <div className="w-full space-y-2.5 pt-2 px-1 select-none">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          <span>Рантайм-карта ордера {activeCoin}</span>
          {/* ФИКС: Текст вернулся на место и гармонично выводится справа от статичной иконки */}
          <span
            className={`px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black tracking-wide ${statusTopBadgeClass}`}
          >
            <StatusTopIcon className="size-3 shrink-0" />
            <span>{statusText}</span>
          </span>
        </div>

        <div className="relative w-full bg-muted/20 border border-border/30 rounded-xl px-4 pb-28 pt-24 sm:px-6 flex flex-col justify-center min-h-44 shadow-sm">
          <div className="relative w-full h-0.5 bg-muted-foreground/20 rounded-full flex items-center">
            <div
              className={`absolute top-0 bottom-0 rounded-full animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.3)] ${
                isLong
                  ? "bg-linear-to-r from-amber-500/40 to-emerald-500/40"
                  : "bg-linear-to-r from-emerald-500/40 to-amber-500/40"
              }`}
              style={{
                left: `${Math.min(entryPct, buPct)}%`,
                width: `${Math.abs(buPct - entryPct)}%`,
              }}
            />

            <div
              className="absolute size-2 bg-rose-500 rounded-full border border-background shadow-sm"
              style={{ left: `${slPct}%`, transform: "translateX(-50%)" }}
            />
            <div
              className="absolute size-2 bg-foreground rounded-full border border-background shadow-sm"
              style={{ left: `${entryPct}%`, transform: "translateX(-50%)" }}
            />
            <div
              className="absolute size-1.5 bg-amber-500 rounded-full border border-background shadow-sm"
              style={{ left: `${buPct}%`, transform: "translateX(-50%)" }}
            />
            <div
              className="absolute size-2 bg-emerald-500 rounded-full border border-background shadow-sm"
              style={{ left: `${tpPct}%`, transform: "translateX(-50%)" }}
            />

            {!isTakeProfitBroken && !isStopLossBroken && (
              <div
                className="absolute flex flex-col items-center z-20 transition-all duration-700 ease-out"
                style={{
                  left: `${livePct}%`,
                  transform: `translateX(${liveTranslateX}%)`,
                }}
              >
                <div
                  className={`size-2.5 rounded-full border border-background shadow-md ${liveBgClass}`}
                />

                <div
                  className={`absolute -top-11 bg-background border rounded overflow-hidden shadow-sm text-[10px] h-5 z-30 flex items-center ${liveTextClass}`}
                >
                  <span
                    className={`h-full px-2 flex items-center text-white ${liveBgClass}`}
                  >
                    <Activity className="size-3 shrink-0" />
                  </span>
                  <span className="pl-1.5 pr-1.5 font-bold flex items-center gap-1.5">
                    {!isMovingToProfit && (
                      <TrendingDown className="size-3 text-rose-500 shrink-0" />
                    )}
                    <span>{livePrice.toFixed(pr)}</span>
                    {isMovingToProfit && (
                      <TrendingUp className="size-3 text-cyan-500 shrink-0" />
                    )}
                  </span>
                </div>
                <div className="absolute -top-4 border-l border-muted-foreground/30 h-4 border-dashed" />
              </div>
            )}

            <div
              className="absolute bottom-0 border-l border-rose-500/20 h-10 border-dashed -translate-x-1/2"
              style={{ left: `${slPct}%` }}
            />
            <div
              className="absolute bottom-0 border-l border-emerald-500/20 h-10 border-dashed -translate-x-1/2"
              style={{ left: `${tpPct}%` }}
            />
            <div
              className="absolute top-0 border-l border-muted-foreground/30 h-3.5 border-dashed -translate-x-1/2"
              style={{ left: `${entryPct}%` }}
            />
            <div
              className="absolute top-0 border-l border-amber-500/20 h-11 border-dashed -translate-x-1/2"
              style={{ left: `${buPct}%` }}
            />

            <div
              className="absolute bottom-11 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
              style={{ left: `${slPct}%`, transform: "translateX(0%)" }}
            >
              <span className="h-full px-1.5 flex items-center bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider">
                SL
              </span>
              <span className="px-1.5 font-bold text-foreground/90">
                {activeOpenDeal.stop_loss.toFixed(pr)}
              </span>
            </div>

            {/* ФИКС: Полное отключение мигания и прыжков с аларм-шлюза */}
            {isStopLossBroken && (
              <div
                className="absolute bottom-17 flex items-center bg-background border border-rose-500/30 rounded overflow-hidden shadow-[0_0_10px_rgba(225,29,72,0.1)] text-[10px] h-5 z-40"
                style={{ left: `${slPct}%`, transform: "translateX(0%)" }}
              >
                <span className="h-full px-2 flex items-center bg-rose-600 text-white">
                  <AlertTriangle className="size-3 shrink-0" />
                </span>
                <span className="px-2 font-black text-rose-600 dark:text-rose-400">
                  OUT: {livePrice.toFixed(pr)}
                </span>
              </div>
            )}

            <div
              className="absolute bottom-11 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
              style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
            >
              <span className="h-full px-1.5 flex items-center bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider">
                TP
              </span>
              <span className="px-1.5 font-bold text-foreground/90">
                {activeOpenDeal.take_profit.toFixed(pr)}
              </span>
            </div>

            {/* ФИКС: Полное отключение мигания и прыжков с ракетного шлюза */}
            {isTakeProfitBroken && (
              <div
                className="absolute bottom-17 flex items-center bg-background border border-purple-500/30 rounded overflow-hidden shadow-[0_0_10px_rgba(147,51,234,0.1)] text-[10px] h-5 z-40"
                style={{ left: `${tpPct}%`, transform: "translateX(-100%)" }}
              >
                <span className="px-2 font-black text-purple-600 dark:text-purple-400">
                  BOOM: {livePrice.toFixed(pr)}
                </span>
                <span className="h-full px-2 flex items-center bg-purple-600 text-white">
                  <Rocket className="size-3 shrink-0" />
                </span>
              </div>
            )}

            <div
              className="absolute top-3.75 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
              style={{
                left: `${entryPct}%`,
                transform:
                  entryPct < 15
                    ? "translateX(0%)"
                    : entryPct > 85
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              <span className="h-full px-2 flex items-center bg-primary text-primary-foreground">
                <LogIn className="size-3 shrink-0" />
              </span>
              <span className="px-1.5 font-bold text-foreground/90">
                {activeOpenDeal.entry_price.toFixed(pr)}
              </span>
            </div>

            <div
              className="absolute top-11.25 flex items-center bg-background border border-border/60 rounded overflow-hidden shadow-sm text-[10px] h-5"
              style={{
                left: `${buPct}%`,
                transform:
                  buPct < 15
                    ? "none"
                    : buPct > 85
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              <span className="h-full px-2 flex items-center bg-amber-500 text-white">
                <ShieldCheck className="size-3 shrink-0" />
              </span>
              <span className="px-1.5 font-bold text-foreground/90">
                {bPrice.toFixed(pr)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const filteredDeals = deals.filter(
    (d) =>
      d.coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (statusFilter === "ALL" ||
        (statusFilter === "OPEN"
          ? d.status?.toUpperCase() === "OPEN"
          : d.status?.toUpperCase() !== "OPEN")),
  );

  const totalDealsCount = deals.length;
  const profitDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "PROFIT",
  ).length;
  const lossDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "LOSS",
  ).length;
  const manualClosedDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "CLOSED",
  ).length;

  return (
    <div className="w-full bg-transparent flex flex-col px-0.5 sm:px-6 space-y-4">
      <div className="py-3 sm:py-4 border-b border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-transparent select-none mx-1 sm:mx-0">
        <div className="flex flex-col min-w-0 pr-2 flex-1">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground truncate">
            Журнал сделок и аналитика ({openDealsCount})
          </h2>
        </div>

        <JournalStats
          totalDeals={totalDealsCount}
          profitDeals={profitDeals}
          lossDeals={lossDeals}
          manualClosedDeals={manualClosedDeals}
          isClearOpen={isClearOpen}
          setIsClearOpen={setIsClearOpen}
          exportToCSV={exportToCSV}
          handleClearAllDeals={handleClearAllDeals}
        />
      </div>

      <div className="py-2 sm:py-3 mx-1 sm:mx-0">
        <JournalFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      {monitorStatusBar}

      <div className="py-2 overflow-hidden">
        <JournalTable
          filteredDeals={filteredDeals}
          renderDealRow={(deal) => {
            const prec = JOURNAL_PRECISION_MAP[deal.coin] ?? 4;
            return (
              <JournalRow
                key={deal.id}
                deal={deal}
                livePrice={livePrice}
                activeCoin={activeCoin}
                precision={prec}
                frozenPnL={frozenPnL}
                setFrozenPnL={setFrozenPnL}
                onCoinSelect={onCoinSelect}
                handleUpdateStatus={handleUpdateStatus}
                handleDeleteDeal={handleDeleteDeal}
                activeDeleteId={activeDeleteId}
                setActiveDeleteId={setActiveDeleteId}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
