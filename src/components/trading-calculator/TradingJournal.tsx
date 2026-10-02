"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { JournalStats } from "./JournalStats";
import { JournalTable } from "./JournalTable";
import { JournalRow } from "./JournalRow";
import { OrderRuntimeMap } from "./OrderRuntimeMap";
import { cn } from "cn";
import { DBAssetCoin } from "./TradingCalculator";

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
  precision?: number;
}

interface TJournalProps {
  onDealsCountChange?: (s: { open: number; closed: number }) => void;
  livePrice?: number;
  activeCoin?: string;
  onCoinSelect?: (coin: string) => void;
  availableCoinsList?: DBAssetCoin[];
}

export default function TradingJournal({
  onDealsCountChange,
  livePrice = 0,
  activeCoin = "",
  onCoinSelect,
}: TJournalProps) {
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
  const [frozenPnL, setFrozenPnL] = useState<Record<number, any>>({});
  const processedSignalsRef = useRef<Record<string, boolean>>({});
  const isUserInteractedRef = useRef<boolean>(false);

  const openDealsCount = deals.filter(
    (d) => d.status?.toUpperCase() === "OPEN",
  ).length;

  useEffect(() => {
    document.title = `Журнал сделок (${openDealsCount})`;
  }, [openDealsCount]);

  useEffect(() => {
    if (!activeCoin || !isChangingCoin) return;
    if (!activeOpenDeal || activeOpenDeal.coin !== activeCoin) {
      setIsChangingCoin(false);
      return;
    }
    if (livePrice <= 0) return;
    const isValid =
      livePrice / activeOpenDeal.entry_price < 1.2 &&
      activeOpenDeal.entry_price / livePrice < 1.2;
    if (isValid) {
      setIsChangingCoin(false);
    }
  }, [livePrice, activeCoin, activeOpenDeal, isChangingCoin]);
  const fetchJournal = useCallback(async () => {
    try {
      const url = activeCoin
        ? `/api/journal?activeCoin=${activeCoin}`
        : "/api/journal";
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) throw new Error();
      const resData = await res.json();
      const cleanArray = Array.isArray(resData)
        ? resData
        : resData.deals && Array.isArray(resData.deals)
          ? resData.deals
          : [];
      setDeals(cleanArray);
      let currentOpen = null;
      if (resData.activeOpenDeal !== undefined) {
        currentOpen = resData.activeOpenDeal;
      } else {
        currentOpen =
          cleanArray.find(
            (d: Deal) => d.status === "OPEN" && d.coin === activeCoin,
          ) || null;
      }
      let currentClosed = null;
      if (resData.lastManualClosedDeal !== undefined) {
        currentClosed = resData.lastManualClosedDeal;
      } else {
        currentClosed =
          cleanArray.find(
            (d: Deal) => d.status === "CLOSED" && d.coin === activeCoin,
          ) || null;
      }
      const anyLastClosedDeal =
        cleanArray.find(
          (d: Deal) => d.coin === activeCoin && d.status !== "OPEN",
        ) || null;
      setActiveOpenDeal(currentOpen);
      setLastManualClosedDeal(currentClosed);
      setFocusedDeal((prev) => {
        if (prev && prev.coin !== activeCoin) {
          return currentOpen || anyLastClosedDeal || null;
        }
        if (isUserInteractedRef.current && prev) {
          const freshData = cleanArray.find((d: Deal) => d.id === prev.id);
          if (freshData) return freshData;
        }
        isUserInteractedRef.current = false;
        if (statusFilter === "CLOSED") {
          return anyLastClosedDeal || null;
        }
        return currentOpen || anyLastClosedDeal || null;
      });
      const openCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() === "OPEN",
      ).length;
      const closedCount = cleanArray.filter(
        (d: Deal) => d.status?.toUpperCase() !== "OPEN",
      ).length;
      onDealsCountChange?.({
        open: openCount,
        closed: closedCount,
      });
      if (!currentOpen) {
        setIsChangingCoin(false);
      }
    } catch (err) {
      console.error(err);
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
    if (!activeOpenDeal || activeOpenDeal.coin !== activeCoin) return;
    if (!activeOpenDeal.stop_loss || !activeOpenDeal.take_profit) return;
    const isValid =
      livePrice / activeOpenDeal.entry_price < 1.2 &&
      activeOpenDeal.entry_price / livePrice < 1.2;
    if (!isValid) return;
    const isLong = activeOpenDeal.side === "BUY";
    let isTp = false;
    let isSl = false;
    if (isLong) {
      if (livePrice >= activeOpenDeal.take_profit) isTp = true;
      if (livePrice <= activeOpenDeal.stop_loss) isSl = true;
    } else {
      if (livePrice <= activeOpenDeal.take_profit) isTp = true;
      if (livePrice >= activeOpenDeal.stop_loss) isSl = true;
    }
    if (isTp && !activeOpenDeal.tp_touched) {
      const key = `${activeOpenDeal.id}-tp`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeOpenDeal.id, action: "TOUCH_TP" }),
        }).then(() => {
          fetchJournal();
        });
      }
    }
    if (isSl && !activeOpenDeal.sl_touched) {
      const key = `${activeOpenDeal.id}-sl`;
      if (!processedSignalsRef.current[key]) {
        processedSignalsRef.current[key] = true;
        fetch("/api/journal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeOpenDeal.id, action: "TOUCH_SL" }),
        }).then(() => {
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
    return () => {
      window.removeEventListener("refresh-trading-journal", fetchJournal);
    };
  }, [fetchJournal]);
  const exportToCSV = () => {
    if (!deals || deals.length === 0) return;
    const headers = [
      "ID",
      "Дата",
      "Пара",
      "Тип",
      "Объем",
      "Margin",
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
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `journal_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDeal = async (id: number) => {
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchJournal();
      setActiveDeleteId(null);
      toast.add({
        title: "Сделка удалена",
        description: "Запись успешно стерта из облачной базы данных.",
        type: "error",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllDeals = async () => {
    try {
      const res = await fetch("/api/journal", { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchJournal();
      setIsClearOpen(false);
      toast.add({
        title: "Журнал очищен",
        description: "Все торговые записи безвозвратно удалены.",
        type: "success",
      });
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

  const hasDealsForPosition = deals.some((d) => d.coin === activeCoin);

  return (
    <div
      className={cn(
        "w-full bg-transparent flex flex-col px-0 space-y-4 min-w-0",
      )}
    >
      <div
        className={cn(
          "py-3 sm:py-4 border-b border-border/40 flex items-center justify-between bg-transparent select-none w-full min-w-0",
        )}
      >
        <JournalStats deals={deals} />
      </div>
      {hasDealsForPosition && (
        <div className={cn("w-full min-w-0")}>
          <OrderRuntimeMap
            focusedDeal={focusedDeal}
            livePrice={livePrice}
            precision={
              focusedDeal
                ? focusedDeal.precision || 4
                : activeOpenDeal
                  ? activeOpenDeal.precision || 4
                  : 4
            }
            isChangingCoin={isChangingCoin}
            storedPnL={activeDealStoredPnL}
          />
        </div>
      )}
      <div className={cn("w-full min-w-0 overflow-hidden")}>
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
            const rowPrecision = deal.precision || 2;
            return (
              <JournalRow
                key={deal.id}
                deal={deal}
                livePrice={livePrice}
                activeCoin={activeCoin}
                precision={rowPrecision}
                frozenPnL={frozenPnL}
                setFrozenPnL={setFrozenPnL}
                focusedDeal={focusedDeal}
                activeDeleteId={activeDeleteId}
                setActiveDeleteId={setActiveDeleteId}
                handleDeleteDeal={handleDeleteDeal}
                onCoinSelect={(coin) => {
                  isUserInteractedRef.current = true;
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
              />
            );
          }}
        />
      </div>
    </div>
  );
}
