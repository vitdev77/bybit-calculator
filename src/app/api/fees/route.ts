import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Полностью отключаем кэширование роута комиссий
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL || "");

let isTableVerified = false;

async function ensureTableExists() {
  if (isTableVerified) return;
  if (!process.env.DATABASE_URL) return;

  try {
    // Создаем изолированную таблицу под обе тарифные сетки аккаунта
    await sql`
      CREATE TABLE IF NOT EXISTS fee_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        fut_taker DOUBLE PRECISION NOT NULL DEFAULT 0.0900,
        fut_maker DOUBLE PRECISION NOT NULL DEFAULT 0.0324,
        spot_taker DOUBLE PRECISION NOT NULL DEFAULT 0.1350,
        spot_maker DOUBLE PRECISION NOT NULL DEFAULT 0.0750,
        CONSTRAINT one_row_only CHECK (id = 1)
      );
    `;

    // Первоначально прописываем ваши данные фьючерсов и спота
    await sql`
      INSERT INTO fee_settings (id, fut_taker, fut_maker, spot_taker, spot_maker)
      VALUES (1, 0.0900, 0.0324, 0.1350, 0.0750)
      ON CONFLICT (id) DO NOTHING;
    `;

    isTableVerified = true;
  } catch (err) {
    console.error("Fees Table Migration Error:", err);
  }
}
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL не настроен" },
        { status: 500 },
      );
    }
    await ensureTableExists();

    const settings = await sql`SELECT * FROM fee_settings WHERE id = 1;`;

    // Возвращаем данные из базы, либо дефолтный хардкод, если что-то пошло не так
    return NextResponse.json(
      settings && settings.length > 0
        ? settings[0]
        : {
            fut_taker: 0.09,
            fut_maker: 0.0324,
            spot_taker: 0.135,
            spot_maker: 0.075,
          },
    );
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

    const futTaker = parseFloat(body.futTaker) || 0.09;
    const futMaker = parseFloat(body.futMaker) || 0.0324;
    const spotTaker = parseFloat(body.spotTaker) || 0.135;
    const spotMaker = parseFloat(body.spotMaker) || 0.075;

    const updated = await sql`
      INSERT INTO fee_settings (id, fut_taker, fut_maker, spot_taker, spot_maker)
      VALUES (1, ${futTaker}, ${futMaker}, ${spotTaker}, ${spotMaker})
      ON CONFLICT (id) 
      DO UPDATE SET 
        fut_taker = ${futTaker}, 
        fut_maker = ${futMaker},
        spot_taker = ${spotTaker},
        spot_maker = ${spotMaker}
      RETURNING *;
    `;

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
