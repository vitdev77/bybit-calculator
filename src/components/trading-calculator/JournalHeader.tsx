"use client";

import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function JournalHeader() {
  return (
    <TableHeader className="relative z-20 select-none">
      <TableRow className="border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50">
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Дата
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Пара
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Тип
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Объем
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          Вход
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          BE
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs">
          TP / SL
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs text-right pr-6">
          PnL
        </TableHead>
        <TableHead className="sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs text-right pr-4">
          Действия
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
