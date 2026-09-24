"use client";

import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function JournalHeader() {
  return (
    // СИНХРОНИЗАЦИЯ СТЕКА: Добавляем относительное позиционирование для монолитного удержания sticky-компонентов
    <TableHeader className="relative z-20 select-none">
      <TableRow className="border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50">
        {/* ЖЕСТКИЙ ФИКС ШАПКИ: Каждая ячейка получает свойства sticky top-0, 
            чтобы намертво застыть при вертикальной прокрутке журнала сделок */}
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Дата / Время
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Пара
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Тип
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Объем ордера
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Вход
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Безубыток
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Уровни TP / SL
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs text-right pr-6">
          Финансовый PnL
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs text-right pr-4">
          Действия
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
