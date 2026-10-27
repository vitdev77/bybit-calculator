"use client";
import React, { useEffect, useState } from "react";
import {
  ClockIcon,
  ZapIcon,
  GlobeIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  LayersIcon,
  ActivityIcon,
  MapPinIcon,
  CompassIcon,
  AnchorIcon,
  XIcon,
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
  icon: React.ComponentType<any>;
}

// Сессии зафиксированы строго в инвариантном UTC.
// Теперь они автоматически сдвинутся на +3 часа для Минска,
// на +4 для Дубая, на -5 для Нью-Йорка и т.д.
const MARKET_SESSIONS: Session[] = [
  {
    name: "SYD",
    fullname: "Сидней (Австралия)",
    startUtc: 22,
    endUtc: 7,
    color: "#3b82f6",
    bgCls: "bg-blue-500/10 dark:bg-blue-500/5",
    borderCls: "border-blue-500/40 dark:border-blue-500/20",
    textCls: "text-blue-600 dark:text-blue-400",
    glowCls: "shadow-[0_0_15px_rgba(59,130,246,0.12)]",
    city: "Sydney",
    icon: CompassIcon,
  },
  {
    name: "TOK",
    fullname: "Токио (Азия)",
    startUtc: 0,
    endUtc: 9,
    color: "#10b981",
    bgCls: "bg-emerald-500/10 dark:bg-emerald-500/5",
    borderCls: "border-emerald-500/40 dark:border-emerald-500/20",
    textCls: "text-emerald-600 dark:text-emerald-400",
    glowCls: "shadow-[0_0_15px_rgba(16,185,129,0.12)]",
    city: "Tokyo",
    icon: AnchorIcon,
  },
  {
    name: "LON",
    fullname: "Лондон (Европа)",
    startUtc: 8,
    endUtc: 17,
    color: "#a855f7",
    bgCls: "bg-purple-500/10 dark:bg-purple-500/5",
    borderCls: "border-purple-500/40 dark:border-purple-500/20",
    textCls: "text-purple-600 dark:text-purple-400",
    glowCls: "shadow-[0_0_15px_rgba(168,85,247,0.12)]",
    city: "London",
    icon: MapPinIcon,
  },
  {
    name: "NY",
    fullname: "Нью-Йорк (Америка)",
    startUtc: 13.5,
    endUtc: 20.5,
    color: "#f59e0b",
    bgCls: "bg-amber-500/10 dark:bg-amber-500/5",
    borderCls: "border-amber-500/40 dark:border-amber-500/20",
    textCls: "text-amber-600 dark:text-amber-400",
    glowCls: "shadow-[0_0_15px_rgba(245,158,11,0.12)]",
    city: "New York",
    icon: GlobeIcon,
  },
];

interface SessionMeta {
  isActive: boolean;
  statusType: "OPENING" | "CLOSING" | "TRADING" | "CLOSED";
  statusText: string;
  countdownText: string;
  localStart: number;
  localEnd: number;
}

