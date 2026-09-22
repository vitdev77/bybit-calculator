"use client";

import React from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";

export function JournalHeader() {
  return (
    /* 
      БИРЖЕВОЙ РЕГЛАМЕНТ: sticky top-0 намертво фиксирует шапку сверху.
      z-30 удерживает её над прокручивающимися строками сделок.
    */
    <TableHeader className="sticky top-0 z-30 bg-muted/95 dark:bg-muted/90 backdrop-blur-xs shadow-xs">
      <TableRow className="border-b border-border/20 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        <TableHead className="py-2.5 px-2 h-auto pl-3.5 sm:pl-5">
          Вход / Status
        </TableHead>
        <TableHead className="py-2.5 px-2 h-auto">Пара</TableHead>
        <TableHead className="py-2.5 px-1 h-auto">Тип</TableHead>
        <TableHead className="py-2.5 px-2 h-auto">Объем / Маржа</TableHead>
        <TableHead className="py-2.5 px-2 h-auto">Цена Входа</TableHead>
        <TableHead className="py-2.5 px-2 h-auto">Безубыток</TableHead>
        <TableHead className="py-2.5 px-2 h-auto">TP / SL</TableHead>
        <TableHead className="py-2.5 px-2 text-right">
          Результат (PnL)
        </TableHead>
        <TableHead className="py-2.5 px-2 text-right pr-3.5 sm:pr-5">
          Действия
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
