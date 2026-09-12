"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2, HelpCircle } from "lucide-react";
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
}
export default function TradingJournal() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // СТЕНД КОНТРОЛЯ BASE UI: Стейты для принудительного закрытия модалок из кода
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);

  // Функция загрузки всей истории сделок из Neon Serverless
  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/journal");
      if (!res.ok) throw new Error("Load error");
      const data = await res.json();
      setDeals(data || []);
    } catch (err) {
      console.error("Не удалось подгрузить журнал сделок:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Авто-синхронизация с калькулятором при фиксации новых сделок
  useEffect(() => {
    fetchJournal();
    window.addEventListener("refresh-trading-journal", fetchJournal);
    return () =>
      window.removeEventListener("refresh-trading-journal", fetchJournal);
  }, [fetchJournal]);
  // Смена статуса (Тейк / Стоп) в Neon Postgres
  const handleUpdateStatus = async (id: number, status: "PROFIT" | "LOSS") => {
    try {
      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update error");
      fetchJournal();
    } catch (err) {
      console.error("Ошибка при изменении статуса:", err);
    }
  };

  // Удаление одной строчки из базы и ручное закрытие её модалки
  const handleDeleteDeal = async (id: number) => {
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete error");
      await fetchJournal();
      setActiveDeleteId(null); // ИСПРАВЛЕНО: Закрываем модалку строки после успеха
    } catch (err) {
      console.error("Ошибка при удалении трейда:", err);
    }
  };

  // Полное уничтожение базы в Neon Serverless и ручное закрытие модалки
  const handleClearAllDeals = async () => {
    try {
      const res = await fetch("/api/journal", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear all error");
      await fetchJournal();
      setIsClearOpen(false); // ИСПРАВЛЕНО: Закрываем глобальную модалку после зачистки
    } catch (err) {
      console.error("Ошибка при полной очистке журнала:", err);
    }
  };

  // Панель быстрой аналитики стратегии
  const totalDeals = deals.length;
  const profitDeals = deals.filter((d) => d.status === "PROFIT").length;
  const lossDeals = deals.filter((d) => d.status === "LOSS").length;
  const winRate =
    totalDeals > 0
      ? ((profitDeals / (profitDeals + lossDeals || 1)) * 100).toFixed(0)
      : "0";
  return (
    <div className="w-full max-w-5xl mx-auto p-4 pt-0">
      <Card className="w-full shadow-sm border border-border/40 bg-background rounded-[2rem] overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-row items-center justify-between space-y-0 gap-4 flex-wrap sm:flex-nowrap">
          <div className="space-y-0.5 min-w-48">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Журнал сделок
            </CardTitle>
            <p className="text-xs text-muted-foreground select-none">
              Облачная статистика твоей торговой стратегии из базы Neon
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs select-none ml-auto">
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                Всего
              </span>
              <span className="font-bold text-foreground text-sm">
                {totalDeals}
              </span>
            </div>
            <div className="text-right border-l pl-3 border-border/40">
              <span className="text-emerald-500 block text-[10px] uppercase font-sans">
                Тейки
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {profitDeals}
              </span>
            </div>
            <div className="text-right border-l pl-3 border-border/40">
              <span className="text-rose-500 block text-[10px] uppercase font-sans">
                Стопы
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                {lossDeals}
              </span>
            </div>
            <div className="text-right border-l pl-3 border-border/40 bg-muted/40 dark:bg-muted/10 px-2 py-0.5 rounded-md border">
              <span className="text-amber-500 block text-[10px] uppercase font-sans font-medium">
                WinRate
              </span>
              <span className="font-extrabold text-foreground text-sm">
                {winRate}%
              </span>
            </div>

            {totalDeals > 0 && (
              <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
                <AlertDialogTrigger
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "h-8 px-2.5 ml-2 text-[10px] font-sans font-bold tracking-wider uppercase text-rose-600 border-rose-500/20 hover:bg-rose-600 hover:text-white dark:border-rose-500/30 transition-all rounded-xl cursor-pointer shadow-none",
                  })}
                >
                  Очистить журнал
                </AlertDialogTrigger>
                <AlertDialogContent size="default">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Уничтожить весь журнал?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие безвозвратно сотрет абсолютно всю историю
                      ваших сделок из облачной базы данных Neon. Восстановить
                      статистику будет невозможно.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                      Отмена
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllDeals}
                      variant="destructive"
                      className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer border-none"
                    >
                      Удалить всё
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-medium animate-pulse">
              Синхронизация с Neon Serverless...
            </div>
          ) : deals.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-medium select-none">
              Журнал пуст. Рассчитай позицию выше и нажми «Зафиксировать в
              журнал»
            </div>
          ) : (
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="border-b border-border/30 bg-muted/30 dark:bg-muted/5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium select-none hover:bg-muted/30 dark:hover:bg-muted/5">
                  <TableHead className="py-2.5 px-4 h-auto text-muted-foreground font-medium">
                    Пара
                  </TableHead>
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Направление
                  </TableHead>
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Объем / Маржа
                  </TableHead>
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Вход
                  </TableHead>
                  {/* ИСПРАВЛЕНО: Теперь сначала идёт Take Profit, а потом Stop Loss */}
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Take Profit
                  </TableHead>
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Stop Loss
                  </TableHead>
                  <TableHead className="py-2.5 px-3 text-center text-muted-foreground font-medium">
                    Статус
                  </TableHead>
                  <TableHead className="py-2.5 px-4 h-auto text-right text-muted-foreground font-medium">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => {
                  const isLong = deal.side === "BUY";
                  const isOpen = deal.status === "OPEN";
                  const precision = deal.entry_price >= 500 ? 2 : 4;

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 select-none">
                      <HelpCircle className="size-3" /> OPEN
                    </span>
                  );
                  if (deal.status === "PROFIT") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                        <CheckCircle2 className="size-3" /> PROFIT
                      </span>
                    );
                  } else if (deal.status === "LOSS") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 select-none">
                        <XCircle className="size-3" /> LOSS
                      </span>
                    );
                  }

                  return (
                    <TableRow
                      key={deal.id}
                      className={`transition-all border-b border-border/20 ${
                        !isOpen
                          ? "opacity-45 grayscale-[20%] select-none hover:bg-transparent"
                          : ""
                      }`}
                    >
                      <TableCell
                        className={`py-3 px-4 font-bold ${isOpen ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {deal.coin.replace("USDT", "")}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                          /USDT
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                            !isOpen
                              ? "text-muted-foreground"
                              : isLong
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isLong ? "▲ LONG" : "▼ SHORT"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-3 text-muted-foreground">
                        <span
                          className={`font-semibold ${isOpen ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {deal.volume.toFixed(2)}
                        </span>
                        <span className="text-[10px] ml-1">USDT</span>
                        <div className="text-[10px] text-muted-foreground/60">
                          Маржа: {deal.margin.toFixed(2)} (x{deal.leverage})
                        </div>
                      </TableCell>

                      <TableCell
                        className={`py-3 px-3 font-semibold ${isOpen ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {deal.entry_price.toFixed(precision)}
                      </TableCell>

                      {/* ИСПРАВЛЕНО: Рендерим TableCell Take Profit (зелёный) строго ПЕРЕД Stop Loss (красный) */}
                      <TableCell
                        className={`py-3 px-3 ${isOpen ? "text-emerald-600/90 dark:text-emerald-400/90" : "text-muted-foreground/70"}`}
                      >
                        {deal.take_profit.toFixed(precision)}
                      </TableCell>
                      <TableCell
                        className={`py-3 px-3 ${isOpen ? "text-rose-600/90 dark:text-rose-400/90" : "text-muted-foreground/70"}`}
                      >
                        {deal.stop_loss.toFixed(precision)}
                      </TableCell>

                      <TableCell className="py-3 px-3 text-center">
                        {statusBadge}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isOpen && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleUpdateStatus(deal.id, "PROFIT")
                                }
                                className="h-7 px-2 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-md text-[10px] font-bold cursor-pointer shadow-none border-none animate-in fade-in duration-150"
                              >
                                Тейк
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleUpdateStatus(deal.id, "LOSS")
                                }
                                className="h-7 px-2 text-rose-600 hover:text-white hover:bg-rose-600 rounded-md text-[10px] font-bold cursor-pointer shadow-none border-none animate-in fade-in duration-150"
                              >
                                Стоп
                              </Button>
                            </>
                          )}

                          <AlertDialog
                            open={activeDeleteId === deal.id}
                            onOpenChange={(isOpen) =>
                              setActiveDeleteId(isOpen ? deal.id : null)
                            }
                          >
                            <AlertDialogTrigger
                              className={buttonVariants({
                                variant: "ghost",
                                size: "icon",
                                className:
                                  "h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-md cursor-pointer transition-colors opacity-40 group-hover:opacity-100 shadow-none border-none flex items-center justify-center p-0",
                              })}
                              title="Удалить запись"
                            >
                              <Trash2 className="size-3.5" />
                            </AlertDialogTrigger>
                            <AlertDialogContent size="default">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Удалить сделку?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы действительно хотите убрать этот трейд по{" "}
                                  {deal.coin.replace("USDT", "")} из журнала?
                                  Статистика винрейта изменится.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                                  Отмена
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDeal(deal.id)}
                                  variant="destructive"
                                  className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer border-none"
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
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
