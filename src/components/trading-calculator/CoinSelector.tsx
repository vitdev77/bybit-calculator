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
    <div className="space-y-2 w-full">
      <div className="grid grid-cols-2 gap-4">
        <Label htmlFor="coin-select">Торговая пара</Label>
        <Label>Тип ордера</Label>
      </div>

      <div className="grid grid-cols-2 gap-4 items-center w-full">
        <Select
          value={selectedCoin}
          onValueChange={(value) => {
            if (value) onCoinChange(value);
          }}
        >
          <SelectTrigger
            id="coin-select"
            className="h-9 w-full bg-background border border-input shadow-none"
          >
            <SelectValue placeholder="Выберите монету" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_COINS.map((coin) => (
              <SelectItem key={coin} value={coin}>
                {coin}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ButtonGroup className="w-full h-9 flex">
          <Button
            type="button"
            variant={orderType === "MARKET" ? "default" : "outline"}
            className={`flex-1 h-full text-xs font-semibold shadow-none ${
              orderType === "MARKET" ? "font-bold" : ""
            }`}
            onClick={() => setOrderType("MARKET")}
          >
            Market
          </Button>
          <Button
            type="button"
            variant={orderType === "LIMIT" ? "default" : "outline"}
            className={`flex-1 h-full text-xs font-semibold shadow-none ${
              orderType === "LIMIT" ? "font-bold" : ""
            }`}
            onClick={() => setOrderType("LIMIT")}
          >
            Limit
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
