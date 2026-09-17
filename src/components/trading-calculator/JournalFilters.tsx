"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JournalFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}
export function JournalFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: JournalFiltersProps) {
  return (
    <div className="flex flex-row items-center gap-2 flex-1 w-full sm:max-w-xl">
      <div className="relative w-full sm:max-w-55 flex items-center group">
        <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground/60 pointer-events-none" />
        <Input
          type="text"
          placeholder="Поиск пары..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 pr-7 h-7.5 text-xs bg-muted/20 border-border/40 rounded-lg w-full"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <Tabs
        value={statusFilter}
        onValueChange={(val) => setStatusFilter(val || "ALL")}
      >
        <TabsList className="h-7.5 p-0.5 bg-muted/40 border border-border/30 rounded-lg">
          <TabsTrigger value="ALL" className="text-[11px] px-2 font-semibold">
            Все
          </TabsTrigger>
          <TabsTrigger value="OPEN" className="text-[11px] px-2 font-semibold">
            Откр.
          </TabsTrigger>
          <TabsTrigger
            value="CLOSED"
            className="text-[11px] px-2 font-semibold"
          >
            Закр.
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
