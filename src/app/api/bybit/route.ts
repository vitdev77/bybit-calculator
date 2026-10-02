import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");

interface CacheEntry {
  timestamp: number;
  data: any;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000;

function safeParseFloat(val: any): number {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();

  const cached = memoryCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const baseUrl = process.env.BYBIT_API_URL || "https://bytick.com";
    const endpoint = "/v5/market/tickers";

    const queryParams = new URLSearchParams({
      category: "linear",
      symbol: symbol,
    });

    const response = await fetch(
      `${baseUrl}${endpoint}?${queryParams.toString()}`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json",
        },
      },
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Ошибка Bybit API: ${response.status}` },
        { status: response.status },
      );
    }

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
      return NextResponse.json(
        { error: data.retMsg || "Пара не найдена" },
        { status: 404 },
      );
    }

    const ticker = data.result.list[0];

    let dbFullName = "Crypto Asset";
    try {
      const dbRes = await sql`
SELECT fullname FROM coins WHERE coin = ${symbol} LIMIT 1;
`;
      if (dbRes && dbRes[0]?.fullname) {
        dbFullName = dbRes[0].fullname;
      }
    } catch (dbErr) {
      console.warn("DB Name fetch err", dbErr);
    }

    const finalResult = {
      lastPrice: safeParseFloat(ticker.lastPrice),
      prevPrice24h: safeParseFloat(ticker.prevPrice24h),
      price24hPcnt: safeParseFloat(ticker.price24hPcnt),
      highPrice24h: safeParseFloat(ticker.highPrice24h),
      lowPrice24h: safeParseFloat(ticker.lowPrice24h),
      fundingRate: safeParseFloat(ticker.fundingRate),
      volume24h: safeParseFloat(ticker.volume24h),
      turnover24h: safeParseFloat(ticker.turnover24h),
      fullname: dbFullName,
    };

    memoryCache.set(symbol, {
      timestamp: Date.now(),
      data: finalResult,
    });

    return NextResponse.json(finalResult);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Превышено время ожидания Bybit API" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
