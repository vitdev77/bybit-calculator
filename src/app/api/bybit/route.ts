import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";

  try {
    // ЖЕЛЕЗОБЕТОННЫЙ ФИКС: Берем URL зеркала из env, если он не задан — используем запасной вариант
    const baseUrl = process.env.BYBIT_API_URL || "https://api.bytick.com";
    const endpoint = "/v5/market/tickers";

    const queryParams = new URLSearchParams();
    queryParams.append("category", "linear");
    queryParams.append("symbol", symbol);

    const response = await fetch(
      `${baseUrl}${endpoint}?${queryParams.toString()}`,
      {
        cache: "no-store",
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
        { error: "Блокировка Cloudflare" },
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
      lastPrice: parseFloat(ticker.lastPrice),
      prevPrice24h: parseFloat(ticker.prevPrice24h),
      price24hPcnt: parseFloat(ticker.price24hPcnt),
      highPrice24h: parseFloat(ticker.highPrice24h),
      lowPrice24h: parseFloat(ticker.lowPrice24h),
      fundingRate: parseFloat(ticker.fundingRate) * 100,
      volume24h: parseFloat(ticker.volume24h),
      turnover24h: parseFloat(ticker.turnover24h),
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
