"use client";

import React from "react";
import { Search, X, Download, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
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

interface JournalFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  totalDeals: number;
  isClearOpen: boolean;
  setIsClearOpen: (open: boolean) => void;
  exportToCSV: () => void;
  handleClearAllDeals: () => void;
}

export function JournalFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  totalDeals,
  isClearOpen,
  setIsClearOpen,
  exportToCSV,
  handleClearAllDeals,
}: JournalFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 w-full text-xs">
      {/* ЛЕВАЯ ЧАСТЬ */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto flex-1 sm:flex-none min-w-0">
        <div className="relative w-full sm:w-56 flex items-center group">
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
        {/* ТАБЫ ФИЛЬТРОВ С АДАПТИВНЫМ СОКРАЩЕНИЕМ СЛОВ */}
        <Tabs
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val || "ALL")}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-9 sm:h-7.5 w-full sm:w-auto p-0.5 bg-muted/40 border border-border/30 rounded-lg grid grid-cols-3 sm:flex">
            <TabsTrigger
              value="ALL"
              className="text-[11px] px-3 font-bold uppercase tracking-wider h-full flex items-center justify-center"
            >
              Все
            </TabsTrigger>
            <TabsTrigger
              value="OPEN"
              className="text-[11px] px-3 font-bold uppercase tracking-wider h-full flex items-center justify-center"
            >
              {/* ФИКС: Откр. на мобилке, Открытые на десктопе */}
              <span className="sm:hidden">Откр.</span>
              <span className="hidden sm:inline">Открытые</span>
            </TabsTrigger>
            <TabsTrigger
              value="CLOSED"
              className="text-[11px] px-3 font-bold uppercase tracking-wider h-full flex items-center justify-center"
            >
              {/* ФИКС: Закр. на мобилке, Закрытые на десктопе */}
              <span className="sm:hidden">Закр.</span>
              <span className="hidden sm:inline">Закрытые</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ПРАВАЯ ЧАСТЬ */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-1.5 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
        {totalDeals > 0 ? (
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="h-9 sm:h-7.5 w-full sm:w-auto px-2.5 rounded-lg text-muted-foreground border-border/60 bg-transparent hover:text-foreground hover:bg-muted/40 transition-colors shadow-none shrink-0"
            title="Выгрузить журнал в формате CSV"
          >
            <Download className="size-3.5 mr-1.5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Экспорт
            </span>
          </Button>
        ) : (
          <div className="hidden sm:block" />
        )}

        {totalDeals > 0 ? (
          <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <AlertDialogTrigger
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-9 sm:h-7.5 w-full sm:w-auto px-2.5 text-rose-600 border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-lg transition-colors shadow-none bg-transparent shrink-0 flex items-center justify-center cursor-pointer",
              })}
              title="Полная очистка облачной базы данных"
            >
              <Trash2 className="size-3.5 mr-1.5 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Очистить
              </span>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl max-w-xs sm:max-w-sm bg-popover/70 dark:bg-zinc-950/70 backdrop-blur-md border border-border/40 dark:border-white/10 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm sm:text-base">
                  Очистить весь журнал?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] sm:text-xs">
                  Это действие безвозвратно удалит всю историю Вашей торговли из
                  облачной базы данных Neon DB.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-1.5 sm:gap-2">
                <AlertDialogCancel className="rounded-xl text-xs h-9 cursor-pointer">
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllDeals}
                  className={buttonVariants({
                    variant: "destructive",
                    className:
                      "rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white border-none cursor-pointer flex items-center justify-center",
                  })}
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </div>
  );
}
