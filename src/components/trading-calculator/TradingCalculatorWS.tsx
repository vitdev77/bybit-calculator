"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CoinSelector from "./CoinSelector";
import BalanceRiskForm from "./BalanceRiskForm";
import PriceLevelsForm from "./PriceLevelsForm";
import ResultsDisplay from "./ResultsDisplay";
import MarketTicker from "./MarketTicker";
import ListingManagerModal from "./ListingManagerModal";
import { cn } from "@/lib/utils";

export type OrderType = "MARKET" | "LIMIT";
export type PositionSide = "BUY" | "SELL";

const STORAGE_KEY = "bybit_calculator_state_v14";

export interface DBAssetCoin {
  coin: string;
  decimals: number;
  is_favorite: boolean;
  is_active: boolean;
  is_delisted: boolean;
  fullname?: string;
  logo_slug?: string;
}

interface TickerData {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  fundingRate: number;
  turnover24h: number;
  fullname?: string;
  logo_slug?: string;
}

function useTabTicker(
  price: number | undefined,
  coin: string,
  decimals: number,
) {
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!price) {
      if (document.title !== "Bybit Futures Calculator") {
        document.title = "Bybit Futures Calculator";
      }
      return;
    }
    const formattedPrice = price.toFixed(decimals);
    let triangle = "•";
    if (prevPriceRef.current !== null) {
      if (price > prevPriceRef.current) {
        triangle = "▲";
      } else if (price < prevPriceRef.current) {
        triangle = "▼";
      } else return;
    }
    prevPriceRef.current = price;
    const nextTitle =
      triangle + " " + formattedPrice + " | " + coin + " | Bybit Calculator";
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [price, coin, decimals]);

  useEffect(() => {
    prevPriceRef.current = null;
    document.title = "Bybit Futures Calculator";
  }, [coin]);
}

