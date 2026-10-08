"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTable: "deals" | "coins";
  onTableChange: (table: "deals" | "coins") => void;
}

export function AdminHeader({ activeTable, onTableChange }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-border/40">
      <div className="flex items-center justify-between w-full">
        <Link href="/" passHref>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold rounded-xl flex items-center gap-1.5 px-2.5"
          >
            <ArrowLeft className="size-3.5" /> Калькулятор
          </Button>
        </Link>
        <ModeToggle />
      </div>
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between",
          "gap-3 bg-muted/20 p-2 rounded-xl border border-border/30",
        )}
      >
        <div className="flex items-center gap-2">
          <Database className="size-4.5 text-violet-500 shrink-0" />
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider">
            Администрирование СУБД
          </h1>
        </div>
        <div
          className={cn(
            "flex gap-1 bg-background border border-input p-0.5",
            "rounded-lg w-full sm:w-auto",
          )}
        >
          <Button
            type="button"
            variant={activeTable === "deals" ? "default" : "ghost"}
            className="h-7 text-[10px] rounded-md font-black uppercase px-3 flex-1"
            onClick={() => onTableChange("deals")}
          >
            Журнал
          </Button>
          <Button
            type="button"
            variant={activeTable === "coins" ? "default" : "ghost"}
            className="h-7 text-[10px] rounded-md font-black uppercase px-3 flex-1"
            onClick={() => onTableChange("coins")}
          >
            Листинг
          </Button>
        </div>
      </div>
    </div>
  );
}
