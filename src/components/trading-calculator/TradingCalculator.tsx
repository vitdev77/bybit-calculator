"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/ModeToggle";
import CoinSelector from "./CoinSelector";
import BalanceRiskForm from "./BalanceRiskForm";
import PriceLevelsForm from "./PriceLevelsForm";
import ResultsDisplay from "./ResultsDisplay";
import MarketTicker from "./MarketTicker";

export type OrderType = "MARKET" | "LIMIT";
export type PositionSide = "BUY" | "SELL";
const PARTS_COUNT = 5;
const STORAGE_KEY = "bybit_calculator_state_v14";

const INITIAL_PRICES: Record<string, number> = {
  BTCUSDT: 77342.45,
  ETHUSDT: 2534.22,
  XAUTUSDT: 4349.45,
  SOLUSDT: 102.02,
  ZECUSDT: 1150.91,
  MNTUSDT: 0.5743,
  GRAMUSDT: 1.378,
  XRPUSDT: 1.3678,
  DOGEUSDT: 0.08477,
  SUIUSDT: 0.725,
  HYPEUSDT: 79.245,
  NEARUSDT: 2.367,
  LINKUSDT: 11.543,
};
const COIN_DECIMALS: Record<string, number> = {
  BTCUSDT: 1,
  ETHUSDT: 2,
  XAUTUSDT: 2,
  SOLUSDT: 2,
  ZECUSDT: 2,
  HYPEUSDT: 2,
  NEARUSDT: 2,
  LINKUSDT: 2,
  XRPUSDT: 4,
  MNTUSDT: 4,
  SUIUSDT: 4,
  GRAMUSDT: 4,
  DOGEUSDT: 5,
};

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
}

// КАСТОМНЫЙ ХУК ДЛЯ ОБНОВЛЕНИЯ НАЗВАНИЯ ВКЛАДКИ С ПОЛНЫМ ТИКЕРОМ ПАРЫ (BTCUSDT)
function useTabTicker(
  price: number | undefined,
  coin: string,
  decimals: number,
) {
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!price) {
      document.title = "Bybit Calculator";
      return;
    }

    const formattedPrice = price.toFixed(decimals);

    let triangle = "•";
    if (prevPriceRef.current !== null) {
      if (price > prevPriceRef.current) triangle = "▲";
      else if (price < prevPriceRef.current) triangle = "▼";
      else return;
    }

    prevPriceRef.current = price;

    // ИСПРАВЛЕНО: Теперь используется оригинальная переменная coin (BTCUSDT) без обрезки
    document.title = `${triangle} ${formattedPrice} | Трейдинг ${coin} | Bybit Futures Calculator`;
  }, [price, coin, decimals]);

  useEffect(() => {
    prevPriceRef.current = null;
  }, [coin]);
}

