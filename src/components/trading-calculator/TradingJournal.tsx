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
  tp_touched?: boolean;
  sl_touched?: boolean;
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
  const [activeOpenDeal, setActiveOpenDeal] = useState<Deal | null>(null);
  const [lastManualClosedDeal, setLastManualClosedDeal] = useState<Deal | null>(
    null,
  );
  const [focusedDeal, setFocusedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingCoin, setIsChangingCoin] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frozenPnL, setFrozenPnL] = useState<
    Record<number, { pnl: number; roi: number }>
  >({});

  const processingAutoCloseRef = useRef<Record<number, boolean>>({});
  const lastTriggeredCoinRef = useRef<string>(activeCoin);
  const processedSignalsRef = useRef<Record<string, boolean>>({});

  const openDealsCount = deals.filter(
    (d) => d.status?.toUpperCase() === "OPEN",
  ).length;

  useEffect(() => {
    document.title = `Журнал сделок (${openDealsCount})`;
  }, [openDealsCount]);

  // ФИКС СКЕЛЕТОНА: Убираем отсюда setTimeout.
  // Лоадер гасится строго в fetchJournal, когда данные монеты и цены синхронизировались!
  useEffect(() => {
    if (livePrice <= 0 || !activeCoin) return;

    if (activeOpenDeal && activeOpenDeal.coin === activeCoin) {
      const isPriceValidForCoin =
        livePrice / activeOpenDeal.entry_price < 2.5 &&
        activeOpenDeal.entry_price / livePrice < 2.5;

      if (isPriceValidForCoin && isChangingCoin) {
        setIsChangingCoin(false);
      }
    }
  }, [livePrice, activeCoin, activeOpenDeal, isChangingCoin]);
  const fetchJournal = useCallback(async () => {
    try {
      const url = activeCoin
        ? `/api/journal?activeCoin=${activeCoin}`
        : "/api/journal";
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Load error");
      const resData = await res.json();

      const cleanArray = Array.isArray(resData)
        ? resData
        : resData.deals && Array.isArray(resData.deals)
          ? resData.deals
          : [];

      setDeals(cleanArray);

      let currentOpen = null;
      let currentClosed = null;

      if (resData.activeOpenDeal !== undefined) {
        currentOpen = resData.activeOpenDeal;
      } else {
        currentOpen =
          cleanArray.find(
            (d: Deal) => d.status === "OPEN" && d.coin === activeCoin,
          ) || null;
      }

      if (resData.lastManualClosedDeal !== undefined) {
        currentClosed = resData.lastManualClosedDeal;
      } else {
        currentClosed =
          cleanArray.find(
            (d: Deal) => d.status === "CLOSED" && d.coin === activeCoin,
          ) || null;
      }

      setActiveOpenDeal(currentOpen);
      setLastManualClosedDeal(currentClosed);

      if (statusFilter === "CLOSED") {
        setFocusedDeal(
          currentClosed ||
            cleanArray.find(
              (d: Deal) => d.status !== "OPEN" && d.coin === activeCoin,
            ) ||
            null,
        );
      } else {
        setFocusedDeal(currentOpen || currentClosed || null);
      }

      const openCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() === "OPEN",
      ).length;
      const closedCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() !== "OPEN",
      ).length;
      onDealsCountChange?.({ open: openCount, closed: closedCount });

      // Снимаем замок лоадера только после того, как все стейты обновились данными новой монеты!
      setIsChangingCoin(false);
    } catch (err) {
      console.error("Не удалось подгрузить журнал:", err);
      setIsChangingCoin(false);
    } finally {
      setLoading(false);
    }
  }, [onDealsCountChange, activeCoin, statusFilter]);

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

  useEffect(() => {
    if (livePrice <= 0 || !activeCoin || deals.length === 0 || isChangingCoin)
      return;

    if (
      !activeOpenDeal ||
      activeOpenDeal.coin !== activeCoin ||
      !activeOpenDeal.stop_loss ||
      !activeOpenDeal.take_profit
    )
      return;

    const isPriceValid =
      livePrice / activeOpenDeal.entry_price < 2.5 &&
      activeOpenDeal.entry_price / livePrice < 2.5;

    if (!isPriceValid) return;

    const isLong = activeOpenDeal.side === "BUY";
    let isTpCrossed = false;
    let isSlCrossed = false;

    if (isLong) {
      if (livePrice >= activeOpenDeal.take_profit) isTpCrossed = true;
      if (livePrice <= activeOpenDeal.stop_loss) isSlCrossed = true;
    } else {
      if (livePrice <= activeOpenDeal.take_profit) isTpCrossed = true;
      if (livePrice >= activeOpenDeal.stop_loss) isSlCrossed = true;
    }

    if (isTpCrossed && !activeOpenDeal.tp_touched) {
      const key = `${activeOpenDeal.id}-tp`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeOpenDeal.id, action: "TOUCH_TP" }),
        }).then(() => {
          toast.add({
            title: "🔔 Сигнал: Take Profit",
            description: `Цена пары ${activeOpenDeal.coin} коснулась уровня Тейка!`,
            type: "info",
          });
          fetchJournal();
        });
      }
    }

    if (isSlCrossed && !activeOpenDeal.sl_touched) {
      const key = `${activeOpenDeal.id}-sl`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeOpenDeal.id, action: "TOUCH_SL" }),
        }).then(() => {
          toast.add({
            title: "⚠️ Сигнал: Stop Loss",
            description: `Цена пары ${activeOpenDeal.coin} дошла до уровня Стопа!`,
            type: "warning",
          });
          fetchJournal();
        });
      }
    }
  }, [
    livePrice,
    activeCoin,
    deals,
    activeOpenDeal,
    fetchJournal,
    isChangingCoin,
  ]);

  useEffect(() => {
    fetchJournal();
  }, [statusFilter, activeCoin, fetchJournal]);

  useEffect(() => {
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

  return (
    <div className="w-full bg-transparent flex flex-col px-0.5 sm:px-6 space-y-4">
      <div className="py-3 sm:py-4 border-b border-border/40 flex items-center justify-between bg-transparent select-none w-full mx-1 sm:mx-0">
        <JournalStats deals={deals} />
      </div>

      <OrderRuntimeMap
        focusedDeal={focusedDeal}
        livePrice={livePrice}
        precision={JOURNAL_PRECISION_MAP[activeCoin] ?? 4}
        isChangingCoin={isChangingCoin}
        storedPnL={activeDealStoredPnL}
      />

      <div className="py-2 overflow-hidden">
        <JournalTable
          filteredDeals={filteredDeals}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalDeals={deals.length}
          isClearOpen={isClearOpen}
          setIsClearOpen={setIsClearOpen}
          exportToCSV={exportToCSV}
          handleClearAllDeals={handleClearAllDeals}
          renderDealRow={(deal) => {
            const rowPrecision = JOURNAL_PRECISION_MAP[deal.coin] ?? 4;
            return (
              <JournalRow
                key={deal.id}
                deal={deal}
                livePrice={livePrice}
                activeCoin={activeCoin}
                precision={rowPrecision}
                frozenPnL={frozenPnL}
                setFrozenPnL={setFrozenPnL}
                onCoinSelect={(coin) => {
                  // ЖЕСТКИЙ СИНХРОННЫЙ ТРИГГЕР: Сразу врубаем скелетон до того, как начнется рендер!
                  setIsChangingCoin(true);
                  setFocusedDeal(deal);
                  onCoinSelect?.(coin);
                }}
                handleUpdateStatus={async (id, status, customPrice) => {
                  if (status === "PROFIT") {
                    await handleUpdateStatus(id, "PROFIT", deal.take_profit);
                  } else if (status === "LOSS") {
                    await handleUpdateStatus(id, "LOSS", deal.stop_loss);
                  } else if (status === "CLOSED" && customPrice !== undefined) {
                    await handleUpdateStatus(id, "CLOSED", customPrice);
                  } else {
                    await handleUpdateStatus(id, status);
                  }
                }}
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
