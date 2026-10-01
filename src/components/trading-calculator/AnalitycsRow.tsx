"use client";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface FGData {
  value: number;
  sentiment: string;
  color: string;
  rawColor: string;
}

interface AnalyticsProps {
  marginUsed: number;
  allocatedMax: number;
  fundingRate: number;
}
export function AnalitycsRow({
  marginUsed,
  allocatedMax,
  fundingRate,
}: AnalyticsProps) {
  const [fng, setFng] = useState<FGData | null>(null);
  const [fngLoading, setFngLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [fundProgress, setFundProgress] = useState(100);

  useEffect(() => {
    fetch("/api/fng")
      .then((r) => r.json())
      .then((res) => {
        const f = res.data?.[0];
        if (!f) return;
        const val = parseInt(f.value) || 50;
        let sent = "Neutral";
        let col = "text-amber-500";
        let rCol = "#f59e0b";
        if (val <= 25) {
          sent = "Extreme Fear";
          col = "text-rose-500";
          rCol = "#f43f5e";
        } else if (val < 45) {
          sent = "Fear";
          col = "text-rose-400";
          rCol = "#fb7185";
        } else if (val > 55 && val <= 75) {
          sent = "Greed";
          col = "text-emerald-400";
          rCol = "#34d399";
        } else if (val > 75) {
          sent = "Extreme Greed";
          col = "text-emerald-500";
          rCol = "#10b981";
        }
        setFng({
          value: val,
          sentiment: sent,
          color: col,
          rawColor: rCol,
        });
      })
      .catch((e) => console.error(e))
      .finally(() => setFngLoading(false));
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const currentUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
      );
      const h = now.getUTCHours();
      const intervals = [0, 8, 16];
      const nextHour = intervals.find((i) => i > h) ?? 24;

      const nextFundingUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        nextHour === 24 ? now.getUTCDate() + 1 : now.getUTCDate(),
        nextHour === 24 ? 0 : nextHour,
        0,
        0,
      );

      const diff = nextFundingUtc - currentUtc;
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setFundProgress(0);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");

      setTimeLeft(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      setFundProgress((diff / (8 * 3600000)) * 100);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const ratio = allocatedMax > 0 ? Math.min(marginUsed / allocatedMax, 1) : 0;
  const activeBlocks = Math.round(ratio * 10);
  const isHighMargin = ratio > 0.85;
  const isFundingHigh = Math.abs(fundingRate) >= 0.01;

  // Пересчет позиции точки-трекера внутри дуги (в процентах от 0 до 100)
  const fngPercent = fng ? fng.value : 50;

  const radius = 16;
  const stroke = 2.5;
  const circum = 2 * Math.PI * radius;
  const strokeDashoffset = circum - (fundProgress / 100) * circum;
  return (
    <div
      className={cn(
        "p-3 border w-full rounded-xl",
        "grid grid-cols-1 md:grid-cols-3 gap-4",
        "bg-muted/30 dark:bg-black/40 border-border/40",
      )}
    >
      <div className="flex items-center justify-between pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-border/30 pb-3 md:pb-0 h-14">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] uppercase font-bold text-muted-foreground/60">
            Fear & Greed
          </span>
          {fngLoading ? (
            <div className="h-6 flex items-center">
              <Spinner className="text-amber-500" />
            </div>
          ) : fng ? (
            <div className="flex flex-col mt-0.5">
              <span
                className={cn("text-base font-black leading-none", fng.color)}
              >
                {fng.value}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground mt-0.5 truncate">
                {fng.sentiment}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">--</span>
          )}
        </div>
        <div className="relative w-24 h-5 flex items-center shrink-0">
          {/* Тонкий горизонтальный премиальный трек со скользящей неоновой точкой */}
          <div className="w-full h-1 bg-muted-foreground/10 dark:bg-neutral-800 rounded-full relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full border border-background shadow-[0_0_8px_currentColor] transition-all duration-1000"
              style={{
                left: `${fngPercent}%`,
                backgroundColor: fng ? fng.rawColor : "#f59e0b",
                color: fng ? fng.rawColor : "#f59e0b",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-0 md:px-4 border-b md:border-b-0 md:border-r border-border/30 pb-3 md:pb-0 h-14">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] uppercase font-bold text-muted-foreground/60">
            Countdown
          </span>
          <span
            className={cn(
              "text-base font-black tracking-tight mt-0.5 text-foreground block",
              isFundingHigh ? "text-amber-500 animate-pulse" : "",
            )}
          >
            {timeLeft}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
            До выплаты фандинга
          </span>
        </div>
        {/* Неоновый круговой индикатор с CSS радар-пульсаром внутри */}
        <div className="relative w-9 h-10 flex items-center justify-center shrink-0">
          <svg width="36" height="40" className="transform -rotate-90">
            <circle
              cx="18"
              cy="20"
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              className="text-muted-foreground/10 dark:text-neutral-800"
            />
            <circle
              cx="18"
              cy="20"
              r={radius}
              stroke="#f59e0b"
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={circum}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          {/* CSS Радар-Пульсар */}
          <div className="absolute size-2 flex items-center justify-center">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75",
                isFundingHigh ? "bg-rose-500" : "",
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full size-1.5 bg-amber-500",
                isFundingHigh ? "bg-rose-500" : "",
              )}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pl-0 md:pl-4 h-14">
        <div className="flex flex-col min-w-0 w-full">
          <div className="flex justify-between items-center w-full">
            <span className="text-[8px] uppercase font-bold text-muted-foreground/60">
              Margin Load
            </span>
            <span
              className={cn(
                "text-xs font-black",
                isHighMargin ? "text-rose-500" : "text-amber-500",
              )}
            >
              {(ratio * 100).toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-10 gap-0.5 mt-2 w-full">
            {Array.from({ length: 10 }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div
                  key={`led-${i}`}
                  className={cn(
                    "h-1.5 rounded-xs transition-all duration-300",
                    isActive
                      ? isHighMargin || i >= 8
                        ? "bg-rose-500 border-none shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                        : "bg-amber-500 border-none shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                      : "bg-muted-foreground/10 dark:bg-neutral-800",
                  )}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-medium text-muted-foreground/60 mt-1 block truncate">
            {isHighMargin
              ? "⚠️ Внимание: Overmargin риск!"
              : "Загрузка лимита в норме"}
          </span>
        </div>
      </div>
    </div>
  );
}
