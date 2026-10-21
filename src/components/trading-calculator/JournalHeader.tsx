import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function JournalHeader() {
  const headCls = cn(
    "sticky top-0 z-20 h-8 font-black uppercase text-[10px] tracking-wider",
    "text-muted-foreground/80 py-1 bg-muted/90 dark:bg-zinc-900/90 backdrop-blur-xs",
  );

  return (
    <TableHeader className="relative z-20 select-none font-mono">
      <TableRow className="border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50">
        <TableHead className={headCls}>Дата</TableHead>
        <TableHead className={headCls}>Пара</TableHead>
        <TableHead className={headCls}>Тип</TableHead>
        <TableHead className={headCls}>Объем</TableHead>
        <TableHead className={headCls}>Вход</TableHead>
        <TableHead className={headCls}>BE</TableHead>
        <TableHead className={headCls}>TP / SL</TableHead>
        <TableHead
          className={cn(
            headCls,
            "text-right pr-4 w-28.75 min-w-28.75 max-w-28.75",
          )}
        >
          PnL
        </TableHead>
        <TableHead
          className={cn(headCls, "text-right pr-4 w-45 min-w-45 max-w-45")}
        >
          Действия
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
