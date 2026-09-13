"use client";

import React, { useState } from "react";
import TradingCalculator from "@/components/trading-calculator/TradingCalculator";
import TradingViewChart from "@/components/trading-calculator/TradingViewChart";
import TradingJournal from "@/components/trading-calculator/TradingJournal";

export default function Home() {
  // Поднимаем состояние выбранной монеты на верхний уровень для сквозной синхронизации
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");

  return (
    <main className="min-h-screen py-8 space-y-6">
      {/* Калькулятор параметров с пробросом стейта */}
      <TradingCalculator
        selectedCoin={selectedCoin}
        setSelectedCoin={setSelectedCoin}
      />

      {/* Интерактивный живой график TradingView */}
      <TradingViewChart coin={selectedCoin} />

      {/* Облачный журнал сделок */}
      <TradingJournal />
    </main>
  );
}