interface CalculatorProps {
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
  onBalanceChange?: (balance: number) => void;
  onPriceUpdate?: (price: number) => void;
  externalPartsCount: number;
  setExternalPartsCount: (v: number) => void;
  onSyncStatusChange?: (v: boolean) => void;
}
export default function TradingCalculator({
  selectedCoin,
  setSelectedCoin,
  onBalanceChange,
  onPriceUpdate,
  externalPartsCount,
  setExternalPartsCount,
  onSyncStatusChange,
}: CalculatorProps) {
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
  const [availableCoinsList, setAvailableCoinsList] = useState<DBAssetCoin[]>(
    [],
  );
  const [tickerRegistry, setTickerRegistry] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const partsCount = externalPartsCount;
  const setPartsCount = setExternalPartsCount;

  const currentCoinMeta = availableCoinsList.find(
    (c) => c.coin === selectedCoin,
  );

  const getAutoDecimals = () => {
    if (entryPrice > 0) {
      const fixedStr = entryPrice.toFixed(8);
      const splitArr = fixedStr.split(".");
      if (splitArr && splitArr[1]) {
        const cleanStr = splitArr[1].replace(/0+$/, "");
        const calculated = cleanStr.length;
        return Math.max(2, Math.min(8, calculated));
      }
    }
    if (currentCoinMeta && currentCoinMeta.decimals !== undefined) {
      return currentCoinMeta.decimals;
    }
    return 2;
  };

  const currentDecimals = getAutoDecimals();
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
    rawIdealMargin: 0,
  });

  useTabTicker(tickerData?.lastPrice, selectedCoin, currentDecimals);
  const prevCoinRef = useRef(selectedCoin);
  const entryPriceRef = useRef(entryPrice);

  useEffect(() => {
    entryPriceRef.current = entryPrice;
  }, [entryPrice]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let loadedCoin = "BTCUSDT";
      let parsed: any = {};
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          parsed = JSON.parse(savedState);
          if (parsed.selectedCoin) loadedCoin = parsed.selectedCoin;
          if (parsed.balance) {
            setBalance(parsed.balance);
            onBalanceChange?.(parsed.balance);
          }
          if (parsed.riskPercent) setRiskPercent(parsed.riskPercent);
          if (parsed.riskRewardRatio)
            setRiskRewardRatio(parsed.riskRewardRatio);
          if (parsed.orderType) setOrderType(parsed.orderType);
          if (parsed.entryPrice) setEntryPrice(parsed.entryPrice);
          if (parsed.stopLossPercent)
            setStopLossPercent(parsed.stopLossPercent);
          if (parsed.leverage) setLeverage(Number(parsed.leverage));
          if (parsed.side) setSide(parsed.side);
          if (parsed.partsCount) setPartsCount(Number(parsed.partsCount));
        } catch (e) {
          console.error(e);
        }
      }

      const params = new URLSearchParams(window.location.search);
      const urlCoin = params.get("coin");
      if (urlCoin) {
        const upperUrlCoin = urlCoin.toUpperCase();
        loadedCoin = upperUrlCoin;
        setSelectedCoin(upperUrlCoin);
        const nextState = { ...parsed, selectedCoin: upperUrlCoin };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } else if (parsed.selectedCoin) {
        setSelectedCoin(parsed.selectedCoin);
      } else {
        setSelectedCoin("BTCUSDT");
      }
      setIsLoaded(true);
    }
  }, [setSelectedCoin, onBalanceChange, setPartsCount]);

  const loadDatabaseCoins = useCallback(
    async (event?: Event) => {
      try {
        const res = await fetch("/api/coins");
        if (!res.ok) throw new Error();
        const data = await res.json();
        let fetchedCoins = data.coins || [];

        let eventCoin: string | null = null;
        let eventFav: boolean | null = null;
        let eventSlug: string | null = null;

        if (event && (event as CustomEvent).detail) {
          const detail = (event as CustomEvent).detail;
          eventCoin = detail.coin || null;
          eventFav =
            detail.is_favorite !== undefined ? detail.is_favorite : null;
          eventSlug = detail.logo_slug || null;
        }

        if (eventCoin) {
          fetchedCoins = fetchedCoins.map((c: DBAssetCoin) =>
            c.coin === eventCoin
              ? {
                  ...c,
                  is_favorite: eventFav !== null ? eventFav : c.is_favorite,
                  logo_slug: eventSlug !== null ? eventSlug : c.logo_slug,
                }
              : c,
          );
        }

        setAvailableCoinsList((prevList) => {
          const currentCoinInFetched = fetchedCoins.some(
            (c: DBAssetCoin) => c.coin === selectedCoin,
          );
          const merged = [...fetchedCoins];

          if (!currentCoinInFetched && selectedCoin) {
            const prevMeta = prevList.find((c) => c.coin === selectedCoin);
            let finalSlug = prevMeta?.logo_slug;
            if (eventCoin === selectedCoin && eventSlug !== null)
              finalSlug = eventSlug;

            merged.push({
              coin: selectedCoin,
              decimals: prevMeta?.decimals || 4,
              is_favorite:
                eventCoin === selectedCoin && eventFav !== null
                  ? eventFav
                  : prevMeta?.is_favorite || false,
              is_active: true,
              is_delisted: false,
              logo_slug: finalSlug,
            });
          }
          return merged;
        });

        if (data.tickerRegistry) setTickerRegistry(data.tickerRegistry);
      } catch (e) {
        console.error(e);
      }
    },
    [selectedCoin],
  );

  useEffect(() => {
    loadDatabaseCoins();
    const handleRefresh = (e: Event) => loadDatabaseCoins(e);
    window.dispatchEvent(new CustomEvent("refresh-calculator-coins"));
    window.addEventListener("refresh-calculator-coins", handleRefresh);
    return () => {
      window.removeEventListener("refresh-calculator-coins", handleRefresh);
    };
  }, [loadDatabaseCoins]);

  useEffect(() => {
    if (isLoaded) onBalanceChange?.(balance);
  }, [balance, isLoaded, onBalanceChange]);
  const getCalculatedIdealLeverage = useCallback(() => {
    const baseRiskAmount = (balance * riskPercent) / 100;
    const allocatedMarginMax = balance / partsCount;
    const totalFeeRate = 0.0013;
    const priceLossFactor = stopLossPercent / 100;
    const idealPositionSizeUsdt =
      baseRiskAmount / (priceLossFactor + totalFeeRate);
    const calculatedRecLeverage = Math.ceil(
      idealPositionSizeUsdt / allocatedMarginMax,
    );
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
  }, [balance, riskPercent, partsCount, stopLossPercent, maxSafeLeverage]);

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
  }, [partsCount, isInitialLoad, getCalculatedIdealLeverage]);

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let lockInterval: NodeJS.Timeout | null = null;

    const checkDbLockStatus = async () => {
      try {
        const res = await fetch(`/api/bybit?symbol=${selectedCoin}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.isDbSyncing !== undefined) {
          onSyncStatusChange?.(!!data.isDbSyncing);
        }
      } catch (e) {
        console.error("Lock check error:", e);
      }
    };

    const fetchMetaAndInit = async () => {
      try {
        setTickerLoading(true);
        const res = await fetch(`/api/bybit?symbol=${selectedCoin}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!active) return;
        setTickerData(data);
        if (data.isDbSyncing !== undefined) {
          onSyncStatusChange?.(!!data.isDbSyncing);
        }
        if (onPriceUpdate && data.lastPrice) onPriceUpdate(data.lastPrice);
        if (
          prevCoinRef.current !== selectedCoin ||
          entryPriceRef.current === 0
        ) {
          setEntryPrice(data.lastPrice);
          prevCoinRef.current = selectedCoin;
        }
        setTickerLoading(false);
        connectWebSocket();
        lockInterval = setInterval(checkDbLockStatus, 5000);
      } catch (err) {
        console.error("Meta fetch error:", err);
        if (active) setTickerLoading(false);
      }
    };

    const connectWebSocket = () => {
      if (!active) return;

      const p1 = "wss" + "://" + "stream";
      const p2 = ".bybit.com" + "/v5";
      const p3 = "/public/linear";
      const cleanUrl = p1 + p2 + p3;

      ws = new WebSocket(cleanUrl);

      ws.onopen = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const subscribeMsg = {
          op: "subscribe",
          args: [`tickers.${selectedCoin}`],
        };
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const response = JSON.parse(event.data);
          if (response.topic === `tickers.${selectedCoin}` && response.data) {
            const tick = response.data;
            if (tick.lastPrice) {
              const nextPrice = parseFloat(tick.lastPrice);
              setTickerData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  lastPrice: nextPrice,
                  price24hPcnt: tick.price24hPcnt
                    ? parseFloat(tick.price24hPcnt)
                    : prev.price24hPcnt,
                  turnover24h: tick.turnover24h
                    ? parseFloat(tick.turnover24h)
                    : prev.turnover24h,
                  fundingRate: tick.fundingRate
                    ? parseFloat(tick.fundingRate)
                    : prev.fundingRate,
                };
              });
              if (onPriceUpdate) onPriceUpdate(nextPrice);
            }
          }
        } catch (err) {
          console.error("WS Parse Err:", err);
        }
      };

      ws.onerror = (err) => console.warn("WS Error:", err);
      ws.onclose = () => {
        if (active) reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
    };

    fetchMetaAndInit();

    return () => {
      active = false;
      if (lockInterval) clearInterval(lockInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          const unsubscribeMsg = {
            op: "unsubscribe",
            args: [`tickers.${selectedCoin}`],
          };
          ws.send(JSON.stringify(unsubscribeMsg));
        }
        ws.close();
      }
    };
  }, [selectedCoin, isLoaded, onPriceUpdate, onSyncStatusChange]);

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
    const totalFeeRate = 0.0013;
    const priceLossFactor = stopLossPercent / 100;
    let positionSizeUsdt = baseRiskAmount / (priceLossFactor + totalFeeRate);

    const idealMargin = positionSizeUsdt / (leverage || 1);

    let marginUsed = idealMargin;
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
    const closeFeeRate = 0.0006;
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
      allocatedMarginMax: allocatedMarginMax,
      decimals: currentDecimals,
      totalFeeUsdt,
      netProfitUsdt,
      riskRewardRatio,
      liquidationPrice,
      rawIdealMargin: idealMargin,
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
  const cardCls = cn(
    "shadow-sm border flex flex-col " +
      "border-border/40 bg-background " +
      "rounded-xl sm:rounded-2xl",
  );
  const headCls = cn("py-2 px-2.5 border-b border-border/40 sm:py-2.5 sm:px-4");
  const titCls = cn(
    "text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  );
  const contCls = cn("space-y-3.5 p-2.5 flex-1 sm:space-y-4 sm:p-4");
  const repCls = cn("p-2.5 flex-1 flex flex-col justify-between sm:p-4");

  return (
    <div className="w-full p-0 relative">
      <div className={cn("p-1.5 sm:p-4", "space-y-3 w-full")}>
        <MarketTicker
          data={tickerData}
          loading={tickerLoading}
          decimals={currentDecimals}
          onPriceClick={handlePriceApply}
          selectedCoin={selectedCoin}
          onCoinChange={handleCoinChange}
          availableCoinsList={availableCoinsList}
          marginUsed={results.rawIdealMargin || results.marginUsed}
          allocatedMarginMax={results.allocatedMarginMax}
        />

        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 md:items-stretch gap-3 sm:gap-4 items-start",
          )}
        >
          <Card className={cardCls}>
            <CardHeader className={headCls}>
              <CardTitle className={titCls}>Панель параметров</CardTitle>
            </CardHeader>
            <CardContent className={contCls}>
              <CoinSelector
                selectedCoin={selectedCoin}
                onCoinChange={handleCoinChange}
                orderType={orderType}
                setOrderType={setOrderType}
                availableCoinsList={availableCoinsList}
                tickerRegistry={tickerRegistry}
                setIsModalOpen={setIsModalOpen}
                liveTickerData={tickerData}
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
                livePrice={tickerData?.lastPrice || 0}
                decimals={currentDecimals}
                side={side}
              />
            </CardContent>
          </Card>

          <Card className={cardCls}>
            <CardHeader className={headCls}>
              <CardTitle className={titCls}>Торговый отчет</CardTitle>
            </CardHeader>
            <CardContent className={repCls}>
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

        <ListingManagerModal
          availableCoinsList={availableCoinsList}
          setAvailableCoinsList={setAvailableCoinsList}
          tickerRegistry={tickerRegistry}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          handleToggleActive={() => {}}
          handleSetActiveStatus={async () => {}}
          onCoinSelect={setSelectedCoin}
          selectedCoin={selectedCoin}
        />
      </div>
    </div>
  );
}
