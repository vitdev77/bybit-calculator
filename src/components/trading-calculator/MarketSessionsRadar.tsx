"use client";
import React, { useEffect, useState } from "react";
import {
  ClockIcon,
  ZapIcon,
  GlobeIcon,
  AlertCircleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  name: string;
  fullname: string;
  startUtc: number;
  endUtc: number;
  color: string;
  bgCls: string;
  borderCls: string;
  textCls: string;
  glowCls: string;
  city: string;
}

const MARKET_SESSIONS: Session[] = [
  {
    name: "SYD",
    fullname: "Сидней (Австралия)",
    startUtc: 22,
    endUtc: 6,
    color: "#3b82f6",
    bgCls: "bg-blue-500/10 dark:bg-blue-500/5",
    borderCls: "border-blue-500/40 dark:border-blue-500/20",
    textCls: "text-blue-600 dark:text-blue-400",
    glowCls: "shadow-[0_0_15px_rgba(59,130,246,0.12)]",
    city: "Sydney",
  },
  {
    name: "TOK",
    fullname: "Токио (Азия)",
    startUtc: 0,
    endUtc: 8,
    color: "#10b981",
    bgCls: "bg-emerald-500/10 dark:bg-emerald-500/5",
    borderCls: "border-emerald-500/40 dark:border-emerald-500/20",
    textCls: "text-emerald-600 dark:text-emerald-400",
    glowCls: "shadow-[0_0_15px_rgba(16,185,129,0.12)]",
    city: "Tokyo",
  },
  {
    name: "LON",
    fullname: "Лондон (Европа)",
    startUtc: 8,
    endUtc: 16,
    color: "#a855f7",
    bgCls: "bg-purple-500/10 dark:bg-purple-500/5",
    borderCls: "border-purple-500/40 dark:border-purple-500/20",
    textCls: "text-purple-600 dark:text-purple-400",
    glowCls: "shadow-[0_0_15px_rgba(168,85,247,0.12)]",
    city: "London",
  },
  {
    name: "NY",
    fullname: "Нью-Йорк (Америка)",
    startUtc: 13,
    endUtc: 21,
    color: "#f59e0b",
    bgCls: "bg-amber-500/10 dark:bg-amber-500/5",
    borderCls: "border-amber-500/40 dark:border-amber-500/20",
    textCls: "text-amber-600 dark:text-amber-400",
    glowCls: "shadow-[0_0_15px_rgba(245,158,11,0.12)]",
    city: "New York",
  },
];

interface SessionMeta {
  isActive: boolean;
  statusText: string;
  countdownText: string;
}

