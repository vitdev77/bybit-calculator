import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL || "");

async function ensureTableExists() {
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      coin VARCHAR(50) NOT NULL,
      side VARCHAR(10) NOT NULL,
      order_type VARCHAR(10) NOT NULL,
      entry_price DOUBLE PRECISION NOT NULL,
      stop_loss DOUBLE PRECISION NOT NULL,
      take_profit DOUBLE PRECISION NOT NULL,
      volume DOUBLE PRECISION NOT NULL,
      margin DOUBLE PRECISION NOT NULL,
      leverage INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'OPEN'
    );
  `;
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL)
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    await ensureTableExists();
    const rows = await sql`SELECT * FROM deals ORDER BY created_at DESC;`;
    return NextResponse.json(rows || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL)
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    await ensureTableExists();
    const body = await request.json();

    if (!body.coin || !body.entry_price || !body.volume) {
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
    const volume = Number(body.volume);
    const margin = Number(body.margin);
    const leverage = Number(body.leverage);

    const existingDuplicates = await sql`
      SELECT id FROM deals
      WHERE coin = ${coin} AND side = ${side} AND status = 'OPEN'
        AND ABS(entry_price - ${entry_price}) < 0.00001
        AND ABS(stop_loss - ${stop_loss}) < 0.00001
        AND ABS(take_profit - ${take_profit}) < 0.00001;
    `;

    if (existingDuplicates && existingDuplicates.length > 0) {
      return NextResponse.json(
        { error: "Duplicate detected" },
        { status: 409 },
      );
    }

    const result = await sql`
      INSERT INTO deals (coin, side, order_type, entry_price, stop_loss, take_profit, volume, margin, leverage, status)
      VALUES (${coin}, ${side}, ${order_type}, ${entry_price}, ${stop_loss}, ${take_profit}, ${volume}, ${margin}, ${leverage}, 'OPEN')
      RETURNING *;
    `;
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "Пропущен id или статус" },
        { status: 400 },
      );
    }
    const result = await sql`
      UPDATE deals SET status = ${String(body.status)} WHERE id = ${Number(body.id)} RETURNING *;
    `;
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Одиночное ИЛИ ПОЛНОЕ удаление таблицы из Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // ИСПРАВЛЕНО: Если id не передан, стираем вообще все записи из таблицы
    if (!id) {
      await sql`TRUNCATE TABLE deals;`;
      return NextResponse.json({
        success: true,
        message: "Журнал полностью зачищен",
      });
    }

    await sql`DELETE FROM deals WHERE id = ${Number(id)};`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
