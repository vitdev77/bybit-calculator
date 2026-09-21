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
      {/* 
        ФИКС РЕГЛАМЕНТА: grid-cols-2 жестко держит элементы в одну линию.
        gap-1.5 уменьшен, чтобы на узких экранах инпуты не сжимались.
      */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full items-center">
        {/* ЛЕВАЯ КОЛОНКА: Торговая пара */}
        <div className="space-y-1 w-full min-w-0">
          <Label
            htmlFor="coin-select"
            className="text-[10px] sm:text-xs truncate block"
          >
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
              className="h-9! m-0! w-full bg-background border border-input shadow-none text-[11px] sm:text-sm px-1.5 sm:px-2.5"
            >
              <SelectValue placeholder="Монета" />
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

        {/* ПРАВАЯ КОЛОНКА: Тип ордера */}
        <div className="space-y-1 w-full min-w-0">
          <Label className="text-[10px] sm:text-xs truncate block">
            Тип ордера
          </Label>
          <ButtonGroup className="w-full h-9 flex">
            <Button
              type="button"
              variant={orderType === "MARKET" ? "default" : "outline"}
              className={`flex-1 h-full text-[11px] sm:text-xs px-1 font-semibold shadow-none border border-input ${
                orderType === "MARKET" ? "font-bold" : ""
              }`}
              onClick={() => setOrderType("MARKET")}
            >
              Market
            </Button>
            <Button
              type="button"
              variant={orderType === "LIMIT" ? "default" : "outline"}
              className={`flex-1 h-full text-[11px] sm:text-xs px-1 font-semibold shadow-none border border-input ${
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
