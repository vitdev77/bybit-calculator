"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2, HelpCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
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

  const [isClearOpen, setIsClearOpen] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);

  // Отключаем кэш и строго проверяем, что пришел массив rows
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
    } catch (err) {
      console.error("Не удалось подгрузить журнал сделок:", err);
      toast.add({
        title: "Ошибка загрузки",
        description: "Не удалось получить историю сделок из базы Neon.",
        type: "error",
      });
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

  useEffect(() => {
    fetchJournal();
  }, []);

  // Панель быстрой аналитики стратегии
  const totalDeals = deals.length;
  const profitDeals = deals.filter((d) => d.status === "PROFIT").length;
  const lossDeals = deals.filter((d) => d.status === "LOSS").length;
  const winRate =
    totalDeals > 0
      ? ((profitDeals / (profitDeals + lossDeals || 1)) * 100).toFixed(0)
      : "0";

  // Смена статуса (Тейк / Стоп) в Neon Postgres
  const handleUpdateStatus = async (id: number, status: "PROFIT" | "LOSS") => {
    try {
      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update error");

      const targetDeal = deals.find((d) => d.id === id);
      const coinName = targetDeal ? targetDeal.coin.replace("USDT", "") : "";

      toast.add({
        title:
          status === "PROFIT"
            ? "Сделка закрыта в ПЛЮС! 🎉"
            : "Сделка закрыта в стоп 📉",
        description: `Статус позиции по ${coinName} успешно обновлен в базе данных Neon.`,
        type: status === "PROFIT" ? "success" : "warning",
      });

      fetchJournal();
    } catch (err) {
      console.error("Ошибка при изменении статуса:", err);
      toast.add({
        title: "Ошибка обновления",
        description: "Не удалось изменить статус сделки.",
        type: "error",
      });
    }
  };

  // Удаление одной строчки из базы и ручное закрытие её модалки
  const handleDeleteDeal = async (id: number) => {
    try {
      const targetDeal = deals.find((d) => d.id === id);
      const coinName = targetDeal ? targetDeal.coin.replace("USDT", "") : "";

      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete error");

      toast.add({
        title: "Запись удалена",
        description: `Трейд по паре ${coinName} стерт из журнала.`,
        type: "info",
      });

      await fetchJournal();
      setActiveDeleteId(null);
    } catch (err) {
      console.error("Ошибка при удалении трейда:", err);
      toast.add({
        title: "Ошибка удаления",
        description: "Не удалось стереть запись из облачной базы.",
        type: "error",
      });
    }
  };

  // Полное уничтожение базы в Neon Serverless и ручное закрытие модалки
  const handleClearAllDeals = async () => {
    try {
      const res = await fetch("/api/journal", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear all error");

      toast.add({
        title: "Журнал зачищен",
        description: "Все записи были успешно удалены из базы Neon Postgres.",
        type: "success",
      });

      await fetchJournal();
      setIsClearOpen(false);
    } catch (err) {
      console.error("Ошибка при полной очистке журнала:", err);
      toast.add({
        title: "Ошибка очистки",
        description: "Критическая ошибка при удалении истории журнала.",
        type: "error",
      });
    }
  };
  // Оптимизированная функция рендеринга строки сделки с безубытком и типом ордера
  const renderDealRow = (deal: Deal) => {
    const isLong = deal.side === "BUY";
    const isOpen = deal.status === "OPEN";
    const precision = deal.entry_price >= 500 ? 2 : 4;

    // Рассчитываем точную цену безубытка с учетом типа ордера (как на Bybit)
    const openFeeRate = deal.order_type === "LIMIT" ? 0.0002 : 0.00055;
    const closeFeeRate = 0.00055;
    const totalFeeRate = openFeeRate + closeFeeRate;

    const breakevenPrice = isLong
      ? deal.entry_price * (1 + totalFeeRate)
      : deal.entry_price * (1 - totalFeeRate);

    const bClass =
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border select-none ";
    const statusBadge =
      deal.status === "PROFIT" ? (
        <span
          className={
            bClass + "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          }
        >
          <CheckCircle2 className="size-3" /> PROFIT
        </span>
      ) : deal.status === "LOSS" ? (
        <span
          className={bClass + "bg-rose-500/10 text-rose-600 border-rose-500/20"}
        >
          <XCircle className="size-3" /> LOSS
        </span>
      ) : (
        <span
          className={
            bClass + "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }
        >
          <HelpCircle className="size-3" /> OPEN
        </span>
      );

    return (
      <TableRow
        key={deal.id}
        className={`transition-all border-b border-border/20 ${!isOpen ? "opacity-45 grayscale-20" : ""}`}
      >
        <TableCell className="py-3 px-4 font-bold">
          {deal.coin.replace("USDT", "")}
          <span className="text-[10px] text-muted-foreground ml-0.5">
            /USDT
          </span>
        </TableCell>

        {/* НОВАЯ ЯЧЕЙКА: Тип ордера */}
        <TableCell className="py-3 px-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${deal.order_type === "LIMIT" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}
          >
            {deal.order_type}
          </span>
        </TableCell>

        <TableCell className="py-3 px-3">
          <span
            className={`font-bold text-[11px] ${isOpen ? (isLong ? "text-emerald-600" : "text-rose-600") : "text-muted-foreground"}`}
          >
            {isLong ? "▲ LONG" : "▼ SHORT"}
          </span>
        </TableCell>
        <TableCell className="py-3 px-3 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {deal.volume.toFixed(2)}
          </span>{" "}
          USDT
          <div className="text-[10px]">
            Маржа: {deal.margin.toFixed(2)} (x{deal.leverage})
          </div>
        </TableCell>
        <TableCell className="py-3 px-3 font-semibold">
          {deal.entry_price.toFixed(precision)}
        </TableCell>

        {/* НОВАЯ ЯЧЕЙКА: Расчитанная цена безубытка */}
        <TableCell className="py-3 px-3 font-medium text-amber-600/90 dark:text-amber-400/90">
          {breakevenPrice.toFixed(precision)}
        </TableCell>

        <TableCell
          className={`py-3 px-3 ${isOpen ? "text-emerald-600/90" : "text-muted-foreground/70"}`}
        >
          {deal.take_profit.toFixed(precision)}
        </TableCell>
        <TableCell
          className={`py-3 px-3 ${isOpen ? "text-rose-600/90" : "text-muted-foreground/70"}`}
        >
          {deal.stop_loss.toFixed(precision)}
        </TableCell>
        <TableCell className="py-3 px-3 text-center">{statusBadge}</TableCell>
        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            {isOpen && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "PROFIT")}
                  className="h-7 px-2 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold cursor-pointer shadow-none"
                >
                  Тейк
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUpdateStatus(deal.id, "LOSS")}
                  className="h-7 px-2 text-rose-600 hover:bg-rose-600 hover:text-white font-bold cursor-pointer shadow-none"
                >
                  Стоп
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
                    "h-7 w-7 text-muted-foreground hover:text-rose-500 cursor-pointer shadow-none flex items-center justify-center p-0",
                })}
              >
                <Trash2 className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent size="default">
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы действительно хотите убрать трейд по{" "}
                    {deal.coin.replace("USDT", "")}? Статистика изменится.
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
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 pt-0">
      <Card className="w-full shadow-sm border border-border/40 bg-background rounded-[2rem] overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-row items-center justify-between space-y-0 gap-4 flex-wrap sm:flex-nowrap">
          <div className="space-y-0.5 min-w-48">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Журнал сделок
            </CardTitle>
            <p className="text-xs text-muted-foreground select-none">
              Статистика торговой стратегии из базы Neon
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs select-none ml-auto">
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
              <span className="font-bold text-rose-600 text-sm">
                {lossDeals}
              </span>
            </div>
            <div className="text-right border-l pl-3 border-border/40 bg-muted/40 dark:bg-muted/10 px-2 py-0.5 rounded-md border">
              <span className="text-amber-500 block text-[10px] uppercase font-medium">
                WinRate
              </span>
              <span className="font-extrabold text-sm">{winRate}%</span>
            </div>
            {totalDeals > 0 && (
              <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
                <AlertDialogTrigger
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "h-8 px-2.5 ml-2 text-[10px] font-bold tracking-wider uppercase text-rose-600 border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-xl cursor-pointer shadow-none",
                  })}
                >
                  Очистить журнал
                </AlertDialogTrigger>
                <AlertDialogContent size="default">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Уничтожить весь журнал?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие безвозвратно сотрет историю ваших сделок из
                      базы Neon.
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
                <TableRow className="border-b border-border/30 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-medium hover:bg-muted/30">
                  <TableHead className="py-2.5 px-4 h-auto text-muted-foreground font-medium">
                    Пара
                  </TableHead>
                  <TableHead className="py-2.5 px-2 h-auto text-muted-foreground font-medium">
                    Тип
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
                  <TableHead className="py-2.5 px-3 h-auto text-muted-foreground font-medium">
                    Безубыток
                  </TableHead>
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
              <TableBody>{deals.map(renderDealRow)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
