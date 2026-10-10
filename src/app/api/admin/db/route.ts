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
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS is_active 
BOOLEAN NOT NULL DEFAULT TRUE;
`;
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS is_delisted 
BOOLEAN NOT NULL DEFAULT FALSE;
`;
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS fullname 
VARCHAR(100) NOT NULL DEFAULT 'Crypto Asset';
`;
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS logo_slug 
VARCHAR(50);
`;
    await sql`
ALTER TABLE coins 
ADD COLUMN IF NOT EXISTS listed_at 
TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
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

    let rows = [];
    let stats: any = { count: 0 };
    const registryMap: Record<
      string,
      { price24hPcnt: number; turnover24h: number }
    > = {};

    if (table === "coins") {
      rows = await sql`
SELECT coin, decimals, is_favorite, is_active, 
is_delisted, fullname, logo_slug, listed_at 
FROM coins 
ORDER BY coin ASC;
`;
      const cRes: any = await sql`
SELECT COUNT(*) as count FROM coins;
`;
      stats.count = parseInt(cRes[0]?.count || "0", 10);

      try {
        const defaultDomain = "https://api.bytick.com";
        const bybitDomain = process.env.BYBIT_API_URL || defaultDomain;
        const cleanedDomain = bybitDomain.replace(/^https?:\/\//, "");
        const baseUrl = "https://" + cleanedDomain;
        const endpoint = "/v5/market/tickers";
        const tickersUrl = baseUrl + endpoint + "?category=linear";

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
SELECT d.id, d.created_at, d.coin, d.side, 
d.order_type, 
d.entry_price::TEXT as entry_price, 
d.stop_loss::TEXT as stop_loss, 
d.take_profit::TEXT as take_profit, 
d.volume, d.margin, d.leverage, d.status, 
d.closed_at_price::TEXT as closed_at_price, 
d.tp_touched, d.sl_touched,
COALESCE(c.decimals, 2) as precision,
c.logo_slug
FROM deals d
LEFT JOIN coins c ON d.coin = c.coin
ORDER BY d.created_at DESC;
`;

      rows = rawDeals.map((d: any) => ({
        ...d,
        entry_price: parseFloat(d.entry_price) || 0,
        stop_loss: parseFloat(d.stop_loss) || 0,
        take_profit: parseFloat(d.take_profit) || 0,
        closed_at_price: d.closed_at_price
          ? parseFloat(d.closed_at_price)
          : null,
        precision: parseInt(d.precision, 10) || 2,
      }));

      const dRes: any = await sql`
SELECT COUNT(*) as count FROM deals;
`;
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
      tickerRegistry: registryMap,
    });
  } catch (err: any) {
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

    if (table === "coins") {
      await sql`TRUNCATE TABLE coins CASCADE;`;
    } else if (table === "deals") {
      await sql`TRUNCATE TABLE deals CASCADE;`;
    } else {
      return NextResponse.json(
        { error: "Unknown table targeted" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Table ${table} successfully truncated`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
