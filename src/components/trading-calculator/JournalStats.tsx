"use client";

import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";
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

interface JournalStatsProps {
  totalDeals: number;
  profitDeals: number;
  lossDeals: number;
  manualClosedDeals: number;
  isClearOpen: boolean;
  setIsClearOpen: (open: boolean) => void;
  exportToCSV: () => void;
  handleClearAllDeals: () => void;
}

export function JournalStats({
  totalDeals,
  profitDeals,
  lossDeals,
  manualClosedDeals,
  isClearOpen,
  setIsClearOpen,
  exportToCSV,
  handleClearAllDeals,
}: JournalStatsProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs justify-between sm:justify-end w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      <div className="text-center">
        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
          Всего
        </span>
        <span className="font-bold text-xs sm:text-sm">{totalDeals}</span>
      </div>

      <div className="text-center border-l pl-2 border-border/40">
        <span className="text-emerald-500 block text-[9px] uppercase tracking-wider">
          Тейки
        </span>
        <span className="font-bold text-emerald-600 text-xs sm:text-sm">
          {profitDeals}
        </span>
      </div>

      <div className="text-center border-l pl-2 border-border/40">
        <span className="text-rose-500 block text-[9px] uppercase tracking-wider">
          Стопы
        </span>
        <span className="font-bold text-rose-600 text-xs sm:text-sm">
          {lossDeals}
        </span>
      </div>

      <div className="text-center border-l pl-2 border-border/40">
        <span className="text-violet-500 block text-[9px] uppercase tracking-wider">
          Ручные
        </span>
        <span className="font-bold text-violet-600 text-sm">
          {manualClosedDeals}
        </span>
      </div>

      <div className="flex items-center gap-1 pl-1 border-l border-border/40 shrink-0">
        {totalDeals > 0 && (
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="icon-sm"
            className="size-8 rounded-xl text-muted-foreground border-border/60 hover:text-foreground"
          >
            <Download className="size-4" />
          </Button>
        )}

        {totalDeals > 0 && (
          <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <AlertDialogTrigger
              className={buttonVariants({
                variant: "outline",
                size: "icon-xs",
                className:
                  "h-7.5 w-7.5 text-rose-600 border-rose-500/20 hover:bg-rose-600 rounded-lg p-0",
              })}
            >
              <Trash2 className="size-3.5 shrink-0" />
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить весь журнал?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие безвозвратно удалит всю историю Вашей торговли из
                  базы данных.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl text-xs h-9">
                  Отмена
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleClearAllDeals}
                  className={buttonVariants({
                    variant: "destructive",
                    className:
                      "rounded-xl text-xs h-9 bg-rose-600 text-white border-none",
                  })}
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
