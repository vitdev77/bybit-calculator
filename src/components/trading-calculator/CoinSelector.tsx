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
      {/* СЕТКА ПАРАМЕТРОВ: Жестко держит элементы в одну линию */}
      <div className="grid grid-cols-2 gap-2.5 w-full items-center">
        {/* ЛЕВАЯ КОЛОНКА: Торговая пара */}
        <div className="space-y-1 w-full min-w-0">
          <Label
            htmlFor="coin-select"
            className="text-[10px] sm:text-xs text-muted-foreground truncate block font-bold uppercase tracking-wider"
          >
            Торговая пара
          </Label>
          <Select
            value={selectedCoin}
            onValueChange={(value) => {
              if (value) onCoinChange(value);
            }}
          >
            {/* ФИКС ВЫСОТЫ: Перебиваем базовый класс на h-9! для мобильных */}
            <SelectTrigger
              id="coin-select"
              className="w-full bg-background border border-input shadow-none text-[11px] sm:text-sm px-2 h-9! md:h-8!"
            >
              <SelectValue placeholder="Монета" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_COINS.map((coin) => {
                return (
                  <SelectItem
                    key={coin}
                    value={coin}
                    className="text-xs sm:text-sm"
                  >
                    {coin}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Тип ордера */}
        <div className="space-y-1 w-full min-w-0">
          <Label className="text-[10px] sm:text-xs text-muted-foreground truncate block font-bold uppercase tracking-wider">
            Тип ордера
          </Label>
          {/* ФИКС ВЫСОТЫ: Приводим к абсолютно идентичному размеру h-9 на мобильных */}
          <ButtonGroup className="w-full flex h-9 md:h-8 mb-1">
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
