import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");

function checkAuth(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET_KEY || "fallback_default_token_key";
  const token = req.headers.get("X-Admin-Token");
  return token === secret;
}

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No DB URL" }, { status: 500 });
    }

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
      rows = await sql`SELECT * FROM coins ORDER BY coin ASC;`;
      const cRes: any = await sql`SELECT COUNT(*) as count FROM coins;`;
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
      rows = await sql`SELECT * FROM deals ORDER BY created_at DESC;`;
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
