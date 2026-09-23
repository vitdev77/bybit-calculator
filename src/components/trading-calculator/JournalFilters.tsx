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
    /* 
      ФИКС МОБИЛЬНОСТИ: flex-col на смартфонах выстраивает поиск 
      и табы друг под другом, предотвращая их сжатие. sm:flex-row возвращает в ряд.
    */
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full">
      {/* СТРОКА ПОИСКА (Высота увеличена до h-9 на мобильных для тапа) */}
      <div className="relative w-full sm:max-w-56 flex items-center group">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
        <Input
          type="text"
          placeholder="Поиск пары..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-8 h-9 sm:h-7.5 text-xs bg-muted/20 border-border/40 rounded-lg w-full"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 text-muted-foreground/60 hover:text-foreground bg-transparent border-none p-0 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* ТАБЫ ФИЛЬТРАЦИИ СТАТУСОВ (Увеличены на мобильных для пальцев) */}
      <Tabs
        value={statusFilter}
        onValueChange={(val) => setStatusFilter(val || "ALL")}
        className="w-full sm:w-auto"
      >
        <TabsList className="h-9 sm:h-7.5 w-full sm:w-auto p-0.5 bg-muted/40 border border-border/30 rounded-lg grid grid-cols-3 sm:flex">
          <TabsTrigger
            value="ALL"
            className="text-[11px] px-3 font-bold uppercase tracking-wider h-full"
          >
            Все
          </TabsTrigger>
          <TabsTrigger
            value="OPEN"
            className="text-[11px] px-3 font-bold uppercase tracking-wider h-full"
          >
            Открытые
          </TabsTrigger>
          <TabsTrigger
            value="CLOSED"
            className="text-[11px] px-3 font-bold uppercase tracking-wider h-full"
          >
            Закрытые
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
