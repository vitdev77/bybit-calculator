import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");
let isCoinsVerified = false;

function getDecimalsFromTick(tickStr: string): number {
  if (!tickStr) return 2;
  const dotIdx = tickStr.indexOf(".");
  if (dotIdx === -1) return 0;
  return tickStr.length - dotIdx - 1;
}

async function fetchAndSyncBybitPairs() {
  await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
  const bybitDomain = process.env.BYBIT_API_URL || "https://api.bytick.com";
  const cleanedDomain = bybitDomain.replace(/^https?:\/\//, "");
  const baseUrl = "https://" + cleanedDomain;
  let livePairs: any[] = [];
  let closedPairs: any[] = [];
  const statuses = ["Trading", "Closed"];
  try {
    for (const currentStatus of statuses) {
      let currentCursor = "";
      let hasNextPage = true;
      let loopCounter = 0;
      while (hasNextPage && loopCounter < 15) {
        loopCounter++;
        let targetUrl =
          baseUrl +
          "/v5/market/instruments-info?category=linear&limit=1000&status=" +
          currentStatus;
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
            (item: any) => item.quoteCoin === "USDT",
          );
          if (currentStatus === "Trading") {
            livePairs = [...livePairs, ...filtered];
          } else {
            closedPairs = [...closedPairs, ...filtered];
          }
          currentCursor = json.result?.nextPageCursor || "";
          if (!currentCursor || list.length === 0) {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }
    }
  } catch (bybitErr) {
    console.warn("⚠️ Сбой Bybit API:", bybitErr);
    try {
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    } catch (e) {}
    return false;
  }
  const totalCoinsFound = livePairs.length + closedPairs.length;
  if (totalCoinsFound > 0) {
    const liveNames = livePairs.map((i: any) => i.symbol);
    const closedNames = closedPairs.map((i: any) => i.symbol);
    const allNames = [...liveNames, ...closedNames];
    await sql`
UPDATE coins SET is_active = FALSE, is_delisted = TRUE WHERE NOT (coin = ANY(${allNames}));
`;
    const defaultFavs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "SUIUSDT", "XRPUSDT"];
    for (const item of livePairs) {
      const coinName = item.symbol;
      const tick = item.priceFilter?.tickSize || "0.01";
      const decimals = getDecimalsFromTick(tick);
      const officialName = item.fullName || item.baseCoin || "Crypto Asset";
      const defaultSlug = coinName.replace("USDT", "");
      await sql`
INSERT INTO coins (coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at)
VALUES (${coinName}, ${decimals}, ${defaultFavs.includes(coinName)}, TRUE, FALSE, ${officialName}, ${defaultSlug}, NOW())
ON CONFLICT (coin) DO UPDATE SET decimals = ${decimals}, is_active = TRUE, is_delisted = FALSE, 
fullname = ${officialName}, logo_slug = COALESCE(coins.logo_slug, ${defaultSlug});
`;
    }
    for (const item of closedPairs) {
      const coinName = item.symbol;
      const tick = item.priceFilter?.tickSize || "0.01";
      const decimals = getDecimalsFromTick(tick);
      const officialName = item.fullName || item.baseCoin || "Crypto Asset";
      const defaultSlug = coinName.replace("USDT", "");
      await sql`
INSERT INTO coins (coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at)
VALUES (${coinName}, ${decimals}, FALSE, FALSE, TRUE, ${officialName}, ${defaultSlug}, NOW())
ON CONFLICT (coin) DO UPDATE SET decimals = ${decimals}, is_active = FALSE, is_delisted = TRUE, 
fullname = ${officialName}, logo_slug = COALESCE(coins.logo_slug, ${defaultSlug});
`;
    }
    await sql`
INSERT INTO sys_settings (key, value) VALUES ('last_sync_meta', ${JSON.stringify(
      {
        timestamp: Date.now(),
        totalCoins: totalCoinsFound,
        liveCount: livePairs.length,
      },
    )}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
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
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_delisted BOOLEAN NOT NULL DEFAULT FALSE;`;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS fullname VARCHAR(100) NOT NULL DEFAULT 'Crypto Asset';`;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS logo_slug VARCHAR(50);`;
    await sql`ALTER TABLE coins ADD COLUMN IF NOT EXISTS listed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`;
    await sql`CREATE TABLE IF NOT EXISTS sys_settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL);`;
    isCoinsVerified = true;
  } catch (err) {
    console.error("Database Migration Error:", err);
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
SELECT coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at 
FROM coins ORDER BY is_favorite DESC, coin ASC;
`;
    } else if (search) {
      const cleanSearch = "%" + search.trim().toUpperCase() + "%";
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at 
FROM coins WHERE coin LIKE ${cleanSearch} ORDER BY is_favorite DESC, coin ASC LIMIT 30;
`;
    } else {
      coinsResult = await sql`
SELECT coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at 
FROM coins WHERE is_favorite = TRUE ORDER BY coin ASC;
`;
    }
    const registryMap: Record<
      string,
      { price24hPcnt: number; turnover24h: number }
    > = {};
    if (all === "true" || search) {
      try {
        const bybitDomain =
          process.env.BYBIT_API_URL || "https://api.bytick.com";
        const cleanedDomain = bybitDomain.replace(/^https?:\/\//, "");
        const baseUrl = "https://" + cleanedDomain;
        const tickersUrl = baseUrl + "/v5/market/tickers?category=linear";
        const tickersRes = await fetch(tickersUrl, { cache: "no-store" });
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
    if (!coin) {
      return NextResponse.json({ error: "No coin" }, { status: 400 });
    }
    if (action === "UPDATE_LOGO_SLUG") {
      if (logo_slug === undefined) {
        return NextResponse.json(
          { error: "No logo_slug provided" },
          { status: 400 },
        );
      }
      const cleanSlug = String(logo_slug).trim();
      await sql`UPDATE coins SET logo_slug = ${cleanSlug} WHERE coin = ${coin};`;
      return NextResponse.json({ success: true });
    }
    if (action === "TOGGLE_FAVORITE") {
      await sql`UPDATE coins SET is_favorite = NOT is_favorite WHERE coin = ${coin};`;
      return NextResponse.json({ success: true });
    }
    if (action === "TOGGLE_ACTIVE") {
      await sql`UPDATE coins SET is_active = NOT is_active WHERE coin = ${coin};`;
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
