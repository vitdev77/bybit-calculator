import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");
let isCoinsVerified = false;

const REAL_STABLE_COINS = [
  { coin: "BTCUSDT", decimals: 2, fullname: "Bitcoin" },
  { coin: "ETHUSDT", decimals: 2, fullname: "Ethereum" },
  { coin: "SOLUSDT", decimals: 2, fullname: "Solana" },
  { coin: "SUIUSDT", decimals: 4, fullname: "Sui" },
  { coin: "XRPUSDT", decimals: 4, fullname: "Ripple" },
  { coin: "DOGEUSDT", decimals: 5, fullname: "Dogecoin" },
  { coin: "NEARUSDT", decimals: 3, fullname: "Near Protocol" },
  { coin: "LINKUSDT", decimals: 3, fullname: "Chainlink" },
  { coin: "MNTUSDT", decimals: 4, fullname: "Mantle" },
  { coin: "HYPEUSDT", decimals: 2, fullname: "Hyperliquid" },
];

const TROUBLESOME_SLUGS: Record<string, string> = {
  AVGOUSDT: "broadcom",
  ANETUSDT: "arista-networks",
  BABAUSDT: "alibaba",
  AAPLUSDT: "apple",
  TSLAUSDT: "tesla",
  NVDAUSDT: "nvidia",
  AMZNUSDT: "amazon",
  MSFTUSDT: "microsoft",
  GOOGLUSDT: "google",
  METAUSDT: "meta-platforms",
  COINUSDT: "coinbase",
  MSTRUSDT: "microstrategy",
  AMDUSDT: "advanced-micro-devices",
};

