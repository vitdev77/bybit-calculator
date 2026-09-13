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

    if (!body.coin || body.entry_price === undefined || !body.volume) {
      return NextResponse.json(
        { error: "Пропущены поля ордера" },
        { status: 400 },
      );
    }

    const coin = String(body.coin);
    const side = String(body.side);
    const order_type = String(body.order_type);

    // Безопасный парсинг чисел с плавающей точкой
    const entry_price = parseFloat(Number(body.entry_price).toFixed(6));
    const stop_loss = parseFloat(Number(body.stop_loss).toFixed(6));
    const take_profit = parseFloat(Number(body.take_profit).toFixed(6));
    const volume = parseFloat(Number(body.volume).toFixed(2));
    const margin = parseFloat(Number(body.margin).toFixed(2));
    const leverage = parseInt(body.leverage, 10);

    // Умная проверка дубликатов с учетом погрешности JS-вычислений
    const existingDuplicates = await sql`
      SELECT id FROM deals
      WHERE coin = ${coin} AND side = ${side} AND status = 'OPEN'
        AND ABS(entry_price - ${entry_price}) < 0.0001
        AND ABS(stop_loss - ${stop_loss}) < 0.0001
        AND ABS(take_profit - ${take_profit}) < 0.0001;
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
    if (!process.env.DATABASE_URL)
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );

    // ДОБАВЛЕНО: Защита от холодного старта Neon
    await ensureTableExists();

    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "Пропущен id или статус" },
        { status: 400 },
      );
    }

    const targetId = parseInt(body.id, 10);
    const targetStatus = String(body.status);

    const result = await sql`
      UPDATE deals SET status = ${targetStatus} WHERE id = ${targetId} RETURNING *;
    `;
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.DATABASE_URL)
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );

    // ДОБАВЛЕНО: Защита от холодного старта Neon
    await ensureTableExists();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      await sql`TRUNCATE TABLE deals;`;
      return NextResponse.json({
        success: true,
        message: "Журнал полностью зачищен",
      });
    }

    const targetId = parseInt(id, 10);
    await sql`DELETE FROM deals WHERE id = ${targetId};`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
