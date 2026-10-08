"use client";
import React, { useState, useEffect } from "react";
import { Wrench, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
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

export default function AdminDbPage() {
  const [activeTable, setActiveTable] = useState<"deals" | "coins">("deals");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [rows, setRows] = useState<any[]>([]);
  const [tickerRegistry, setTickerRegistry] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>({ count: 0 });
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
  }, [activeTable, isMounted]);

  const handleTableChange = (tableName: "deals" | "coins") => {
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

  const processCoinsDistribution = () => {
    const liqRows: any[] = [];
    const midRows: any[] = [];
    const riskRows: any[] = [];
    const delisRows: any[] = [];

    if (activeTable !== "coins") {
      return { liqRows, midRows, riskRows, delisRows, filtered: rows };
    }

    rows.forEach((row) => {
      if (row.is_delisted) {
        delisRows.push(row);
        return;
      }
      const live = tickerRegistry[row.coin] || { turnover24h: 0 };
      const isMem =
        row.coin?.includes("DOGE") ||
        row.coin?.includes("SHIB") ||
        row.coin?.includes("PEPE") ||
        row.coin?.includes("BONK");
      const isLiq = live.turnover24h >= 50000000;
      const isRisk = isMem || live.turnover24h < 10000000;

      if (isLiq) liqRows.push(row);
      else if (isRisk) riskRows.push(row);
      else midRows.push(row);
    });

    let filtered = rows;
    if (filterType === "LIQ") filtered = liqRows;
    else if (filterType === "MID") filtered = midRows;
    else if (filterType === "RISK") filtered = riskRows;
    else if (filterType === "DELIS") filtered = delisRows;

    return { liqRows, midRows, riskRows, delisRows, filtered };
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
    filtered: displayedRows,
  } = processCoinsDistribution();

  const dealsHeaders = [
    "id",
    "created_at",
    "coin",
    "side",
    "order_type",
    "entry_price",
    "stop_loss",
    "take_profit",
    "volume",
    "margin",
    "leverage",
    "status",
    "closed_at_price",
    "tp_touched",
    "sl_touched",
  ];
  const coinsHeaders = [
    "coin",
    "decimals",
    "is_favorite",
    "is_active",
    "is_delisted",
    "fullname",
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
        delistedCount={delisRows.length}
        activeCount={rows.length - delisRows.length}
      />

      <div className="flex flex-col gap-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
        <div
          className={cn(
            "flex flex-col sm:flex-row items-start sm:items-center justify-between",
            "gap-3 w-full",
          )}
        >
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-violet-400 shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground">
              Управление:
            </span>
          </div>
          <ButtonGroup
            className={cn(
              "h-8.5 rounded-lg border border-input flex flex-row items-stretch",
              "bg-background overflow-hidden *:rounded-none w-full sm:w-auto",
            )}
          >
            {activeTable === "coins" && (
              <Button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncBybit}
                className={cn(
                  "h-full text-[10px] font-black uppercase tracking-wider bg-transparent",
                  "text-foreground border-r border-input px-3 flex flex-1 sm:flex-none",
                  "items-center justify-center rounded-none",
                )}
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
                    className={cn(
                      "h-full text-[10px] font-black uppercase bg-rose-600",
                      "text-white border-none px-3 flex flex-1 sm:flex-none",
                      "items-center justify-center rounded-none",
                    )}
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
        {activeTable === "coins" && (
          <div className="w-full pt-1.5 border-t border-border/10">
            <div
              className={cn(
                "grid grid-cols-5 gap-1 w-full bg-background border border-input p-0.5",
                "rounded-lg overflow-hidden",
              )}
            >
              <Button
                type="button"
                variant={filterType === "ALL" ? "default" : "ghost"}
                className="h-7 rounded-md flex items-center justify-center gap-1 text-[10px] font-black"
                onClick={() => setFilterType("ALL")}
              >
                Все ({rows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "LIQ" ? "default" : "ghost"}
                className="h-7 rounded-md flex items-center justify-center gap-1 text-[10px] font-black text-emerald-500"
                onClick={() => setFilterType("LIQ")}
              >
                LIQ ({liqRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "MID" ? "default" : "ghost"}
                className="h-7 rounded-md flex items-center justify-center gap-1 text-[10px] font-black text-blue-500"
                onClick={() => setFilterType("MID")}
              >
                MID ({midRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "RISK" ? "default" : "ghost"}
                className="h-7 rounded-md flex items-center justify-center gap-1 text-[10px] font-black text-amber-500"
                onClick={() => setFilterType("RISK")}
              >
                RISK ({riskRows.length})
              </Button>
              <Button
                type="button"
                variant={filterType === "DELIS" ? "default" : "ghost"}
                className="h-7 rounded-md flex items-center justify-center gap-1 text-[10px] font-black text-rose-500"
                onClick={() => setFilterType("DELIS")}
              >
                DEL ({delisRows.length})
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card className="border border-border/40 bg-background mt-1">
        {displayedRows.length === 0 ? (
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
          />
        )}
      </Card>
    </div>
  );
}
