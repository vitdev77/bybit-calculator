import { NextResponse } from "next/server";

// Принудительно отключаем кэширование всего роута в Next.js
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";

  try {
    const baseUrl = process.env.BYBIT_API_URL || "https://api.bytick.com";
    const endpoint = "/v5/market/tickers";

    const queryParams = new URLSearchParams();
    queryParams.append("category", "linear");
    queryParams.append("symbol", symbol);

    const response = await fetch(
      `${baseUrl}${endpoint}?${queryParams.toString()}`,
      {
        cache: "no-store", // Отключаем кэширование запроса к API
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      },
    );

    const responseText = await response.text();
    if (!response.ok)
      return NextResponse.json(
        { error: "Ошибка Bybit API" },
        { status: response.status },
      );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        { error: "Блокировка Cloudflare или невалидный JSON" },
        { status: 403 },
      );
    }

    if (
      data.retCode !== 0 ||
      !data.result?.list ||
      data.result.list.length === 0
    ) {
      return NextResponse.json({ error: "Пара не найдена" }, { status: 404 });
    }

    const ticker = data.result.list[0];

    return NextResponse.json({
      lastPrice: parseFloat(ticker.lastPrice) || 0,
      prevPrice24h: parseFloat(ticker.prevPrice24h) || 0,
      price24hPcnt: parseFloat(ticker.price24hPcnt) || 0,
      highPrice24h: parseFloat(ticker.highPrice24h) || 0,
      lowPrice24h: parseFloat(ticker.lowPrice24h) || 0,
      // ФИКС: Убрано ошибочное умножение на 100. Bybit v5 возвращает реальное значение (например 0.0001 для 0.01%)
      fundingRate: parseFloat(ticker.fundingRate) || 0,
      volume24h: parseFloat(ticker.volume24h) || 0,
      turnover24h: parseFloat(ticker.turnover24h) || 0,
    });
  } catch (error) {
    console.error("Bybit Route Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