interface RadarState {
  h: number;
  m: number;
  s: number;
  metaMap: Record<string, SessionMeta>;
  overlap: { title: string; desc: string; level: string; timeAlert: string };
}
export default function MarketSessionsRadar() {
  const [mounted, setMounted] = useState(false);
  const [timeState, setTimeState] = useState<RadarState>({
    h: 0,
    m: 0,
    s: 0,
    metaMap: {},
    overlap: {
      title: "Загрузка",
      desc: "Синхронизация времени...",
      level: "low",
      timeAlert: "",
    },
  });

  useEffect(() => {
    setMounted(true);
    const calculateRadarMetrics = () => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const s = now.getUTCSeconds();

      const metaMap: Record<string, SessionMeta> = {};
      MARKET_SESSIONS.forEach((session) => {
        const start = session.startUtc;
        const end = session.endUtc;
        let isActive = false;
        if (start < end) {
          isActive = h >= start && h < end;
        } else {
          isActive = h >= start || h < end;
        }

        let statusText = "Рынок закрыт";
        let countdownText = "";

        if (isActive) {
          if (h === start && m < 30) {
            statusText = "⚡ ОТКРЫТИЕ";
          } else if ((h + 1) % 24 === end && m >= 30) {
            statusText = "📦 ФИКСАЦИЯ";
          } else {
            statusText = "📊 ТОРГОВЛЯ";
          }
          let remainingHours = end - h - 1;
          if (end <= h) remainingHours = 24 - h + end - 1;
          if (remainingHours < 0) remainingHours = 0;
          countdownText = `${remainingHours}ч ${59 - m}м`;
        } else {
          let untilHours = start - h;
          if (start <= h) untilHours = 24 - h + start;
          if (untilHours > 0 && m > 0) untilHours -= 1;
          const remainingMins = m === 0 ? 0 : 60 - m;
          countdownText = `через ${untilHours}ч ${remainingMins}м`;
        }

        metaMap[session.name] = { isActive, statusText, countdownText };
      });

      let overlap = {
        title: "СТАНДАРТНЫЙ ИМПУЛЬС",
        desc: "Рынок движется в рамках стандартных сессионных объемов.",
        level: "normal",
        timeAlert: "",
      };

      const isLon = metaMap["LON"]?.isActive;
      const isNy = metaMap["NY"]?.isActive;
      const isTok = metaMap["TOK"]?.isActive;

      if (isLon && isNy) {
        let remainingHours = 16 - h - 1;
        overlap = {
          title: "ВРЕМЯ СИЛЫ (LON + NY)",
          desc: "Максимальный объем, агрессивные тренды и ликвидность.",
          level: "high",
          timeAlert: `Пересечение активно еще ${remainingHours}ч ${59 - m}м`,
        };
      } else if (isTok && isLon) {
        overlap = {
          title: "ПЕРЕСЕЧЕНИЕ АЗИЯ + ЕВРОПА",
          desc: "Высокая активность, возможны развороты утренних движений.",
          level: "mid",
          timeAlert: "Вливание европейского капитала в рынок",
        };
      } else {
        const count = MARKET_SESSIONS.filter(
          (s) => metaMap[s.name]?.isActive,
        ).length;
        if (count >= 2) {
          overlap = {
            title: "ПЕРЕСЕЧЕНИЕ СЕССИЙ",
            desc: "Повышенная волатильность, объемы заходят в стакан.",
            level: "mid",
            timeAlert: "Наложение двух часовых поясов",
          };
        } else if (h >= 22 || h < 2) {
          overlap = {
            title: "ТИХООКЕАНСКИЙ ФЛЭТ",
            desc: "Низкие объемы. Осторожно с лимитными ордерами, рынок спит.",
            level: "low",
            timeAlert: "Рекомендуется снизить риски",
          };
        }
      }

      setTimeState({ h, m, s, metaMap, overlap });
    };

    calculateRadarMetrics();
    const timer = setInterval(calculateRadarMetrics, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="w-full border border-border/40 bg-linear-to-b from-muted/30 to-background dark:from-zinc-900/10 dark:to-black/40 rounded-xl p-3.5 select-none text-xs font-mono shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/30 pb-2.5">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-amber-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground/90">
            Монитор сессионной активности
          </span>
        </div>
        <div className="text-right text-sm font-black text-foreground bg-background/80 dark:bg-zinc-950/80 border border-border/10 rounded-lg px-2.5 py-0.5 tracking-tight shadow-md flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase">
            UTC:
          </span>
          <span className="text-amber-500">
            {mounted
              ? `${pad(timeState.h)}:${pad(timeState.m)}:${pad(timeState.s)}`
              : "--:--:--"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-3">
        {MARKET_SESSIONS.map((session) => {
          const meta = timeState.metaMap[session.name] || {
            isActive: false,
            statusText: "Закрыт",
            countdownText: "",
          };
          const active = !!meta.isActive;
          return (
            <div
              key={session.name}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-500 min-h-20 relative overflow-hidden bg-background/30",
                active
                  ? `${session.bgCls} ${session.borderCls} ${session.glowCls} ring-1 ring-foreground/5`
                  : "border-border/10 opacity-40 bg-background/10",
              )}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                  <span
                    className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      "bg-current",
                    )}
                    style={{ color: session.color }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: session.color }}
                  />
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-xs font-black tracking-wider uppercase leading-none",
                      active ? session.textCls : "text-muted-foreground",
                    )}
                  >
                    {session.name}
                  </span>
                  <span className="text-[8px] opacity-40 uppercase font-bold">
                    {session.city}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground/60 truncate mt-0.5">
                  {session.fullname}
                </span>
              </div>
              <div className="mt-3 pt-1.5 border-t border-border/10 flex flex-col gap-0.5 text-[9px]">
                <div className="flex justify-between items-center font-bold">
                  <span className="opacity-40">Статус:</span>
                  <span className={active ? session.textCls : "opacity-30"}>
                    {meta.statusText}
                  </span>
                </div>
                <div className="flex justify-between items-center opacity-80 mt-0.5">
                  <span className="opacity-40">
                    {active ? "До конца:" : "Старт:"}
                  </span>
                  <span className="font-bold tabular-nums">
                    {meta.countdownText}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-full my-3.5 space-y-1">
        <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-muted-foreground/40 px-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
        <div className="relative w-full h-5 rounded-lg border border-border/20 bg-background/50 dark:bg-zinc-950/40 flex flex-col justify-center px-1.5">
          <div className="relative w-full h-1.5 bg-muted/30 dark:bg-neutral-800 rounded-full mx-1.5">
            {MARKET_SESSIONS.map((session) => {
              const start = session.startUtc;
              const end = session.endUtc;
              let left = (start / 24) * 100;
              let width = ((end - start) / 24) * 100;
              if (start > end) {
                width = ((24 - start + end) / 24) * 100;
              }
              return (
                <div
                  key={`bar-${session.name}`}
                  className="absolute h-1 opacity-50 rounded-full transition-all duration-300"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: session.color,
                    top:
                      session.name === "SYD"
                        ? "-3px"
                        : session.name === "TOK"
                          ? "-1px"
                          : session.name === "LON"
                            ? "1px"
                            : "3px",
                  }}
                />
              );
            })}
            {mounted && (
              <div
                className="absolute -top-2.5 -bottom-2.5 w-0.5 bg-rose-500 z-20"
                style={{ left: `${(timeState.h / 24) * 100}%` }}
              >
                <div className="absolute -top-0.5 -left-1 size-2.5 rounded-full bg-rose-500 border border-background dark:border-zinc-950 shadow-md animate-pulse" />
                <div className="absolute top-2.5 -left-0.5 h-3 border-l border-dashed border-rose-500/50" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all duration-500 shadow-inner bg-background/20",
          timeState.overlap.level === "high"
            ? "from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400"
            : timeState.overlap.level === "mid"
              ? "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400"
              : timeState.overlap.level === "low"
                ? "from-blue-500/10 via-blue-500/2 to-transparent border-blue-500/15 text-blue-500"
                : "from-muted/30 via-muted/5 to-transparent border-border/30 text-muted-foreground",
        )}
      >
        <div className="flex gap-3 items-center min-w-0">
          <div className="shrink-0 size-8 rounded-lg bg-background/60 dark:bg-zinc-950/40 border border-border/10 flex items-center justify-center shadow-xs">
            {timeState.overlap.level === "high" ? (
              <ZapIcon className="size-4 fill-current text-purple-500" />
            ) : timeState.overlap.level === "mid" ? (
              <TrendingUpIcon className="size-4 text-amber-500" />
            ) : timeState.overlap.level === "low" ? (
              <GlobeIcon className="size-4 opacity-50" />
            ) : (
              <AlertCircleIcon className="size-4" />
            )}
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">
              {timeState.overlap.title}
            </span>
            <span className="text-[11px] font-semibold text-foreground/80 dark:text-zinc-300">
              {timeState.overlap.desc}
            </span>
          </div>
        </div>
        {timeState.overlap.timeAlert && (
          <div className="px-2 py-0.5 bg-background/60 dark:bg-zinc-950/40 border border-border/10 rounded-md text-[9px] font-black uppercase tracking-wider font-mono text-foreground/70 self-start sm:self-center">
            {timeState.overlap.timeAlert}
          </div>
        )}
      </div>
    </div>
  );
}
