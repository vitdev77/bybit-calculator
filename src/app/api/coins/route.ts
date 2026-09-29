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
  if (!tickStr || !tickStr.includes(".")) return 0;
  const parts = tickStr.split(".");
  return parts[1] ? parts[1].length : 2;
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
    await sql`
      ALTER TABLE coins 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN 
      NOT NULL DEFAULT TRUE;
    `;
    await sql`
      ALTER TABLE coins 
      ADD COLUMN IF NOT EXISTS is_delisted BOOLEAN 
      NOT NULL DEFAULT FALSE;
    `;

    const bybitApiUrl = process.env.BYBIT_API_URL || "https://bytick.com";
    const endpoint = "/v5/market/instruments-info";

    let allLiveUsdtPairs: any[] = [];
    let currentCursor = "";
    let hasNextPage = true;
    let loopSafetyCounter = 0;

    while (hasNextPage && loopSafetyCounter < 15) {
      loopSafetyCounter++;
      let targetUrl = `${bybitApiUrl}${endpoint}?category=linear&limit=1000`;
      if (currentCursor) {
        targetUrl += `&cursor=${currentCursor}`;
      }

      try {
        const response = await fetch(targetUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        });

        if (response.ok) {
          const json = await response.json();
          const list = json.result?.list || [];

          const filtered = list.filter(
            (item: any) =>
              item.status === "Trading" && item.quoteCoin === "USDT",
          );

          allLiveUsdtPairs = [...allLiveUsdtPairs, ...filtered];
          currentCursor = json.result?.nextPageCursor || "";
          if (!currentCursor || list.length === 0) {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      } catch (e) {
        hasNextPage = false;
      }
    }
    if (allLiveUsdtPairs.length > 0) {
      const names = allLiveUsdtPairs.map((i: any) => i.symbol);

      await sql`
        UPDATE coins 
        SET is_active = FALSE, is_delisted = TRUE 
        WHERE NOT (coin = ANY(${names}));
      `;

      for (const item of allLiveUsdtPairs) {
        const coinName = item.symbol;
        const tick = item.priceFilter?.tickSize || "0.01";
        const decimals = getDecimalsFromTick(tick);
        const defaultFavs = [
          "BTCUSDT",
          "ETHUSDT",
          "SOLUSDT",
          "SUIUSDT",
          "XRPUSDT",
        ];

        await sql`
          INSERT INTO coins (
            coin, decimals, is_favorite, 
            is_active, is_delisted
          )
          VALUES (
            ${coinName}, ${decimals}, 
            ${defaultFavs.includes(coinName)}, 
            TRUE, FALSE
          )
          ON CONFLICT (coin) DO UPDATE SET 
            decimals = ${decimals}, 
            is_active = TRUE,
            is_delisted = FALSE;
        `;
      }
    }

    const res: any = await sql`SELECT COUNT(*) as count FROM coins;`;
    const coinCount = parseInt((res && res[0]?.count) || "0", 10);

    if (allLiveUsdtPairs.length === 0 && coinCount === 0) {
      for (const item of REAL_STABLE_COINS) {
        await sql`
          INSERT INTO coins (
            coin, decimals, is_favorite, 
            is_active, is_delisted
          )
          VALUES (
            ${item.coin}, ${item.decimals}, 
            ${item.coin === "BTCUSDT"}, TRUE, FALSE
          )
          ON CONFLICT (coin) DO NOTHING;
        `;
      }
    }
    isCoinsVerified = true;
  } catch (err) {
    console.error("Sync Error", err);
  }
}
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    await ensureCoinsTableExists();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const all = searchParams.get("all");

    let coinsResult;

    if (all === "true") {
      // Для ListingManagerModal запрашиваем всё
      coinsResult = await sql`
        SELECT coin, decimals, is_favorite, is_active, is_delisted 
        FROM coins 
        ORDER BY is_favorite DESC, coin ASC;
      `;
    } else if (search) {
      // Для точечного текстового поиска новой пары
      const cleanSearch = `%${search.trim().toUpperCase()}%`;
      coinsResult = await sql`
        SELECT coin, decimals, is_favorite, is_active, is_delisted 
        FROM coins 
        WHERE coin LIKE ${cleanSearch}
        ORDER BY is_favorite DESC, coin ASC 
        LIMIT 30;
      `;
    } else {
      // По умолчанию отдаем ТОЛЬКО Избранное (Разгрузка базы!)
      coinsResult = await sql`
        SELECT coin, decimals, is_favorite, is_active, is_delisted 
        FROM coins 
        WHERE is_favorite = TRUE
        ORDER BY coin ASC;
      `;
    }

    const registryMap: Record<
      string,
      { price24hPcnt: number; turnover24h: number }
    > = {};

    try {
      const bybitApiUrl = process.env.BYBIT_API_URL || "https://bytick.com";
      const endpoint = "/v5/market/tickers";
      const tickersUrl = `${bybitApiUrl}${endpoint}?category=linear`;

      const tickersRes = await fetch(tickersUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (tickersRes.ok) {
        const bulkJson = await tickersRes.json();
        const list = bulkJson.result?.list || [];
        list.forEach((item: any) => {
          // Записываем данные котировок только для тех монет,
          // которые попали в выборку
          const isInSelection = coinsResult.some(
            (c: any) => c.coin === item.symbol,
          );
          if (isInSelection || all === "true") {
            registryMap[item.symbol] = {
              price24hPcnt: parseFloat(item.price24hPcnt || "0"),
              turnover24h: parseFloat(item.turnover24h || "0"),
            };
          }
        });
      }
    } catch (e) {
      console.warn("Не удалось подгрузить реестр Bybit");
    }

    return NextResponse.json({
      coins: coinsResult || [],
      tickerRegistry: registryMap,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    const body = await request.json();
    const { action, coin } = body;

    if (!coin) {
      return NextResponse.json({ error: "Не указана монета" }, { status: 400 });
    }

    if (action === "TOGGLE_FAVORITE") {
      await sql`
        UPDATE coins 
        SET is_favorite = NOT is_favorite 
        WHERE coin = ${coin};
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "TOGGLE_ACTIVE") {
      await sql`
        UPDATE coins 
        SET is_active = NOT is_active 
        WHERE coin = ${coin};
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Неизвестное действие" },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
