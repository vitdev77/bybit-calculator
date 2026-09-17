"use client";

import React from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";

export function JournalHeader() {
  return (
    <TableHeader>
      <TableRow className="border-b border-border/20 bg-muted/30 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <TableHead className="py-2 px-1.5 h-auto pl-3.5 sm:pl-5">
          Вход / Status
        </TableHead>
        <TableHead className="py-2 px-1.5 h-auto">Пара</TableHead>
        <TableHead className="py-2 px-1 h-auto">Тип</TableHead>
        <TableHead className="py-2 px-1.5 h-auto">Объем / Маржа</TableHead>
        <TableHead className="py-2 px-1.5 h-auto">Цена Входа</TableHead>
        <TableHead className="py-2 px-1.5 h-auto">Безубыток</TableHead>
        <TableHead className="py-2 px-1.5 h-auto">TP / SL</TableHead>
        <TableHead className="py-2.5 px-2 text-right">
          Результат (PnL)
        </TableHead>
        <TableHead className="py-2 px-1.5 h-auto text-right">
          Действия
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
