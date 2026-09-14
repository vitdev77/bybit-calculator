"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface TradingViewChartProps {
  coin: string;
}

export default function TradingViewChart({ coin }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Очищаем контейнер перед каждым перерендером (смена монеты или темы)
    containerRef.current.innerHTML = "";

    const scriptId = "tradingview-widget-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const tvScriptUrl =
      process.env.NEXT_PUBLIC_TRADINGVIEW_SCRIPT_URL ||
      "https://s3.tradingview.com/tv.js";

    // 2. Если скрипт еще не был загружен на страницу глобально, создаем его
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = tvScriptUrl;
      script.type = "text/javascript";
      script.async = true;
      document.head.appendChild(script);
    }

    // 3. Функция инициализации самого виджета TradingView
    const initWidget = () => {
      if (
        typeof window !== "undefined" &&
        (window as any).TradingView &&
        containerRef.current
      ) {
        new (window as any).TradingView.widget({
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
      }
    };

    // 4. Запускаем рендер виджета в iframe
    if ((window as any).TradingView) {
      initWidget();
    } else {
      script.onload = initWidget;
    }

    // 5. Очистка ресурсов при размонтировании
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [coin, theme]);

  return (
    <div className="w-full h-125 bg-transparent p-4 overflow-hidden">
      <div
        id="tradingview_chart_widget"
        ref={containerRef}
        className="w-full h-full overflow-hidden border border-border/30 shadow-inner"
      />
    </div>
  );
}
