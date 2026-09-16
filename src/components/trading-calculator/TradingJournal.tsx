"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Check,
  X,
  LogOut,
  Search,
  Clock,
  Pause,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const totalDeals = deals.length;
  const profitDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "PROFIT",
  ).length;
  const lossDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "LOSS",
  ).length;
  const manualClosedDeals = deals.filter(
    (d) => d.status?.toUpperCase() === "CLOSED",
  ).length;
  const handleUpdateStatus = async (
    id: number,
    status: "PROFIT" | "LOSS" | "CLOSED",
  ) => {
    try {
      const bodyPayload: any = { id, status };
      if (status === "CLOSED" && livePrice > 0)
        bodyPayload.closed_at_price = livePrice;
      await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      fetchJournal();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDeal = async (id: number) => {
    try {
      await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      fetchJournal();
      setActiveDeleteId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllDeals = async () => {
    try {
      await fetch("/api/journal", { method: "DELETE" });
      fetchJournal();
      setIsClearOpen(false);
    } catch (e) {
      console.error(e);
    }
  };
  const renderDealRow = (deal: Deal) => {
    const isLong = deal.side === "BUY";
    const isOpen = deal.status?.toUpperCase() === "OPEN";
    const precision =
      JOURNAL_PRECISION_MAP[deal.coin] !== undefined
        ? JOURNAL_PRECISION_MAP[deal.coin]
        : 4;
    const totalFeeRate =
      (deal.order_type === "LIMIT" ? 0.0002 : 0.00055) + 0.00055;
    const breakevenPrice = isLong
      ? deal.entry_price * (1 + totalFeeRate)
      : deal.entry_price * (1 - totalFeeRate);
    let pnlDisplay = null;
    const isCurrentActiveCoin = activeCoin === deal.coin;

    if (isOpen && isCurrentActiveCoin && livePrice > 0) {
      const isPriceValid =
        (deal.coin === "BTCUSDT" && livePrice > 30000) ||
        (deal.coin === "ETHUSDT" && livePrice > 1000 && livePrice < 10000) ||
        (deal.coin !== "BTCUSDT" && deal.coin !== "ETHUSDT" && livePrice < 500);
      if (isPriceValid) {
        const cryptoQty = deal.volume / deal.entry_price;
        const livePnlUsdt =
          (isLong
            ? livePrice - deal.entry_price
            : deal.entry_price - livePrice) *
            cryptoQty -
          deal.volume * totalFeeRate;
        const liveRoi = deal.margin > 0 ? (livePnlUsdt / deal.margin) * 100 : 0;
        const isProfit = livePnlUsdt >= 0;

        if (frozenPnL[deal.id]?.pnl !== livePnlUsdt) {
          setTimeout(() => {
            setFrozenPnL((prev) => ({
              ...prev,
              [deal.id]: { pnl: livePnlUsdt, roi: liveRoi },
            }));
          }, 0);
        }
        pnlDisplay = (
          <div className="flex flex-col text-right select-none relative w-full pl-5 sm:pl-6">
            <span className="absolute left-1 top-1.5 flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
              ></span>
            </span>
            <span
              className={`font-black text-[11px] sm:text-xs ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {isProfit ? "+" : ""}
              {liveRoi.toFixed(2)}%
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold ${isProfit ? "text-emerald-500/80" : "text-rose-500/80"}`}
            >
              {isProfit ? "+" : ""}
              {livePnlUsdt.toFixed(3)}{" "}
              <span className="text-[8px] font-normal opacity-60 text-muted-foreground">
                USDT
              </span>
            </span>
          </div>
        );
      }
    }
    if (!pnlDisplay) {
      const lastKnown = frozenPnL[deal.id] || { pnl: 0, roi: 0 };
      if (isOpen) {
        pnlDisplay = (
          <div className="flex flex-col text-right select-none opacity-45 relative w-full pl-5 sm:pl-6">
            <Pause className="size-2 text-muted-foreground absolute left-0.5 top-1.5" />
            <span
              className={`text-[11px] sm:text-xs font-bold ${lastKnown.pnl >= 0 ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-rose-600/80 dark:text-rose-400/80"}`}
            >
              {lastKnown.pnl >= 0 ? "+" : ""}
              {lastKnown.roi.toFixed(2)}%
            </span>
            <span
              className={`text-[10px] font-bold ${lastKnown.pnl >= 0 ? "text-emerald-500/60" : "text-rose-500/60"}`}
            >
              {lastKnown.pnl >= 0 ? "+" : ""}
              {lastKnown.pnl.toFixed(3)}{" "}
              <span className="text-[8px] font-normal text-muted-foreground opacity-60">
                USDT
              </span>
            </span>
          </div>
        );
      } else {
        const statusUpper = deal.status?.toUpperCase();
        let targetPrice =
          statusUpper === "PROFIT"
            ? deal.take_profit
            : statusUpper === "LOSS"
              ? deal.stop_loss
              : deal.entry_price;

        if (statusUpper === "CLOSED") {
          const parsedPrice = deal.closed_at_price
            ? parseFloat(String(deal.closed_at_price))
            : 0;
          targetPrice =
            parsedPrice > 0
              ? parsedPrice
              : livePrice > 0
                ? livePrice
                : deal.entry_price;
        }

        const cryptoQty =
          deal.entry_price > 0 ? deal.volume / deal.entry_price : 0;
        const finalPnlUsdt =
          (isLong
            ? targetPrice - deal.entry_price
            : deal.entry_price - targetPrice) *
            cryptoQty -
          deal.volume * totalFeeRate;
        const finalRoi =
          deal.margin > 0.01 ? (finalPnlUsdt / deal.margin) * 100 : 0;

        pnlDisplay = (
          <div className="flex flex-col text-right opacity-65 select-none w-full">
            <span
              className={`font-black text-[11px] sm:text-xs ${finalPnlUsdt >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {finalPnlUsdt >= 0 ? "+" : ""}
              {finalRoi.toFixed(2)}%
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold ${finalPnlUsdt >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}`}
            >
              {finalPnlUsdt >= 0 ? "+" : ""}
              {finalPnlUsdt.toFixed(3)}{" "}
              <span className="text-[8px] font-normal opacity-60 text-muted-foreground">
                USDT
              </span>
            </span>
          </div>
        );
      }
    }

    let dStr = "--.--.--",
      tStr = "--:--";
    if (deal.created_at) {
      try {
        const d = new Date(deal.created_at);
        dStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
        tStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      } catch (e) {}
    }
    return (
      <TableRow
        key={deal.id}
        className={`transition-all border-b border-border/10 ${isCurrentActiveCoin ? "bg-amber-500/5 dark:bg-amber-500/10" : !isOpen ? "opacity-45" : ""}`}
      >
        <TableCell className="py-2 px-1.5 sm:px-3 relative pl-3.5 sm:pl-5">
          <div
            className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${isLong ? "w-1 bg-emerald-500" : "w-1 bg-rose-500"} ${isCurrentActiveCoin ? "w-1.5" : ""}`}
          />
          <div className="flex items-start gap-1">
            {deal.status?.toUpperCase() === "PROFIT" ? (
              <CheckCircle2 className="size-3 text-emerald-500 mt-0.5" />
            ) : deal.status?.toUpperCase() === "LOSS" ? (
              <XCircle className="size-3 text-rose-500 mt-0.5" />
            ) : deal.status?.toUpperCase() === "CLOSED" ? (
              <Clock className="size-3 text-muted-foreground mt-0.5 opacity-60" />
            ) : (
              <span className="relative flex h-1.5 w-1.5 mt-1.5 mx-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
            )}
            <div className="flex flex-col text-[9px] sm:text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">{dStr}</span>
              <span className="opacity-60">{tStr}</span>
            </div>
          </div>
        </TableCell>
        <TableCell
          onClick={() => onCoinSelect?.(deal.coin)}
          className="py-2 px-1.5 sm:px-3 font-bold cursor-pointer select-none group/coin text-[11px] sm:text-xs"
        >
          <span className="border-b border-dotted border-muted-foreground/40 group-hover/coin:border-amber-500/80 transition-colors text-foreground">
            {deal.coin}
          </span>
        </TableCell>
        <TableCell className="py-2 px-1 sm:px-2">
          <span
            className={`px-0.5 py-0.5 rounded text-[8px] font-black border ${deal.order_type === "LIMIT" ? "bg-violet-500/10 text-violet-500 border-violet-500/15" : "bg-blue-500/10 text-blue-500 border-blue-500/15"}`}
          >
            {deal.order_type}
          </span>
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3 text-muted-foreground text-[11px] sm:text-xs">
          <span className="font-semibold text-foreground">
            {(deal.volume || 0).toFixed(1)}
          </span>
          <div className="text-[9px] sm:text-[10px] opacity-70">
            М: {(deal.margin || 0).toFixed(1)} (x{deal.leverage})
          </div>
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3 font-semibold text-[11px] sm:text-xs">
          {(deal.entry_price || 0).toFixed(precision)}
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[11px] sm:text-xs">
          {breakevenPrice.toFixed(precision)}
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3">
          <div className="flex flex-col text-[11px] sm:text-xs">
            <span
              className={
                isOpen
                  ? "text-emerald-600/90 font-medium"
                  : "text-muted-foreground/60"
              }
            >
              {(deal.take_profit ?? 0).toFixed(precision)}
            </span>
            <span
              className={
                isOpen
                  ? "text-rose-600/90 font-medium"
                  : "text-muted-foreground/60"
              }
            >
              {(deal.stop_loss ?? 0).toFixed(precision)}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3 relative min-w-22 sm:min-w-26.25">
          {pnlDisplay}
        </TableCell>
        <TableCell className="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-0.5">
            {isOpen && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "PROFIT")}
                  className="h-7 w-7 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "LOSS")}
                  className="h-7 w-7 text-rose-600 hover:bg-rose-600 hover:text-white rounded-md"
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "CLOSED")}
                  className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md"
                >
                  <LogOut className="size-3" />
                </Button>
              </>
            )}
            <AlertDialog
              open={activeDeleteId === deal.id}
              onOpenChange={(o) => setActiveDeleteId(o ? deal.id : null)}
            >
              <AlertDialogTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className:
                    "h-7 w-7 text-muted-foreground hover:text-rose-500",
                })}
              >
                <Trash2 className="size-3" />
              </AlertDialogTrigger>
              <AlertDialogContent size="default">
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы действительно хотите удалить сделку по паре {deal.coin}{" "}
                    из журнала?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl text-xs h-9">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteDeal(deal.id)}
                    variant="destructive"
                    className="rounded-xl text-white bg-rose-600 border-none text-xs h-9"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const filteredDeals = deals.filter(
    (d) =>
      d.coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (statusFilter === "ALL" ||
        (statusFilter === "OPEN"
          ? d.status?.toUpperCase() === "OPEN"
          : d.status?.toUpperCase() !== "OPEN")),
  );
  return (
    <div className="w-full bg-transparent flex flex-col px-0.5 sm:px-6">
      <div className="py-3 sm:py-4 border-b border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-transparent select-none mx-1 sm:mx-0">
        <div className="flex flex-row items-center gap-2 flex-1 w-full sm:max-w-xl">
          <div className="relative w-full sm:max-w-55 flex items-center group">
            <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="text"
              placeholder="Поиск пары..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-7 h-7.5 text-xs bg-muted/20 border-border/40 rounded-lg w-full"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val || "ALL")}
          >
            <TabsList className="h-7.5 p-0.5 bg-muted/40 border border-border/30 rounded-lg">
              <TabsTrigger
                value="ALL"
                className="text-[11px] px-2 font-semibold"
              >
                Все
              </TabsTrigger>
              <TabsTrigger
                value="OPEN"
                className="text-[11px] px-2 font-semibold"
              >
                Откр.
              </TabsTrigger>
              <TabsTrigger
                value="CLOSED"
                className="text-[11px] px-2 font-semibold"
              >
                Закр.
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs justify-between sm:justify-end w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="text-center">
            <span className="text-muted-foreground block text-[9px] uppercase">
              Всего
            </span>
            <span className="font-bold text-xs sm:text-sm">{totalDeals}</span>
          </div>
          <div className="text-center border-l pl-2 border-border/40">
            <span className="text-emerald-500 block text-[9px] uppercase">
              Тейки
            </span>
            <span className="font-bold text-emerald-600 text-xs sm:text-sm">
              {profitDeals}
            </span>
          </div>
          <div className="text-center border-l pl-2 border-border/40">
            <span className="text-rose-500 block text-[9px] uppercase">
              Стопы
            </span>
            <span className="font-bold text-rose-600 text-xs sm:text-sm">
              {lossDeals}
            </span>
          </div>
          <div className="text-center border-l pl-2 border-border/40">
            <span className="text-violet-500 block text-[9px] uppercase">
              Ручные
            </span>
            <span className="font-bold text-violet-600 text-sm">
              {manualClosedDeals}
            </span>
          </div>
          <div className="flex items-center gap-1 pl-1 border-l border-border/40 shrink-0">
            {totalDeals > 0 && (
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="icon-sm"
                className="size-8 rounded-xl text-muted-foreground border-border/60 hover:text-foreground"
              >
                <Download className="size-4" />
              </Button>
            )}
            {totalDeals > 0 && (
              <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
                <AlertDialogTrigger
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon-xs",
                    className:
                      "h-7.5 w-7.5 text-rose-600 border-rose-500/20 hover:bg-rose-600 rounded-lg p-0",
                  })}
                >
                  <Trash2 className="size-3.5 shrink-0" />
                </AlertDialogTrigger>
                <AlertDialogContent size="default">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Уничтожить весь журнал?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие безвозвратно удалит всю историю Вашей
                      торговли из базы данных.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs h-9">
                      Отмена
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllDeals}
                      variant="destructive"
                      className="rounded-xl text-xs h-9 bg-rose-600 text-white border-none"
                    >
                      Удалить всё
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
      <div className="py-3 sm:py-6 overflow-hidden">
        {filteredDeals.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-medium">
            Ничего не найдено.
          </div>
        ) : (
          <div className="w-full rounded-xl border border-border/50 overflow-x-auto bg-background shadow-sm scrollbar-thin">
            <Table className="w-full text-xs min-w-180">
              <TableHeader>
                <TableRow className="border-b border-border/20 bg-muted/30 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <TableHead className="py-2 px-1.5 h-auto pl-3.5 sm:pl-5">
                    Вход / Статус
                  </TableHead>
                  <TableHead className="py-2 px-1.5 h-auto">Пара</TableHead>
                  <TableHead className="py-2 px-1 h-auto">Тип</TableHead>
                  <TableHead className="py-2 px-1.5 h-auto">
                    Объем / Маржа
                  </TableHead>
                  <TableHead className="py-2 px-1.5 h-auto">
                    Цена Входа
                  </TableHead>
                  <TableHead className="py-2 px-1.5 h-auto">
                    Безубыток
                  </TableHead>
                  <TableHead className="py-2 px-1.5 h-auto">TP / SL</TableHead>
                  <TableHead className="py-2.5 px-2 text-right">
                    Результат (PnL)
                  </TableHead>
                  <TableHead className="py-2 px-1.5 h-auto text-right">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filteredDeals.map(renderDealRow)}</TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