interface RadarState {
  h: number;
  m: number;
  s: number;
  tzName: string;
  metaMap: Record<string, SessionMeta>;
  overlap: { title: string; desc: string; level: string; timeAlert: string };
}
export default function MarketSessionsRadar() {
  const [mounted, setMounted] = useState(false);
  const [timeState, setTimeState] = useState<RadarState>({
    h: 0,
    m: 0,
    s: 0,
    tzName: "Local",
    metaMap: {},
    overlap: {
      title: "Загрузка",
      desc: "Синхронизация...",
      level: "low",
      timeAlert: "",
    },
  });

  useEffect(() => {
    setMounted(true);
    const calculateRadarMetrics = () => {
      const now = new Date();
      // Браузер сам определяет смещение относительно UTC для любой точки мира
      const offsetHours = -now.getTimezoneOffset() / 60;
      const sign = offsetHours >= 0 ? "+" : "";
      const tzName = `GMT${sign}${offsetHours}`;

      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      const utcHoursFloat = now.getUTCHours() + now.getUTCMinutes() / 60;
      const metaMap: Record<string, SessionMeta> = {};

      MARKET_SESSIONS.forEach((session) => {
        const start = session.startUtc;
        const end = session.endUtc;
        const localStart = (start + offsetHours + 24) % 24;
        const localEnd = (end + offsetHours + 24) % 24;

        let isActive = false;
        if (start < end) {
          isActive = utcHoursFloat >= start && utcHoursFloat < end;
        } else {
          isActive = utcHoursFloat >= start || utcHoursFloat < end;
        }

        let statusType: "OPENING" | "CLOSING" | "TRADING" | "CLOSED" = "CLOSED";
        let statusText = "Рынок закрыт";
        let countdownText = "";

        const currentUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const startMinutes = start * 60;
        const endMinutes = end * 60;

        if (isActive) {
          const diffFromStart =
            (currentUtcMinutes - startMinutes + 1440) % 1440;
          const diffUntilEnd = (endMinutes - currentUtcMinutes + 1440) % 1440;

          if (diffFromStart < 30) {
            statusType = "OPENING";
            statusText = "ОТКРЫТИЕ";
          } else if (diffUntilEnd <= 30) {
            statusType = "CLOSING";
            statusText = "ФИКСАЦИЯ";
          } else {
            statusType = "TRADING";
            statusText = "ТОРГОВЛЯ";
          }

          const remHours = Math.floor(diffUntilEnd / 60);
          const remMins = diffUntilEnd % 60;
          countdownText = `${remHours}ч ${remMins}м`;
        } else {
          const diffUntilStart =
            (startMinutes - currentUtcMinutes + 1440) % 1440;
          const untilHours = Math.floor(diffUntilStart / 60);
          const untilMins = diffUntilStart % 60;
          countdownText = `${untilHours}ч ${untilMins}м`;
        }

        metaMap[session.name] = {
          isActive,
          statusType,
          statusText,
          countdownText,
          localStart,
          localEnd,
        };
      });

      let overlap = {
        title: "СТАНДАРТНЫЙ ИМПУЛЬС",
        desc: "Объемы в рамках нормы.",
        level: "normal",
        timeAlert: "",
      };

      if (metaMap["LON"]?.isActive && metaMap["NY"]?.isActive) {
        const currentUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const lonEndMinutes = 17 * 60;
        const diffMinutes = (lonEndMinutes - currentUtcMinutes + 1440) % 1440;
        overlap = {
          title: "ВРЕМЯ СИЛЫ (LON + NY)",
          desc: "Пик объемов. Американская сессия: высокая волатильность, новости США.",
          level: "high",
          timeAlert: `Активно еще ${Math.floor(diffMinutes / 60)}ч ${diffMinutes % 60}м`,
        };
      } else if (metaMap["TOK"]?.isActive && metaMap["LON"]?.isActive) {
        overlap = {
          title: "ПЕРЕСЕЧЕНИЕ АЗИЯ + ЕВРОПА",
          desc: "Токио и Лондон вместе. Активны пары с JPY, AUD, NZD, GBP, EUR.",
          level: "mid",
          timeAlert: "Повышенная волатильность",
        };
      } else if (metaMap["NY"]?.isActive) {
        overlap = {
          title: "АМЕРИКАНСКАЯ СЕССИЯ (NY)",
          desc: "Высокая волатильность, выход важных экономических новостей США.",
          level: "mid",
          timeAlert: "Активные торги",
        };
      } else if (metaMap["LON"]?.isActive) {
        overlap = {
          title: "ЕВРОПЕЙСКАЯ СЕССИЯ (LON)",
          desc: "Европейская сессия, наблюдается пик торговых объемов и ликвидности.",
          level: "mid",
          timeAlert: "Высокие объемы",
        };
      } else if (metaMap["TOK"]?.isActive) {
        overlap = {
          title: "АЗИАТСКАЯ СЕССИЯ (TOK)",
          desc: "Азиатская сессия, наиболее активны валютные пары с JPY, AUD, NZD.",
          level: "normal",
          timeAlert: "Азиатский фокус",
        };
      } else if (metaMap["SYD"]?.isActive) {
        overlap = {
          title: "ТИХООКЕАНСКИЙ ФЛЭТ (SYD)",
          desc: "Тихоокеанская сессия, характерна низкая волатильность. Рынок спит.",
          level: "low",
          timeAlert: "Снизьте риски",
        };
      }

      setTimeState({ h, m, s, tzName, metaMap, overlap });
    };

    calculateRadarMetrics();
    const timer = setInterval(calculateRadarMetrics, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const formatMinutes = (hoursFloat: number) => {
    const mins = Math.round((hoursFloat % 1) * 60);
    return mins === 0 ? "00" : String(mins).padStart(2, "0");
  };

  const renderStatusIcon = (
    type: "OPENING" | "CLOSING" | "TRADING" | "CLOSED",
    colorCls: string,
  ) => {
    if (type === "OPENING")
      return (
        <ZapIcon className={cn("size-3 shrink-0 animate-pulse", colorCls)} />
      );
    if (type === "CLOSING")
      return <LayersIcon className={cn("size-3 shrink-0", colorCls)} />;
    if (type === "TRADING")
      return <ActivityIcon className={cn("size-3 shrink-0", colorCls)} />;
    return <XIcon className="size-3 shrink-0 opacity-30" />;
  };

  const livePositionPercent =
    ((timeState.h * 60 + timeState.m + timeState.s / 60) / 1440) * 100;
  const gridHoursAll = Array.from({ length: 25 }, (_, i) => i);
  const gridHoursMobile = [0, 4, 8, 12, 16, 20, 24];

  const timeBadgeCls =
    livePositionPercent < 10
      ? "absolute -top-7 left-0 translate-x-0"
      : livePositionPercent > 90
        ? "absolute -top-7 right-0 left-auto translate-x-0"
        : "absolute -top-7 left-1/2 -translate-x-1/2";
  const renderSessionBar = (
    session: Session,
    meta: SessionMeta,
    laneIdx: number,
  ) => {
    const start = meta.localStart;
    const end = meta.localEnd;
    const laneTop = `${laneIdx * 24 + 1}%`;
    const barActive = meta.isActive;
    const barBaseCls =
      "absolute h-3 opacity-75 rounded-md " +
      "transition-all duration-300 flex items-center justify-center " +
      "text-[7px] font-black text-white px-1 overflow-hidden border " +
      "border-white/5";

    const labelText =
      `${session.name} ${pad(start)}:${formatMinutes(start)}-` +
      `${pad(end)}:${formatMinutes(end)}`;

    if (start < end) {
      let left = (start / 24) * 100;
      let width = ((end - start) / 24) * 100;
      return (
        <div
          key={`bar-${session.name}`}
          className={barBaseCls}
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: session.color,
            top: laneTop,
            boxShadow: barActive ? `0 0 10px ${session.color}35` : "none",
          }}
        >
          <span className="truncate opacity-90">{labelText}</span>
        </div>
      );
    } else {
      let left1 = (start / 24) * 100;
      let width1 = ((24 - start) / 24) * 100;
      let left2 = 0;
      let width2 = (end / 24) * 100;
      return (
        <React.Fragment key={`bar-frag-${session.name}`}>
          <div
            className={barBaseCls}
            style={{
              left: `${left1}%`,
              width: `${width1}%`,
              backgroundColor: session.color,
              top: laneTop,
              boxShadow: barActive ? `0 0 10px ${session.color}35` : "none",
            }}
          >
            <span className="truncate opacity-90">{labelText}</span>
          </div>
          <div
            className={barBaseCls}
            style={{
              left: `${left2}%`,
              width: `${width2}%`,
              backgroundColor: session.color,
              top: laneTop,
              boxShadow: barActive ? `0 0 10px ${session.color}35` : "none",
            }}
          >
            <span className="truncate opacity-90">{labelText}</span>
          </div>
        </React.Fragment>
      );
    }
  };

  return (
    <div className="w-full border border-border/40 rounded-xl p-3.5 select-none text-xs font-mono shadow-xs bg-linear-to-b from-muted/30 to-background dark:from-zinc-900/10 dark:to-black/40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/30 pb-2.5">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-amber-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground/90">
            Монитор сессионной активности
          </span>
        </div>
        <div className="text-right text-sm font-black text-foreground bg-background/80 dark:bg-zinc-950/80 border border-border/10 rounded-lg px-2.5 py-0.5 tracking-tight shadow-md flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase">
            {timeState.tzName}:
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
            statusType: "CLOSED",
            statusText: "Рынок закрыт",
            countdownText: "",
            localStart: 0,
            localEnd: 0,
          };
          const active = !!meta.isActive;
          const IconComponent = session.icon;
          return (
            <div
              key={session.name}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col justify-between transition-all " +
                  "duration-500 min-h-22 relative overflow-hidden bg-background/30",
                active
                  ? `${session.bgCls} ${session.borderCls} ${session.glowCls} ring-1 ring-foreground/5`
                  : "border-border/10 opacity-40 bg-background/10",
              )}
              style={{ color: active ? session.color : undefined }}
            >
              <IconComponent
                className="absolute -bottom-4 -right-2 size-24 pointer-events-none transition-all duration-500"
                style={{
                  color: active ? session.color : undefined,
                  opacity: active ? 0.1 : 0.03,
                }}
              />
              <div className="flex items-center justify-between w-full relative z-10">
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
                <div className="flex size-4.5 items-center justify-center relative">
                  <span
                    className={cn(
                      "absolute inset-0.5 rounded-full blur-[3px] opacity-50",
                      active
                        ? "bg-current animate-pulse duration-1000"
                        : "bg-neutral-800",
                    )}
                  />
                  <div
                    className={cn(
                      "size-2 rounded-full border border-white/20 transition-all " +
                        "shadow-[inset_0_1px_1px_rgba(255,255,245,0.2)]",
                      active
                        ? "bg-current shadow-[0_0_10px_currentColor]"
                        : "bg-zinc-700/60 dark:bg-zinc-800/80",
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-col min-w-0 relative z-10 mt-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 truncate">
                  {session.fullname}
                </span>
                <span className="text-[8px] font-semibold text-muted-foreground/40 mt-0.5 font-mono">
                  Локально: {pad(meta.localStart)}:
                  {formatMinutes(meta.localStart)} - {pad(meta.localEnd)}:
                  {formatMinutes(meta.localEnd)}
                </span>
              </div>
              <div className="mt-2.5 pt-1.5 border-t border-border/10 flex flex-col gap-0.5 text-[9px] relative z-10">
                <div className="flex justify-between items-center font-bold">
                  <span className="opacity-40">Статус:</span>
                  <div className="flex items-center gap-1">
                    {renderStatusIcon(
                      meta.statusType,
                      active ? session.textCls : "text-muted-foreground",
                    )}
                    <span className={active ? session.textCls : "opacity-30"}>
                      {meta.statusText}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center opacity-80 mt-0.5">
                  <span className="opacity-40">
                    {active ? "До закрытия:" : "До открытия:"}
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
        <div className="relative w-full h-34 rounded-xl border border-border/20 bg-background/50 dark:bg-zinc-950/40 flex flex-col justify-start pt-9 px-2 overflow-visible">
          <div className="relative w-full h-16 bg-muted/20 dark:bg-neutral-900/30 rounded-lg flex flex-col justify-between py-1 px-0 overflow-visible">
            <div className="absolute inset-0 z-0 flex justify-between pointer-events-none overflow-hidden rounded-lg">
              {gridHoursAll.map((h) => (
                <div
                  key={`grid-line-${h}`}
                  className={cn(
                    "h-full border-l border-solid transition-colors",
                    h % 4 === 0
                      ? "border-muted-foreground/25 dark:border-neutral-700"
                      : "border-muted-foreground/5 dark:border-neutral-900/50",
                  )}
                  style={{ width: "1px" }}
                />
              ))}
            </div>

            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-lg">
              {MARKET_SESSIONS.map((session, laneIdx) => {
                const meta = timeState.metaMap[session.name];
                if (!meta) return null;
                return renderSessionBar(session, meta, laneIdx);
              })}
            </div>

            {mounted && (
              <div
                className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none will-change-transform bg-linear-to-b from-slate-400 via-slate-400/50 to-transparent dark:from-zinc-500 dark:via-zinc-500/50 shadow-[0_0_8px_rgba(148,163,184,0.2)]"
                style={{ left: `${livePositionPercent}%` }}
              >
                <div
                  className={cn(
                    "h-4.5 bg-slate-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white/10 shadow-[0_2px_8px_rgba(148,163,184,0.3)] flex items-center justify-center font-mono select-none tracking-tight",
                    timeBadgeCls,
                  )}
                  style={{ width: "48px" }}
                >
                  <span>
                    {pad(timeState.h)}:{pad(timeState.m)}
                  </span>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-slate-400 dark:bg-zinc-500 border-2 border-background dark:border-zinc-950 shadow-[0_0_8px_rgba(148,163,184,0.6)] flex items-center justify-center">
                  <div className="size-1 rounded-full bg-white animate-pulse" />
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full hidden md:flex justify-between px-0.5 mt-2.5 text-[8px] font-black font-mono text-muted-foreground/50 select-none overflow-visible">
            {gridHoursAll.map((h) => (
              <span
                key={`lbl-all-${h}`}
                className="w-4 text-center -ml-2 first:ml-0 last:-ml-4 tabular-nums"
              >
                {pad(h)}
              </span>
            ))}
          </div>
          <div className="relative w-full flex md:hidden justify-between px-0.5 mt-2.5 text-[8px] font-black font-mono text-muted-foreground/50 select-none overflow-visible">
            {gridHoursAll.map((h) =>
              gridHoursMobile.includes(h) ? (
                <span
                  key={`lbl-mob-${h}`}
                  className="w-4 text-center -ml-2 first:ml-0 last:-ml-4 tabular-nums"
                >
                  {pad(h)}
                </span>
              ) : (
                <div key={`lbl-mob-empty-${h}`} className="w-0" />
              ),
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
