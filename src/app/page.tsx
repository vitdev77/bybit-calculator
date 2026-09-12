import TradingCalculator from "@/components/trading-calculator/TradingCalculator";
import TradingJournal from "@/components/trading-calculator/TradingJournal"; // Импортируем журнал

export default function Home() {
  return (
    <main className="min-h-screen py-8 space-y-6">
      <TradingCalculator />
      <TradingJournal /> {/* Рендерим журнал прямо снизу */}
    </main>
  );
}
