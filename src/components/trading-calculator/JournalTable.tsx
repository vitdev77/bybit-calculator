"use client";
import React from "react";
import { Table, TableBody, TableRow } from "@/components/ui/table";
import { JournalHeader } from "./JournalHeader";
import { JournalFilters } from "./JournalFilters";
import { cn } from "@/lib/utils";

interface JTableProps {
  filteredDeals: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  renderDealRow: (deal: any) => React.ReactNode;
  totalDeals: number;
  isClearOpen: boolean;
  setIsClearOpen: (open: boolean) => void;
  exportToCSV: () => void;
  handleClearAllDeals: () => void;
}

export function JournalTable({
  filteredDeals,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  renderDealRow,
  totalDeals,
  isClearOpen,
  setIsClearOpen,
  exportToCSV,
  handleClearAllDeals,
}: JTableProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl",
        "border border-border/50",
        "bg-background",
        "shadow-xs",
        "overflow-hidden",
        "flex flex-col",
      )}
    >
      <div
        className={cn(
          "w-full flex",
          "items-center",
          "justify-start",
          "bg-muted/30",
          "dark:bg-muted/10",
          "px-3.5 py-2.5",
          "border-b",
          "border-border/30",
        )}
      >
        <JournalFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalDeals={totalDeals}
          isClearOpen={isClearOpen}
          setIsClearOpen={setIsClearOpen}
          exportToCSV={exportToCSV}
          handleClearAllDeals={handleClearAllDeals}
        />
      </div>
      <div
        className={cn(
          "w-full",
          "overflow-x-auto",
          "overflow-y-auto",
          "scrollbar-thin",
          "touch-pan-x",
        )}
      >
        <Table
          className={cn(
            "w-full text-xs",
            "min-w-180",
            "relative",
            "border-collapse",
          )}
        >
          <JournalHeader />
          <TableBody>
            {filteredDeals.length === 0 ? (
              <TableRow>
                <td
                  colSpan={9}
                  className={cn(
                    "p-8 text-center",
                    "text-xs",
                    "text-muted-foreground",
                    "font-medium",
                  )}
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
