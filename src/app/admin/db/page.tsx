"use client";
import React, { useState, useEffect } from "react";
import { Wrench, Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
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
import { AdminHeader } from "./AdminHeader";
import { AdminStats } from "./AdminStats";
import { AdminTable } from "./AdminTable";

const STORAGE_KEY_TABLE = "bybit_calc_admin_table_v1";

interface SyncMeta {
  timestamp: number;
  totalCoins: number;
  liveCount: number;
}

export default function AdminDbPage() {
  const [activeTable, setActiveTable] = useState<"deals" | "coins">("deals");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [tickerRegistry, setTickerRegistry] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>({ count: 0 });
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const getAuthHeaders = () => {
    const token = process.env.ADMIN_SECRET_KEY || "fallback_default_token_key";
    return {
      "X-Admin-Token": token,
      "Content-Type": "application/json",
    };
  };

  const loadTableData = async (tableName: "deals" | "coins") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/db?table=${tableName}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Ошибка СУБД");
      const data = await res.json();
      if (data.success) {
        setRows(data.data || []);
        setStats(data.stats || { count: 0 });
        if (data.tickerRegistry) {
          setTickerRegistry(data.tickerRegistry);
        }
        if (data.syncMeta) {
          setSyncMeta(data.syncMeta);
        }
      }
    } catch (err: any) {
      toast.add({ title: "Сбой", description: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_TABLE);
      if (saved === "coins" || saved === "deals") {
        setActiveTable(saved as "deals" | "coins");
      }
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    loadTableData(activeTable);
    setFilterType("ALL");
    setSearchQuery("");
  }, [activeTable, isMounted]);

  const handleTableChange = (tableName: "deals" | "coins") => {
    if (tableName === activeTable) return;
    setRows([]);
    setActiveTable(tableName);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_TABLE, tableName);
    }
  };

  const handleSyncBybit = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setRows([]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "SYNC_BYBIT" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.add({
          title: "Синхронизация",
          description: "Листинг фьючерсов Bybit обновлен.",
          type: "success",
        });
        loadTableData(activeTable);
      } else {
        throw new Error(data.error || "Ошибка API");
      }
    } catch (err: any) {
      toast.add({ title: "Ошибка", description: err.message, type: "error" });
      loadTableData(activeTable);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTruncateTable = async () => {
    try {
      const res = await fetch(`/api/admin/db?table=${activeTable}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Ошибка очистки");
      toast.add({
        title: "Очищено",
        description: `Таблица ${activeTable} очищена.`,
        type: "success",
      });
      setRows([]);
      setIsClearOpen(false);
    } catch (err: any) {
      toast.add({ title: "Ошибка", description: err.message, type: "error" });
    }
  };

  const getRowStyles = (row: any) => {
    if (activeTable === "coins" && row.is_delisted) {
      return "opacity-50 cursor-not-allowed";
    }
    return "hover:bg-muted/10";
  };

  const isNumericColumn = (col: string) => {
    const c = col.toLowerCase();
    return [
      "id",
      "price",
      "entry_price",
      "stop_loss",
      "take_profit",
      "closed_at_price",
      "volume",
      "margin",
      "leverage",
      "decimals",
      "precision",
    ].includes(c);
  };
  const getDealsMetrics = () => {
    let totalPnl = 0,
      totalMargin = 0,
      openCount = 0;
    let profitCount = 0,
      lossCount = 0;
    rows.forEach((r) => {
      if (activeTable !== "deals") return;
      const feeRate = 0.0013;
      const entry = parseFloat(r.entry_price) || 0;
      const vol = parseFloat(r.volume) || 0;
      const marg = parseFloat(r.margin) || 0;
      const status = String(r.status || "").toUpperCase();
      if (status === "OPEN") {
        openCount++;
        return;
      }
      totalMargin += marg;
      const clPrice = r.closed_at_price ? parseFloat(r.closed_at_price) : entry;
      const cryptoQty = entry > 0 ? vol / entry : 0;
      const diff = r.side === "BUY" ? clPrice - entry : entry - clPrice;
      totalPnl += diff * cryptoQty - vol * feeRate;
      if (status === "PROFIT") profitCount++;
      if (status === "LOSS") lossCount++;
    });
    const closedCount = profitCount + lossCount;
    const winRate = closedCount > 0 ? (profitCount / closedCount) * 100 : 0;
    return {
      totalPnl,
      totalMargin,
      openCount,
      profitCount,
      lossCount,
      winRate,
    };
  };

  const processAdminTableDistribution = () => {
    if (activeTable === "deals") {
      const filteredDeals = rows.filter((row) =>
        row.coin?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      return {
        liqRows: [],
        midRows: [],
        riskRows: [],
        delisRows: [],
        newRows: [],
        allRows: rows,
        filtered: filteredDeals,
        topGainers: [],
        topLosers: [],
      };
    }

    const liqRows: any[] = [];
    const midRows: any[] = [];
    const riskRows: any[] = [];
    const delisRows: any[] = [];
    const newRows: any[] = [];
    const allRows: any[] = [];

    const validTickers = Object.entries(tickerRegistry)
      .map(([coin, t]: [string, any]) => ({ coin, p: t.price24hPcnt || 0 }))
      .filter((item) => !isNaN(item.p));

    const sortedTickers = [...validTickers].sort((a, b) => b.p - a.p);
    const topGainers = sortedTickers.slice(0, 3).map((i) => i.coin);
    const topLosers = sortedTickers
      .slice(-3)
      .reverse()
      .map((i) => i.coin);

    rows.forEach((row) => {
      const isMatch = row.coin
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!isMatch) return;
      allRows.push(row);
      if (row.is_delisted) {
        delisRows.push(row);
        return;
      }

      if (row.listed_at) {
        const created = new Date(row.listed_at).getTime();
        const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;
        if (created >= oneDayAgo) {
          newRows.push(row);
        }
      }

      const live = tickerRegistry[row.coin] || { turnover24h: 0 };
      const isMem =
        row.coin?.includes("DOGE") ||
        row.coin?.includes("SHIB") ||
        row.coin?.includes("PEPE") ||
        row.coin?.includes("BONK");
      const isLiq = live.turnover24h >= 50000000;
      const isRisk = !isLiq && (isMem || live.turnover24h < 10000000);
      if (isLiq) liqRows.push(row);
      else if (isRisk) riskRows.push(row);
      else midRows.push(row);
    });

    let filtered = allRows;
    if (filterType === "LIQ") filtered = liqRows;
    else if (filterType === "MID") filtered = midRows;
    else if (filterType === "RISK") filtered = riskRows;
    else if (filterType === "DELIS") filtered = delisRows;
    else if (filterType === "NEW") filtered = newRows;

    return {
      liqRows,
      midRows,
      riskRows,
      delisRows,
      newRows,
      allRows,
      filtered,
      topGainers,
      topLosers,
    };
  };
  if (!isMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spinner className="text-violet-500 size-6" />
      </div>
    );
  }

  const dm = getDealsMetrics();
  const {
    liqRows,
    midRows,
    riskRows,
    delisRows,
    newRows,
    allRows,
    filtered: displayedRows,
    topGainers,
    topLosers,
  } = processAdminTableDistribution();

  const dealsHeaders = [
    "id",
    "created_at",
    "coin",
    "order_type",
    "volume",
    "entry_price",
    "tp_sl",
    "status",
    "closed_at_price",
    "tp_touched",
    "sl_touched",
  ];

  const coinsHeaders = [
    "coin",
    "logo_slug",
    "decimals",
    "is_favorite",
    "is_active",
    "is_delisted",
    "listed_at",
  ];

  const activeHeaders = activeTable === "deals" ? dealsHeaders : coinsHeaders;
  return (
    <div className="w-full max-w-5xl mx-auto p-2.5 sm:p-6 space-y-4 font-sans">
      <AdminHeader
        activeTable={activeTable}
        onTableChange={handleTableChange}
      />
      <AdminStats
        activeTable={activeTable}
        displayedRowsCount={displayedRows.length}
        totalRowsCount={stats.count}
        dm={dm}
        favCount={rows.filter((r) => r.is_favorite).length}
        delistedCount={rows.filter((r) => r.is_delisted).length}
        activeCount={rows.length - rows.filter((r) => r.is_delisted).length}
      />

      <div className="flex flex-col gap-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <svg
              className="size-4 text-violet-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-[11px] font-bold text-muted-foreground">
              Управление:
            </span>
          </div>
          <ButtonGroup className="h-8.5 rounded-lg border border-input flex flex-row items-stretch bg-background overflow-hidden *:rounded-none w-full sm:w-auto">
            {activeTable === "coins" && (
              <Button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncBybit}
                className="h-full text-[10px] font-black uppercase tracking-wider bg-transparent text-foreground border-r border-input px-3 flex flex-1 sm:flex-none items-center justify-center rounded-none"
              >
                {isSyncing ? (
                  <Spinner className="size-3" />
                ) : (
                  <>
                    <RefreshCw className="size-3 md:mr-1.5" />
                    <span className="hidden md:inline">Синхронизация</span>
                  </>
                )}
              </Button>
            )}
            <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
              <AlertDialogTrigger
                render={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    type="button"
                    disabled={isLoading || rows.length === 0}
                    className="h-full text-[10px] font-black uppercase bg-rose-600 text-white border-none px-3 flex flex-1 sm:flex-none items-center justify-center rounded-none"
                  >
                    Очистить
                  </Button>
                )}
              />
              <AlertDialogContent className="rounded-2xl max-w-sm w-[calc(100%-1rem)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">
                    Очистить {activeTable}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Строки будут безвозвратно удалены.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-1.5">
                  <AlertDialogCancel className="rounded-xl text-xs h-9">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleTruncateTable}
                    className="rounded-xl text-xs h-9 bg-rose-600 border-none text-white font-bold"
                  >
                    Стереть
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ButtonGroup>
        </div>

        {activeTable === "coins" && syncMeta && (
          <div className="text-[10px] font-semibold text-muted-foreground/60 leading-none px-0.5 mt-1">
            Листинг Bybit актуален. Синхронизировано:{" "}
            <span className="text-foreground/80 font-bold">
              {new Date(syncMeta.timestamp).toLocaleString("ru-RU")}
            </span>{" "}
            | Всего:{" "}
            <span className="text-foreground/80 font-bold">
              {syncMeta.totalCoins}
            </span>{" "}
            пар (Активных:{" "}
            <span className="text-emerald-500 font-bold">
              {syncMeta.liveCount}
            </span>
            )
          </div>
        )}

        {activeTable === "coins" && (
          <div className="w-full pt-1.5 border-t border-border/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-48 flex items-center group shrink-0">
              <span className="absolute left-2.5 flex items-center h-full pointer-events-none">
                <svg
                  className="size-3.5 text-muted-foreground/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <Input
                type="text"
                placeholder="Поиск пары..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs bg-background/50 border-border/40 rounded-lg w-full"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 w-full bg-background border border-input p-0.5 rounded-lg overflow-hidden flex-1 *:h-7 *:text-[10px] *:font-black *:rounded-md *:flex-1 *:min-w-14 *:w-full">
              <Button
                type="button"
                variant={filterType === "ALL" ? "default" : "ghost"}
                onClick={() => setFilterType("ALL")}
              >
                Все ({allRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "LIQ" ? "default" : "ghost"}
                className="text-emerald-500"
                onClick={() => setFilterType("LIQ")}
              >
                LIQ ({liqRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "MID" ? "default" : "ghost"}
                className="text-blue-500"
                onClick={() => setFilterType("MID")}
              >
                MID ({midRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "RISK" ? "default" : "ghost"}
                className="text-amber-500"
                onClick={() => setFilterType("RISK")}
              >
                RISK ({riskRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "NEW" ? "default" : "ghost"}
                className="text-cyan-500"
                onClick={() => setFilterType("NEW")}
              >
                NEW ({newRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "DELIS" ? "default" : "ghost"}
                className="text-rose-500"
                onClick={() => setFilterType("DELIS")}
              >
                DEL ({delisRows.length})
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card className="border border-border/40 bg-background mt-1">
        {rows.length === 0 && isLoading ? (
          <div className="p-16 flex flex-col gap-2 items-center justify-center text-muted-foreground">
            <Spinner className="text-violet-500" />
            <span className="text-xs font-medium">Загрузка структуры...</span>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Нет данных.
          </div>
        ) : (
          <AdminTable
            activeTable={activeTable}
            activeHeaders={activeHeaders}
            displayedRows={displayedRows}
            getRowStyles={getRowStyles}
            isNumericColumn={isNumericColumn}
            topGainers={topGainers}
            topLosers={topLosers}
          />
        )}
      </Card>
    </div>
  );
}
