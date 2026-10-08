import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");
let isTableVerified = false;

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
entry_price NUMERIC(20, 8) NOT NULL,
stop_loss NUMERIC(20, 8) NOT NULL,
take_profit NUMERIC(20, 8) NOT NULL,
volume DOUBLE PRECISION NOT NULL,
margin DOUBLE PRECISION NOT NULL,
leverage INTEGER NOT NULL,
status VARCHAR(20) DEFAULT 'OPEN',
closed_at_price NUMERIC(20, 8),
tp_touched BOOLEAN DEFAULT FALSE,
sl_touched BOOLEAN DEFAULT FALSE
);
`;

    await sql`
ALTER TABLE deals 
ALTER COLUMN entry_price TYPE NUMERIC(20, 8),
ALTER COLUMN stop_loss TYPE NUMERIC(20, 8),
ALTER COLUMN take_profit TYPE NUMERIC(20, 8),
ALTER COLUMN closed_at_price TYPE NUMERIC(20, 8);
`;

    await sql`
CREATE INDEX IF NOT EXISTS idx_deals_status_coin 
ON deals (status, coin);
`;

    isTableVerified = true;
  } catch (err) {
    console.error("Database Deals Migration Error:", err);
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

    const rawDeals = await sql`
SELECT d.id, d.created_at, d.coin, d.side, 
d.order_type, 
d.entry_price::TEXT as entry_price, 
d.stop_loss::TEXT as stop_loss, 
d.take_profit::TEXT as take_profit, 
d.volume, d.margin, d.leverage, d.status, 
d.closed_at_price::TEXT as closed_at_price, 
d.tp_touched, d.sl_touched,
c.decimals as coin_decimals,
c.logo_slug
FROM deals d
LEFT JOIN coins c ON d.coin = c.coin
ORDER BY 
CASE WHEN d.status = 'OPEN' THEN 0 ELSE 1 END ASC,
d.created_at DESC;
`;

    const parsedDeals = rawDeals.map((d: any) => {
      const ep = parseFloat(d.entry_price) || 0;

      let calculatedPrecision = 2;
      if (d.coin_decimals !== null && d.coin_decimals !== undefined) {
        calculatedPrecision = parseInt(d.coin_decimals, 10);
      } else if (ep > 0) {
        const epStr = d.entry_price || "";
        const dotIdx = epStr.indexOf(".");
        if (dotIdx !== -1) {
          const cleanFraction = epStr.slice(dotIdx + 1).replace(/0+\$/, "");
          calculatedPrecision = Math.max(2, Math.min(8, cleanFraction.length));
        }
      }

      return {
        ...d,
        entry_price: ep,
        stop_loss: parseFloat(d.stop_loss) || 0,
        take_profit: parseFloat(d.take_profit) || 0,
        closed_at_price: d.closed_at_price
          ? parseFloat(d.closed_at_price)
          : null,
        precision: calculatedPrecision,
        logo_slug: d.logo_slug || d.coin.replace("USDT", ""),
      };
    });

    let activeOpenDeal = null;
    let lastManualClosedDeal = null;

    if (activeCoin) {
      activeOpenDeal =
        parsedDeals.find((d) => d.coin === activeCoin && d.status === "OPEN") ||
        null;

      if (!activeOpenDeal) {
        lastManualClosedDeal =
          parsedDeals.find(
            (d) => d.coin === activeCoin && d.status === "CLOSED",
          ) || null;
      }
    }

    return NextResponse.json({
      deals: parsedDeals,
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

    const entry_price = Number(body.entry_price);
    const stop_loss = Number(body.stop_loss);
    const take_profit = Number(body.take_profit);
    const volume = parseFloat(Number(body.volume).toFixed(2));
    const margin = parseFloat(Number(body.margin).toFixed(2));
    const leverage = parseInt(body.leverage, 10);

    const coinData = await sql`
SELECT decimals FROM coins WHERE coin = ${coin} LIMIT 1;
`;

    const decimals = (coinData && coinData[0]?.decimals) ?? 2;
    const priceEpsilon = 1 / Math.pow(10, decimals + 2);

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
${coin}, ${side}, ${order_type}, ${entry_price}, 
${stop_loss}, ${take_profit}, ${volume}, ${margin}, 
${leverage}, 'OPEN', FALSE, FALSE
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

    if (!body.id) {
      return NextResponse.json({ error: "Пропущен id" }, { status: 400 });
    }

    const targetId = parseInt(body.id, 10);

    if (body.action === "MOVE_TO_BREAKEVEN" && body.stop_loss !== undefined) {
      const nextSl = Number(body.stop_loss);
      const result = await sql`
UPDATE deals SET stop_loss = ${nextSl} 
WHERE id = ${targetId} AND status = 'OPEN'
RETURNING *;
`;
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "TOUCH_TP") {
      const result = await sql`
UPDATE deals SET tp_touched = TRUE 
WHERE id = ${targetId} AND status = 'OPEN' 
RETURNING *;
`;
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "TOUCH_SL") {
      const result = await sql`
UPDATE deals SET sl_touched = TRUE 
WHERE id = ${targetId} AND status = 'OPEN' 
RETURNING *;
`;
      return NextResponse.json({ success: true, data: result });
    }

    if (!body.status) {
      return NextResponse.json({ error: "Пропущен status" }, { status: 400 });
    }

    const targetStatus = String(body.status);
    const closedAtPrice =
      body.closed_at_price !== undefined && body.closed_at_price !== null
        ? Number(body.closed_at_price)
        : null;

    let result;
    if (closedAtPrice !== null) {
      result = await sql`
UPDATE deals 
SET status = ${targetStatus}, 
closed_at_price = ${closedAtPrice} 
WHERE id = ${targetId} RETURNING *;
`;
    } else {
      result = await sql`
UPDATE deals SET status = ${targetStatus} 
WHERE id = ${targetId} RETURNING *;
`;
    }

    return NextResponse.json({ success: true, data: result });
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
      return NextResponse.json({
        success: true,
        message: "Журнал сделок полностью очищен",
      });
    }

    const targetId = parseInt(id, 10);
    await sql`DELETE FROM deals WHERE id = ${targetId};`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
