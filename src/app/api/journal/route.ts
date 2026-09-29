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
      SELECT d.id, d.created_at, d.coin, d.side, d.order_type, 
             d.entry_price::TEXT as entry_price, 
             d.stop_loss::TEXT as stop_loss, 
             d.take_profit::TEXT as take_profit, 
             d.volume, d.margin, d.leverage, d.status, 
             d.closed_at_price::TEXT as closed_at_price, 
             d.tp_touched, d.sl_touched,
             COALESCE(c.decimals, 2) as precision
      FROM deals d
      LEFT JOIN coins c ON d.coin = c.coin
      ORDER BY d.created_at DESC;
    `;

    let activeOpenDeal = null;
    let lastManualClosedDeal = null;

    if (activeCoin) {
      const openResult = await sql`
        SELECT d.id, d.created_at, d.coin, d.side, d.order_type, 
               d.entry_price::TEXT as entry_price, 
               d.stop_loss::TEXT as stop_loss, 
               d.take_profit::TEXT as take_profit, 
               d.volume, d.margin, d.leverage, d.status, 
               d.closed_at_price::TEXT as closed_at_price, 
               d.tp_touched, d.sl_touched,
               COALESCE(c.decimals, 2) as precision
        FROM deals d
        LEFT JOIN coins c ON d.coin = c.coin
        WHERE d.coin = ${activeCoin} AND d.status = 'OPEN' 
        LIMIT 1;
      `;
      if (openResult && openResult.length > 0) {
        activeOpenDeal = openResult[0];
      }

      if (!activeOpenDeal) {
        const closedResult = await sql`
          SELECT d.id, d.created_at, d.coin, d.side, d.order_type, 
                 d.entry_price::TEXT as entry_price, 
                 d.stop_loss::TEXT as stop_loss, 
                 d.take_profit::TEXT as take_profit, 
                 d.volume, d.margin, d.leverage, d.status, 
                 d.closed_at_price::TEXT as closed_at_price, 
                 d.tp_touched, d.sl_touched,
                 COALESCE(c.decimals, 2) as precision
          FROM deals d
          LEFT JOIN coins c ON d.coin = c.coin
          WHERE d.coin = ${activeCoin} AND d.status = 'CLOSED' 
          ORDER BY d.created_at DESC 
          LIMIT 1;
        `;
        if (closedResult && closedResult.length > 0) {
          lastManualClosedDeal = closedResult[0];
        }
      }
    }

    const parsedDeals = rawDeals.map((d: any) => ({
      ...d,
      entry_price: parseFloat(d.entry_price) || 0,
      stop_loss: parseFloat(d.stop_loss) || 0,
      take_profit: parseFloat(d.take_profit) || 0,
      closed_at_price: d.closed_at_price ? parseFloat(d.closed_at_price) : null,
      precision: parseInt(d.precision, 10) || 2,
    }));

    return NextResponse.json({
      deals: parsedDeals || [],
      activeOpenDeal: activeOpenDeal
        ? {
            ...activeOpenDeal,
            entry_price: parseFloat((activeOpenDeal as any).entry_price) || 0,
            stop_loss: parseFloat((activeOpenDeal as any).stop_loss) || 0,
            take_profit: parseFloat((activeOpenDeal as any).take_profit) || 0,
            closed_at_price: (activeOpenDeal as any).closed_at_price
              ? parseFloat((activeOpenDeal as any).closed_at_price)
              : null,
            precision: parseInt((activeOpenDeal as any).precision, 10) || 2,
          }
        : null,
      lastManualClosedDeal: lastManualClosedDeal
        ? {
            ...lastManualClosedDeal,
            entry_price:
              parseFloat((lastManualClosedDeal as any).entry_price) || 0,
            stop_loss: parseFloat((lastManualClosedDeal as any).stop_loss) || 0,
            take_profit:
              parseFloat((lastManualClosedDeal as any).take_profit) || 0,
            closed_at_price: (lastManualClosedDeal as any).closed_at_price
              ? parseFloat((lastManualClosedDeal as any).closed_at_price)
              : null,
            precision:
              parseInt((lastManualClosedDeal as any).precision, 10) || 2,
          }
        : null,
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
      SELECT decimals FROM coins 
      WHERE coin = ${coin} LIMIT 1;
    `;

    const decimals = (coinData && coinData[0]?.decimals) ?? 2;
    const priceEpsilon = 1 / Math.pow(10, decimals + 2);

    const existingDuplicates = await sql`
      SELECT id FROM deals
      WHERE coin = ${coin} AND side = ${side} 
        AND status = 'OPEN'
        AND ABS(entry_price::DOUBLE PRECISION - ${entry_price}) < ${priceEpsilon}
        AND ABS(stop_loss::DOUBLE PRECISION - ${stop_loss}) < ${priceEpsilon}
        AND ABS(take_profit::DOUBLE PRECISION - ${take_profit}) < ${priceEpsilon};
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

    if (!body.id) {
      return NextResponse.json({ error: "Пропущен id" }, { status: 400 });
    }

    const targetId = parseInt(body.id, 10);

    if (body.action === "MOVE_TO_BREAKEVEN" && body.stop_loss !== undefined) {
      const nextSl = Number(body.stop_loss);
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
      // ФИКС: Опечатка Extends успешно заменена на валидный оператор AND
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
