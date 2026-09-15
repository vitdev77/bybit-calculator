"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { CardTitle } from "@/components/ui/card";
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
  TrendingUp,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
  closed_at_price?: number | null;
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

  // Стейт анимационного скрытия инфографики
  const [isChartVisible, setIsChartVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "bybit_calculator_journal_chart_visible",
      );
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  // Дополнительный стейт для полной остановки рендера Recharts после закрытия шторки
  const [renderChart, setRenderChart] = useState(isChartVisible);

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
        (d: Deal) => d.status === "OPEN",
      ).length;
      const closedCount = cleanArray.filter(
        (d: Deal) => d.status !== "OPEN",
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

  // Эффект плавного переключения рендера графиков под анимацию шторки
  useEffect(() => {
    localStorage.setItem(
      "bybit_calculator_journal_chart_visible",
      String(isChartVisible),
    );
    if (isChartVisible) {
      setRenderChart(true);
    } else {
      const timer = setTimeout(() => setRenderChart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isChartVisible]);
  const chartData = useMemo(() => {
    if (!deals || deals.length === 0) return [];

    const closedDeals = [...deals]
      .filter((d) => d.status !== "OPEN")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

    if (closedDeals.length === 0) return [];

    const pnlByDate: Record<string, number> = {};

    closedDeals.forEach((deal) => {
      const date = new Date(deal.created_at).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });

      const isLong = deal.side === "BUY";
      const openFeeRate = deal.order_type === "LIMIT" ? 0.0002 : 0.00055;
      const totalFeeRate = openFeeRate + 0.00055;

      let targetPrice = deal.entry_price;
      if (deal.status === "PROFIT") targetPrice = deal.take_profit;
      else if (deal.status === "LOSS") targetPrice = deal.stop_loss;
      else if (deal.status === "CLOSED" && deal.closed_at_price)
        targetPrice = Number(deal.closed_at_price);

      const cryptoQty =
        deal.entry_price > 0 ? deal.volume / deal.entry_price : 0;
      const totalFeeUsdt = deal.volume * totalFeeRate;
      const rawFinalPnl = isLong
        ? (targetPrice - deal.entry_price) * cryptoQty
        : (deal.entry_price - targetPrice) * cryptoQty;
      const finalPnlUsdt = rawFinalPnl - totalFeeUsdt;

      pnlByDate[date] = (pnlByDate[date] || 0) + finalPnlUsdt;
    });

    let cumulativePnL = 0;
    return Object.keys(pnlByDate).map((date) => {
      cumulativePnL += pnlByDate[date];
      return {
        name: date,
        "Чистый PnL": parseFloat(pnlByDate[date].toFixed(2)),
        Баланс: parseFloat(cumulativePnL.toFixed(2)),
      };
    });
  }, [deals]);
  const exportToCSV = () => {
    if (!deals || deals.length === 0) return;

    const headers = [
      "ID",
      "Дата создания",
      "Торговая пара",
      "Направление",
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
      d.side === "BUY" ? "LONG" : "SHORT",
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
  const profitDeals = deals.filter((d) => d.status === "PROFIT").length;
  const lossDeals = deals.filter((d) => d.status === "LOSS").length;
  const manualClosedDeals = deals.filter((d) => d.status === "CLOSED").length;

  const winRate =
    totalDeals > 0
      ? ((profitDeals / (profitDeals + lossDeals || 1)) * 100).toFixed(0)
      : "0";
  const handleUpdateStatus = async (
    id: number,
    status: "PROFIT" | "LOSS" | "CLOSED",
  ) => {
    try {
      const bodyPayload: any = { id, status };
      if (status === "CLOSED" && livePrice > 0) {
        bodyPayload.closed_at_price = livePrice;
      }

      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) throw new Error("Update error");

      const targetDeal = deals.find((d) => d.id === id);
      const coinName = targetDeal ? targetDeal.coin.replace("USDT", "") : "";
      let toastTitle = "Сделка закрыта руками ✋";
      let toastType: "success" | "warning" | "info" = "info";

      if (status === "PROFIT") {
        toastTitle = "Сделка закрыта в ПЛЮС! 🎉";
        toastType = "success";
      } else if (status === "LOSS") {
        toastTitle = "Сделка закрыта в стоп 📉";
        toastType = "warning";
      }

      toast.add({
        title: toastTitle,
        description: `Статус по ${coinName} обновлен.`,
        type: toastType,
      });
      fetchJournal();
    } catch (err) {
      console.error("Ошибка при изменении статуса:", err);
    }
  };

  const handleDeleteDeal = async (id: number) => {
    try {
      const targetDeal = deals.find((d) => d.id === id);
      const coinName = targetDeal ? targetDeal.coin.replace("USDT", "") : "";
      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete error");

      toast.add({
        title: "Запись удалена",
        description: `Трейд по паре ${coinName}USDT удален.`,
        type: "info",
      });
      await fetchJournal();
      setActiveDeleteId(null);
    } catch (err) {
      console.error("Ошибка при удалении трейда:", err);
    }
  };

  const handleClearAllDeals = async () => {
    try {
      const res = await fetch("/api/journal", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear all error");
      toast.add({
        title: "Журнал зачищен",
        description: "Все записи были успешно удалены.",
        type: "success",
      });
      await fetchJournal();
      setIsClearOpen(false);
    } catch (err) {
      console.error("Ошибка при полной очистке журнала:", err);
    }
  };
  const renderDealRow = (deal: Deal) => {
    const isLong = deal.side === "BUY";
    const isOpen = deal.status === "OPEN";
    const precision =
      JOURNAL_PRECISION_MAP[deal.coin] !== undefined
        ? JOURNAL_PRECISION_MAP[deal.coin]
        : 4;
    const openFeeRate = deal.order_type === "LIMIT" ? 0.0002 : 0.00055;
    const closeFeeRate = 0.00055;
    const totalFeeRate = openFeeRate + closeFeeRate;

    const breakevenPrice = isLong
      ? deal.entry_price * (1 + totalFeeRate)
      : deal.entry_price * (1 - totalFeeRate);
    let pnlDisplay = null;
    const isCurrentActiveCoin = activeCoin === deal.coin;
    let isHitTP = false;
    let isHitSL = false;

    if (isOpen && isCurrentActiveCoin && livePrice > 0) {
      const isPriceValidForCoin =
        (deal.coin === "BTCUSDT" && livePrice > 30000) ||
        (deal.coin === "ETHUSDT" && livePrice > 1000 && livePrice < 10000) ||
        (deal.coin !== "BTCUSDT" && deal.coin !== "ETHUSDT" && livePrice < 500);

      if (isPriceValidForCoin) {
        isHitTP = isLong
          ? livePrice >= (deal.take_profit ?? 0)
          : livePrice <= (deal.take_profit ?? 0);
        isHitSL = isLong
          ? livePrice <= (deal.stop_loss ?? 0)
          : livePrice >= (deal.stop_loss ?? 0);

        const cryptoQty = deal.volume / deal.entry_price;
        const totalFeeUsdt = deal.volume * totalFeeRate;
        const rawPnlUsdt = isLong
          ? (livePrice - deal.entry_price) * cryptoQty
          : (deal.entry_price - livePrice) * cryptoQty;
        const livePnlUsdt = rawPnlUsdt - totalFeeUsdt;
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
          <div className="flex flex-col text-right select-none relative w-full pl-6">
            <span className="absolute left-1.5 top-1.5 flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
              ></span>
            </span>
            <span
              className={`font-black text-xs ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {isProfit ? "+" : ""}
              {liveRoi.toFixed(2)}%
            </span>
            <span
              className={`text-[10px] font-bold ${isProfit ? "text-emerald-500/80" : "text-rose-500/80"}`}
            >
              {isProfit ? "+" : ""}
              {livePnlUsdt.toFixed(4)}{" "}
              <span className="text-[9px] font-normal opacity-60 text-muted-foreground">
                USDT
              </span>
            </span>
          </div>
        );
      }
    }
    if (!pnlDisplay) {
      const lastKnown = frozenPnL[deal.id] || { pnl: 0, roi: 0 };
      const isLastProfit = lastKnown.pnl >= 0;

      if (isOpen) {
        pnlDisplay = (
          <div className="flex flex-col text-right select-none opacity-45 relative w-full pl-6">
            <Pause className="size-2.5 text-muted-foreground absolute left-1 top-1.5" />
            <span
              className={`text-xs font-bold ${isLastProfit ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-rose-600/80 dark:text-rose-400/80"}`}
            >
              {isLastProfit ? "+" : ""}
              {lastKnown.roi.toFixed(2)}%
            </span>
            <span
              className={`text-[10px] font-bold ${isLastProfit ? "text-emerald-500/60" : "text-rose-500/60"}`}
            >
              {isLastProfit ? "+" : ""}
              {lastKnown.pnl.toFixed(4)}{" "}
              <span className="text-[9px] font-normal text-muted-foreground opacity-60">
                USDT
              </span>
            </span>
          </div>
        );
      } else {
        let targetPrice =
          deal.status === "PROFIT"
            ? deal.take_profit
            : deal.status === "LOSS"
              ? deal.stop_loss
              : deal.closed_at_price && Number(deal.closed_at_price) > 0
                ? Number(deal.closed_at_price)
                : isCurrentActiveCoin && livePrice > 0
                  ? livePrice
                  : deal.entry_price;
        const cryptoQty =
          deal.entry_price > 0 ? deal.volume / deal.entry_price : 0;
        const totalFeeUsdt = deal.volume * totalFeeRate;
        const rawFinalPnl = isLong
          ? (targetPrice - deal.entry_price) * cryptoQty
          : (deal.entry_price - targetPrice) * cryptoQty;
        const finalPnlUsdt = rawFinalPnl - totalFeeUsdt;
        const finalRoi =
          deal.margin > 0.01 ? (finalPnlUsdt / deal.margin) * 100 : 0;
        const isFinalProfit = finalPnlUsdt >= 0;

        pnlDisplay = (
          <div className="flex flex-col text-right opacity-65 select-none w-full">
            <span
              className={`font-black text-xs ${isFinalProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {isFinalProfit ? "+" : ""}
              {finalRoi.toFixed(2)}%
            </span>
            <span
              className={`text-[10px] font-bold ${isFinalProfit ? "text-emerald-500/80" : "text-rose-500/80"}`}
            >
              {isFinalProfit ? "+" : ""}
              {finalPnlUsdt.toFixed(4)}{" "}
              <span className="text-[9px] font-normal opacity-60 text-muted-foreground">
                USDT
              </span>
            </span>
          </div>
        );
      }
    }

    let formattedDateOnly = "--.--.----",
      formattedTimeOnly = "--:--:--";
    if (deal.created_at) {
      try {
        const d = new Date(deal.created_at);
        formattedDateOnly = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
        formattedTimeOnly = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      } catch (e) {}
    }

    const statusIcon =
      deal.status === "PROFIT" ? (
        <span className="shrink-0 mt-0.5 flex" title="Профит">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        </span>
      ) : deal.status === "LOSS" ? (
        <span className="shrink-0 mt-0.5 flex" title="Стоп">
          <XCircle className="size-3.5 text-rose-500" />
        </span>
      ) : deal.status === "CLOSED" ? (
        <span className="shrink-0 mt-0.5 flex opacity-60" title="Руками">
          <Clock className="size-3.5 text-muted-foreground" />
        </span>
      ) : (
        <span
          className="relative flex h-2 w-2 shrink-0 mt-1.5 mx-0.5"
          title="Активная"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      );

    return (
      <TableRow
        key={deal.id}
        className={`transition-all border-b border-border/20 ${isCurrentActiveCoin ? "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15" : !isOpen ? "opacity-45 grayscale-20" : ""}`}
      >
        <TableCell className="py-2 px-2 whitespace-nowrap relative pl-4">
          <div
            className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${isLong ? (isCurrentActiveCoin ? "w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "w-1 bg-emerald-500") : isCurrentActiveCoin ? "w-1.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "w-1 bg-rose-500"}`}
          />
          <div className="flex items-start gap-1.5">
            {statusIcon}
            <div className="flex flex-col space-y-0.5 text-[10px] select-none text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                {formattedDateOnly}
              </span>
              <span className="opacity-70 text-[9px]">{formattedTimeOnly}</span>
            </div>
          </div>
        </TableCell>
        <TableCell
          onClick={() => onCoinSelect?.(deal.coin)}
          className="py-3 px-2 font-bold cursor-pointer transition-colors select-none group/coin whitespace-nowrap text-xs tracking-tight"
        >
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`border-b border-dotted border-transparent group-hover/coin:border-amber-500/60 transition-colors duration-150 ${isCurrentActiveCoin ? "text-amber-500 font-extrabold" : ""}`}
              >
                {deal.coin}
              </span>
              {isCurrentActiveCoin && (
                <span className="text-[8px] font-black text-amber-500 tracking-widest uppercase animate-pulse">
                  • active
                </span>
              )}
            </div>
            <span
              className={`inline-flex items-center justify-center text-[9px] font-extrabold px-1 py-0.5 rounded w-fit leading-none ${isLong ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"}`}
            >
              {isLong ? "LONG" : "SHORT"}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-3 px-1.5">
          <span
            className={`px-1 py-0.5 rounded text-[9px] font-extrabold border ${deal.order_type === "LIMIT" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}
          >
            {deal.order_type}
          </span>
        </TableCell>
        <TableCell className="py-3 px-2 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {(deal.volume || 0).toFixed(2)}
          </span>
          <div className="text-[10px]">
            Маржа: {(deal.margin || 0).toFixed(2)} (x{deal.leverage})
          </div>
        </TableCell>
        <TableCell className="py-3 px-2 font-semibold">
          {(deal.entry_price || 0).toFixed(precision)}
        </TableCell>
        <TableCell className="py-3 px-2 font-semibold text-foreground/90 border-none">
          {breakevenPrice.toFixed(precision)}
        </TableCell>
        <TableCell className="py-3 px-2">
          <div className="flex flex-col space-y-1">
            <span
              className={`font-semibold transition-all duration-300 rounded px-1 -mx-1 w-fit ${isOpen ? (isHitTP ? "text-emerald-500 dark:text-emerald-400 bg-emerald-500/15 font-black border border-emerald-500/30 animate-pulse" : "text-emerald-600/90") : "text-muted-foreground/60"}`}
            >
              {isHitTP
                ? `🔥 ${(deal.take_profit ?? 0).toFixed(precision)}`
                : (deal.take_profit ?? 0).toFixed(precision)}
            </span>
            <span
              className={`font-semibold transition-all duration-300 rounded px-1 -mx-1 w-fit ${isOpen ? (isHitSL ? "text-rose-500 dark:text-rose-400 bg-rose-500/15 font-black border border-rose-500/30 animate-pulse" : "text-rose-600/90") : "text-muted-foreground/60"}`}
            >
              {isHitSL
                ? `⚠️ ${(deal.stop_loss ?? 0).toFixed(precision)}`
                : (deal.stop_loss ?? 0).toFixed(precision)}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-3 px-2 relative min-w-26.25">
          {pnlDisplay}
        </TableCell>
        <TableCell className="py-3 px-2 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            {isOpen && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "PROFIT")}
                  className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "LOSS")}
                  className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-600 hover:text-white rounded-md"
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "CLOSED")}
                  className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md"
                >
                  <LogOut className="size-3" />
                </Button>
              </>
            )}
            <AlertDialog
              open={activeDeleteId === deal.id}
              onOpenChange={(open) => setActiveDeleteId(open ? deal.id : null)}
            >
              <AlertDialogTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className:
                    "h-6 w-6 p-0 text-muted-foreground hover:text-rose-500",
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
                    className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white border-none"
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
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = deal.coin
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (statusFilter === "OPEN") return matchesSearch && deal.status === "OPEN";
    if (statusFilter === "CLOSED")
      return matchesSearch && deal.status !== "OPEN";
    return matchesSearch;
  });

  return (
    <div className="w-full bg-transparent flex flex-col px-1 sm:px-6">
      {/* ФИКС: Внедрен плавный CSS-переход max-height под каноны Tailwind CSS */}
      {chartData.length > 0 && (
        <div className="mb-6 border border-border/40 rounded-2xl bg-muted/20 dark:bg-black/20 overflow-hidden select-none">
          <div
            onClick={() => setIsChartVisible(!isChartVisible)}
            className="flex items-center justify-between p-4 select-none cursor-pointer group/chart-header hover:opacity-90"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover/chart-header:text-foreground transition-colors">
                Кривая доходности (Cumulative Equity PnL)
              </span>
            </div>
            <div className="text-muted-foreground group-hover/chart-header:text-foreground transition-colors">
              {isChartVisible ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>

          {/* Схлопывание через плавное изменение max-height, opacity и padding */}
          <div
            className={`transition-all duration-300 ease-in-out w-full text-[10px] ${
              isChartVisible
                ? "max-h-56 opacity-100 p-4 pt-0 visible"
                : "max-h-0 opacity-0 p-0 overflow-hidden invisible"
            }`}
          >
            {/* Рендерим Recharts только когда шторка открыта, чтобы не ломать ResponsiveContainer */}
            {renderChart && (
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-primary, #10b981)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-primary, #10b981)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(128,128,128,0.1)"
                    />
                    <XAxis dataKey="name" stroke="#888888" tickLine={false} />
                    <YAxis stroke="#888888" tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card, #1e1e24)",
                        borderRadius: "12px",
                        borderColor: "var(--border, rgba(128,128,128,0.2))",
                        fontSize: "11px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Баланс"
                      stroke="var(--color-primary, #10b981)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPnL)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="py-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent select-none">
        <div className="flex flex-row items-center gap-3 flex-1 max-w-xl">
          <div className="relative w-full max-w-55 flex items-center group">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="text"
              placeholder="Поиск монеты..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-muted/20 dark:bg-muted/5 border-border/40 focus-visible:ring-ring/30 rounded-lg w-full"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 h-4 w-4 flex items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted dark:hover:bg-muted/50 hover:text-foreground transition-all p-0 border-none bg-transparent"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val || "ALL")}
          >
            <TabsList
              variant="default"
              className="h-8 p-0.5 bg-muted/40 dark:bg-muted/10 border border-border/30 rounded-lg"
            >
              <TabsTrigger
                value="ALL"
                className="text-xs px-2.5 font-semibold rounded-md data-active:bg-background data-active:text-foreground"
              >
                Все
              </TabsTrigger>
              <TabsTrigger
                value="OPEN"
                className="text-xs px-2.5 font-semibold rounded-md data-active:bg-background data-active:text-foreground"
              >
                Открытые
              </TabsTrigger>
              <TabsTrigger
                value="CLOSED"
                className="text-xs px-2.5 font-semibold rounded-md data-active:bg-background data-active:text-foreground"
              >
                Закрытые
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-4 text-xs ml-auto shrink-0 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
          <div className="text-right">
            <span className="text-muted-foreground block text-[10px] uppercase">
              Всего
            </span>
            <span className="font-bold text-sm">{totalDeals}</span>
          </div>
          <div className="text-right border-l pl-3 border-border/40">
            <span className="text-emerald-500 block text-[10px] uppercase">
              Тейки
            </span>
            <span className="font-bold text-emerald-600 text-sm">
              {profitDeals}
            </span>
          </div>
          <div className="text-right border-l pl-3 border-border/40">
            <span className="text-rose-500 block text-[10px] uppercase">
              Стопы
            </span>
            <span className="font-bold text-rose-600 text-sm">{lossDeals}</span>
          </div>
          <div className="text-right border-l pl-3 border-border/40">
            <span className="text-violet-500 block text-[10px] uppercase font-medium">
              Ручные
            </span>
            <span className="font-bold text-violet-600 text-sm">
              {manualClosedDeals}
            </span>
          </div>
          <div className="text-right border-l pl-3 border-border/40 bg-muted/40 dark:bg-muted/10 px-2 py-0.5 rounded-md border">
            <span className="text-amber-500 block text-[10px] uppercase font-medium">
              WinRate
            </span>
            <span className="font-extrabold text-sm">{winRate}%</span>
          </div>

          {totalDeals > 0 && (
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="icon-sm"
              className="size-8 rounded-xl text-muted-foreground border-border/60 hover:text-foreground transition-all ml-2"
              title="Экспортировать историю в CSV файл"
            >
              <Download className="size-4" />
            </Button>
          )}

          {totalDeals > 0 && (
            <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
              <AlertDialogTrigger
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className:
                    "h-8 w-8 ml-1 text-rose-600 border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-xl p-0",
                })}
              >
                <Trash2 className="size-4 shrink-0" />
              </AlertDialogTrigger>
              <AlertDialogContent size="default">
                <AlertDialogHeader>
                  <AlertDialogTitle>Уничтожить весь журнал?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие безвозвратно сотрет историю вашей торговли из
                    облачной базы.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl text-xs h-9">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllDeals}
                    variant="destructive"
                    className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white border-none"
                  >
                    Удалить всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <div className="py-6 pt-4 bg-transparent">
        {filteredDeals.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-medium select-none">
            Ничего не найдено.
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-border/60 overflow-hidden bg-background">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="border-b border-border/30 bg-muted/40 dark:bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground font-medium hover:bg-muted/40">
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium pl-4">
                    Вход / Status
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    Пара
                  </TableHead>
                  <TableHead className="py-2.5 px-1.5 h-auto text-muted-foreground font-medium">
                    Тип
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    Объем / Маржа
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    Цена Входа
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    Безубыток
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    TP / SL
                  </TableHead>
                  <TableHead className="py-2.5 px-2 text-right text-muted-foreground font-medium">
                    Результат (PnL)
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-right text-muted-foreground font-medium">
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
