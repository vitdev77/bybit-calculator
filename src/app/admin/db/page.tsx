"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Trash2,
  RefreshCw,
  Check,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Star,
  AlertOctagon,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { ModeToggle } from "@/components/ModeToggle";
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

export default function AdminDbPage() {
  const [activeTable, setActiveTable] = useState<"deals" | "coins">("deals");
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  const loadTableData = async (tableName: "deals" | "coins") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/db?table=${tableName}`);
      if (!res.ok) throw new Error("Ошибка загрузки данных СУБД");
      const data = await res.json();
      if (data.success) {
        const rawRows = data.data || [];
        const cleanedRows = rawRows.map((row: any) => {
          const { logo_slug, ...rest } = row;
          return rest;
        });
        setRows(Array.isArray(cleanedRows) ? cleanedRows : []);
        setStats(data.stats || { count: 0 });
      }
    } catch (err: any) {
      toast.add({
        title: "Сбой СУБД",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTableData(activeTable);
  }, [activeTable]);
  const handleSyncBybit = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setRows([]);
    setStats({ count: 0 });
    setIsLoading(true);
    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_BYBIT" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.add({
          title: "Синхронизация",
          description: "Листинг фьючерсов Bybit успешно обновлен.",
          type: "success",
        });
        loadTableData(activeTable);
      } else {
        throw new Error(data.error || "Ошибка API");
      }
    } catch (err: any) {
      toast.add({
        title: "Ошибка синхронизации",
        description: err.message,
        type: "error",
      });
      loadTableData(activeTable);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTruncateTable = async () => {
    try {
      const res = await fetch(`/api/admin/db?table=${activeTable}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось очистить таблицу");
      toast.add({
        title: "Очистка завершена",
        description: `Таблица ${activeTable} полностью очищена.`,
        type: "success",
      });
      setRows([]);
      setStats({ count: 0 });
      setIsClearOpen(false);
    } catch (err: any) {
      toast.add({
        title: "Ошибка удаления",
        description: err.message,
        type: "error",
      });
    }
  };

  const formatValue = (val: any, col: string, decimals: number = 2) => {
    if (val === null || val === undefined) return "--";
    const c = col.toLowerCase();
    if (c === "created_at") {
      return new Date(val).toLocaleString("ru-RU");
    }
    if (
      [
        "price",
        "entry_price",
        "stop_loss",
        "take_profit",
        "closed_at_price",
      ].includes(c)
    ) {
      const num = parseFloat(val);
      return isNaN(num) ? val : num.toFixed(decimals);
    }
    if (typeof val === "boolean") {
      return val ? (
        <Check className="size-3.5 text-emerald-500 mx-auto" />
      ) : (
        <span className="text-muted-foreground/30 font-medium">-</span>
      );
    }
    return String(val);
  };

  const getRowStyles = (row: any) => {
    if (activeTable === "deals") {
      const s = String(row.status || "").toUpperCase();
      if (s === "PROFIT") return "bg-emerald-500/5 hover:bg-emerald-500/10";
      if (s === "LOSS") return "bg-rose-500/5 hover:bg-rose-500/10";
      if (s === "OPEN") return "bg-amber-500/5 hover:bg-amber-500/10";
    }
    if (activeTable === "coins" && row.is_delisted) {
      return "bg-rose-950/10 opacity-50 cursor-not-allowed";
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
    let totalPnl = 0;
    let totalMargin = 0;
    let openCount = 0;
    let profitCount = 0;
    let lossCount = 0;

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
      const closedPrice = r.closed_at_price
        ? parseFloat(r.closed_at_price)
        : entry;
      const cryptoQty = entry > 0 ? vol / entry : 0;
      const diff = r.side === "BUY" ? closedPrice - entry : entry - closedPrice;
      const pnl = diff * cryptoQty - vol * feeRate;

      totalPnl += pnl;
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

  const getCoinsMetrics = () => {
    const favCount = rows.filter((r) => r.is_favorite).length;
    const delistedCount = rows.filter((r) => r.is_delisted).length;
    const activeCount = rows.filter(
      (r) => r.is_active && !r.is_delisted,
    ).length;
    return { favCount, delistedCount, activeCount };
  };

  const dm = getDealsMetrics();
  const cm = getCoinsMetrics();
  return (
    <div className="w-full max-w-5xl mx-auto p-2.5 sm:p-6 space-y-4 font-sans selection:bg-violet-500/20">
      {/* ШАПКА НАВИГАЦИИ И УПРАВЛЕНИЯ ТЕМОЙ */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border/40 select-none">
        <div className="flex items-center justify-between w-full">
          <Link href="/" passHref>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-none px-2.5"
            >
              <ArrowLeft className="size-3.5" />
              Калькулятор
            </Button>
          </Link>
          <ModeToggle />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-2 rounded-xl border border-border/30">
          <div className="flex items-center gap-2">
            <Database className="size-4.5 text-violet-500 shrink-0" />
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
              Администрирование СУБД
            </h1>
          </div>
          <div className="flex gap-1 bg-background border border-input p-0.5 rounded-lg w-full sm:w-auto">
            <Button
              type="button"
              variant={activeTable === "deals" ? "default" : "ghost"}
              className="h-7 text-[10px] rounded-md font-black uppercase tracking-wider px-3 shadow-none border-none flex-1 sm:flex-none"
              onClick={() => setActiveTable("deals")}
            >
              Журнал
            </Button>
            <Button
              type="button"
              variant={activeTable === "coins" ? "default" : "ghost"}
              className="h-7 text-[10px] rounded-md font-black uppercase tracking-wider px-3 shadow-none border-none flex-1 sm:flex-none"
              onClick={() => setActiveTable("coins")}
            >
              Листинг
            </Button>
          </div>
        </div>
      </div>

      {/* СЕТКА СТАТИСТИКИ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
        <Card className="border border-border/30 bg-muted/10 rounded-xl">
          <CardHeader className="py-2 px-3 border-b border-border/10">
            <CardTitle className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest">
              Structure СУБД
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex items-center gap-3">
            <Layers className="size-5 text-violet-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-foreground leading-tight">
                {activeTable === "deals" ? "table: deals" : "table: coins"}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-semibold mt-0.5">
                Строк в таблице: {stats.count}
              </span>
            </div>
          </CardContent>
        </Card>

        {activeTable === "deals" ? (
          <>
            <Card className="border border-border/30 bg-muted/10 rounded-xl">
              <CardHeader className="py-2 px-3 border-b border-border/10">
                <CardTitle className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest">
                  Эффективность & Net PnL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex items-center gap-3">
                {dm.totalPnl >= 0 ? (
                  <TrendingUp className="size-5 text-emerald-500 shrink-0" />
                ) : (
                  <TrendingDown className="size-5 text-rose-500 shrink-0" />
                )}
                <div className="flex flex-col leading-tight min-w-0">
                  <span
                    className={cn(
                      "text-sm font-black truncate",
                      dm.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {dm.totalPnl >= 0 ? "+" : ""}
                    {dm.totalPnl.toFixed(2)}
                    <span className="text-[9px] font-bold opacity-60 ml-0.5">
                      USDT
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                    Винрейт: {dm.winRate.toFixed(1)}% ({dm.profitCount}/
                    {dm.profitCount + dm.lossCount})
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/30 bg-muted/10 rounded-xl">
              <CardHeader className="py-2 px-3 border-b border-border/10">
                <CardTitle className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest">
                  Состояние Позиций
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex items-center gap-3">
                <Activity className="size-5 text-amber-500 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-black text-foreground">
                    {dm.openCount}{" "}
                    <span className="text-[10px] text-muted-foreground/60 font-bold">
                      открыто
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                    Маржа ордеров: {dm.totalMargin.toFixed(1)} USDT
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border border-border/30 bg-muted/10 rounded-xl">
              <CardHeader className="py-2 px-3 border-b border-border/10">
                <CardTitle className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest">
                  Пользовательский Трекинг
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex items-center gap-3">
                <Star className="size-5 text-amber-400 shrink-0 fill-amber-400" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-black text-foreground">
                    {cm.favCount}{" "}
                    <span className="text-[10px] text-muted-foreground/60 font-bold">
                      в избранном
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                    Приоритетный листинг пар
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/30 bg-muted/10 rounded-xl">
              <CardHeader className="py-2 px-3 border-b border-border/10">
                <CardTitle className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest">
                  Биржевой Статус
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex items-center gap-3">
                <AlertOctagon className="size-5 text-rose-500 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-black text-rose-500">
                    {cm.delistedCount}{" "}
                    <span className="text-[10px] text-muted-foreground/60 font-bold">
                      архив
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">
                    Доступно в торгах: {cm.activeCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      {/* КОМАНДЫ СИСТЕМЫ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl select-none">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-violet-400 shrink-0" />
          <span className="text-[11px] font-bold text-muted-foreground">
            Управление базой данных:
          </span>
        </div>

        <ButtonGroup
          orientation="horizontal"
          className="h-8.5 rounded-lg border border-input shadow-xs flex flex-row items-stretch bg-background overflow-hidden *:rounded-none w-full sm:w-auto"
        >
          {activeTable === "coins" && (
            <Button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncBybit}
              className="h-full text-[10px] font-black uppercase tracking-wider bg-transparent hover:bg-muted text-foreground border-r border-input px-3 cursor-pointer flex-1 sm:flex-none flex items-center justify-center rounded-none"
              title="Принудительная синхронизация листинга фьючерсов Bybit"
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
                  className="h-full text-[10px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white border-none px-3 cursor-pointer flex-1 sm:flex-none flex items-center justify-center rounded-none"
                  title="Полная очистка строк текущей таблицы через TRUNCATE CASCADE"
                >
                  <Trash2 className="size-3 sm:mr-1.5" />
                  <span className="hidden sm:inline">Очистить таблицу</span>
                </Button>
              )}
            />
            <AlertDialogContent className="rounded-2xl max-w-sm w-[calc(100%-1rem)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Очистить данные в {activeTable}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Строки будут безвозвратно удалены командой TRUNCATE CASCADE.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-1.5">
                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTruncateTable}
                  className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 border-none cursor-pointer text-white font-bold"
                >
                  Стереть всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </ButtonGroup>
      </div>

      {/* СТРУКТУРНАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ БЕЗ ОШИБОК И АРТЕФАКТОВ */}
      <Card className="border border-border/40 shadow-sm bg-background mt-1">
        <div className="overflow-x-auto max-h-140 scrollbar-thin touch-pan-x w-full">
          {isLoading ? (
            <div className="p-16 flex flex-col gap-2 items-center justify-center text-muted-foreground select-none">
              <Spinner className="text-violet-500" />
              <span className="text-xs font-medium">
                Загрузка структуры СУБД...
              </span>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground select-none">
              Таблица пуста. Нет доступных данных для отображения.
            </div>
          ) : (
            <Table className="text-[11px] font-medium border-collapse min-w-150 w-full">
              <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md select-none border-b">
                <TableRow>
                  <TableHead className="h-9 px-3 text-center font-black uppercase text-muted-foreground tracking-wider whitespace-nowrap w-12 border-r border-border/10">
                    #
                  </TableHead>
                  {/* ФИКС: Безопасно парсим ключи строго из первого существующего объекта строк */}
                  {rows[0] &&
                    Object.keys(rows[0]).map((col) => (
                      <TableHead
                        key={col}
                        className="h-9 px-3 text-left font-black uppercase text-muted-foreground tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.id || row.coin || idx}
                    className={cn(
                      "transition-colors border-b border-border/20 odd:bg-muted/5",
                      getRowStyles(row),
                    )}
                  >
                    <TableCell className="p-3 text-center text-muted-foreground/50 font-mono font-bold w-12 border-r border-border/10 bg-muted/5 select-none">
                      {idx + 1}
                    </TableCell>
                    {Object.keys(row).map((col) => (
                      <TableCell
                        key={col}
                        className={cn(
                          "p-3 max-w-44 truncate text-foreground/90 font-sans whitespace-nowrap",
                          isNumericColumn(col) ? "font-mono font-semibold" : "",
                        )}
                      >
                        {formatValue(row[col], col, row.precision || 2)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
