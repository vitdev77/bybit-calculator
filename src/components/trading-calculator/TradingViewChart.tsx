"use client";
import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingViewChartProps {
  coin: string;
}

export default function TradingViewChart({ coin }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isChartLoading, setIsChartLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsChartLoading(true);
    containerRef.current.innerHTML = "";

    const scriptId = "tradingview-widget-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const tvScriptUrl =
      process.env.TRADINGVIEW_SCRIPT_URL || "https://s3.tradingview.com/tv.js";

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = tvScriptUrl;
      script.type = "text/javascript";
      script.async = true;
      document.head.appendChild(script);
    }

    let widgetInstance: any = null;

    const initWidget = () => {
      if (
        typeof window !== "undefined" &&
        (window as any).TradingView &&
        containerRef.current
      ) {
        if (!containerRef.current) return;
        widgetInstance = new (window as any).TradingView.widget({
          autosize: true,
          symbol: `BYBIT:${coin}.P`,
          interval: "15",
          timezone: "Etc/UTC",
          theme: theme === "dark" ? "dark" : "light",
          style: "1",
          locale: "ru",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: containerRef.current.id,
          studies: [],
        });
        setIsChartLoading(false);
      }
    };

    let observer: ResizeObserver | null = null;

    const startWidgetWithObserver = () => {
      if ((window as any).TradingView) {
        observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width } = entry.contentRect;
            if (width > 100) {
              initWidget();
              if (observer) {
                observer.disconnect();
              }
            }
          }
        });
        if (containerRef.current) {
          observer.observe(containerRef.current);
        }
      } else {
        setTimeout(startWidgetWithObserver, 100);
      }
    };

    if ((window as any).TradingView) {
      startWidgetWithObserver();
    } else {
      script.onload = startWidgetWithObserver;
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [coin, theme]);

  return (
    <div
      className={cn(
        "w-full min-w-full h-125 bg-transparent p-4",
        "overflow-hidden relative select-none",
      )}
    >
      {isChartLoading && (
        <div
          className={cn(
            "absolute inset-4 z-40 bg-background dark:bg-neutral-950",
            "border border-border/40 rounded-xl flex flex-col",
            "justify-between p-4 overflow-hidden animate-pulse",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b",
              "border-border/20 pb-2 w-full",
            )}
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 bg-muted/60" />
              <Skeleton className="h-5 w-10 bg-muted/40" />
              <Skeleton className="h-5 w-12 bg-muted/40" />
            </div>
            <div className="flex items-center gap-1.5">
              <Activity
                className={cn("size-3.5 text-muted-foreground/30", "mr-1")}
              />
              <Skeleton className="h-5 w-24 bg-muted/50" />
            </div>
          </div>

          <div
            className={cn(
              "flex-1 w-full relative my-4 flex",
              "items-center justify-center",
            )}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
linear-gradient(rgba(120, 119, 198, 0.08) 1px, transparent 1px),
linear-gradient(90deg, rgba(120, 119, 198, 0.08) 1px, transparent 1px)
`,
                backgroundSize: "40px 40px",
              }}
            />
            <div
              className={cn(
                "flex items-end gap-5 h-2/3 opacity-30",
                "select-none pointer-events-none",
              )}
            >
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-emerald-500" />
                <div className="w-2.5 h-16 bg-emerald-500 rounded-xs" />
                <div className="w-0.5 h-4 bg-emerald-500" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-emerald-500" />
                <div className="w-2.5 h-10 bg-emerald-500 rounded-xs" />
                <div className="w-0.5 h-8 bg-emerald-500" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-8 bg-rose-500" />
                <div className="w-2.5 h-20 bg-rose-500 rounded-xs" />
                <div className="w-0.5 h-5 bg-rose-500" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-emerald-500" />
                <div className="w-2.5 h-12 bg-emerald-500 rounded-xs" />
                <div className="w-0.5 h-3 bg-emerald-500" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-10 bg-rose-500" />
                <div className="w-2.5 h-14 bg-rose-500 rounded-xs" />
                <div className="w-0.5 h-4 bg-rose-500" />
              </div>
            </div>
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 border-l",
                "border-border/10 flex flex-col justify-between pl-2 opacity-40",
              )}
            >
              <Skeleton className="h-2 w-10 bg-muted/40" />
              <Skeleton className="h-2 w-10 bg-muted/40" />
              <Skeleton className="h-2 w-10 bg-muted/40" />
              <Skeleton className="h-2 w-10 bg-muted/40" />
            </div>
          </div>

          <div
            className={cn(
              "h-10 w-full flex items-end gap-1.5 opacity-20",
              "border-t border-border/10 pt-2",
            )}
          >
            <Skeleton className="h-4 flex-1 bg-emerald-500" />
            <Skeleton className="h-7 flex-1 bg-emerald-500" />
            <Skeleton className="h-5 flex-1 bg-rose-500" />
            <Skeleton className="h-9 flex-1 bg-emerald-500" />
            <Skeleton className="h-3 flex-1 bg-rose-500" />
            <Skeleton className="h-6 flex-1 bg-rose-500" />
            <Skeleton className="h-4 flex-1 bg-emerald-500" />
          </div>
        </div>
      )}

      <div
        id="tradingview_chart_widget"
        ref={containerRef}
        className="w-full min-w-full h-full overflow-hidden border border-border/30 shadow-inner"
      />
    </div>
  );
}
