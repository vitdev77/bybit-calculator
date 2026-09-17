"use client";

import React from "react";
import { Table, TableBody } from "@/components/ui/table";
import { JournalHeader } from "./JournalHeader";

interface JournalTableProps {
  filteredDeals: any[];
  renderDealRow: (deal: any) => React.ReactNode;
}
export function JournalTable({
  filteredDeals,
  renderDealRow,
}: JournalTableProps) {
  if (filteredDeals.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground font-medium">
        Ничего не найдено.
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border/50 overflow-x-auto bg-background shadow-sm scrollbar-thin">
      <Table className="w-full text-xs min-w-180">
        <JournalHeader />
        <TableBody>{filteredDeals.map(renderDealRow)}</TableBody>
      </Table>
    </div>
  );
}
