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

// ЖЕЛЕЗОБЕТОННЫЙ ФИКС: Берем длину строки первой группы, чтобы вернуть реальное число знаков (3-4 для NEAR)
const detectDecimals = (price: number | string | undefined): number => {
  if (!price) return 2;
  const priceStr = String(price);
  const match = priceStr.match(/\.(\d+)/);
  if (!match || !match[1]) return 2;
  const length = match[1].length;
  return length < 2 ? 2 : length;
};

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
}

function useTabTicker(
  price: number | undefined,
  coin: string,
  decimals: number,
) {
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!price) {
      if (document.title !== "Bybit Calculator") {
        document.title = "Bybit Calculator";
      }
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

    const nextTitle = `${triangle} ${formattedPrice} | Трейдинг ${coin} | Bybit Calculator`;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [price, coin, decimals]);

  useEffect(() => {
    prevPriceRef.current = null;
    document.title = "Bybit Calculator";
  }, [coin]);
}

// ДОБАВЛЕНО: Интерфейс пропсов для связи стейта монеты с графиком на уровне page.tsx
interface TradingCalculatorProps {
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
}

export default function TradingCalculator({
  selectedCoin,
  setSelectedCoin,
}: TradingCalculatorProps) {
  const [balance, setBalance] = useState(100);
  const [riskPercent, setRiskPercent] = useState(2);
  const [riskRewardRatio, setRiskRewardRatio] = useState(3);
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLossPercent, setStopLossPercent] = useState(1);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<PositionSide>("BUY");
  const [isLoaded, setIsLoaded] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);

  const currentDecimals = tickerData?.lastPrice
    ? detectDecimals(tickerData.lastPrice)
    : 4;
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
    riskRewardRatio: 3,
    liquidationPrice: 0,
  });

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

  const handleReset = () => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setBalance(100);
    setRiskPercent(2);
    setRiskRewardRatio(3);
    setSelectedCoin("BTCUSDT");
    setOrderType("MARKET");
    setStopLossPercent(1);
    setLeverage(10);
    setSide("BUY");
    setEntryPrice(
      tickerData && selectedCoin === "BTCUSDT"
        ? tickerData.lastPrice
        : 77342.45,
    );
  };

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
        setEntryPrice(0);
      }
      setIsLoaded(true);
    }
  }, [setSelectedCoin]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchLiveTicker(selectedCoin, tickerData === null);
    const interval = setInterval(
      () => fetchLiveTicker(selectedCoin, false),
      3000,
    );
    return () => clearInterval(interval);
  }, [selectedCoin, isLoaded, fetchLiveTicker]);

  const prevCoinRef = useRef(selectedCoin);
  useEffect(() => {
    if (isLoaded && prevCoinRef.current !== selectedCoin) {
      setEntryPrice(0);
      setTickerData(null);
      prevCoinRef.current = selectedCoin;
    }
  }, [selectedCoin, isLoaded]);

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
  useEffect(() => {
    if (entryPrice <= 0 || stopLossPercent <= 0 || balance <= 0) return;

    const isLong = side === "BUY";
    const baseRiskAmount = (balance * riskPercent) / 100;
    const allocatedMarginMax = balance / PARTS_COUNT;

    // 1. Точный расчет цен ордеров
    const stopLossPrice =
      entryPrice *
      (isLong ? 1 - stopLossPercent / 100 : 1 + stopLossPercent / 100);
    const takeProfitPrice =
      entryPrice *
      (isLong
        ? 1 + (stopLossPercent * riskRewardRatio) / 100
        : 1 - (stopLossPercent * riskRewardRatio) / 100);

    // 2. Ставки комиссий Bybit
    const openFeeRate = orderType === "MARKET" ? 0.00055 : 0.0002;
    const closeFeeRate = 0.00055;
    const totalFeeRate = openFeeRate + closeFeeRate;

    // 3. Честный расчет объема позиции по чистой дистанции стопа
    const priceLossFactor = stopLossPercent / 100;
    let positionSizeUsdt = baseRiskAmount / priceLossFactor;
    let marginUsed = positionSizeUsdt / leverage;

    // Ограничение по максимальной марже на 1 позицию (1/5 депозита)
    if (marginUsed > allocatedMarginMax) {
      marginUsed = allocatedMarginMax;
      positionSizeUsdt = marginUsed * leverage;
    }

    const positionSizeCrypto = positionSizeUsdt / entryPrice;

    // 4. Прозрачный расчет комиссий Bybit поверх объема
    const openFee = positionSizeUsdt * openFeeRate;
    const closeFee = positionSizeUsdt * closeFeeRate;
    const totalFeeUsdt = openFee + closeFee;

    // Итоговый риск — это чистый убыток по стопу плюс комиссия за вход и выход
    const rawLossUsdt =
      positionSizeCrypto * Math.abs(entryPrice - stopLossPrice);
    const actualRiskAmount = rawLossUsdt + totalFeeUsdt;

    // Чистая прибыль — это грязный профит по тейку минус комиссии за круг
    const netProfitUsdt =
      positionSizeCrypto * Math.abs(entryPrice - takeProfitPrice) -
      totalFeeUsdt;

    // 5. Расчет цены ликвидации (Формула изолированной маржи Bybit)
    const MMR = 0.005; // Поддерживающая маржа 0.5%
    let liquidationPrice = 0;
    if (isLong) {
      liquidationPrice = entryPrice * (1 - 1 / leverage + MMR);
    } else {
      liquidationPrice = entryPrice * (1 + 1 / leverage - MMR);
    }
    if (liquidationPrice < 0) liquidationPrice = 0;

    const maxSafeLeverage = Math.ceil(positionSizeUsdt / allocatedMarginMax);

    setResults({
      riskAmount: actualRiskAmount,
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
      riskRewardRatio,
      liquidationPrice,
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
    <div className="w-full max-w-5xl mx-auto p-4 pb-0">
      <div className="p-6 rounded-[2rem] bg-muted/70 dark:bg-muted/15 shadow-none backdrop-blur-[2px] space-y-4">
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

        <MarketTicker
          data={tickerData}
          loading={tickerLoading}
          decimals={currentDecimals}
          onPriceClick={handlePriceApply}
          selectedCoin={selectedCoin}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
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
                onReset={handleReset}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-border/40 bg-background flex flex-col rounded-2xl">
            <CardHeader className="py-2.5 px-4 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Торговый отчёт
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <ResultsDisplay
                results={results}
                coin={selectedCoin}
                entryPrice={entryPrice}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
