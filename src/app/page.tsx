import TradingCalculator from "@/components/trading-calculator/TradingCalculator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 antialiased selection:bg-foreground selection:text-background transition-colors duration-200">
      <div className="w-full max-w-4xl">
        <TradingCalculator />
      </div>
    </main>
  );
}