export default function TradingCalculator() {
  const [balance, setBalance] = useState(100);
  const [riskPercent, setRiskPercent] = useState(2);
  const [riskRewardRatio, setRiskRewardRatio] = useState(3);
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLossPercent, setStopLossPercent] = useState(1);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<PositionSide>("BUY");
  const [isLoaded, setIsLoaded] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);

  const currentDecimals = COIN_DECIMALS[selectedCoin] ?? 4;
  const [results, setResults] = useState({
    riskAmount: 0,
    positionSizeCrypto: 0,
    positionSizeUsdt: 0,
    selectedLeverage: 10,
    maxSafeLeverage: 10,
    marginUsed: 0,
    takeProfitPrice: 0,
    stopLossPrice: 0,
    allocatedMarginMax: 0,
    decimals: 2,
    totalFeeUsdt: 0,
    netProfitUsdt: 0,
  });

  // Активируем хук динамической вкладки
  useTabTicker(tickerData?.lastPrice, selectedCoin, currentDecimals);

  const fetchLiveTicker = useCallback(
    async (coin: string, isFirstInit: boolean) => {
      try {
        if (isFirstInit) setTickerLoading(true);
        const res = await fetch(`/api/bybit?symbol=${coin}`);
        if (!res.ok) throw new Error("API error");
        const data: TickerData = await res.json();
        setTickerData(data);
        if (isFirstInit && entryPrice === 0) setEntryPrice(data.lastPrice);
      } catch (err) {
        console.error("Bybit fetch error", err);
      } finally {
        setTickerLoading(false);
      }
    },
    [entryPrice],
  );

  const handlePriceApply = (price: number) => {
    if (price > 0) setEntryPrice(price);
  };

  // Загрузка состояния из локального хранилища браузера
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.balance) setBalance(parsed.balance);
          if (parsed.riskPercent) setRiskPercent(parsed.riskPercent);
          if (parsed.riskRewardRatio)
            setRiskRewardRatio(parsed.riskRewardRatio);
          if (parsed.selectedCoin) setSelectedCoin(parsed.selectedCoin);
          if (parsed.orderType) setOrderType(parsed.orderType);
          if (parsed.entryPrice) setEntryPrice(parsed.entryPrice);
          if (parsed.stopLossPercent)
            setStopLossPercent(parsed.stopLossPercent);
          if (parsed.leverage) setLeverage(Number(parsed.leverage));
          if (parsed.side) setSide(parsed.side);
        } catch (e) {
          console.error("Storage error", e);
        }
      } else {
        setEntryPrice(INITIAL_PRICES["BTCUSDT"]);
      }
      setIsLoaded(true);
    }
  }, []);

  // Запуск интервала фонового обновления котировок каждые 3 секунды
  useEffect(() => {
    if (!isLoaded) return;
    fetchLiveTicker(selectedCoin, false);
    const interval = setInterval(
      () => fetchLiveTicker(selectedCoin, false),
      3000,
    );
    return () => clearInterval(interval);
  }, [selectedCoin, isLoaded, fetchLiveTicker]);

  const prevCoinRef = useRef(selectedCoin);
  useEffect(() => {
    if (isLoaded && prevCoinRef.current !== selectedCoin) {
      const freshPrice = INITIAL_PRICES[selectedCoin];
      if (freshPrice) setEntryPrice(freshPrice);
      prevCoinRef.current = selectedCoin;
    }
  }, [selectedCoin, isLoaded]);

  // Сохранение изменений в localStorage
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const state = {
        balance,
        riskPercent,
        riskRewardRatio,
        selectedCoin,
        orderType,
        entryPrice,
        stopLossPercent,
        leverage,
        side,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [
    balance,
    riskPercent,
    riskRewardRatio,
    selectedCoin,
    orderType,
    entryPrice,
    stopLossPercent,
    leverage,
    side,
    isLoaded,
  ]);
  // Математический пересчет торговых параметров без циклической блокировки плеча
  useEffect(() => {
    if (entryPrice <= 0 || stopLossPercent <= 0 || balance <= 0) return;
    const riskAmount = (balance * riskPercent) / 100;
    const allocatedMarginMax = balance / PARTS_COUNT;
    const isLong = side === "BUY";

    const stopLossPrice =
      entryPrice *
      (isLong ? 1 - stopLossPercent / 100 : 1 + stopLossPercent / 100);
    const takeProfitPrice =
      entryPrice *
      (isLong
        ? 1 + (stopLossPercent * riskRewardRatio) / 100
        : 1 - (stopLossPercent * riskRewardRatio) / 100);

    let positionSizeUsdt =
      (riskAmount / Math.abs(entryPrice - stopLossPrice)) * entryPrice;
    const maxSafeLeverage = Math.ceil(positionSizeUsdt / allocatedMarginMax);

    let marginUsed = positionSizeUsdt / leverage;

    // Включаем защитный лимит: маржа на позицию не может превышать 1/5 от баланса
    if (marginUsed > allocatedMarginMax) {
      marginUsed = allocatedMarginMax;
      positionSizeUsdt = marginUsed * leverage;
    }

    const positionSizeCrypto = positionSizeUsdt / entryPrice;
    const openFee =
      positionSizeUsdt * (orderType === "MARKET" ? 0.00055 : 0.0002);
    const totalFeeUsdt = openFee + positionSizeUsdt * 0.00055;
    const netProfitUsdt =
      positionSizeCrypto * Math.abs(entryPrice - takeProfitPrice) -
      totalFeeUsdt;

    setResults({
      riskAmount,
      positionSizeCrypto,
      positionSizeUsdt,
      selectedLeverage: leverage,
      maxSafeLeverage,
      marginUsed,
      takeProfitPrice,
      stopLossPrice,
      allocatedMarginMax,
      decimals: currentDecimals,
      totalFeeUsdt,
      netProfitUsdt,
    });
  }, [
    balance,
    riskPercent,
    riskRewardRatio,
    side,
    entryPrice,
    stopLossPercent,
    orderType,
    leverage,
    currentDecimals,
    isLoaded,
  ]);

  if (!isLoaded)
    return (
      <div className="w-full max-w-4xl mx-auto p-4 text-center text-sm text-muted-foreground">
        Загрузка конфигурации...
      </div>
    );

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Воздушная серая подложка без внешних теней с радиусом скругления 32px */}
      <div className="p-6 rounded-[2rem] bg-muted/70 dark:bg-muted/15 shadow-none backdrop-blur-[2px] space-y-4">
        {/* Панель заголовка */}
        <div className="flex items-center justify-between px-1">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Bybit Futures{" "}
              <span className="text-muted-foreground font-normal">
                / Calculator
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Изолированная маржа 1/{PARTS_COUNT} •{" "}
              {(balance / PARTS_COUNT).toFixed(2)} USDT на позицию
            </p>
          </div>
          <ModeToggle />
        </div>

        {/* Профессиональный 5-колоночный информер Bybit с матовым эффектом */}
        <MarketTicker
          data={tickerData}
          loading={tickerLoading}
          decimals={currentDecimals}
          onPriceClick={handlePriceApply}
        />

        {/* Две внутренние сбалансированные карточки Card с закруглением rounded-2xl */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* ЛЕВАЯ КАРТОЧКА: Панель параметров */}
          <Card className="shadow-sm border border-border/40 bg-background flex flex-col rounded-2xl">
            <CardHeader className="py-2.5 px-4 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Панель параметров
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 flex-1">
              <CoinSelector
                selectedCoin={selectedCoin}
                onCoinChange={setSelectedCoin}
                orderType={orderType}
                setOrderType={setOrderType}
              />
              <BalanceRiskForm
                balance={balance}
                setBalance={setBalance}
                riskPercent={riskPercent}
                setRiskPercent={setRiskPercent}
                leverage={leverage}
                setLeverage={setLeverage}
                side={side}
                setSide={setSide}
              />
              <PriceLevelsForm
                entryPrice={entryPrice}
                setEntryPrice={setEntryPrice}
                stopLossPercent={stopLossPercent}
                setStopLossPercent={setStopLossPercent}
                riskRewardRatio={riskRewardRatio}
                setRiskRewardRatio={setRiskRewardRatio}
              />
            </CardContent>
          </Card>

          {/* ПРАВАЯ КАРТОЧКА: Торговый отчёт */}
          <Card className="shadow-sm border border-border/40 bg-background flex flex-col rounded-2xl">
            <CardHeader className="py-2.5 px-4 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Торговый отчёт
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <ResultsDisplay results={results} coin={selectedCoin} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
