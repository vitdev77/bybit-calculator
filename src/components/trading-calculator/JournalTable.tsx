"use client";

import React from "react";
import { Table, TableBody, TableRow } from "@/components/ui/table";
import { JournalHeader } from "./JournalHeader";
import { JournalFilters } from "./JournalFilters";

interface JournalTableProps {
  filteredDeals: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  renderDealRow: (deal: any) => React.ReactNode;
}

export function JournalTable({
  filteredDeals,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  renderDealRow,
}: JournalTableProps) {
  return (
    /* МОНОЛИТНЫЙ КОНТЕЙНЕР: Сливаем фильтр и таблицу в единый блок */
    <div className="w-full rounded-xl border border-border/50 bg-background shadow-sm overflow-hidden flex flex-col">
      {/* ВЕРХНИЙ ЯРУС ТАБЛИЦЫ: Панель управления поиском и вкладками */}
      <div className="w-full flex items-center justify-start bg-muted/30 dark:bg-muted/10 px-3.5 py-2.5 border-b border-border/30">
        <JournalFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      {/* НИЖНИЙ ЯРУС ТАБЛИЦЫ: Скролл-зона самой таблицы со своей шапкой */}
      <div className="w-full max-h-126.25 overflow-y-auto overflow-x-auto scrollbar-thin">
        <Table className="w-full text-xs min-w-180 relative border-collapse">
          <JournalHeader />
          <TableBody>
            {filteredDeals.length === 0 ? (
              <TableRow>
                <td
                  colSpan={9}
                  className="p-8 text-center text-xs text-muted-foreground font-medium"
                >
                  Ничего не найдено.
                </td>
              </TableRow>
            ) : (
              filteredDeals.map(renderDealRow)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
