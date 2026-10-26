import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");
let isCoinsVerified = false;

function checkAuth(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET_KEY || "fallback_default_token_key";
  const token = req.headers.get("X-Admin-Token");
  return token === secret;
}

async function ensureCoinsTableSchema() {
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
ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
`;
    await sql`
ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_delisted BOOLEAN NOT NULL DEFAULT FALSE;
`;
    await sql`
ALTER TABLE coins ADD COLUMN IF NOT EXISTS fullname VARCHAR(100) NOT NULL DEFAULT 'Crypto Asset';
`;
    await sql`
ALTER TABLE coins ADD COLUMN IF NOT EXISTS logo_slug VARCHAR(50);
`;
    await sql`
ALTER TABLE coins ADD COLUMN IF NOT EXISTS listed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
`;
    await sql`
CREATE TABLE IF NOT EXISTS sys_settings (
key VARCHAR(100) PRIMARY KEY,
value JSONB NOT NULL
);
`;
    isCoinsVerified = true;
  } catch (err) {
    console.error("Admin DB Coins Migration Error:", err);
  }
}
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }
    await ensureCoinsTableSchema();
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") || "deals";
    const action = searchParams.get("action");
    if (action === "backup") {
      const allDeals = await sql`SELECT * FROM deals;`;
      const allCoins = await sql`SELECT * FROM coins;`;
      const allSettings = await sql`SELECT * FROM sys_settings;`;
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        backupData: {
          deals: allDeals,
          coins: allCoins,
          sys_settings: allSettings,
        },
      });
    }
    let rows = [];
    let stats: any = { count: 0 };
    let syncMeta: any = null;
    let dealsMetrics = {
      totalPnl: 0,
      winRate: 0,
      openCount: 0,
      totalMargin: 0,
    };
    const registryMap: Record<
      string,
      { price24hPcnt: number; turnover24h: number }
    > = {};

    try {
      const metaRes =
        await sql`SELECT value FROM sys_settings WHERE key = 'last_sync_meta' LIMIT 1;`;
      if (metaRes && metaRes.length > 0) {
        syncMeta = metaRes[0].value;
      }
    } catch (e) {
      console.warn("⚠️ Cannot read sync meta settings:", e);
    }

    if (table === "coins") {
      rows = await sql`
SELECT coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at 
FROM coins ORDER BY coin ASC;
`;
      const cRes: any = await sql`SELECT COUNT(*) as count FROM coins;`;
      stats.count = parseInt(cRes[0]?.count || "0", 10);
      try {
        const bybitDomain =
          process.env.BYBIT_API_URL || "https://api.bytick.com";
        const cleanedDomain = bybitDomain.replace(/^https?:\/\//, "");
        const tickersUrl =
          "https://" + cleanedDomain + "/v5/market/tickers?category=linear";
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
        console.warn("⚠️ Admin DB Sync Tickers Error:", e);
      }
    } else if (table === "deals") {
      const rawDeals = await sql`
SELECT d.id, d.created_at, d.coin, d.side, d.order_type, 
d.entry_price::TEXT as entry_price, d.stop_loss::TEXT as stop_loss, 
d.take_profit::TEXT as take_profit, d.volume, d.margin, d.leverage, d.status, 
d.closed_at_price::TEXT as closed_at_price, d.tp_touched, d.sl_touched,
COALESCE(c.decimals, 2) as precision, c.logo_slug
FROM deals d LEFT JOIN coins c ON d.coin = c.coin ORDER BY d.created_at DESC;
`;

      let grossProfitDeals = 0;
      let closedDealsCount = 0;

      rows = rawDeals.map((d: any) => {
        const isLong = d.side === "BUY";
        let statusUpper = d.status?.toUpperCase();
        const isOpen = statusUpper === "OPEN";
        const marginVal = parseFloat(d.margin) || 0;
        const volVal = parseFloat(d.volume) || 0;
        const entryPriceNum = parseFloat(d.entry_price) || 0;

        if (isOpen) {
          dealsMetrics.openCount += 1;
          dealsMetrics.totalMargin += marginVal;
        } else {
          closedDealsCount += 1;
          const closedPriceNum = d.closed_at_price
            ? parseFloat(d.closed_at_price)
            : 0;
          let targetPrice = closedPriceNum;
          if (targetPrice <= 0) {
            targetPrice =
              statusUpper === "PROFIT"
                ? parseFloat(d.take_profit)
                : parseFloat(d.stop_loss);
          }
          const cryptoQty = entryPriceNum > 0 ? volVal / entryPriceNum : 0;
          const priceDiff = isLong
            ? targetPrice - entryPriceNum
            : entryPriceNum - targetPrice;
          const netPnlUsdt = priceDiff * cryptoQty - volVal * 0.0013;
          dealsMetrics.totalPnl += netPnlUsdt;

          if (netPnlUsdt >= 0) {
            grossProfitDeals += 1;
          }

          // Корректировка статуса LOSS на BREAKEVEN, если стоп был перенесен в БУ или закрыт в плюс/ноль
          if (statusUpper === "LOSS") {
            const isBreakeven = isLong
              ? targetPrice >= entryPriceNum
              : targetPrice <= entryPriceNum;
            if (isBreakeven) {
              statusUpper = "BREAKEVEN";
            }
          }
        }

        return {
          ...d,
          status: statusUpper,
          entry_price: entryPriceNum,
          stop_loss: parseFloat(d.stop_loss) || 0,
          take_profit: parseFloat(d.take_profit) || 0,
          closed_at_price: d.closed_at_price
            ? parseFloat(d.closed_at_price)
            : null,
          precision: parseInt(d.precision, 10) || 2,
        };
      });

      if (closedDealsCount > 0) {
        dealsMetrics.winRate = (grossProfitDeals / closedDealsCount) * 100;
      }

      const dRes: any = await sql`SELECT COUNT(*) as count FROM deals;`;
      stats.count = parseInt(dRes[0]?.count || "0", 10);
    } else {
      return NextResponse.json(
        { error: "Unknown table target" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      table,
      stats,
      data: rows,
      dealsMetrics,
      tickerRegistry: registryMap,
      syncMeta,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }
    await ensureCoinsTableSchema();
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }
    const body = await request.json();
    const { action, backupData } = body;
    if (action === "restore") {
      if (!backupData) {
        return NextResponse.json({ error: "No backup data" }, { status: 400 });
      }
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
      await sql`TRUNCATE TABLE deals CASCADE;`;
      await sql`TRUNCATE TABLE coins CASCADE;`;
      await sql`DELETE FROM sys_settings WHERE key != 'db_lock_status';`;
      const coins = backupData.coins || [];
      for (const c of coins) {
        await sql`
INSERT INTO coins (coin, decimals, is_favorite, is_active, is_delisted, fullname, logo_slug, listed_at)
VALUES (${c.coin}, ${c.decimals}, ${c.is_favorite}, ${c.is_active}, ${c.is_delisted}, ${c.fullname}, ${c.logo_slug}, ${c.listed_at});
`;
      }
      const sys_settings = backupData.sys_settings || [];
      for (const s of sys_settings) {
        if (s.key === "db_lock_status") continue;
        await sql`
INSERT INTO sys_settings (key, value) VALUES (${s.key}, ${JSON.stringify(s.value)});
`;
      }
      const deals = backupData.deals || [];
      for (const d of deals) {
        await sql`
INSERT INTO deals (id, created_at, coin, side, order_type, entry_price, stop_loss, take_profit, volume, margin, leverage, status, closed_at_price, tp_touched, sl_touched)
VALUES (${d.id}, ${d.created_at}, ${d.coin}, ${d.side}, ${d.order_type}, ${d.entry_price}, ${d.stop_loss}, ${d.take_profit}, ${d.volume}, ${d.margin}, ${d.leverage}, ${d.status}, ${d.closed_at_price}, ${d.tp_touched}, ${d.sl_touched});
`;
      }
      await sql`
SELECT setval(pg_get_serial_sequence('deals', 'id'), COALESCE((SELECT MAX(id) FROM deals), 1), true);
`;
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
      return NextResponse.json({
        success: true,
        message: "Database successfully restored",
      });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    try {
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    } catch (e) {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }
    await ensureCoinsTableSchema();
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    if (table === "coins") {
      await sql`TRUNCATE TABLE coins CASCADE;`;
    } else if (table === "deals") {
      await sql`TRUNCATE TABLE deals CASCADE;`;
    } else {
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
      return NextResponse.json(
        { error: "Unknown table targeted" },
        { status: 400 },
      );
    }
    await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    return NextResponse.json({
      success: true,
      message: `Table ${table} successfully truncated`,
    });
  } catch (err: any) {
    try {
      await sql`
INSERT INTO sys_settings (key, value) VALUES ('db_lock_status', '{"is_locked":false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;
    } catch (e) {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
