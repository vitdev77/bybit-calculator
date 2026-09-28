import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
const sql = neon(process.env.DATABASE_URL || "");
let isCoinsVerified = false;

const REAL_STABLE_COINS = [
  { coin: "BTCUSDT", decimals: 2 },
  { coin: "ETHUSDT", decimals: 2 },
  { coin: "SOLUSDT", decimals: 2 },
  { coin: "SUIUSDT", decimals: 4 },
  { coin: "XRPUSDT", decimals: 4 },
  { coin: "DOGEUSDT", decimals: 5 },
  { coin: "NEARUSDT", decimals: 3 },
  { coin: "LINKUSDT", decimals: 3 },
  { coin: "MNTUSDT", decimals: 4 },
  { coin: "HYPEUSDT", decimals: 2 },
];

function getDecimalsFromTick(tickStr: string): number {
  if (!tickStr) return 2;
  const num = parseFloat(tickStr);
  if (isNaN(num) || num >= 1) return 0;
  const parts = tickStr.split(".");
  return parts ? parts.length - 1 : 2;
}

async function ensureCoinsTableExists() {
  if (isCoinsVerified) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS coins (
        coin VARCHAR(50) PRIMARY KEY,
        decimals INTEGER NOT NULL DEFAULT 2,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE
      );
    `;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_delisted BOOLEAN NOT NULL DEFAULT FALSE;`;

    const bybitUrl = "https://bytick.com";
    let itemsLoaded = false;
    try {
      const response = await fetch(bybitUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const json = await response.json();
        const list = json.result?.list || [];
        const liveUsdtPairs = list.filter(
          (item: any) => item.status === "Trading" && item.quoteCoin === "USDT",
        );

        if (liveUsdtPairs.length > 0) {
          const activeCoinNames = liveUsdtPairs.map((item: any) => item.symbol);
          await sql`UPDATE coins SET is_active = FALSE, is_delisted = TRUE WHERE NOT (coin = ANY(${activeCoinNames}));`;

          for (const item of liveUsdtPairs) {
            const coinName = item.symbol;
            const decimals = getDecimalsFromTick(
              item.priceFilter?.tickSize || "0.01",
            );
            const defaultFavs = [
              "BTCUSDT",
              "ETHUSDT",
              "SOLUSDT",
              "SUIUSDT",
              "XRPUSDT",
            ];

            await sql`
              INSERT INTO coins (coin, decimals, is_favorite, is_active, is_delisted)
              VALUES (${coinName}, ${decimals}, ${defaultFavs.includes(coinName)}, TRUE, FALSE)
              ON CONFLICT (coin) DO UPDATE SET decimals = ${decimals}, is_delisted = FALSE;
            `;
          }
          itemsLoaded = true;
        }
      }
    } catch (e) {
      console.warn("Bybit API офлайн");
    }

    const res = await sql`SELECT COUNT(*) as count FROM coins;`;
    const coinCount = parseInt((res && res[0]?.count) || "0", 10);

    if (!itemsLoaded && coinCount === 0) {
      for (const item of REAL_STABLE_COINS) {
        await sql`
          INSERT INTO coins (coin, decimals, is_favorite, is_active, is_delisted)
          VALUES (${item.coin}, ${item.decimals}, ${item.coin === "BTCUSDT"}, TRUE, FALSE)
          ON CONFLICT (coin) DO NOTHING;
        `;
      }
    }
    isCoinsVerified = true;
  } catch (err) {
    console.error("Sync Error", err);
  }
}
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    isCoinsVerified = false;
    await ensureCoinsTableExists();

    const allCoins = await sql`
      SELECT coin, decimals, is_favorite, is_active, is_delisted 
      FROM coins ORDER BY is_favorite DESC, coin ASC;
    `;

    const registryMap: Record<
      string,
      { price24hPcnt: number; turnover24h: number }
    > = {};
    try {
      const tickersRes = await fetch("https://bytick.com", {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (tickersRes.ok) {
        const bulkJson = await tickersRes.json();
        const list = bulkJson.result?.list || [];
        list.forEach((item: any) => {
          registryMap[item.symbol] = {
            price24hPcnt: parseFloat(item.price24hPcnt || "0") * 100,
            turnover24h: parseFloat(item.turnover24h || "0"),
          };
        });
      }
    } catch (e) {
      console.warn("Не удалось подгрузить реестр объемов торгов Bybit");
    }

    return NextResponse.json({
      coins: allCoins || [],
      tickerRegistry: registryMap,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
