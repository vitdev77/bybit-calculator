import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");
let isTableVerified = false;

// Базовый мини-резерв гарантированных пар
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
async function ensureTableExists() {
  if (isTableVerified) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE 
          DEFAULT CURRENT_TIMESTAMP,
        coin VARCHAR(50) NOT NULL,
        side VARCHAR(10) NOT NULL,
        order_type VARCHAR(10) NOT NULL,
        entry_price DOUBLE PRECISION NOT NULL,
        stop_loss DOUBLE PRECISION NOT NULL,
        take_profit DOUBLE PRECISION NOT NULL,
        volume DOUBLE PRECISION NOT NULL,
        margin DOUBLE PRECISION NOT NULL,
        leverage INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'OPEN',
        closed_at_price DOUBLE PRECISION,
        tp_touched BOOLEAN DEFAULT FALSE,
        sl_touched BOOLEAN DEFAULT FALSE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coins (
        coin VARCHAR(50) PRIMARY KEY,
        decimals INTEGER NOT NULL DEFAULT 2,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_deals_status_coin 
      ON deals (status, coin);
    `;

    const countResult = await sql`
      SELECT COUNT(*) as count FROM coins;
    `;

    // ИСПРАВЛЕНО: Чистый одиночный оператор к первому элементу массива ответа
    const coinCount = parseInt(
      (countResult && countResult[0]?.count) || "0",
      10,
    );

    if (coinCount === 0) {
      console.log("Синхронизация с Bybit...");
      const bybitUrl = "https://bytick.com" + "?category=linear&limit=1000";

      let itemsLoaded = false;
      try {
        const response = await fetch(bybitUrl, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const json = await response.json();
          const list = json.result?.list || [];

          const liveUsdtPairs = list.filter(
            (item: any) =>
              item.status === "Trading" && item.quoteCoin === "USDT",
          );

          if (liveUsdtPairs.length > 0) {
            const oldFavs = await sql`
              SELECT coin FROM coins WHERE is_favorite = TRUE;
            `;
            const favNames = (oldFavs || []).map((f: any) => f.coin);

            await sql`TRUNCATE TABLE coins;`;

            for (const item of liveUsdtPairs) {
              const coinName = item.symbol;
              const tickSize = item.priceFilter?.tickSize || "0.01";
              const decimals = getDecimalsFromTick(tickSize);

              const defaultFavs = [
                "BTCUSDT",
                "ETHUSDT",
                "SOLUSDT",
                "SUIUSDT",
                "XRPUSDT",
              ];
              const isFav =
                defaultFavs.includes(coinName) || favNames.includes(coinName);

              await sql`
                INSERT INTO coins (coin, decimals, is_favorite)
                VALUES (${coinName}, ${decimals}, ${isFav})
                ON CONFLICT (coin) DO UPDATE 
                SET decimals = ${decimals};
              `;
            }
            itemsLoaded = true;
          }
        }
      } catch (fetchErr) {
        console.warn("Bybit API офлайн");
      }

      if (!itemsLoaded) {
        for (const item of REAL_STABLE_COINS) {
          const defaultFavs = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
          const isFav = defaultFavs.includes(item.coin);

          await sql`
            INSERT INTO coins (coin, decimals, is_favorite)
            VALUES (${item.coin}, ${item.decimals}, ${isFav})
            ON CONFLICT (coin) DO NOTHING;
          `;
        }
      }
    }
    isTableVerified = true;
  } catch (err) {
    console.error("Database Migration Error:", err);
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
    await ensureTableExists();

    const { searchParams } = new URL(request.url);
    const activeCoin = searchParams.get("activeCoin");
    const mode = searchParams.get("mode");

    if (mode === "get_coins") {
      const allCoins = await sql`
        SELECT coin, decimals, is_favorite 
        FROM coins 
        ORDER BY is_favorite DESC, coin ASC;
      `;
      return NextResponse.json({
        coins: allCoins || [],
      });
    }

    const allDeals = await sql`
      SELECT * FROM deals ORDER BY created_at DESC;
    `;

    let activeOpenDeal = null;
    let lastManualClosedDeal = null;

    if (activeCoin) {
      const openResult = await sql`
        SELECT * FROM deals 
        WHERE coin = ${activeCoin} AND status = 'OPEN' 
        LIMIT 1;
      `;
      if (openResult && openResult.length > 0) {
        activeOpenDeal = openResult[0];
      }

      if (!activeOpenDeal) {
        const closedResult = await sql`
          SELECT * FROM deals 
          WHERE coin = ${activeCoin} AND status = 'CLOSED' 
          ORDER BY created_at DESC 
          LIMIT 1;
        `;
        if (closedResult && closedResult.length > 0) {
          lastManualClosedDeal = closedResult[0];
        }
      }
    }

    return NextResponse.json({
      deals: allDeals || [],
      activeOpenDeal,
      lastManualClosedDeal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    await ensureTableExists();
    const body = await request.json();

    if (!body.coin || body.entry_price === undefined || !body.volume) {
      return NextResponse.json(
        { error: "Пропущены поля ордера" },
        { status: 400 },
      );
    }

    const coin = String(body.coin);
    const side = String(body.side);
    const order_type = String(body.order_type);
    const entry_price = parseFloat(Number(body.entry_price).toFixed(6));
    const stop_loss = parseFloat(Number(body.stop_loss).toFixed(6));
    const take_profit = parseFloat(Number(body.take_profit).toFixed(6));
    const volume = parseFloat(Number(body.volume).toFixed(2));
    const margin = parseFloat(Number(body.margin).toFixed(2));
    const leverage = parseInt(body.leverage, 10);

    const coinData = await sql`
      SELECT decimals FROM coins 
      WHERE coin = ${coin} LIMIT 1;
    `;

    // ИСПРАВЛЕНО: Чистый одиночный оператор к первому элементу массива ответа
    const decimals = (coinData && coinData[0]?.decimals) ?? 2;
    const priceEpsilon = decimals >= 4 ? 0.000001 : 0.0001;

    const existingDuplicates = await sql`
      SELECT id FROM deals
      WHERE coin = ${coin} AND side = ${side} 
        AND status = 'OPEN'
        AND ABS(entry_price - ${entry_price}) < ${priceEpsilon}
        AND ABS(stop_loss - ${stop_loss}) < ${priceEpsilon}
        AND ABS(take_profit - ${take_profit}) < ${priceEpsilon};
    `;

    if (existingDuplicates && existingDuplicates.length > 0) {
      return NextResponse.json(
        { error: "Duplicate detected" },
        { status: 409 },
      );
    }

    const result = await sql`
      INSERT INTO deals (
        coin, side, order_type, entry_price, stop_loss, 
        take_profit, volume, margin, leverage, status, 
        tp_touched, sl_touched
      )
      VALUES (
        ${coin}, ${side}, ${order_type}, ${entry_price}, ${stop_loss}, 
        ${take_profit}, ${volume}, ${margin}, ${leverage}, 'OPEN', 
        FALSE, FALSE
      )
      RETURNING *;
    `;
    return NextResponse.json({
      success: true,
      data: result,
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
    await ensureTableExists();
    const body = await request.json();

    if (body.action === "TOGGLE_FAVORITE" && body.coin) {
      const coinName = String(body.coin);
      const coinCheck = await sql`
        SELECT is_favorite FROM coins 
        WHERE coin = ${coinName} LIMIT 1;
      `;

      if (!coinCheck || coinCheck.length === 0) {
        return NextResponse.json(
          { error: "Монета не найдена в БД" },
          { status: 404 },
        );
      }

      // ИСПРАВЛЕНО: Чистый одиночный оператор к первому элементу массива ответа
      const nextFavStatus = !coinCheck[0]?.is_favorite;
      await sql`
        UPDATE coins 
        SET is_favorite = ${nextFavStatus} 
        WHERE coin = ${coinName};
      `;
      return NextResponse.json({
        success: true,
        is_favorite: nextFavStatus,
      });
    }

    if (!body.id) {
      return NextResponse.json({ error: "Пропущен id" }, { status: 400 });
    }

    const targetId = parseInt(body.id, 10);

    if (body.action === "MOVE_TO_BREAKEVEN" && body.stop_loss !== undefined) {
      const nextSl = parseFloat(Number(body.stop_loss).toFixed(6));
      const result = await sql`
        UPDATE deals 
        SET stop_loss = ${nextSl} 
        WHERE id = ${targetId} AND status = 'OPEN'
        RETURNING *;
      `;
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (body.action === "TOUCH_TP") {
      const result = await sql`
        UPDATE deals SET tp_touched = TRUE 
        WHERE id = ${targetId} AND status = 'OPEN' 
        RETURNING *;
      `;
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (body.action === "TOUCH_SL") {
      const result = await sql`
        UPDATE deals SET sl_touched = TRUE 
        WHERE id = ${targetId} AND status = 'OPEN' 
        RETURNING *;
      `;
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (!body.status) {
      return NextResponse.json({ error: "Пропущен статус" }, { status: 400 });
    }

    const targetStatus = String(body.status);
    const closedAtPrice =
      body.closed_at_price !== undefined && body.closed_at_price !== null
        ? parseFloat(Number(body.closed_at_price).toFixed(6))
        : null;

    let result;
    if (closedAtPrice !== null) {
      result = await sql`
        UPDATE deals 
        SET status = ${targetStatus}, 
            closed_at_price = ${closedAtPrice} 
        WHERE id = ${targetId} 
        RETURNING *;
      `;
    } else {
      result = await sql`
        UPDATE deals SET status = ${targetStatus} 
        WHERE id = ${targetId} 
        RETURNING *;
      `;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    await ensureTableExists();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      await sql`TRUNCATE TABLE deals;`;
      await sql`TRUNCATE TABLE coins;`;
      isTableVerified = false;
      return NextResponse.json({
        success: true,
        message: "Журнал и кэш монет полностью очищены",
      });
    }

    const targetId = parseInt(id, 10);
    await sql`DELETE FROM deals WHERE id = ${targetId};`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
