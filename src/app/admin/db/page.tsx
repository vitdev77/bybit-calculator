"use client";
import React, { useState, useEffect } from "react";
import { Database, Trash2, RefreshCw, Check, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isSeeding, setIsSeeding] = useState(false);

  const loadTableData = async (tableName: "deals" | "coins") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/db?table=${tableName}`);
      if (!res.ok) throw new Error("Ошибка загрузки данных");
      const data = await res.json();
      if (data.success) {
        setRows(data.data || []);
        setStats(data.stats || { count: 0 });
      }
    } catch (err: any) {
      toast.add({
        title: "Сбой БД",
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
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedSlugs = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEED_SLUGS" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.add({
          title: "Разметка слагов",
          description: "Слаги логотипов успешно сохранены.",
          type: "success",
        });
        loadTableData(activeTable);
      } else {
        throw new Error(data.error || "Ошибка API");
      }
    } catch (err: any) {
      toast.add({
        title: "Ошибка разметки",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsSeeding(false);
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
  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b border-border/40 select-none">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-violet-500" />
          <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">
            Администрирование СУБД (Neon)
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant={activeTable === "deals" ? "default" : "outline"}
            className="h-8.5 text-xs rounded-lg font-bold"
            onClick={() => setActiveTable("deals")}
          >
            Журнал сделок
          </Button>
          <Button
            type="button"
            variant={activeTable === "coins" ? "default" : "outline"}
            className="h-8.5 text-xs rounded-lg font-bold"
            onClick={() => setActiveTable("coins")}
          >
            Листинг монет
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
        <Card className="border border-border/40 shadow-xs bg-background/50 backdrop-blur-md">
          <CardHeader className="py-2.5 px-4 border-b border-border/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Выбранная таблица
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-black uppercase text-foreground">
              {activeTable === "deals" ? "deals (Сделки)" : "coins (Валюты)"}
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-xs bg-background/50 backdrop-blur-md">
          <CardHeader className="py-2.5 px-4 border-b border-border/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Всего записей в СУБД
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-2xl font-black text-violet-500">
              {stats.count}
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-xs bg-background/50 backdrop-blur-md">
          <CardHeader className="py-2.5 px-4 border-b border-border/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Быстрые операции
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex gap-2 flex-wrap items-center">
            {activeTable === "coins" && (
              <>
                <Button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleSyncBybit}
                  className="h-8 text-[10px] font-bold uppercase rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  {isSyncing ? (
                    <Spinner className="size-3" />
                  ) : (
                    <RefreshCw className="size-3 mr-1" />
                  )}
                  Синхронизация
                </Button>
                <Button
                  type="button"
                  disabled={isSeeding}
                  onClick={handleSeedSlugs}
                  className="h-8 text-[10px] font-bold uppercase rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {isSeeding ? (
                    <Spinner className="size-3" />
                  ) : (
                    <Image className="size-3 mr-1" />
                  )}
                  Заполнить слаги
                </Button>
              </>
            )}

            <AlertDialog>
              <AlertDialogTrigger
                render={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    type="button"
                    disabled={isLoading || rows.length === 0}
                    className="h-8 text-[10px] font-bold uppercase rounded-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer ml-auto"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Очистить таблицу
                  </Button>
                )}
              />
              <AlertDialogContent className="rounded-2xl max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm sm:text-base">
                    Уничтожить все данные в {activeTable}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Это действие выполнит команду TRUNCATE и полностью удалит
                    все строки. Восстановление невозможно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-1.5">
                  <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleTruncateTable}
                    className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white border-none cursor-pointer"
                  >
                    Стереть всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40 shadow-sm bg-background">
        <div className="overflow-x-auto max-h-140 scrollbar-thin">
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
            <Table className="text-[11px] font-medium border-collapse">
              <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-md select-none border-b">
                <TableRow>
                  {Object.keys(rows[0]).map((col) => (
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
                    className="hover:bg-muted/10 transition-colors border-b border-border/20 odd:bg-muted/5"
                  >
                    {Object.keys(row).map((col) => (
                      <TableCell
                        key={col}
                        className="p-3 max-w-44 truncate text-foreground/90 font-mono"
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
