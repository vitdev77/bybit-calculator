"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  XIcon,
  TrashIcon,
  RefreshCcwIcon,
  SettingsIcon,
  SearchIcon,
  RotateCcwClockIcon,
  DownloadIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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
  const [dealsTotalCount, setDealsTotalCount] = useState<number>(0);
  const [coinsTotalCount, setCoinsTotalCount] = useState<number>(0);
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dm, setDm] = useState({
    totalPnl: 0,
    winRate: 0,
    openCount: 0,
    totalMargin: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => {
    const token = process.env.ADMIN_SECRET_KEY || "fallback_default_token_key";
    return { "X-Admin-Token": token, "Content-Type": "application/json" };
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
        if (tableName === "deals") {
          setDealsTotalCount(data.stats?.count || 0);
        } else {
          setCoinsTotalCount(data.stats?.count || 0);
        }
        if (data.dealsMetrics) setDm(data.dealsMetrics);
        if (data.tickerRegistry) setTickerRegistry(data.tickerRegistry);
        if (data.syncMeta) setSyncMeta(data.syncMeta);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const preloadGlobalCounts = async () => {
    try {
      const target = activeTable === "deals" ? "coins" : "deals";
      const res = await fetch(`/api/admin/db?table=${target}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (target === "deals") setDealsTotalCount(data.stats?.count || 0);
        else setCoinsTotalCount(data.stats?.count || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_TABLE);
      if (saved === "coins" || saved === "deals")
        setActiveTable(saved as "deals" | "coins");
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    loadTableData(activeTable);
    preloadGlobalCounts();
    setFilterType("ALL");
    setSearchQuery("");
  }, [activeTable, isMounted]);

  const handleTableChange = (tableName: "deals" | "coins") => {
    if (tableName === activeTable) return;
    setRows([]);
    setActiveTable(tableName);
    if (typeof window !== "undefined")
      localStorage.setItem(STORAGE_KEY_TABLE, tableName);
  };

  const handleReloadTable = async () => {
    await loadTableData(activeTable);
    await preloadGlobalCounts();
  };
  const handleSyncBybit = async () => {
    if (isSyncing) return;
    window.dispatchEvent(new Event("db-sync-start"));
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
        loadTableData(activeTable);
        preloadGlobalCounts();
      } else throw new Error(data.error || "Ошибка API");
    } catch (err: any) {
      loadTableData(activeTable);
    } finally {
      setIsSyncing(false);
      window.dispatchEvent(new Event("db-sync-end"));
    }
  };

  const handleTruncateTable = async () => {
    window.dispatchEvent(new Event("db-sync-start"));
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/db?table=${activeTable}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Ошибка очистки");
      setRows([]);
      setIsClearOpen(false);
      toast.add({
        title: "Таблица очищена",
        description: `Все данные из таблицы ${activeTable} стерты.`,
        type: "success",
      });
      loadTableData(activeTable);
      preloadGlobalCounts();
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event("db-sync-end"));
    }
  };

  const handleBackupExport = async () => {
    try {
      const res = await fetch("/api/admin/db?action=backup", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const dataStr = JSON.stringify(json.backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bybit_calc_db_backup_${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.add({
        title: "Сбой бэкапа",
        description: "Не удалось выгрузить слепок.",
        type: "error",
      });
    }
  };

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        "Внимание! Импорт полностью перезапишет текущие таблицы. Продолжить?",
      )
    ) {
      e.target.value = "";
      return;
    }
    window.dispatchEvent(new Event("db-sync-start"));
    setActionLoading(true);
    try {
      const fileText = await file.text();
      const parsedBackup = JSON.parse(fileText);
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "restore", backupData: parsedBackup }),
      });
      if (res.ok) {
        toast.add({
          title: "Данные импортированы",
          description: "Таблицы восстановлены из файла.",
          type: "success",
        });
        loadTableData(activeTable);
        preloadGlobalCounts();
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.add({
        title: "Сбой восстановления",
        description: "Неверный формат JSON.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
      e.target.value = "";
      window.dispatchEvent(new Event("db-sync-end"));
    }
  };

  const processAdminTableDistribution = () => {
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

    if (activeTable === "deals") {
      const openDeals = rows.filter((r) => r.status === "OPEN");
      const beDeals = rows.filter((r) => r.status === "BREAKEVEN");
      const closedDeals = rows.filter((r) =>
        ["PROFIT", "LOSS", "BREAKEVEN"].includes(r.status),
      );
      let filteredDeals = rows.filter((row) =>
        row.coin?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (filterType === "BE")
        filteredDeals = filteredDeals.filter(
          (row) => row.status === "BREAKEVEN",
        );
      if (filterType === "NEW")
        filteredDeals = filteredDeals.filter((row) => row.status === "OPEN");
      if (filterType === "DELIS")
        filteredDeals = filteredDeals.filter((row) =>
          ["PROFIT", "LOSS", "BREAKEVEN"].includes(row.status),
        );
      return {
        liqRows: openDeals,
        midRows: beDeals,
        riskRows: closedDeals,
        delisRows: [],
        newRows: [],
        allRows: rows,
        filtered: filteredDeals,
        topGainers: [],
        topLosers: [],
      };
    }

    rows.forEach((row) => {
      if (
        searchQuery &&
        !row.coin?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return;
      allRows.push(row);
      if (row.is_delisted) {
        delisRows.push(row);
        return;
      }
      if (
        row.listed_at &&
        new Date(row.listed_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000
      )
        newRows.push(row);
      const live = tickerRegistry[row.coin] || { turnover24h: 0 };
      const isMem = ["DOGE", "SHIB", "PEPE", "BONK"].some((t) =>
        row.coin?.includes(t),
      );
      if (live.turnover24h >= 50000000) liqRows.push(row);
      else if (!isMem && live.turnover24h >= 10000000) midRows.push(row);
      else riskRows.push(row);
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
  const activeHeaders =
    activeTable === "deals"
      ? [
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
        ]
      : [
          "coin",
          "logo_slug",
          "decimals",
          "is_favorite",
          "is_active",
          "is_delisted",
          "listed_at",
        ];

  return (
    <div className="w-full max-h-screen max-w-5xl mx-auto flex flex-col p-2.5 sm:p-6 space-y-4">
      <AdminHeader
        activeTable={activeTable}
        onTableChange={handleTableChange}
        dealsCount={dealsTotalCount}
        coinsCount={coinsTotalCount}
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
            <SettingsIcon className="size-4 text-violet-400 shrink-0" />
            <div className="text-[11px] font-bold text-muted-foreground uppercase">
              Панель управления
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            <ButtonGroup>
              <Button
                type="button"
                disabled={isLoading || rows.length === 0 || isSyncing}
                onClick={handleBackupExport}
                size="icon"
                variant="secondary"
                title="Бэкап базы данных"
              >
                <DownloadIcon className="size-4" />
              </Button>
              <Button
                type="button"
                disabled={isLoading || isSyncing}
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                variant="secondary"
                title="Восстановить СУБД"
              >
                <UploadIcon className="size-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleBackupImport}
                disabled={isLoading || isSyncing}
                className="hidden"
              />
            </ButtonGroup>
            <ButtonGroup>
              {activeTable === "deals" && (
                <Button
                  type="button"
                  disabled={isLoading || isSyncing || rows.length === 0}
                  onClick={handleReloadTable}
                  size="icon"
                  variant="secondary"
                  title="Обновить таблицу"
                >
                  {isLoading || isSyncing ? <Spinner /> : <RefreshCcwIcon />}
                </Button>
              )}
              {activeTable === "coins" && (
                <Button
                  type="button"
                  disabled={isSyncing || isLoading}
                  onClick={handleSyncBybit}
                  size="icon"
                  variant="secondary"
                  title="Синхронизация Bybit"
                >
                  {isSyncing ? <Spinner /> : <RotateCcwClockIcon />}
                </Button>
              )}
            </ButtonGroup>
            <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
              <AlertDialogTrigger
                render={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    type="button"
                    disabled={isLoading || rows.length === 0 || isSyncing}
                    size="icon"
                    className="bg-rose-700 hover:bg-rose-600 text-white font-bold"
                    title="Удалить всё"
                  >
                    <TrashIcon />
                  </Button>
                )}
              />
              <AlertDialogContent className="rounded-2xl max-w-sm w-[calc(100%-1rem)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-mono">
                    Очистить таблицу{" "}
                    <span className="uppercase">{activeTable}</span>?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    {activeTable === "deals"
                      ? "Историю Вашей торговли будет полностью удалена из базы данных."
                      : "Все пары монет будут безвозвратно удалены из базы данных."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-1.5">
                  <AlertDialogCancel className="rounded-xl text-xs h-9">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleTruncateTable}
                    className="rounded-xl text-xs h-9 bg-rose-700 hover:bg-rose-600 text-white font-bold"
                  >
                    Удалить всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {activeTable === "coins" && syncMeta && (
          <div className="text-[10px] font-semibold text-muted-foreground/60 leading-none px-0.5 mt-1">
            Синхронизировано:{" "}
            <span className="text-foreground/80 font-bold">
              {new Date(syncMeta.timestamp).toLocaleString("ru-RU")}
            </span>
          </div>
        )}
        <div className="w-full pt-1.5 border-t border-border/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-48 flex items-center group shrink-0">
            <SearchIcon className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading || displayedRows.length === 0}
              className="pl-8 pr-8 h-8 text-xs bg-background/50 border-border/40 rounded-lg w-full"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0 cursor-pointer"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 w-full bg-background border border-input p-0.5 rounded-lg overflow-hidden flex-1 *:h-7 *:text-[10px] *:font-black *:rounded-md *:flex-1 *:min-w-14 *:w-full">
            {activeTable === "deals" ? (
              <>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "ALL" ? "default" : "ghost"}
                  onClick={() => setFilterType("ALL")}
                >
                  ALL ({allRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "NEW" ? "default" : "ghost"}
                  className="text-amber-500"
                  onClick={() => setFilterType("NEW")}
                >
                  OPEN ({liqRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "BE" ? "default" : "ghost"}
                  className="text-cyan-500"
                  onClick={() => setFilterType("BE")}
                >
                  BE ({midRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "DELIS" ? "default" : "ghost"}
                  className="text-rose-500"
                  onClick={() => setFilterType("DELIS")}
                >
                  CLOSED ({riskRows.length})
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "ALL" ? "default" : "ghost"}
                  onClick={() => setFilterType("ALL")}
                >
                  ALL ({allRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "LIQ" ? "default" : "ghost"}
                  className="text-emerald-500"
                  onClick={() => setFilterType("LIQ")}
                >
                  LIQ ({liqRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "MID" ? "default" : "ghost"}
                  className="text-blue-500"
                  onClick={() => setFilterType("MID")}
                >
                  MID ({midRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "RISK" ? "default" : "ghost"}
                  className="text-amber-500"
                  onClick={() => setFilterType("RISK")}
                >
                  RISK ({riskRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "NEW" ? "default" : "ghost"}
                  className="text-cyan-500"
                  onClick={() => setFilterType("NEW")}
                >
                  NEW ({newRows.length})
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  variant={filterType === "DELIS" ? "default" : "ghost"}
                  className="text-rose-500"
                  onClick={() => setFilterType("DELIS")}
                >
                  DEL ({delisRows.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <Card className="border min-h-32 md:min-h-auto md:grow border-border/40 bg-background mt-1 py-0!">
        {isLoading || isSyncing ? (
          <div className="w-full h-32 flex gap-2 items-center justify-center text-muted-foreground">
            <Spinner className="text-violet-500" />
            <span className="text-xs font-medium">
              {isSyncing ? "Синхронизация листинга..." : "Загрузка данных..."}
            </span>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Ничего не найдено
          </div>
        ) : (
          <AdminTable
            activeTable={activeTable}
            activeHeaders={activeHeaders}
            displayedRows={displayedRows}
            topGainers={topGainers}
            topLosers={topLosers}
          />
        )}
      </Card>
    </div>
  );
}
