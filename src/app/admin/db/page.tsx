"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Database,
  RefreshCw,
  Layers,
  Coins,
  Trash2,
  ArrowLeft,
  CloudDownload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
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
import { toast } from "@/components/ui/toast";
import { ModeToggle } from "@/components/ModeToggle";

export default function AdminDBExplorer() {
  const [currentTable, setCurrentTable] = useState<"deals" | "coins">("deals");
  const [dbData, setDbData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isTruncating, setIsTruncating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const loadTableData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/db?table=${currentTable}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setDbData(json.data || []);
        setStats(json.stats || {});
      }
    } catch (e) {
      toast.add({
        title: "Ошибка СУБД",
        description: "Не удалось загрузить данные",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentTable]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);
  const handleWipeTable = async () => {
    setIsAlertOpen(false);
    setIsTruncating(true);
    try {
      const res = await fetch(`/api/admin/db?table=${currentTable}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.add({
          title: "Таблица очищена",
          description: "Сброс TRUNCATE успешен",
          type: "success",
        });
        loadTableData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTruncating(false);
    }
  };

  const handleSyncBybit = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/coins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "SYNC_BYBIT",
        }),
      });
      if (res.ok) {
        toast.add({
          title: "Листинг обновлен",
          description: "Данные Bybit синхронизированы",
          type: "success",
        });
        if (currentTable === "coins") {
          loadTableData();
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.add({
        title: "Ошибка синхронизации",
        description: "Не удалось связаться с Bybit",
        type: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const headClass = cn(
    "sticky top-0 z-50 w-full",
    "bg-background/60 backdrop-blur-xl",
    "border-b border-white/5 py-3",
    "mb-6 flex items-center",
    "justify-between gap-4",
  );
  return (
    <main
      className={cn(
        "min-h-screen p-4 sm:p-6",
        "max-w-[2000px] mx-auto",
        "w-full overflow-hidden",
      )}
    >
      <div className={headClass}>
        <div className={cn("flex items-center", "gap-2.5 min-w-0 flex-1")}>
          <Database className={cn("size-5 text-amber-500")} />
          <h1
            className={cn(
              "text-sm sm:text-base font-black",
              "tracking-tight text-foreground",
              "hidden xs:inline",
            )}
          >
            Neon DB{" "}
            <span className={cn("text-muted-foreground", "font-normal")}>
              / Explorer
            </span>
          </h1>

          <Link
            href="/"
            className={cn(
              "inline-flex items-center",
              "gap-1 px-2 py-1",
              "text-[10px] sm:text-xs",
              "font-bold uppercase",
              "tracking-wider",
              "text-neutral-400",
              "hover:text-foreground",
              "bg-muted/40",
              "hover:bg-muted/80",
              "border border-border/40",
              "rounded-lg",
              "transition-all",
              "ml-1",
            )}
            title="Вернуться к калькулятору"
          >
            <ArrowLeft className="size-3" />
            <span>Калькулятор</span>
          </Link>
        </div>

        <div className={cn("flex items-center gap-2", "shrink-0")}>
          <span
            className={cn(
              "px-2 py-0.5 border",
              "border-amber-500/20 text-[10px]",
              "text-amber-500 font-bold",
              "rounded bg-amber-500/5 shadow-xs",
              "hidden sm:inline",
            )}
          >
            Администратор
          </span>
          <ModeToggle />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col sm:flex-row",
          "gap-3 items-stretch sm:items-center",
          "justify-between mb-4 w-full",
        )}
      >
        <div className={cn("flex items-center gap-2")}>
          <Button
            variant={currentTable === "deals" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTable("deals")}
            className="gap-1.5 font-bold"
          >
            <Layers className="size-4" />
            Журнал (deals)
          </Button>
          <Button
            variant={currentTable === "coins" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTable("coins")}
            className="gap-1.5 font-bold"
          >
            <Coins className="size-4" />
            Валюты (coins)
          </Button>
        </div>

        <div className={cn("flex items-center gap-2", "justify-end")}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncBybit}
            disabled={isSyncing || loading}
            className="gap-1 text-amber-500 border-amber-500/20 hover:bg-amber-500/10 font-bold"
            title="Стянуть свежий листинг с Bybit"
          >
            <CloudDownload
              className={cn("size-3.5", isSyncing ? "animate-bounce" : "")}
            />
            <span className="hidden xs:inline">Синхронизировать</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTableData}
            disabled={loading || isSyncing}
          >
            <RefreshCw
              className={cn("size-3.5", loading ? "animate-spin" : "")}
            />
          </Button>

          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger
              className={buttonVariants({
                variant: "destructive",
                size: "sm",
                className: cn("gap-1.5 font-black", "cursor-pointer"),
              })}
              disabled={
                loading || isTruncating || dbData.length === 0 || isSyncing
              }
            >
              <Trash2 className="size-3.5" />
              Очистить таблицу
            </AlertDialogTrigger>
            <AlertDialogContent
              className={cn("rounded-2xl max-w-xs", "sm:max-w-sm")}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className={cn("text-sm sm:text-base")}>
                  Очистить таблицу
                  {currentTable.toUpperCase()}?
                </AlertDialogTitle>
                <AlertDialogDescription
                  className={cn("text-[11px] sm:text-xs")}
                >
                  ВНИМАНИЕ! Это действие удалит все строки из таблицы{" "}
                  {currentTable}в базе Neon DB.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={cn("gap-1.5 sm:gap-2")}>
                <AlertDialogCancel
                  className={cn("rounded-xl text-xs", "h-9 cursor-pointer")}
                >
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWipeTable}
                  className={buttonVariants({
                    variant: "destructive",
                    className: cn(
                      "rounded-xl text-xs",
                      "h-9 bg-rose-600",
                      "hover:bg-rose-700",
                      "text-white border-none",
                      "cursor-pointer flex",
                      "items-center",
                      "justify-center",
                    ),
                  })}
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div
        className={cn(
          "w-full rounded-2xl border",
          "border-border/40 bg-background",
          "p-4 shadow-2xl min-w-0",
        )}
      >
        <div
          className={cn(
            "w-full px-4 py-2 border-b",
            "border-border/30 bg-muted/20",
            "flex justify-between items-center",
          )}
        >
          <span
            className={cn(
              "text-[10px] font-black",
              "uppercase tracking-wider",
              "text-muted-foreground",
            )}
          >
            Всего строк в СУБД:{" "}
            <span className="text-foreground">{stats.count || 0}</span>
          </span>
        </div>

        <div
          className={cn(
            "w-full max-h-150 relative",
            "scrollbar-thin min-w-0",
            isSyncing ? "overflow-hidden" : "overflow-x-auto overflow-y-auto",
          )}
        >
          {isSyncing && (
            <div
              className={cn(
                "absolute inset-0 bg-background/50",
                "backdrop-blur-xs z-30 flex",
                "items-center justify-center",
                "gap-2 font-bold text-amber-500",
                "select-none pointer-events-auto",
              )}
            >
              <Spinner className="text-amber-500 animate-spin" />
              <span>Запрос Bybit API...</span>
            </div>
          )}

          <div
            className={cn(
              "w-full transition-all duration-300",
              isSyncing ? "blur-xs pointer-events-none opacity-50" : "",
            )}
          >
            {loading && !isSyncing ? (
              <div
                className={cn(
                  "flex p-20 gap-2 items-center",
                  "justify-center text-muted-foreground",
                )}
              >
                <Spinner className={"text-amber-500"} />
                <span>Чтение Neon DB...</span>
              </div>
            ) : dbData.length === 0 ? (
              <div className={cn("p-12 text-center", "text-muted-foreground")}>
                Таблица пуста
              </div>
            ) : (
              <Table
                className={cn("w-full text-xs min-w-225", "border-collapse")}
              >
                <TableHeader>
                  <TableRow className={cn("bg-muted/40 font-bold")}>
                    {Object.keys(dbData[0] || {}).map((key) => (
                      <TableHead
                        key={key}
                        className={cn(
                          "font-black text-[10px]",
                          "uppercase tracking-wider",
                        )}
                      >
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/20">
                      {Object.values(row).map((val: any, vIdx) => (
                        <TableCell
                          key={vIdx}
                          className={cn("font-mono max-w-48", "truncate")}
                        >
                          {val === null
                            ? "NULL"
                            : typeof val === "boolean"
                              ? val
                                ? "TRUE"
                                : "FALSE"
                              : String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
