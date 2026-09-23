"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { JournalStats } from "./JournalStats";
import { JournalTable } from "./JournalTable";
import { JournalRow } from "./JournalRow";
import { OrderRuntimeMap } from "./OrderRuntimeMap";

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
  tp_touched?: boolean; // Добавлено сигнальное поле из БД
  sl_touched?: boolean; // Добавлено сигнальное поле из БД
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
  const [isChangingCoin, setIsChangingCoin] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frozenPnL, setFrozenPnL] = useState<
    Record<number, { pnl: number; roi: number }>
  >({});

  // Реф контроля отправки сигнальных касаний во избежание спама запросами
  const processedSignalsRef = useRef<Record<string, boolean>>({});
  const lastTriggeredCoinRef = useRef<string>(activeCoin);

  const openDealsCount = deals.filter(
    (d) => d.status?.toUpperCase() === "OPEN",
  ).length;

  useEffect(() => {
    document.title = `Журнал сделок (${openDealsCount})`;
  }, [openDealsCount]);

  if (activeCoin && lastTriggeredCoinRef.current !== activeCoin) {
    lastTriggeredCoinRef.current = activeCoin;
    if (!isChangingCoin) {
      setIsChangingCoin(true);
    }
  }

  useEffect(() => {
    if (livePrice <= 0 || !activeCoin) return;

    const currentOpenDeal = deals.find(
      (d) => d.status?.toUpperCase() === "OPEN" && d.coin === activeCoin,
    );

    if (currentOpenDeal) {
      const isPriceValidForCoin =
        livePrice / currentOpenDeal.entry_price < 2.5 &&
        currentOpenDeal.entry_price / livePrice < 2.5;

      if (isPriceValidForCoin && isChangingCoin) {
        setIsChangingCoin(false);
      }
    } else {
      if (isChangingCoin) {
        setIsChangingCoin(false);
      }
    }
  }, [livePrice, activeCoin, deals, isChangingCoin]);
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
      console.error("Не удалось подгрузить журнал:", err);
    } finally {
      setLoading(false);
    }
  }, [onDealsCountChange]);

  const handleUpdateStatus = useCallback(
    async (
      id: number,
      status: "PROFIT" | "LOSS" | "CLOSED",
      customPrice?: number,
    ) => {
      try {
        const targetPrice = customPrice !== undefined ? customPrice : livePrice;
        const res = await fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status, closed_at_price: targetPrice }),
        });
        if (!res.ok) throw new Error();

        const statusRu =
          status === "PROFIT"
            ? "в плюс"
            : status === "LOSS"
              ? "в минус"
              : "вручную";

        toast.add({
          title: "Позиция закрыта",
          description: `Статус изменен на ${statusRu} по цене ${targetPrice}.`,
          type: "success",
        });
        fetchJournal();
      } catch (e) {
        console.error(e);
      }
    },
    [livePrice, fetchJournal],
  );

  // СИСТЕМА ФИКСАЦИИ СИГНАЛОВ КАСАНИЯ: Пишет метку в БД, ордер остается висеть открытым!
  useEffect(() => {
    if (livePrice <= 0 || !activeCoin || deals.length === 0 || isChangingCoin)
      return;

    const openDeal = deals.find(
      (d) => d.status?.toUpperCase() === "OPEN" && d.coin === activeCoin,
    );

    if (!openDeal || !openDeal.stop_loss || !openDeal.take_profit) return;

    const isPriceValid =
      livePrice / openDeal.entry_price < 2.5 &&
      openDeal.entry_price / livePrice < 2.5;

    if (!isPriceValid) return;

    const isLong = openDeal.side === "BUY";
    let isTpCrossed = false;
    let isSlCrossed = false;

    if (isLong) {
      if (livePrice >= openDeal.take_profit) isTpCrossed = true;
      if (livePrice <= openDeal.stop_loss) isSlCrossed = true;
    } else {
      if (livePrice <= openDeal.take_profit) isTpCrossed = true;
      if (livePrice >= openDeal.stop_loss) isSlCrossed = true;
    }

    // Логируем касание Тейк Профита
    if (isTpCrossed && !openDeal.tp_touched) {
      const key = `${openDeal.id}-tp`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: openDeal.id, action: "TOUCH_TP" }),
        }).then(() => {
          toast.add({
            title: "🔔 Сигнал: Take Profit",
            description: `Цена пары ${openDeal.coin} коснулась уровня Тейка!`,
            type: "info",
          });
          fetchJournal();
        });
      }
    }

    // Логируем касание Стоп Лосса
    if (isSlCrossed && !openDeal.sl_touched) {
      const key = `${openDeal.id}-sl`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: openDeal.id, action: "TOUCH_SL" }),
        }).then(() => {
          toast.add({
            title: "⚠️ Сигнал: Stop Loss",
            description: `Цена пары ${openDeal.coin} дошла до уровня Стопа!`,
            type: "warning",
          });
          fetchJournal();
        });
      }
    }
  }, [livePrice, activeCoin, deals, fetchJournal, isChangingCoin]);

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
      "Дата",
      "Пара",
      "Тип",
      "Объем",
      "Маржа",
      "Плечо",
      "Вход",
      "SL",
      "TP",
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
  const filteredDeals = deals.filter(
    (d) =>
      d.coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (statusFilter === "ALL" ||
        (statusFilter === "OPEN"
          ? d.status?.toUpperCase() === "OPEN"
          : d.status?.toUpperCase() !== "OPEN")),
  );
  const activeDealStoredPnL = activeOpenDeal
    ? frozenPnL[activeOpenDeal.id] || { pnl: 0, roi: 0 }
    : { pnl: 0, roi: 0 };
  const isHeaderProfit = activeDealStoredPnL.pnl >= 0;
  const pr = JOURNAL_PRECISION_MAP[activeCoin] ?? 4;

  return (
    <div className="w-full bg-transparent flex flex-col px-0.5 sm:px-6 space-y-4">
      <div className="py-3 sm:py-4 border-b border-border/40 flex flex-col-reverse gap-3.5 sm:flex-row sm:items-center justify-between bg-transparent select-none mx-1 sm:mx-0">
        <div className="flex items-center gap-3 min-w-0 pr-2 flex-1 w-full">
          {activeOpenDeal && livePrice > 0 && !isChangingCoin && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-3 gap-y-1.5 w-full sm:w-auto text-[10px] font-bold bg-transparent">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 text-[9px] font-black tracking-wider uppercase hidden sm:inline mr-0.5">
                  Live
                </span>
                <span className="text-foreground font-black tracking-tight">
                  {activeCoin}
                </span>
                <span className="text-muted-foreground/60 font-medium">
                  <span className="hidden sm:inline">Price: </span>
                  <span className="inline sm:hidden">P: </span>
                  {livePrice.toFixed(pr)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end sm:justify-start">
                <span
                  className={`text-[8px] px-1 rounded text-white font-black leading-none py-0.5 ${activeOpenDeal.side === "BUY" ? "bg-emerald-500" : "bg-rose-500"}`}
                >
                  {activeOpenDeal.side === "BUY" ? "L" : "S"}
                </span>
                <span className="text-muted-foreground/60 font-medium">
                  <span className="hidden sm:inline">Vol: </span>
                  <span className="inline sm:hidden">V: </span>
                  {activeOpenDeal.volume.toFixed(2)}
                </span>
                <div className="flex items-center font-black sm:ml-1">
                  <div className="h-2.5 w-px bg-border/40 mx-1.5 hidden sm:block" />
                  <span
                    className={
                      isHeaderProfit ? "text-emerald-500" : "text-rose-500"
                    }
                  >
                    {isHeaderProfit ? "+" : ""}
                    {activeDealStoredPnL.roi.toFixed(2)}%
                    <span className="text-[9px] font-medium opacity-80 ml-0.5">
                      ({isHeaderProfit ? "+" : ""}
                      {activeDealStoredPnL.pnl.toFixed(3)} USDT)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
          {activeOpenDeal && isChangingCoin && (
            <div className="flex items-center gap-3 w-full sm:w-auto h-5 animate-pulse">
              <div className="size-2 bg-muted rounded-full shrink-0" />
              <div className="h-3.5 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-24 opacity-60" />
            </div>
          )}
        </div>
        <JournalStats
          totalDeals={deals.length}
          profitDeals={deals.filter((d) => d.status === "PROFIT").length}
          lossDeals={deals.filter((d) => d.status === "LOSS").length}
          manualClosedDeals={deals.filter((d) => d.status === "CLOSED").length}
          isClearOpen={isClearOpen}
          setIsClearOpen={setIsClearOpen}
          exportToCSV={exportToCSV}
          handleClearAllDeals={handleClearAllDeals}
        />
      </div>

      <OrderRuntimeMap
        activeOpenDeal={activeOpenDeal}
        livePrice={livePrice}
        precision={pr}
        isChangingCoin={isChangingCoin}
      />

      <div className="py-2 overflow-hidden">
        <JournalTable
          filteredDeals={filteredDeals}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
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
