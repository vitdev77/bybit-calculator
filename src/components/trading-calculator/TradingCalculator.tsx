"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CoinSelector from "./CoinSelector";
import BalanceRiskForm from "./BalanceRiskForm";
import PriceLevelsForm from "./PriceLevelsForm";
import ResultsDisplay from "./ResultsDisplay";
import MarketTicker from "./MarketTicker";

export type OrderType = "MARKET" | "LIMIT";
export type PositionSide = "BUY" | "SELL";
const STORAGE_KEY = "bybit_calculator_state_v14";

const COIN_PRECISION_MAP: Record<string, number> = {
  BTCUSDT: 2,
  ETHUSDT: 2,
  XAUTUSDT: 2,
  ZECUSDT: 2,
  SOLUSDT: 2,
  HYPEUSDT: 2,
  LINKUSDT: 3,
  NEARUSDT: 3,
  GRAMUSDT: 3,
  MNTUSDT: 4,
  XRPUSDT: 4,
  SUIUSDT: 4,
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

    if (document.title !== nextTitle) document.title = nextTitle;
  }, [price, coin, decimals]);

  useEffect(() => {
    prevPriceRef.current = null;
    document.title = "Bybit Calculator";
  }, [coin]);
}

interface TradingCalculatorProps {
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
  onBalanceChange?: (balance: number) => void;
  onPriceUpdate?: (price: number) => void;
  externalPartsCount: number;
  setExternalPartsCount: (v: number) => void;
}
export default function TradingCalculator({
  selectedCoin,
  setSelectedCoin,
  onBalanceChange,
  onPriceUpdate,
  externalPartsCount,
  setExternalPartsCount,
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
  const [idealLeverage, setIdealLeverage] = useState(10);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const partsCount = externalPartsCount;
  const setPartsCount = setExternalPartsCount;

  const currentDecimals = COIN_PRECISION_MAP[selectedCoin] ?? 4;
  const maxSafeLeverage =
    selectedCoin === "BTCUSDT" || selectedCoin === "ETHUSDT" ? 100 : 50;

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

  const prevCoinRef = useRef(selectedCoin);
  const entryPriceRef = useRef(entryPrice);

  useEffect(() => {
    entryPriceRef.current = entryPrice;
  }, [entryPrice]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.balance) {
            setBalance(parsed.balance);
            onBalanceChange?.(parsed.balance);
          }
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
          if (parsed.partsCount) setPartsCount(Number(parsed.partsCount));
        } catch (e) {
          console.error("Storage error", e);
        }
      }
      setIsLoaded(true);
    }
  }, [setSelectedCoin, onBalanceChange, setPartsCount]);

  useEffect(() => {
    if (isLoaded) onBalanceChange?.(balance);
  }, [balance, isLoaded, onBalanceChange]);
  const getCalculatedIdealLeverage = useCallback(() => {
    const baseRiskAmount = (balance * riskPercent) / 100;
    const allocatedMarginMax = balance / partsCount;
    const isSpot = leverage === 1;

    const openFeeRate = isSpot ? 0.001 : 0.0006;
    const closeFeeRate = isSpot ? 0.001 : 0.0006;
    const totalFeeRate = openFeeRate + closeFeeRate + 0.0001;
    const priceLossFactor = stopLossPercent / 100;

    const idealPositionSizeUsdt =
      baseRiskAmount / (priceLossFactor + totalFeeRate);
    const calculatedRecLeverage = Math.ceil(
      idealPositionSizeUsdt / allocatedMarginMax,
    );

    // ФИКС: Массив шагов полностью восстановлен и заполнен константами
    const standardSteps = [
      1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100,
    ];
    let finalRecLeverage = 10;

    for (const step of standardSteps) {
      if (step >= calculatedRecLeverage) {
        finalRecLeverage = step;
        break;
      }
    }
    if (finalRecLeverage > maxSafeLeverage) finalRecLeverage = maxSafeLeverage;
    return finalRecLeverage;
  }, [
    balance,
    riskPercent,
    partsCount,
    stopLossPercent,
    maxSafeLeverage,
    leverage,
  ]);

  useEffect(() => {
    if (!isLoaded) return;
    const ideal = getCalculatedIdealLeverage();
    setIdealLeverage(ideal);
  }, [
    partsCount,
    riskPercent,
    stopLossPercent,
    isLoaded,
    getCalculatedIdealLeverage,
  ]);

  const handleAutoLeverageCalculate = useCallback(() => {
    const ideal = getCalculatedIdealLeverage();
    setLeverage(ideal);
  }, [getCalculatedIdealLeverage]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    const ideal = getCalculatedIdealLeverage();
    setLeverage(ideal);
  }, [partsCount]);

  const fetchLiveTicker = useCallback(
    async (coin: string, isFirstInit: boolean, isCurrent: () => boolean) => {
      try {
        if (isFirstInit) setTickerLoading(true);
        const res = await fetch(`/api/bybit?symbol=${coin}`);
        if (!res.ok) throw new Error("API error");
        const data: TickerData = await res.json();
        if (!isCurrent()) return;
        setTickerData(data);
        onPriceUpdate?.(data.lastPrice);
        if (
          isFirstInit ||
          prevCoinRef.current !== coin ||
          entryPriceRef.current === 0
        ) {
          setEntryPrice(data.lastPrice);
          prevCoinRef.current = coin;
        }
      } catch (err) {
        console.error("Bybit error", err);
      } finally {
        if (isCurrent()) setTickerLoading(false);
      }
    },
    [onPriceUpdate],
  );

  const handlePriceApply = (price: number) => {
    if (price > 0) setEntryPrice(price);
  };
  const handleCoinChange = (newCoin: string) => {
    setSelectedCoin(newCoin);
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
    setPartsCount(5);
    setEntryPrice(
      tickerData && selectedCoin === "BTCUSDT"
        ? tickerData.lastPrice
        : 77342.45,
    );
  };

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    const isCurrent = () => active;
    fetchLiveTicker(selectedCoin, true, isCurrent);
    const interval = setInterval(() => {
      fetchLiveTicker(selectedCoin, false, isCurrent);
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedCoin, isLoaded, fetchLiveTicker]);

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
        partsCount,
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
    partsCount,
    isLoaded,
  ]);
  useEffect(() => {
    if (entryPrice <= 0 || stopLossPercent <= 0 || balance <= 0) return;

    const isLong = side === "BUY";
    const baseRiskAmount = (balance * riskPercent) / 100;
    const allocatedMarginMax = balance / partsCount;

    const stopLossPrice =
      entryPrice *
      (isLong ? 1 - stopLossPercent / 100 : 1 + stopLossPercent / 100);
    const takeProfitPrice =
      entryPrice *
      (isLong
        ? 1 + (stopLossPercent * riskRewardRatio) / 100
        : 1 - (stopLossPercent * riskRewardRatio) / 100);

    const isSpot = leverage === 1;
    const openFeeRate = isSpot ? 0.001 : 0.0006;
    const closeFeeRate = isSpot ? 0.001 : 0.0006;
    const totalFeeRate = openFeeRate + closeFeeRate + 0.0001;
    const priceLossFactor = stopLossPercent / 100;

    let positionSizeUsdt = baseRiskAmount / (priceLossFactor + totalFeeRate);
    let marginUsed = positionSizeUsdt / leverage;

    if (marginUsed > allocatedMarginMax) {
      marginUsed = allocatedMarginMax;
      positionSizeUsdt = marginUsed * leverage;
    }

    const positionSizeCrypto = positionSizeUsdt / entryPrice;
    const totalFeeUsdt = positionSizeUsdt * totalFeeRate;
    const rawLossUsdt =
      positionSizeCrypto * Math.abs(entryPrice - stopLossPrice);

    const actualRiskAmount = rawLossUsdt + totalFeeUsdt;
    const netProfitUsdt =
      positionSizeCrypto * Math.abs(entryPrice - takeProfitPrice) -
      totalFeeUsdt;

    const MMR = 0.005;
    let liquidationPrice = isLong
      ? entryPrice * (1 - 1 / leverage + MMR + closeFeeRate)
      : entryPrice * (1 + 1 / leverage - MMR - closeFeeRate);

    if (liquidationPrice < 0) liquidationPrice = 0;

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
    selectedCoin,
    maxSafeLeverage,
    partsCount,
  ]);

  return (
    <div className="w-full p-1.5 sm:p-4 space-y-3 sm:space-y-4">
      <MarketTicker
        data={tickerData}
        loading={tickerLoading}
        decimals={currentDecimals}
        onPriceClick={handlePriceApply}
        selectedCoin={selectedCoin}
        onCoinChange={handleCoinChange}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <Card className="shadow-sm border border-border/40 bg-background flex flex-col rounded-xl sm:rounded-2xl">
          <CardHeader className="py-2 px-2.5 sm:py-2.5 sm:px-4 border-b border-border/40">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Панель параметров
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 sm:space-y-4 p-2.5 sm:p-4 flex-1">
            <CoinSelector
              selectedCoin={selectedCoin}
              onCoinChange={handleCoinChange}
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
              maxSafeLeverage={maxSafeLeverage}
              selectedCoin={selectedCoin}
              partsCount={partsCount}
              setPartsCount={setPartsCount}
              onAutoLeverage={handleAutoLeverageCalculate}
              isLeverageModified={leverage !== idealLeverage}
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
        <Card className="shadow-sm border border-border/40 bg-background flex flex-col rounded-xl sm:rounded-2xl">
          <CardHeader className="py-2 px-2.5 sm:py-2.5 sm:px-4 border-b border-border/40">
            <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Торговый отчет
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
            <ResultsDisplay
              results={results}
              coin={selectedCoin}
              entryPrice={entryPrice}
              orderType={orderType}
              side={side}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
