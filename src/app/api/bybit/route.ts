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
    const protocol = "https://";
    const defaultDomain = "https://api.bytick.com";
    const bybitDomain = process.env.BYBIT_API_URL || defaultDomain;
    const cleanedDomain = bybitDomain.replace(/^https?:\/\//, "");

    const baseUrl = protocol + cleanedDomain;
    const endpoint = "/v5/market/tickers";
    const queryParams = new URLSearchParams({
      category: "linear",
      symbol: symbol,
    });

    const response = await fetch(
      baseUrl + endpoint + "?" + queryParams.toString(),
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "BybitCalcAI/1.0",
          Accept: "application/json",
        },
      },
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Bybit API Error Status: ${response.status}` },
        { status: response.status },
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON response or Cloudflare block" },
        { status: 403 },
      );
    }

    if (
      data.retCode !== 0 ||
      !data.result?.list ||
      data.result.list.length === 0
    ) {
      return NextResponse.json(
        { error: data.retMsg || "Symbol asset not found" },
        { status: 404 },
      );
    }

    const ticker = data.result.list[0];
    let dbFullName = "Crypto Asset";

    try {
      const dbRes = await sql`
SELECT fullname FROM coins WHERE coin = ${symbol} LIMIT 1;
`;
      if (dbRes && dbRes.length > 0 && dbRes[0].fullname) {
        dbFullName = dbRes[0].fullname;
      }
    } catch (dbErr) {
      console.warn("Database Name Fetch Error", dbErr);
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
        { error: "Bybit API response timeout exceeded" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error Route" },
      { status: 500 },
    );
  }
}
