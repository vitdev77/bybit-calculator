"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { OrderType } from "./TradingCalculator";

interface CoinSelectorProps {
  selectedCoin: string;
  onCoinChange: (value: string) => void;
  orderType: OrderType;
  setOrderType: (value: OrderType) => void;
}

export const AVAILABLE_COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "MNTUSDT",
  "ZECUSDT",
  "XAUTUSDT",
  "SOLUSDT",
  "GRAMUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "SUIUSDT",
  "HYPEUSDT",
  "NEARUSDT",
  "LINKUSDT",
];

export default function CoinSelector({
  selectedCoin,
  onCoinChange,
  orderType,
  setOrderType,
}: CoinSelectorProps) {
  return (
    <div className="space-y-1.5 w-full">
      {/* 🔥 ИСПРАВЛЕНО: Скрываем лейблы на мобилках (или ставим в flex), разносим элементы по адаптивной сетке */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full items-center">
        <div className="space-y-1 w-full">
          <Label htmlFor="coin-select" className="text-xs sm:text-sm">
            Торговая пара
          </Label>
          <Select
            value={selectedCoin}
            onValueChange={(value) => {
              if (value) onCoinChange(value);
            }}
          >
            <SelectTrigger
              id="coin-select"
              className="h-9 w-full bg-background border border-input shadow-none text-xs sm:text-sm"
            >
              <SelectValue placeholder="Выберите монету" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_COINS.map((coin) => (
                <SelectItem
                  key={coin}
                  value={coin}
                  className="text-xs sm:text-sm"
                >
                  {coin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 w-full">
          <Label className="text-xs sm:text-sm">Тип ордера</Label>
          <ButtonGroup className="w-full h-9 flex">
            <Button
              type="button"
              variant={orderType === "MARKET" ? "default" : "outline"}
              className={`flex-1 h-full text-xs font-semibold shadow-none border border-input ${
                orderType === "MARKET" ? "font-bold" : ""
              }`}
              onClick={() => setOrderType("MARKET")}
            >
              Market
            </Button>
            <Button
              type="button"
              variant={orderType === "LIMIT" ? "default" : "outline"}
              className={`flex-1 h-full text-xs font-semibold shadow-none border border-input ${
                orderType === "LIMIT" ? "font-bold" : ""
              }`}
              onClick={() => setOrderType("LIMIT")}
            >
              Limit
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}
