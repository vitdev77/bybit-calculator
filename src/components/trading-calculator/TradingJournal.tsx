"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { JournalStats } from "./JournalStats";
import { JournalFilters } from "./JournalFilters";
import { JournalTable } from "./JournalTable";
import { JournalRow } from "./JournalRow";

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

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/journal", {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
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
      console.error("Не удалось подгрузить журнал сделок:", err);
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
      `trading_journal_export_${new Date().toISOString().slice(0, 10)}.csv`,
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
      const bodyPayload: any = { id, status };
      if (status === "CLOSED" && livePrice > 0)
        bodyPayload.closed_at_price = livePrice;
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
        description: "Запись успешно стёрта из облачной базы.",
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

  if (activeOpenDeal && livePrice > 0) {
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
    const distPercent = ((livePrice - bPrice) / bPrice) * 100;
    const priceDiffUsdt = Math.abs(livePrice - bPrice);
    const cryptoQty = activeOpenDeal.volume / activeOpenDeal.entry_price;
    const usdtToBreakeven = priceDiffUsdt * cryptoQty;

    const pr = JOURNAL_PRECISION_MAP[activeCoin] ?? 4;

    monitorStatusBar = (
      <div className="w-full space-y-1.5 pt-1">
        {/* ИНФО-ЗАГОЛОВК БЛОКА МОНИТОРИНГА */}
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none px-1">
          Рантайм-трекер окупаемости сборов Bybit
        </div>

        {/* СТРУКТУРИРОВАННАЯ СТАТУС-СТРОКА */}
        <div className="w-full py-2.5 border-t border-b border-border/30 bg-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] select-none text-muted-foreground font-semibold px-1">
          {/* ЛЕВАЯ ЧАСТЬ: Маркер со сквозным выводом активной пары */}
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-wider text-[9px] uppercase px-1.5 py-0.5 rounded-md ${
                isBuPassed
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {isBuPassed ? "SECURED" : `SPREAD: ${distPercent.toFixed(2)}%`}
            </span>
            <div>
              {isBuPassed ? (
                <span>
                  Окупаемость{" "}
                  <span className="text-foreground font-bold">
                    {activeCoin}
                  </span>{" "}
                  зафиксирована
                </span>
              ) : (
                <span>
                  Ордер{" "}
                  <span className="text-foreground font-bold">
                    {activeCoin}
                  </span>{" "}
                  • Спред: {usdtToBreakeven.toFixed(2)} USDT
                </span>
              )}
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ: Лента цен */}
          <div className="flex items-center gap-2 text-foreground/80">
            <span>
              Вход{" "}
              <span className="font-bold text-foreground">
                {activeOpenDeal.entry_price.toFixed(pr)}
              </span>
            </span>
            <span className="opacity-30">→</span>
            <span>
              Живая{" "}
              <span
                className={`font-bold ${isBuPassed ? "text-emerald-500" : "text-amber-500"}`}
              >
                {livePrice.toFixed(pr)}
              </span>
            </span>
            <span className="opacity-30">→</span>
            <span>
              БУ{" "}
              <span className="font-bold text-foreground">
                {bPrice.toFixed(pr)}
              </span>
            </span>
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
      {/* РЯД 1: Фильтры и статистика */}
      <div className="py-3 sm:py-4 border-b border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-transparent select-none mx-1 sm:mx-0">
        <JournalFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
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

      {/* РЯД 2: ПРОЗРАЧНАЯ СТАТУС-СТРОКА С ИНФО ЗАГОЛОВКОМ И НАЗВАНИЕМ ПАРЫ */}
      {monitorStatusBar}

      {/* РЯД 3: Таблица истории сделок */}
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