function getDecimalsFromTick(tickStr: string): number {
  if (!tickStr) return 2;
  const dotIdx = tickStr.indexOf(".");
  if (dotIdx === -1) return 0;
  return tickStr.length - dotIdx - 1;
}
async function fetchAndSyncBybitPairs() {
  const baseUrl = process.env.BYBIT_API_URL || "https://bytick.com";
  const endpoint = "/v5/market/instruments-info";

  let allLiveUsdtPairs: any[] = [];
  let currentCursor = "";
  let hasNextPage = true;
  let loopSafetyCounter = 0;

  try {
    while (hasNextPage && loopSafetyCounter < 15) {
      loopSafetyCounter++;
      let targetUrl = baseUrl + endpoint + "?category=linear&limit=1000";
      if (currentCursor) {
        targetUrl += "&cursor=" + currentCursor;
      }

      const response = await fetch(targetUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        const json = await response.json();
        const list = json.result?.list || [];

        const filtered = list.filter(
          (item: any) => item.status === "Trading" && item.quoteCoin === "USDT",
        );

        allLiveUsdtPairs = [...allLiveUsdtPairs, ...filtered];
        currentCursor = json.result?.nextPageCursor || "";
        if (!currentCursor || list.length === 0) {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }
  } catch (bybitErr) {
    console.warn("⚠️ Сбой Bybit API:", bybitErr);
    return false;
  }

  if (allLiveUsdtPairs.length > 0) {
    const names = allLiveUsdtPairs.map((i: any) => i.symbol);

    await sql`
UPDATE coins 
SET is_active = FALSE, 
is_delisted = TRUE 
WHERE NOT (coin = ANY(${names}));
`;

    for (const item of allLiveUsdtPairs) {
      const coinName = item.symbol;
      const tick = item.priceFilter?.tickSize || "0.01";
      const decimals = getDecimalsFromTick(tick);
      const officialName = item.fullName || item.baseCoin || "Crypto Asset";

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
is_active, is_delisted, fullname
)
VALUES (
${coinName}, ${decimals}, 
${defaultFavs.includes(coinName)}, 
TRUE, FALSE, ${officialName}
)
ON CONFLICT (coin) 
DO UPDATE SET 
decimals = ${decimals}, 
is_active = TRUE,
is_delisted = FALSE,
fullname = ${officialName};
`;
    }
    return true;
  }
  return false;
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
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS fullname VARCHAR(100) 
NOT NULL DEFAULT 'Crypto Asset';
`;
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS logo_slug VARCHAR(100);
`;

    isCoinsVerified = true;
  } catch (err) {
    console.error(err);
  }
}

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL?" }, { status: 500 });
    }
    await ensureCoinsTableExists();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const all = searchParams.get("all");

    let coinsResult;

    if (all === "true") {
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, 
is_active, is_delisted, fullname, logo_slug 
FROM coins 
ORDER BY is_favorite DESC, coin ASC;
`;
    } else if (search) {
      const cleanSearch = "%" + search.trim().toUpperCase() + "%";
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, 
is_active, is_delisted, fullname, logo_slug 
FROM coins 
WHERE coin LIKE ${cleanSearch}
ORDER BY is_favorite DESC, coin ASC 
LIMIT 30;
`;
    } else {
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, 
is_active, is_delisted, fullname, logo_slug 
FROM coins 
WHERE is_favorite = TRUE
ORDER BY coin ASC;
`;
    }

    if (coinsResult.length === 0 && !search && !all) {
      const defaultFavs = [
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
        "SUIUSDT",
        "XRPUSDT",
      ];
      for (const item of REAL_STABLE_COINS) {
        await sql`
INSERT INTO coins (
coin, decimals, is_favorite, 
is_active, is_delisted, fullname
)
VALUES (
${item.coin}, ${item.decimals}, 
${defaultFavs.includes(item.coin)}, 
TRUE, FALSE, ${item.fullname}
)
ON CONFLICT (coin) 
DO UPDATE SET 
decimals = EXCLUDED.decimals,
fullname = EXCLUDED.fullname;
`;
      }
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, 
is_active, is_delisted, fullname, logo_slug 
FROM coins 
WHERE is_favorite = TRUE
ORDER BY coin ASC;
`;
    }

    const registryMap: Record<
      string,
      {
        price24hPcnt: number;
        turnover24h: number;
      }
    > = {};

    if (all === "true" || search) {
      try {
        const bybitApiUrl = process.env.BYBIT_API_URL || "https://bytick.com";
        const endpoint = "/v5/market/tickers";
        const tickersUrl = bybitApiUrl + endpoint + "?category=linear";

        const tickersRes = await fetch(tickersUrl, {
          cache: "no-store",
        });
        if (tickersRes.ok) {
          const bulkJson = await tickersRes.json();
          const list = bulkJson.result?.list || [];
          list.forEach((item: any) => {
            registryMap[item.symbol] = {
              price24hPcnt: parseFloat(item.price24hPcnt || "0"),
              turnover24h: parseFloat(item.turnover24h || "0"),
            };
          });
        }
      } catch (e) {
        console.warn("⚠️ Сбой живых тикеров:", e);
      }
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
      return NextResponse.json({ error: "DATABASE_URL?" }, { status: 500 });
    }
    const body = await request.json();
    const { action, coin, logo_slug } = body;

    if (action === "SYNC_BYBIT") {
      const success = await fetchAndSyncBybitPairs();
      if (!success) {
        return NextResponse.json({ error: "Bybit API error" }, { status: 502 });
      }
      return NextResponse.json({
        success: true,
        message: "Листинг синхронизирован",
      });
    }

    if (action === "SEED_SLUGS") {
      for (const [targetCoin, slug] of Object.entries(TROUBLESOME_SLUGS)) {
        await sql`
UPDATE coins 
SET logo_slug = ${slug} 
WHERE coin = ${targetCoin};
`;
      }
      return NextResponse.json({
        success: true,
        message: "Слаги логотипов успешно размечены в БД",
      });
    }

    if (!coin) {
      return NextResponse.json({ error: "No coin" }, { status: 400 });
    }

    if (action === "UPDATE_SLUG") {
      await sql`
UPDATE coins 
SET logo_slug = ${logo_slug} 
WHERE coin = ${coin};
`;
      return NextResponse.json({ success: true });
    }

    if (action === "TOGGLE_FAVORITE") {
      await sql`
UPDATE coins 
SET is_favorite = 
NOT is_favorite 
WHERE coin = ${coin};
`;
      return NextResponse.json({
        success: true,
      });
    }

    if (action === "TOGGLE_ACTIVE") {
      await sql`
UPDATE coins 
SET is_active = 
NOT is_active 
WHERE coin = ${coin};
`;
      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
